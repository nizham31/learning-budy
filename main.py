from fastapi import FastAPI
from api.router import router as api_router
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware 

app = FastAPI(
    title="Chatbot Learning Buddy API",
    description="testing",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:5500",    # Default Live Server Port
    "http://127.0.0.1:5500",
    "http://localhost:5501",    # Port alternatif Live Server (milik Anda sekarang)
    "http://127.0.0.1:5501",
    "https://learning-budy-chatbot.vercel.app",
    "*"                         # Fallback untuk development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Gunakan list origin spesifik
    allow_credentials=True,
    allow_methods=["*"],         # Izinkan semua method (GET, POST, PUT, DELETE)
    allow_headers=["*"],         # Izinkan semua header (Authorization, Content-Type)
)

app.include_router(api_router, prefix="/api/v1")

app.mount(
    "/widget",  
    StaticFiles(directory="template"),  
    name="widget-static"
)

@app.get("/")
async def read_root():
    return {
        "message": "Selamat datang di API Chatbot Learning Buddy.",
        "documentation": "Silakan cek /docs untuk dokumentasi API interaktif."
    }
