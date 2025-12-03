from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # Kunci untuk API Dicoding
    DICODING_SUPABASE_URL: str
    DICODING_SUPABASE_KEY: str
    
    # Kunci untuk API Mock
    MOCK_SUPABASE_URL: str
    MOCK_SUPABASE_KEY: str
    
    # Kunci Gemini
    GEMINI_API_KEY: str

    SECRET_KEY: str = "gNtN_HEaoYmT2LtLIiupMUq7m4aILPzj3L_jvLuVmWM" # Ganti ramdom string untuk keamanan JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'),
        env_file_encoding="utf-8"
    )

settings = Settings()