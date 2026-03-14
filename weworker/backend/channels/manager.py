import asyncio
import logging

from channels.base import BaseChannel

logger = logging.getLogger(__name__)


class ChannelManager:
    def __init__(self):
        self._channels: list[BaseChannel] = []
        self._tasks: list[asyncio.Task] = []

    def configure(self, settings, agent, store) -> None:
        """Rebuild channel list from current settings."""
        self._channels = []
        if settings.channels.qq.enabled and settings.channels.qq.app_id:
            from channels.qq_channel import QQChannel
            self._channels.append(QQChannel(settings.channels.qq, agent, store))
            logger.info("QQ channel configured")

    async def start(self) -> None:
        for ch in self._channels:
            task = asyncio.create_task(ch.start())
            self._tasks.append(task)

    async def stop(self) -> None:
        for ch in self._channels:
            try:
                await ch.stop()
            except Exception as e:
                logger.warning(f"Error stopping channel: {e}")
        for t in self._tasks:
            t.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        self._channels.clear()

    def get_statuses(self) -> dict:
        """Return status dict for each configured channel."""
        result = {}
        for ch in self._channels:
            name = type(ch).__name__.replace("Channel", "").lower()
            result[name] = {
                "status": getattr(ch, "status", "unknown"),
                "error": getattr(ch, "error_msg", ""),
            }
        return result


channel_manager = ChannelManager()
