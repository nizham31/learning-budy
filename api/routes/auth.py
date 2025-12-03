from fastapi import APIRouter, HTTPException, status
from schemas.auth import UserLogin, UserRegister, Token, UserResponse
from services.supabase import call_supabase_api
from core.security import verify_password, get_password_hash, create_access_token
from core.config import settings
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Autentikasi"])

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserRegister):
    """
    Mendaftarkan user baru ke tabel 'public.users' (Custom Table).
    """
    # 1. Cek apakah email sudah ada (Supabase Filter)
    existing_user = await call_supabase_api(
        "users",
        db_type="mock", # Asumsi tabel users ada di Mock DB agar satu tempat dengan data siswa
        params={"email": f"eq.{user_in.email}", "select": "id"}
    )
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")

    # 2. Hash Password
    hashed_pw = get_password_hash(user_in.password)

    # 3. Simpan ke Database
    new_user_data = {
        "email": user_in.email,
        "password_hash": hashed_pw,
        "full_name": user_in.full_name
        # Kita pakai 1 email saja, jadi tidak simpan student_email
    }

    result = await call_supabase_api(
        "users",
        method="POST",
        db_type="mock",
        json_body=new_user_data
    )

    if not result:
        raise HTTPException(status_code=500, detail="Gagal menyimpan user ke database.")

    # Return data user (tanpa password)
    created_user = result[0]
    return UserResponse(
        id=created_user['id'], 
        email=created_user['email'], 
        full_name=created_user['full_name']
    )

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """
    Cek email & password, jika cocok kembalikan Token JWT.
    """
    # 1. Cari user by Email
    users = await call_supabase_api(
        "users",
        db_type="mock",
        params={"email": f"eq.{login_data.email}", "select": "*"}
    )

    if not users:
        # Gunakan pesan umum agar hacker tidak tahu email valid/tidak
        raise HTTPException(status_code=400, detail="Email atau password salah")
    
    user = users[0]

    # 2. Verifikasi Password Hash
    if not verify_password(login_data.password, user['password_hash']):
         raise HTTPException(status_code=400, detail="Email atau password salah")

    # 3. Buat Token Akses
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, # Kita simpan email di dalam token
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}