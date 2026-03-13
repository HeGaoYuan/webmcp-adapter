from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class SettingsUpdate(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


class WorkTitleUpdate(BaseModel):
    title: str
