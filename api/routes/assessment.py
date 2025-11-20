from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.supabase import call_supabase_api
from services.gemini import call_gemini_api
from schemas.chat import AssessmentQuestion, AssessmentSubmitRequest, AssessmentResponse

router = APIRouter(prefix="/assessment", tags=["Asesmen Minat"])


# --- Endpoint 1: Ambil SEMUA Soal ---
@router.get("/questions", response_model=List[AssessmentQuestion])
async def get_assessment_questions():
    """
    Mengambil SEMUA data dari tabel 'interest_questions'.
    Tidak ada batasan limit, semua baris akan diambil dan dikelompokkan.
    """
    
    # 1. Panggil Supabase
    # Perhatikan: Kita TIDAK menggunakan parameter 'limit' di sini.
    raw_data = await call_supabase_api(
        "Interest Questions", 
        db_type="mock",
        params={
            "select": "question_desc,option_text,category"
            # "limit": 5  <-- JANGAN PAKAI INI agar semua soal keluar
        }
    )
    
    if not raw_data:
        raise HTTPException(status_code=404, detail="Data asesmen tidak ditemukan. Pastikan tabel 'interest_questions' ada di Supabase.")

    # 2. Logic Pengelompokan (Grouping)
    # Mengubah data CSV yang flat menjadi hierarki Soal -> Opsi
    grouped_questions = {}
    q_id_counter = 1

    for item in raw_data:
        q_text = item['question_desc']
        
        # Jika pertanyaan baru, buat entry baru
        if q_text not in grouped_questions:
            grouped_questions[q_text] = {
                "id": q_id_counter,
                "question": q_text,
                "options": []
            }
            q_id_counter += 1
        
        # Tambahkan opsi ke pertanyaan tersebut
        grouped_questions[q_text]["options"].append({
            "text": item['option_text'],
            "value": item['category']
        })

    return list(grouped_questions.values())

# --- Endpoint 2: Hitung Hasil ---
@router.post("/submit", response_model=AssessmentResponse)
async def submit_assessment(request: AssessmentSubmitRequest):
    """
    Menentukan minat berdasarkan kategori yang paling banyak dipilih (Modus).
    """
    if not request.answers:
        raise HTTPException(status_code=400, detail="Tidak ada jawaban yang dikirim.")

    # 1. Hitung Frekuensi Pilihan
    vote_count = {}
    for category in request.answers:
        if category: # Hindari nilai null
            vote_count[category] = vote_count.get(category, 0) + 1
    
    if not vote_count:
        raise HTTPException(status_code=400, detail="Jawaban tidak valid.")

    # 2. Cari Pemenang (Kategori Terbanyak)
    winner_category = max(vote_count, key=vote_count.get)
    
    # 3. Minta Gemini membuatkan saran
    prompt = f"""
    Seorang siswa telah mengikuti tes minat bakat IT.
    Hasilnya, minat terkuat dia adalah di bidang: '{winner_category}'.
    
    Tolong berikan respons (Bahasa Indonesia) yang:
    1. Mengucapkan selamat karena telah menemukan minatnya.
    2. Menjelaskan singkat apa itu role '{winner_category}'.
    3. Memberikan semangat untuk mulai belajar di jalur tersebut.
    
    Gaya bahasa: Santai, ramah, dan memotivasi (seperti mentor).
    """
    
    ai_response = await call_gemini_api(prompt)
    
    return AssessmentResponse(
        recommended_path=winner_category,
        description=ai_response
    )