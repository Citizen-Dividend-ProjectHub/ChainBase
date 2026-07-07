from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    pghost: str = "127.0.0.1"
    pgport: int = 5432
    pgdatabase: str = "chainbase"
    pguser: str = ""
    pgpassword: str = ""

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 1 week


settings = Settings()
