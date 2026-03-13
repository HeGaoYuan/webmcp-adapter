import asyncio
import json
import logging
import uuid
from typing import Any, Callable

import websockets
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)

BRIDGE_URL = "ws://localhost:3711"


class BridgeClient:
    def __init__(self):
        self._ws = None
        self._tools: dict[str, dict] = {}  # domain -> {tools, tabCount}
        self._pending: dict[str, asyncio.Future] = {}
        self._counter = 0
        self._connected = False
        self._extension_connected = False
        self._on_tools_updated: list[Callable] = []
        self._task: asyncio.Task | None = None

    def start(self):
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        if self._task:
            self._task.cancel()
        if self._ws:
            await self._ws.close()

    async def _run(self):
        while True:
            try:
                async with websockets.connect(BRIDGE_URL) as ws:
                    self._ws = ws
                    self._connected = True
                    logger.info("Connected to bridge")
                    async for raw in ws:
                        await self._handle_message(json.loads(raw))
            except (ConnectionClosed, OSError) as e:
                logger.warning(f"Bridge disconnected: {e}, retrying in 2s")
            except asyncio.CancelledError:
                break
            finally:
                self._ws = None
                self._connected = False
                self._extension_connected = False
            await asyncio.sleep(2)

    async def _handle_message(self, msg: dict):
        msg_type = msg.get("type")

        if msg_type == "tools_updated":
            domain = msg.get("domain", "")
            self._tools[domain] = {
                "tools": msg.get("tools", []),
                "tabCount": msg.get("tabCount", 0),
            }
            self._extension_connected = True
            for cb in self._on_tools_updated:
                cb()

        elif msg_type == "tools_snapshot":
            for domain, data in msg.get("domains", {}).items():
                self._tools[domain] = data
            if self._tools:
                self._extension_connected = True

        elif msg_type in ("call_tool_result", "call_tool_error",
                          "get_active_tab_result", "open_browser_result",
                          "capture_screenshot_result"):
            req_id = msg.get("id")
            if req_id and req_id in self._pending:
                fut = self._pending.pop(req_id)
                if not fut.done():
                    if msg_type.endswith("_error"):
                        fut.set_exception(RuntimeError(msg.get("error", "unknown error")))
                    else:
                        fut.set_result(msg)

        elif msg_type == "extension_disconnected":
            self._extension_connected = False
            self._tools.clear()

    async def _request(self, msg: dict, timeout: float = 30.0) -> dict:
        if not self._ws:
            raise RuntimeError("Not connected to bridge")
        self._counter += 1
        req_id = f"py-{self._counter}"
        msg["id"] = req_id
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[req_id] = fut
        await self._ws.send(json.dumps(msg))
        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        except asyncio.TimeoutError:
            self._pending.pop(req_id, None)
            raise TimeoutError(f"Request {req_id} timed out")

    async def call_tool(self, name: str, args: dict) -> Any:
        # bridge expects 'toolName', not 'name'
        result = await self._request({"type": "call_tool", "toolName": name, "args": args})
        return result.get("result")

    async def open_browser(self, url: str) -> dict:
        result = await self._request({"type": "open_browser", "url": url})
        return result.get("result", result)

    async def capture_screenshot(self, full_page: bool = False) -> dict:
        # bridge forwards to extension; extension returns call_tool_result with result={data:...}
        result = await self._request(
            {"type": "capture_screenshot", "fullPage": full_page},
            timeout=30.0,
        )
        # result is the inner payload: {data: "base64..."} or the full msg
        inner = result.get("result", result)
        return inner

    def get_all_tools(self) -> list[dict]:
        seen = set()
        tools = []
        for domain_data in self._tools.values():
            for tool in domain_data.get("tools", []):
                name = tool.get("name", "")
                if name not in seen:
                    seen.add(name)
                    tools.append(tool)
        return tools

    def is_connected(self) -> bool:
        return self._connected

    def is_extension_connected(self) -> bool:
        return self._extension_connected

    def on_tools_updated(self, cb: Callable):
        self._on_tools_updated.append(cb)


# Global singleton
bridge = BridgeClient()
