from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str
    PORT: int = 8000
    DATABASE_URL: str = "sqlite+aiosqlite:///./aura_ats.db" 

    # This tells Pydantic to read the .env file and ignore any random extra variables
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()