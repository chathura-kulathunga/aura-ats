from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str = "sqlite+aiosqlite:///./aura_ats.db"
    GEMINI_API_KEY: str = "" # We will load this from the .env file
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()