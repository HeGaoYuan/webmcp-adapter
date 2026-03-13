import json
import logging
import os
import sys

# Force UTF-8 for stdout/stderr (PyInstaller bundles default to ASCII)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent import WeWorkAgent
from bridge_client import bridge
from config import get_settings, update_settings
from models import ChatRequest, SettingsUpdate, WorkTitleUpdate
from works_store import store

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger(__name__)

# If Electron passes a log file path, also write to it
_log_file = os.environ.get("WEWORK_LOG_FILE")
if _log_file:
    _fh = logging.FileHandler(_log_file, mode='a', encoding='utf-8')
    _fh.setFormatter(logging.Formatter('%(asctime)s [python] %(levelname)s %(message)s'))
    logging.getLogger().addHandler(_fh)

app = FastAPI(title="WeWork Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = WeWorkAgent(bridge)


@app.on_event("startup")
async def startup():
    await store.init()
    bridge.start()
    logger.info("WeWork backend started")


@app.on_event("shutdown")
async def shutdown():
    await bridge.stop()


# ── Status ──────────────────────────────────────────────────────────────────

@app.get("/status")
async def get_status():
    return {
        "bridge": "running" if bridge.is_connected() else "disconnected",
        "extension": "connected" if bridge.is_extension_connected() else "disconnected",
        "tools_count": len(bridge.get_all_tools()),
    }


# ── Model connectivity test ───────────────────────────────────────────────────

@app.post("/settings/test")
async def test_connection():
    import asyncio
    settings = get_settings()
    if not settings.api_key:
        raise HTTPException(400, "API key not configured")
    try:
        if settings.model.startswith("claude-"):
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.api_key, base_url=settings.base_url)
            resp = await asyncio.wait_for(
                client.messages.create(
                    model=settings.model,
                    max_tokens=1,
                    messages=[{"role": "user", "content": "hi"}],
                ),
                timeout=25,
            )
            return {"ok": True, "model": resp.model}
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.api_key, base_url=settings.base_url)
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model=settings.model,
                    messages=[{"role": "user", "content": "hi"}],
                    max_tokens=1,
                    stream=False,
                ),
                timeout=25,
            )
            return {"ok": True, "model": resp.model}
    except TimeoutError:
        raise HTTPException(400, "连接超时，请检查代理地址是否可访问")
    except Exception as e:
        msg = str(e)
        if msg.strip().startswith("<!") or "<html" in msg[:200].lower():
            raise HTTPException(400, "API 请求被拦截（可能是网络/地区限制）。请检查是否需要代理，或改用其他模型提供商（如 DeepSeek、Qwen）。")
        raise HTTPException(400, msg)


# ── Sites ────────────────────────────────────────────────────────────────────

SITES = [
    {
        "id": "mail.google.com",
        "name": "Gmail",
        "name_zh": "Gmail",
        "description": "Read emails, search, open messages, download attachments",
        "description_zh": "读取邮件、搜索、查看详情、下载附件",
        "icon": "gmail",
        "match": ["mail.google.com"],
    },
    {
        "id": "mail.163.com",
        "name": "163 Mail",
        "name_zh": "163邮箱",
        "description": "Read emails, search, open messages, download attachments",
        "description_zh": "读取邮件、搜索、查看详情、下载附件",
        "icon": "163",
        "match": ["mail.163.com"],
    },
    {
        "id": "www.jd.com",
        "name": "JD.com",
        "name_zh": "京东",
        "description": "Browse products, view cart, view orders, buy, pay",
        "description_zh": "浏览商品、查看购物车、查看订单、购买、支付",
        "icon": "jd",
        "match": ["jd.com"],
    },
    {
        "id": "www.xiaohongshu.com",
        "name": "Xiaohongshu",
        "name_zh": "小红书",
        "description": "Browse homepage, search notes by keyword",
        "description_zh": "浏览主页、按关键词搜索帖子",
        "icon": "xhs",
        "match": ["xiaohongshu.com"],
    },
]


@app.get("/tools")
async def get_tools():
    result = []
    for domain, data in bridge._tools.items():
        result.append({
            "domain": domain,
            "tab_count": data.get("tabCount", 0),
            "tools": [{"name": t.get("name", ""), "description": t.get("description", "")}
                      for t in data.get("tools", [])],
        })
    return result


async def get_sites():
    return SITES


# ── Settings ─────────────────────────────────────────────────────────────────

@app.get("/settings")
async def get_settings_endpoint():
    s = get_settings()
    return {"base_url": s.base_url, "model": s.model, "has_api_key": bool(s.api_key)}


@app.post("/settings")
async def post_settings(body: SettingsUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = update_settings(data)
    return {"base_url": updated.base_url, "model": updated.model, "has_api_key": bool(updated.api_key)}


# ── Works ─────────────────────────────────────────────────────────────────────

@app.get("/works")
async def list_works():
    works = await store.list_works()
    return [{"id": w.id, "title": w.title, "updated_at": w.updated_at} for w in works]


@app.post("/works")
async def create_work():
    work = await store.create_work()
    return {"id": work.id, "title": work.title, "updated_at": work.updated_at}


@app.get("/works/{work_id}")
async def get_work(work_id: str):
    wm = await store.get_work_with_messages(work_id)
    if not wm:
        raise HTTPException(404, "Work not found")
    return {
        "id": wm.work.id,
        "title": wm.work.title,
        "updated_at": wm.work.updated_at,
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in wm.messages
        ],
    }


@app.patch("/works/{work_id}")
async def update_work(work_id: str, body: WorkTitleUpdate):
    await store.update_title(work_id, body.title)
    return {"ok": True}


@app.delete("/works/{work_id}")
async def delete_work(work_id: str):
    await store.delete_work(work_id)
    return {"ok": True}


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.post("/works/{work_id}/chat")
async def chat(work_id: str, req: ChatRequest):
    wm = await store.get_work_with_messages(work_id)
    if not wm:
        raise HTTPException(404, "Work not found")

    settings = get_settings()
    if not settings.api_key:
        raise HTTPException(400, "API key not configured")

    # Save user message
    await store.append_message(work_id, "user", [{"type": "text", "text": req.message}])

    # Build messages list with system prompt
    all_tools = bridge.get_all_tools()
    tool_names = ", ".join(t.get("name", "") for t in all_tools) if all_tools else "暂无"
    system_prompt = (
        "你是 WeWork（微牛马），一个能通过 Chrome 扩展直接操作网页的 AI 助手。\n"
        "你可以使用工具操作用户当前打开的网页，也可以用 open_browser 打开新网址，用 capture_screenshot 截图查看页面。\n"
        f"当前已加载的工具：{tool_names}。\n"
        "如果用户要操作某个网站但对应工具未加载，请告知用户先在 Chrome 中打开该网站，扩展会自动注入工具。\n"
        "支持的网站包括：Gmail (mail.google.com)、163邮箱 (mail.163.com)、京东 (www.jd.com)、小红书 (www.xiaohongshu.com)。"
    )
    messages = [{"role": "system", "content": system_prompt}]
    for m in wm.messages:
        if m.role == "user":
            text = next((b["text"] for b in m.content if b.get("type") == "text"), "")
            messages.append({"role": "user", "content": text})
        elif m.role == "assistant":
            text = next((b["text"] for b in m.content if b.get("type") == "text"), "")
            messages.append({"role": "assistant", "content": text})
    messages.append({"role": "user", "content": req.message})

    # Accumulate assistant response for persistence
    assistant_content: list[dict] = []
    tool_calls_in_progress: dict[str, dict] = {}

    async def event_stream():
        nonlocal assistant_content, tool_calls_in_progress
        text_buffer = ""

        try:
            async for event in agent.stream_chat(messages, settings):
                yield f"data: {json.dumps(event)}\n\n"

                t = event["type"]
                if t == "text_delta":
                    text_buffer += event["content"]
                elif t == "tool_call_start":
                    if text_buffer:
                        assistant_content.append({"type": "text", "text": text_buffer})
                        text_buffer = ""
                    tool_calls_in_progress[event["id"]] = {"name": event["name"], "args": event["args"]}
                elif t == "tool_call_result":
                    tc = tool_calls_in_progress.pop(event["id"], {})
                    assistant_content.append({
                        "type": "tool_use",
                        "id": event["id"],
                        "name": tc.get("name", ""),
                        "args": tc.get("args", {}),
                        "result": event["result"],
                    })
                elif t == "tool_call_image":
                    tc = tool_calls_in_progress.pop(event["id"], {})
                    assistant_content.append({
                        "type": "tool_use",
                        "id": event["id"],
                        "name": tc.get("name", ""),
                        "args": tc.get("args", {}),
                        "image": event["data"],
                    })
                elif t == "done":
                    if text_buffer:
                        assistant_content.append({"type": "text", "text": text_buffer})
        except Exception as e:
            err_msg = str(e)
            logger.error(f"stream_chat error: {err_msg}")
            if err_msg.strip().startswith("<!") or "<html" in err_msg[:200].lower():
                err_msg = "API 请求被拦截（可能是网络/地区限制）。请检查是否需要代理，或改用其他模型提供商。"
            yield f"data: {json.dumps({'type': 'error', 'message': err_msg})}\n\n"

        # Persist assistant message
        if assistant_content:
            await store.append_message(work_id, "assistant", assistant_content)
            # Auto-title from first user message
            if len(wm.messages) == 0:
                title = req.message[:40] + ("…" if len(req.message) > 40 else "")
                await store.update_title(work_id, title)

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    port = int(os.environ.get("WEWORK_PORT", "8765"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
