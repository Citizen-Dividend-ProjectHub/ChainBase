from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ---------- User / Auth ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Scenario (CRUD resource) ----------

class ScenarioCreate(BaseModel):
    title: str
    description: Optional[str] = None
    monthly_amount: float
    population_size: int
    funding_source: Optional[str] = None


class ScenarioUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    monthly_amount: Optional[float] = None
    population_size: Optional[int] = None
    funding_source: Optional[str] = None


class ScenarioOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    monthly_amount: float
    population_size: int
    funding_source: Optional[str]
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
