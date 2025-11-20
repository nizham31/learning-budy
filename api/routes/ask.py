from fastapi import APIRouter
from schemas.chat import AskRequest, AskResponse
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api

# Buat router khusus untuk endpoint 'ask'
router = APIRouter()

@router.post("/ask", response_model=AskResponse)
async def handle_ask(request: AskRequest):
    """
    FITUR 2: Menjawab pertanyaan teknis (Dengan RAG)
    """
    
    # --- RETRIEVAL ---
    search_query = request.question.replace(" ", "%") 
    
    konteks_tutorials = await call_supabase_api(
        "tutorials", 
        db_type= "dicoding",
        params={
            "tutorial_title": f"ilike.%{search_query}%",
            "select": "tutorial_title", 
            "limit": 3
        }
    )

    konteks_str = "Tidak ada konteks materi yang ditemukan."
    if konteks_tutorials:
        judul_tutorial = [t['tutorial_title'] for t in konteks_tutorials]
        konteks_str = "Konteks Materi:\n- " + "\n- ".join(judul_tutorial)
        
    print(f"[DEBUG RAG] Konteks ditemukan: {konteks_str}")

    # ---  AUGMENTATION  ---
    prompt_nada = ""
    if request.preset == "teman":
        prompt_nada = (
            "Jawab dengan gaya santai dan akrab, seperti teman yang membantu belajar dengan menggunakan analogi agar lebih mudah dipahami. "
            "Gunakan bahasa yang ringan, hangat, dan relatable, seolah sedang ngobrol santai sambil menjelaskan konsep yang sulit."
        )

    elif request.preset == "instruktor":
        prompt_nada = (
            "Jawab dengan nada seperti instruktur yang teknikal dan terstruktur. "
            "Gunakan bahasa yang jelas, profesional, dan langsung menjelaskan materi dengan akurat tanpa kehilangan detail penting."
        )

    elif request.preset == "rekan":
        prompt_nada = (
            "Jawab dengan nada seperti rekan satu tim yang sedang mengerjakan proyek bersama. "
            "Gunakan bahasa kolaboratif, suportif, dan berorientasi solusi, seolah sedang berdiskusi untuk menyelesaikan tugas bareng."
        )

    else: # Default is "to the point"
        prompt_nada = (
            "Jawab secara ringkas, jelas, dan langsung ke inti permasalahan (to the point). "
            "Fokus hanya pada informasi yang paling penting dan relevan."
        )

    prompt_final = f"""
    Anda adalah Asisten Pengajar yang ahli.
    Tugas Anda adalah menjawab pertanyaan siswa berdasarkan materi kursus yang tersedia.
    
    {konteks_str}
    
    Berdasarkan konteks di atas (JIKA relevan) dan pengetahuan umum Anda, 
    tolong jawab pertanyaan siswa berikut:
    
    Pertanyaan: "{request.question}"
    
    Instruksi Jawaban: {prompt_nada}
    """
    
    # --- ENERATION ---
    jawaban_ai = await call_gemini_api(prompt_final)
    
    return AskResponse(bot_response=jawaban_ai)