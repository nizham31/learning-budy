from fastapi import APIRouter
from api.routes import ask, progress, recommend, assessment
 # <-- Impor modul-modul baru kita

# Ini adalah router utama API yang akan diimpor oleh main.py
router = APIRouter()

# "Daftarkan" semua endpoint dari file-file terpisah ke router utama ini
router.include_router(ask.router, tags=["Q&A Teknis"])
router.include_router(progress.router, tags=["Progres Siswa"])
router.include_router(recommend.router, tags=["Rekomendasi"])
router.include_router(assessment.router, tags=["Asesmen Minat"])