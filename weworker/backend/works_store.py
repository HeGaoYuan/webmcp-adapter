import aiosqlite
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path.home() / ".wework" / "works.db"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Work:
    id: str
    title: str
    created_at: str
    updated_at: str


@dataclass
class Message:
    id: str
    work_id: str
    role: str
    content: list  # OpenAI content blocks
    created_at: str


@dataclass
class WorkWithMessages:
    work: Work
    messages: list[Message] = field(default_factory=list)


class WorksStore:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.last_external_write: str = ""  # updated when QQ/channel writes a message

    async def init(self):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS works (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS channel_sessions (
                    channel_type TEXT NOT NULL,
                    external_user_id TEXT NOT NULL,
                    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
                    PRIMARY KEY (channel_type, external_user_id)
                )
            """)
            await db.commit()

    async def create_work(self, title: str = "New Work") -> Work:
        work = Work(
            id=str(uuid.uuid4()),
            title=title,
            created_at=_now(),
            updated_at=_now(),
        )
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO works VALUES (?, ?, ?, ?)",
                (work.id, work.title, work.created_at, work.updated_at),
            )
            await db.commit()
        return work

    async def list_works(self) -> list[Work]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, title, created_at, updated_at FROM works ORDER BY updated_at DESC"
            ) as cur:
                rows = await cur.fetchall()
        return [Work(*row) for row in rows]

    async def get_work(self, work_id: str) -> Work | None:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, title, created_at, updated_at FROM works WHERE id = ?", (work_id,)
            ) as cur:
                row = await cur.fetchone()
        return Work(*row) if row else None

    async def get_work_with_messages(self, work_id: str) -> WorkWithMessages | None:
        work = await self.get_work(work_id)
        if not work:
            return None
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, work_id, role, content, created_at FROM messages WHERE work_id = ? ORDER BY created_at",
                (work_id,),
            ) as cur:
                rows = await cur.fetchall()
        messages = [
            Message(id=r[0], work_id=r[1], role=r[2], content=json.loads(r[3]), created_at=r[4])
            for r in rows
        ]
        return WorkWithMessages(work=work, messages=messages)

    async def append_message(self, work_id: str, role: str, content: list, external: bool = False) -> Message:
        msg = Message(
            id=str(uuid.uuid4()),
            work_id=work_id,
            role=role,
            content=content,
            created_at=_now(),
        )
        now = _now()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO messages VALUES (?, ?, ?, ?, ?)",
                (msg.id, msg.work_id, msg.role, json.dumps(msg.content), msg.created_at),
            )
            await db.execute(
                "UPDATE works SET updated_at = ? WHERE id = ?", (now, work_id)
            )
            await db.commit()
        if external:
            self.last_external_write = now
        return msg

    async def update_title(self, work_id: str, title: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE works SET title = ?, updated_at = ? WHERE id = ?",
                (title, _now(), work_id),
            )
            await db.commit()

    async def delete_work(self, work_id: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM works WHERE id = ?", (work_id,))
            await db.commit()

    async def get_or_create_channel_work(
        self, channel_type: str, external_user_id: str, display_name: str = ""
    ) -> tuple["Work", bool]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT work_id FROM channel_sessions WHERE channel_type = ? AND external_user_id = ?",
                (channel_type, external_user_id),
            ) as cur:
                row = await cur.fetchone()
            if row:
                work = await self.get_work(row[0])
                if work:
                    return work, False
            # Create new work and session
            title = display_name or external_user_id
            work = await self.create_work(title=f"[{channel_type}] {title}")
            await db.execute(
                "INSERT OR REPLACE INTO channel_sessions VALUES (?, ?, ?)",
                (channel_type, external_user_id, work.id),
            )
            await db.commit()
        return work, True

    async def reset_channel_work(
        self, channel_type: str, external_user_id: str, display_name: str = ""
    ) -> "Work":
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM channel_sessions WHERE channel_type = ? AND external_user_id = ?",
                (channel_type, external_user_id),
            )
            await db.commit()
        work, _ = await self.get_or_create_channel_work(channel_type, external_user_id, display_name)
        return work


# Global singleton
store = WorksStore()
