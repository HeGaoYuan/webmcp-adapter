from abc import ABC, abstractmethod


class BaseChannel(ABC):
    @abstractmethod
    async def start(self) -> None:
        """Start the bot. Runs until stopped."""

    @abstractmethod
    async def stop(self) -> None:
        """Graceful shutdown."""

    @property
    @abstractmethod
    def is_running(self) -> bool: ...
