from fastapi import APIRouter
from schemas.chat import AskRequest, AskResponse
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api

# Buat router khusus untuk endpoint 'ask'
router = APIRouter()

@router.post("/ask", response_model=AskResponse)
async def handle_ask(request: AskRequest):
    """
    FITUR 2 (UPDATED): Menjawab pertanyaan teknis dengan Hybrid Context.
    Prioritas Konteks:
    1. Konteks Halaman Web (Full + Visible Text) yang dikirim frontend.
    2. Jika tidak ada, fallback ke RAG Database (Supabase).
    """
    
    konteks_str = ""
    sumber_konteks = ""

    # --- SKENARIO A: ON-PAGE CONTEXT (Prioritas) ---
    # Jika frontend mengirim konten halaman, gunakan itu.
    if request.full_page_content:
        sumber_konteks = "Halaman Web yang Sedang Dibuka User"
        
        # Susun string konteks yang rapi
        konteks_str = f"""
        KONTEKS HALAMAN (MODUL BELAJAR):
        ================================
        {request.full_page_content[:20000]} # Batasi 20rb karakter agar aman
        ================================
        """

        # Tambahkan fokus user (viewport) jika ada
        if request.visible_text:
            konteks_str += f"""
            
            BAGIAN YANG SEDANG DIBACA/DILIHAT USER SAAT INI (FOKUS):
            --------------------------------------------------------
            {request.visible_text[:5000]}
            --------------------------------------------------------
            """
        else:
             konteks_str += "\n(User sedang melihat halaman ini secara umum)"

    # --- SKENARIO B: DATABASE RAG (Fallback) ---
    # Jika tidak ada konteks halaman, cari di database tutorial
    else:
        sumber_konteks = "Database Tutorial (Pencarian Keyword)"
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

        if konteks_tutorials:
            judul_tutorial = [t['tutorial_title'] for t in konteks_tutorials]
            konteks_str = "Konteks Materi dari Database:\n- " + "\n- ".join(judul_tutorial)
        else:
            konteks_str = "Tidak ada konteks spesifik yang ditemukan."

    print(f"[DEBUG] Sumber Konteks: {sumber_konteks}")

    # ---  AUGMENTATION (Nada Bicara)  ---
    prompt_nada = ""
    if request.preset == "teman":
        prompt_nada = (
            "Jawab dengan gaya santai dan akrab, seperti teman yang membantu belajar dengan menggunakan analogi agar lebih mudah dipahami. "
            "Gunakan bahasa yang ringan, hangat, dan relatable."
        )
    elif request.preset == "instruktor":
        prompt_nada = (
            "Jawab dengan nada seperti instruktur yang teknikal dan terstruktur. "
            "Gunakan bahasa yang jelas, profesional, dan langsung menjelaskan materi."
        )
    elif request.preset == "rekan":
        prompt_nada = (
            "Jawab dengan nada seperti rekan satu tim. "
            "Gunakan bahasa kolaboratif dan suportif."
        )
    else: 
        prompt_nada = (
            "Jawab secara ringkas, jelas, dan langsung ke inti permasalahan (to the point)."
        )

    # --- FINAL PROMPT ---
    prompt_final = f"""
    Anda adalah Asisten Pengajar yang cerdas.
    
    {konteks_str}
    
    Tugas Anda:
    Jawab pertanyaan user di bawah ini.
    Jika ada "KONTEKS HALAMAN", utamakan jawaban berdasarkan teks tersebut.
    Jika ada "BAGIAN YANG SEDANG DIBACA", berikan perhatian khusus pada bagian itu karena user sedang bingung di sana.
    
    Pertanyaan User: "{request.question}"
    
    Instruksi Gaya Bicara: {prompt_nada}
    """
    
    # --- GENERATION ---
    jawaban_ai = await call_gemini_api(prompt_final)
    
    return AskResponse(bot_response=jawaban_ai)