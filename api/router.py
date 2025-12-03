from fastapi import APIRouter
from api.routes import ask, progress, recommend, assessment, auth

router = APIRouter()
router.include_router(auth.router)
router.include_router(ask.router, tags=["Q&A Teknis"])
router.include_router(progress.router, tags=["Progres Siswa"])
router.include_router(recommend.router, tags=["Rekomendasi"])
router.include_router(assessment.router, tags=["Asesmen Minat"])