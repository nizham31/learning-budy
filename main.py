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
    "https://learning-budy-chatbot.vercel.app",                     
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,
    allow_methods=["*"],         
    allow_headers=["*"],         
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
