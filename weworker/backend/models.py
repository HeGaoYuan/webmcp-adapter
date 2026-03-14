from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class SettingsUpdate(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


class WorkTitleUpdate(BaseModel):
    title: str


class QQChannelConfigUpdate(BaseModel):
    enabled: bool | None = None
    app_id: str | None = None
    app_secret: str | None = None


class ChannelsSettingsUpdate(BaseModel):
    qq: QQChannelConfigUpdate | None = None
