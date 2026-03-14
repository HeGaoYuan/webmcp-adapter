import asyncio
import logging
import re

from channels.base import BaseChannel
from config import get_settings

logger = logging.getLogger(__name__)

MAX_MSG_LEN = 1900


def _split_message(text: str) -> list[str]:
    if len(text) <= MAX_MSG_LEN:
        return [text]
    return [text[i:i + MAX_MSG_LEN] for i in range(0, len(text), MAX_MSG_LEN)]


def _parse_content(raw_content: str | None, attachments: list) -> list[dict]:
    """Convert QQ message content + attachments into OpenAI-style content blocks."""
    blocks = []

    # Strip bot @mention from guild messages
    text = re.sub(r"<@!\d+>", "", raw_content or "").strip()
    if text:
        blocks.append({"type": "text", "text": text})

    for att in attachments:
        url = getattr(att, "url", None)
        ct = getattr(att, "content_type", "") or ""
        if not url:
            continue
        if ct.startswith("image") or url.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
            # Store as image_url block (OpenAI vision format)
            blocks.append({"type": "image_url", "image_url": {"url": url}})
        else:
            # Non-image attachment — include as text reference
            fname = getattr(att, "filename", url)
            blocks.append({"type": "text", "text": f"[附件: {fname} — {url}]"})

    return blocks or [{"type": "text", "text": ""}]


class QQChannel(BaseChannel):
    def __init__(self, config, agent, store):
        self._config = config
        self._agent = agent
        self._store = store
        self._client = None
        self._running = False
        self._status = "starting"   # starting | connected | error
        self._error_msg = ""

    @property
    def status(self) -> str:
        return self._status

    @property
    def error_msg(self) -> str:
        return self._error_msg

    async def start(self) -> None:
        import botpy
        from botpy.http import Route
        from botpy.message import GroupMessage, DirectMessage, C2CMessage, Message

        intents = botpy.Intents(
            public_messages=True,        # 群聊@消息 + C2C消息
            public_guild_messages=True,  # 频道@消息
            direct_message=True,         # 频道私信
        )
        channel = self

        class _Bot(botpy.Client):
            async def on_ready(self):
                logger.info(f"QQ bot connected: {self.robot.name}")
                channel._status = "connected"
                channel._error_msg = ""

            async def _send_image_group(self, group_openid: str, file_data: str, msg_id: str, msg_seq: int):
                """通过 file_data (base64) 上传图片并发送到群聊"""
                try:
                    route = Route("POST", "/v2/groups/{group_openid}/files", group_openid=group_openid)
                    media = await self.api._http.request(route, json={
                        "file_type": 1,
                        "file_data": file_data,
                        "srv_send_msg": False,
                    })
                    file_info = media.get("file_info") if isinstance(media, dict) else getattr(media, "file_info", None)
                    if not file_info:
                        logger.warning("post_group_file returned no file_info")
                        return
                    await self.api.post_group_message(
                        group_openid=group_openid,
                        msg_type=7,
                        media={"file_info": file_info},
                        msg_id=msg_id,
                        msg_seq=msg_seq,
                    )
                except Exception as e:
                    logger.error(f"send_image_group error: {e}")

            async def _send_image_c2c(self, openid: str, file_data: str, msg_id: str, msg_seq: int):
                """通过 file_data (base64) 上传图片并发送到 C2C"""
                try:
                    route = Route("POST", "/v2/users/{openid}/files", openid=openid)
                    media = await self.api._http.request(route, json={
                        "file_type": 1,
                        "file_data": file_data,
                        "srv_send_msg": False,
                    })
                    file_info = media.get("file_info") if isinstance(media, dict) else getattr(media, "file_info", None)
                    if not file_info:
                        logger.warning("post_c2c_file returned no file_info")
                        return
                    await self.api.post_c2c_message(
                        openid=openid,
                        msg_type=7,
                        media={"file_info": file_info},
                        msg_id=msg_id,
                        msg_seq=msg_seq,
                    )
                except Exception as e:
                    logger.error(f"send_image_c2c error: {e}")

            # 群聊 @ 机器人
            async def on_group_at_message_create(self, message: GroupMessage):
                content = _parse_content(message.content, message.attachments)
                bot = self
                await channel._handle_message(
                    channel_type="qq_group",
                    external_user_id=message.author.member_openid,
                    display_name=message.author.member_openid,
                    content=content,
                    reply_fn=lambda t, seq, m=message: m.reply(content=t, msg_seq=seq),
                    image_reply_fn=lambda d, seq, m=message, b=bot: b._send_image_group(m.group_openid, d, m.id, seq),
                )

            # C2C 私聊（QQ好友/单聊）
            async def on_c2c_message_create(self, message: C2CMessage):
                content = _parse_content(message.content, message.attachments)
                bot = self
                await channel._handle_message(
                    channel_type="qq_c2c",
                    external_user_id=message.author.user_openid,
                    display_name=message.author.user_openid,
                    content=content,
                    reply_fn=lambda t, seq, m=message: m.reply(content=t, msg_seq=seq),
                    image_reply_fn=lambda d, seq, m=message, b=bot: b._send_image_c2c(m.author.user_openid, d, m.id, seq),
                )

            # 频道 @ 机器人（频道不支持富媒体文件上传，仅文字）
            async def on_at_message_create(self, message: Message):
                content = _parse_content(message.content, message.attachments)
                await channel._handle_message(
                    channel_type="qq_guild",
                    external_user_id=message.author.id,
                    display_name=getattr(message.author, "username", message.author.id),
                    content=content,
                    reply_fn=lambda t, _seq, m=message: m.reply(content=t),
                )

            # 频道私信（频道不支持富媒体文件上传，仅文字）
            async def on_direct_message_create(self, message: DirectMessage):
                content = _parse_content(message.content, message.attachments)
                await channel._handle_message(
                    channel_type="qq_dm",
                    external_user_id=message.author.id,
                    display_name=getattr(message.author, "username", message.author.id),
                    content=content,
                    reply_fn=lambda t, _seq, m=message: m.reply(content=t),
                )

        self._client = _Bot(intents=intents)
        self._running = True
        self._status = "starting"
        try:
            await self._client.start(
                appid=self._config.app_id,
                secret=self._config.app_secret,
            )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"QQ bot error: {e}")
            self._status = "error"
            self._error_msg = str(e)
        finally:
            self._running = False

    async def stop(self) -> None:
        self._running = False
        if self._client:
            try:
                await self._client.close()
            except Exception:
                pass

    @property
    def is_running(self) -> bool:
        return self._running

    async def _handle_message(self, channel_type, external_user_id, display_name, content,
                              reply_fn, image_reply_fn=None):
        seq = 1  # msg_seq counter; must increment for each send with the same msg_id

        # Check /new command
        text_only = " ".join(b["text"] for b in content if b.get("type") == "text").strip()
        if text_only == "/new":
            await self._store.reset_channel_work(channel_type, external_user_id, display_name)
            await reply_fn("已开启新对话 ✓", seq)
            return

        work, _ = await self._store.get_or_create_channel_work(
            channel_type, external_user_id, display_name
        )

        settings = get_settings()
        if not settings.api_key:
            await reply_fn("WeWork 尚未配置 API Key，请在设置中配置后重试。", seq)
            return

        # Persist user message (same format as desktop chat)
        await self._store.append_message(work.id, "user", content, external=True)

        wm = await self._store.get_work_with_messages(work.id)
        messages = self._build_messages(wm, settings)

        full_text = ""
        images: list[str] = []  # base64 strings from tool_call_image events
        try:
            async for event in self._agent.stream_chat(messages, settings):
                if event["type"] == "text_delta":
                    full_text += event["content"]
                elif event["type"] == "tool_call_image":
                    images.append(event["data"])
                elif event["type"] == "done":
                    break
        except Exception as e:
            logger.error(f"QQ stream_chat error: {e}")
            await reply_fn(f"处理出错：{e}", seq)
            return

        if full_text:
            await self._store.append_message(work.id, "assistant", [{"type": "text", "text": full_text}], external=True)
            for chunk in _split_message(full_text):
                await reply_fn(chunk, seq)
                seq += 1

        # Send screenshots if supported (group/c2c only)
        if images and image_reply_fn:
            for img_b64 in images:
                try:
                    await image_reply_fn(img_b64, seq)
                    seq += 1
                    await self._store.append_message(
                        work.id, "assistant",
                        [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}],
                        external=True,
                    )
                except Exception as e:
                    logger.error(f"QQ image send error: {e}")

        if not full_text and not images:
            await reply_fn("（无回复）", seq)

    def _build_messages(self, wm, settings) -> list[dict]:
        all_tools = self._agent.bridge.get_all_tools() if self._agent.bridge else []
        tool_names = ", ".join(t.get("name", "") for t in all_tools) if all_tools else "暂无"
        system = (
            "你是 WeWork（微牛马），一个能通过 Chrome 扩展直接操作网页的 AI 助手。\n"
            f"当前已加载的工具：{tool_names}。\n"
            "用户通过 QQ 与你对话，请简洁回复。"
        )
        msgs = [{"role": "system", "content": system}]

        is_claude = settings.model.startswith("claude-")

        for m in wm.messages:
            if m.role == "assistant":
                text = next((b["text"] for b in m.content if b.get("type") == "text"), "")
                msgs.append({"role": "assistant", "content": text})
            else:
                # Build content blocks, converting image_url to model-appropriate format
                blocks = []
                for b in m.content:
                    if b.get("type") == "text":
                        if is_claude:
                            blocks.append({"type": "text", "text": b["text"]})
                        else:
                            blocks.append({"type": "text", "text": b["text"]})
                    elif b.get("type") == "image_url":
                        url = b["image_url"]["url"]
                        if is_claude:
                            blocks.append({
                                "type": "image",
                                "source": {"type": "url", "url": url},
                            })
                        else:
                            blocks.append({"type": "image_url", "image_url": {"url": url}})
                if len(blocks) == 1 and blocks[0].get("type") == "text":
                    msgs.append({"role": m.role, "content": blocks[0]["text"]})
                else:
                    msgs.append({"role": m.role, "content": blocks})

        return msgs
