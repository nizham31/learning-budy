from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from core.config import settings

# --- PERUBAHAN DI SINI ---
# Kita ganti schemes dari "bcrypt" menjadi "pbkdf2_sha256"
# Ini menghilangkan batasan 72 karakter yang bikin error.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Mencocokkan password inputan user dengan hash di database."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Mengubah password menjadi hash acak."""
    # Dengan pbkdf2_sha256, kita TIDAK PERLU lagi memotong password manual.
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Membuat JWT Token (Kartu Akses)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Masukkan expired time ke dalam token
    to_encode.update({"exp": expire})
    
    # Tandatangani token dengan SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt