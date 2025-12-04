from fastapi import APIRouter
from schemas.chat import AskRequest, AskResponse
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api

router = APIRouter()

@router.post("/ask", response_model=AskResponse)
async def handle_ask(request: AskRequest):
 
    konteks_str = ""
    sumber_konteks = ""

    # --- SKENARIO A: ON-PAGE CONTEXT (Prioritas) ---
    if request.full_page_content:
        sumber_konteks = "Halaman Web yang Sedang Dibuka User"
        konteks_str = f"""
        KONTEKS HALAMAN (MODUL BELAJAR):
        ================================
        {request.full_page_content[:20000]} # Batasi 20rb karakter agar aman
        ================================
        """
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
    history_str = ""
    if request.history:
        history_str = "\n\nRIWAYAT PERCAKAPAN SEBELUMNYA (Gunakan untuk konteks 'ini', 'itu', 'dia', dll):\n"
        for msg in request.history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "")
            if content:
                history_str += f"{role}: {content}\n"
        history_str += "[AKHIR RIWAYAT]\n"

    # --- AUGMENTATION  ---
    prompt_nada = ""
    if request.preset == "teman":
        prompt_nada = (
            "Jawab dengan gaya santai dan akrab, seperti teman yang membantu belajar dengan menggunakan analogi agar lebih mudah dipahami. "
            "Gunakan bahasa yang ringan, hangat, dan relatable."
            "gunakan analogi dan contoh sehari-hari."
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
            "bantu permaslahan dan projek user seolah-olah kalian bekerja bersama dalam satu tim."
        )
    else: 
        prompt_nada = (
            "Jawab secara ringkas, jelas, dan langsung ke inti permasalahan (to the point)."
        )

    prompt_final = f"""
    Anda adalah Asisten Pengajar yang cerdas.
    
    {konteks_str}

    {history_str}
    
    Tugas Anda:
    Jawab pertanyaan user di bawah ini.
    Jika ada "KONTEKS HALAMAN", utamakan jawaban berdasarkan teks tersebut.
    Jika ada "RIWAYAT PERCAKAPAN", gunakan itu untuk memahami referensi kata ganti (seperti "itu", "nya", "sebelumnya") atau perbandingan dengan topik sebelumnya.
    
    Pertanyaan User: "{request.question}"
    
    Instruksi Gaya Bicara: {prompt_nada}
    """
    
    # --- GENERATION ---
    jawaban_ai = await call_gemini_api(prompt_final)
    
    return AskResponse(bot_response=jawaban_ai)