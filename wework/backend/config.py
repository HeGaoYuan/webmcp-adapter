import json
import os
from pathlib import Path
from pydantic import BaseModel

WEWORK_DIR = Path.home() / ".wework"
SETTINGS_FILE = WEWORK_DIR / "settings.json"

WEWORK_DIR.mkdir(exist_ok=True)


class Settings(BaseModel):
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"

    @classmethod
    def load(cls) -> "Settings":
        if SETTINGS_FILE.exists():
            try:
                data = json.loads(SETTINGS_FILE.read_text())
                return cls(**data)
            except Exception:
                pass
        return cls()

    def save(self):
        SETTINGS_FILE.write_text(self.model_dump_json(indent=2))


# Global settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings.load()
    return _settings


def update_settings(data: dict) -> Settings:
    global _settings
    current = get_settings()
    updated = current.model_copy(update=data)
    updated.save()
    _settings = updated
    return updated
