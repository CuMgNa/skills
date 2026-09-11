"""API validation; protocol field validation belongs exclusively to protocol."""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_max_length=131072)


class Connect(Input):
    environment_id: str | None = Field(default=None, max_length=128)
    environment_name: str = Field(default="", max_length=200)
    device_id: str = Field(min_length=1, max_length=100)
    host: str = Field(min_length=1, max_length=253)
    port: int = Field(ge=1, le=65535, strict=True)
    practice: bool = False
    keep_seconds: float = Field(default=0, ge=0, le=604800, allow_inf_nan=False)
    reconnect: bool = False
    reconnect_interval: float = Field(default=3, ge=0.1, le=3600, allow_inf_nan=False)
    reconnect_attempts: int = Field(default=3, ge=0, le=100, strict=True)

    @model_validator(mode="after")
    def clean_host(self):
        if any(c.isspace() for c in self.host) or any(c in self.host for c in "/@?#\\"):
            raise ValueError("host must be a hostname or IP, not a URL")
        return self


class DraftInput(Input):
    draft: dict[str, Any]


class Raw(Input):
    value: str
    mode: Literal["text", "hex"] = "text"


class Send(Input):
    operation_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    draft: dict[str, Any] | None = None
    raw: Raw | None = None
    confirm_warnings: bool = False

    @model_validator(mode="after")
    def one_source(self):
        if (self.draft is None) == (self.raw is None):
            raise ValueError("exactly one of draft and raw is required")
        return self


class Reply(Input):
    action: Literal["normal", "reject", "ignore"] = "normal"
    delay: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    version: str = Field(default="S10U-SIM-1.0", max_length=100)
    raw: str = ""
    raw_mode: Literal["text", "hex"] = "text"


class Policy(Reply):
    mode: Literal["auto", "manual"] = "manual"


class PracticeSend(Input):
    command: str = Field(min_length=1, max_length=40)
    parameter: str = Field(default="", max_length=4096)
    device_id: str = Field(min_length=1, max_length=100)


class Environment(Input):
    id: str | None = Field(default=None, min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=200)
    host: str = Field(min_length=1, max_length=253)
    port: int = Field(ge=1, le=65535, strict=True)


class Device(Input):
    id: str | None = Field(default=None, min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=200)
    environment_id: str | None = Field(default=None, max_length=128)
    device_id: str = Field(min_length=1, max_length=100)
    iccid: str = Field(default="", max_length=100)


class Sample(Input):
    id: str | None = Field(default=None, min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=200)
    command: str = Field(min_length=1, max_length=40)
    draft: dict[str, Any]
