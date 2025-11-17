from fastapi import FastAPI
from api.router import router as api_router
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware # <-- 1. Impor CORS

app = FastAPI(
    title="Chatbot Learning Buddy API",
    description="testing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)
# -----------------------------------

# Daftarkan semua endpoint dari api/router.py
# Beri prefix /api/v1 untuk semua endpoint tersebut
app.include_router(api_router, prefix="/api/v1")


app.mount(
    "/widget",  # Ini akan menjadi path URL-nya
    StaticFiles(directory="template"),  # Lokasi file statis di server
    name="widget-static"
)
@app.get("/")
async def read_root():
    return {
        "message": "Selamat datang di API Chatbot Learning Buddy.",
        "documentation": "Silakan cek /docs untuk dokumentasi API interaktif."
    }
# uvicorn main:app --reload