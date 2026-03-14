import json
import logging
from typing import AsyncIterator

from bridge_client import BridgeClient
from config import Settings
from file_tools import (
    delete_wework_file,
    list_downloads,
    list_wework_files,
    move_to_wework,
    read_file_text,
)
from tools import build_tool_schemas, resolve_tool_name

logger = logging.getLogger(__name__)


def _is_claude(model: str) -> bool:
    return model.startswith("claude-")


class WeWorkAgent:
    def __init__(self, bridge: BridgeClient):
        self.bridge = bridge

    async def stream_chat(self, messages: list[dict], settings: Settings) -> AsyncIterator[dict]:
        if _is_claude(settings.model):
            async for event in self._stream_anthropic(messages, settings):
                yield event
        else:
            async for event in self._stream_openai(messages, settings):
                yield event

    # ── tool execution (shared) ──────────────────────────────────────────────

    async def _run_tool(self, tc_id: str, tc_name_sanitized: str, args_str: str):
        """Yields SSE events and returns result_text for the tool message."""
        tc_name = resolve_tool_name(tc_name_sanitized)
        try:
            args = json.loads(args_str) if args_str else {}
        except json.JSONDecodeError:
            args = {}

        yield {"type": "tool_call_start", "id": tc_id, "name": tc_name, "args": args}

        try:
            if tc_name == "open_browser":
                result = await self.bridge.open_browser(args.get("url", ""))
                result_text = json.dumps(result)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "capture_screenshot":
                result = await self.bridge.capture_screenshot(full_page=args.get("fullPage", False))
                img_data = result.get("data", "")
                if img_data:
                    yield {"type": "tool_call_image", "id": tc_id, "data": img_data}
                    result_text = "[Screenshot captured]"
                else:
                    result_text = json.dumps(result)
                    yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "list_downloads":
                result = list_downloads(**{k: v for k, v in args.items() if k in ("keyword", "limit")})
                result_text = json.dumps(result, ensure_ascii=False)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "list_wework_files":
                result = list_wework_files(category=args.get("category", ""))
                result_text = json.dumps(result, ensure_ascii=False)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "move_to_wework":
                result = move_to_wework(args.get("filename", ""), category=args.get("category", ""))
                result_text = json.dumps(result, ensure_ascii=False)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "read_file_text":
                result = read_file_text(args.get("path", ""), max_chars=args.get("max_chars", 8000))
                result_text = json.dumps(result, ensure_ascii=False)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            elif tc_name == "delete_wework_file":
                result = delete_wework_file(args.get("path", ""))
                result_text = json.dumps(result, ensure_ascii=False)
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

            else:
                result = await self.bridge.call_tool(tc_name, args)
                result_text = json.dumps(result) if not isinstance(result, str) else result
                yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

        except Exception as e:
            result_text = f"Error: {e}"
            yield {"type": "tool_call_result", "id": tc_id, "result": result_text}

        # Return result_text via a special sentinel event (caller reads it)
        yield {"type": "__tool_result__", "id": tc_id, "result": result_text}

    # ── OpenAI-compatible ────────────────────────────────────────────────────

    async def _stream_openai(self, messages: list[dict], settings: Settings):
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.api_key, base_url=settings.base_url)
        tool_schemas = build_tool_schemas(self.bridge)

        while True:
            kwargs = dict(model=settings.model, messages=messages, stream=True)
            if tool_schemas:
                kwargs["tools"] = tool_schemas

            stream = await client.chat.completions.create(**kwargs)

            full_text = ""
            tool_calls_buffer: dict[int, dict] = {}

            async for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue
                delta = choice.delta
                if delta.content:
                    full_text += delta.content
                    yield {"type": "text_delta", "content": delta.content}
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_buffer:
                            tool_calls_buffer[idx] = {"id": "", "name": "", "args_str": ""}
                        if tc.id:
                            tool_calls_buffer[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls_buffer[idx]["name"] = tc.function.name
                            if tc.function.arguments:
                                tool_calls_buffer[idx]["args_str"] += tc.function.arguments

            if not tool_calls_buffer:
                messages.append({"role": "assistant", "content": full_text})
                break

            openai_tool_calls = [
                {"id": tc["id"], "type": "function",
                 "function": {"name": tc["name"], "arguments": tc["args_str"]}}
                for tc in (tool_calls_buffer[i] for i in sorted(tool_calls_buffer))
            ]
            messages.append({"role": "assistant", "content": full_text or None, "tool_calls": openai_tool_calls})

            for idx in sorted(tool_calls_buffer.keys()):
                tc = tool_calls_buffer[idx]
                result_text = ""
                async for event in self._run_tool(tc["id"], tc["name"], tc["args_str"]):
                    if event["type"] == "__tool_result__":
                        result_text = event["result"]
                    else:
                        yield event
                messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result_text})

        yield {"type": "done"}

    # ── Anthropic native ─────────────────────────────────────────────────────

    async def _stream_anthropic(self, messages: list[dict], settings: Settings):
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.api_key, base_url=settings.base_url)
        tool_schemas = build_tool_schemas(self.bridge)

        anthropic_tools = [
            {
                "name": t["function"]["name"],
                "description": t["function"].get("description", ""),
                "input_schema": t["function"].get("parameters", {"type": "object", "properties": {}}),
            }
            for t in tool_schemas
        ]

        # Separate system message; convert remaining to Anthropic format
        system = None
        conv: list[dict] = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                conv.append({"role": m["role"], "content": m.get("content") or ""})

        while True:
            kwargs = dict(model=settings.model, max_tokens=4096, messages=conv)
            if system:
                kwargs["system"] = system
            if anthropic_tools:
                kwargs["tools"] = anthropic_tools

            full_text = ""
            tool_uses: list[dict] = []
            current_tool: dict | None = None

            async with client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    etype = event.type
                    if etype == "content_block_start":
                        blk = event.content_block
                        if blk.type == "tool_use":
                            current_tool = {"id": blk.id, "name": blk.name, "input_str": ""}
                            tool_uses.append(current_tool)
                        else:
                            current_tool = None
                    elif etype == "content_block_delta":
                        d = event.delta
                        if d.type == "text_delta":
                            full_text += d.text
                            yield {"type": "text_delta", "content": d.text}
                        elif d.type == "input_json_delta" and current_tool is not None:
                            current_tool["input_str"] += d.partial_json
                    elif etype == "content_block_stop":
                        current_tool = None

            if not tool_uses:
                conv.append({"role": "assistant", "content": full_text})
                break

            # Build assistant message
            assistant_content = []
            if full_text:
                assistant_content.append({"type": "text", "text": full_text})
            for tu in tool_uses:
                try:
                    inp = json.loads(tu["input_str"]) if tu["input_str"] else {}
                except json.JSONDecodeError:
                    inp = {}
                assistant_content.append({"type": "tool_use", "id": tu["id"], "name": tu["name"], "input": inp})
            conv.append({"role": "assistant", "content": assistant_content})

            # Execute tools
            tool_results = []
            for tu in tool_uses:
                result_text = ""
                async for event in self._run_tool(tu["id"], tu["name"], tu["input_str"]):
                    if event["type"] == "__tool_result__":
                        result_text = event["result"]
                    else:
                        yield event
                tool_results.append({"type": "tool_result", "tool_use_id": tu["id"], "content": result_text})
            conv.append({"role": "user", "content": tool_results})

        yield {"type": "done"}


# Global singleton (bridge injected at startup via main.py)
agent = WeWorkAgent(None)
