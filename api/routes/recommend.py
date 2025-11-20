import asyncio
from fastapi import APIRouter, HTTPException, Query
from schemas.chat import (
    InterestResponse, QuizQuestion, 
    SubmitRequest, SubmitResponse
)
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api
from typing import List, Literal

# Buat router khusus untuk endpoint 'recommend'
router = APIRouter(prefix="/recommend", tags=["Rekomendasi"])

# --- INI ADALAH SOLUSINYA ---
# Kamus untuk "menerjemahkan" nama dari API Dicoding
# ke nama kategori di API Mock Anda (sesuai screenshot)
CATEGORY_MAP = {
    "AI Engineer": "Machine Learning",
    "Android Developer": "Android",
    "Back-End Developer JavaScript": "Web",
    "Back-End Developer Python": "Back-End",
    "Data Scientist": "Data", 
    "DevOps Engineer": "Cloud Computing", 
    "Front-End Web Developer": "Web",
    "Gen AI Engineer": "Machine Learning",
    "Google Cloud Professional": "Cloud Computing",
    "iOS Developer": "iOS", 
    "MLOps Engineer": "Machine Learning",
    "Multi-Platform App Developer": "Mobile",
    "React Developer": "Web" 
}

@router.get("/interests", response_model=List[InterestResponse])
async def get_interests():
    # ... (Fungsi ini sudah benar, tidak perlu diubah)
    data = await call_supabase_api(
        "learning_paths",
        db_type="dicoding",
        params={"select": "learning_path_id,learning_path_name"}
    )
    if not data:
        raise HTTPException(status_code=404, detail="Daftar alur belajar tidak ditemukan.")
    interests = [
        InterestResponse(id=item['learning_path_id'], name=item['learning_path_name']) 
        for item in data
    ]
    return interests

# --- Endpoint 2: Mengambil Soal Kuis (DENGAN PERBAIKAN) ---

@router.get("/quiz", response_model=List[QuizQuestion])
async def get_quiz(
    kategori_minat: str = Query(..., example="Android Developer"), # Terima nama lengkap
):
    """
    FITUR 1 (Step 2): Mengambil 15 soal kuis campuran (5 per level).
    """
    
    # 1. Terjemahkan nama minat (Logika ini tetap sama)
    tech_category_mock = CATEGORY_MAP.get(kategori_minat, kategori_minat)
    print(f"[DEBUG] Menerjemahkan minat: '{kategori_minat}' -> '{tech_category_mock}'")
    
    select_query = "id,question_desc,option_1,option_2,option_3,option_4"
    
    # 2. Ambil 5 soal per level secara paralel
    try:
        data_beginner, data_intermediate, data_advanced = await asyncio.gather(
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.beginner",
                    "select": select_query,
                    "limit": 5
                }
            ),
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.intermediate",
                    "select": select_query,
                    "limit": 5
                }
            ),
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.advanced",
                    "select": select_query,
                    "limit": 5
                }
            )
        )
    except Exception as e:
        print(f"Error fetching quiz data: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil data kuis dari Supabase.")

    # 3. Gabungkan semua hasil
    data_combined = (data_beginner or []) + (data_intermediate or []) + (data_advanced or [])
    
    if not data_combined:
        raise HTTPException(status_code=404, detail=f"Kuis untuk {kategori_minat} (kategori: {tech_category_mock}) tidak ditemukan.")
    
    # 4. Buat daftar pertanyaan
    questions = [
        QuizQuestion(
            question_id=item['id'],
            question_desc=item['question_desc'],
            option_1=item['option_1'],
            option_2=item['option_2'],
            option_3=item['option_3'],
            option_4=item['option_4']
        ) for item in data_combined
    ]
    
    return questions

# --- Endpoint 3: Submit Jawaban & Dapatkan Rekomendasi (DENGAN PERBAIKAN) ---

@router.post("/submit", response_model=SubmitResponse)
async def handle_submission(request: SubmitRequest):
    """
    FITUR 1 (Step 3): Menerima jawaban kuis (tanpa level), menghitung skor,
    dan mengembalikan rekomendasi dinamis dari AI.
    """
    
    # 1. Dapatkan jawaban yang benar (Logika ini tetap sama)
    question_ids = [answer.question_id for answer in request.answers]
    if not question_ids:
        raise HTTPException(status_code=400, detail="Tidak ada jawaban yang diterima.")

    correct_answers_data = await call_supabase_api(
        "Tech Questions", db_type="mock",
        params={
            "id": f"in.({','.join(map(str, question_ids))})",
            "select": "id,correct_answer"
        }
    )
    
    if not correct_answers_data:
        raise HTTPException(status_code=404, detail="Soal kuis tidak ditemukan di database.")
        
    correct_answer_map = {item['id']: item['correct_answer'] for item in correct_answers_data}
    
    # 2. Hitung Skor (Logika ini tetap sama)
    skor = 0
    total_soal = len(request.answers)
    for answer in request.answers:
        if answer.question_id in correct_answer_map:
            jawaban_benar = correct_answer_map[answer.question_id]
            if answer.selected_answer == jawaban_benar:
                skor += 1
                
    # 3. Tentukan Level Rekomendasi (LOGIKA BARU BERDASARKAN PERSENTASE)
    level_rekomendasi_str = "Dasar"
    level_rekomendasi_id = 1 
    
    if total_soal > 0:
        persentase = skor / total_soal
        if persentase >= 0.6: # Jika skor 60% atau lebih, rekomendasikan level menengah
            level_rekomendasi_str = "Menengah"
            level_rekomendasi_id = 3
        # Anda bisa menambahkan logika "Ahli" di sini jika mau
        # elif persentase >= 0.85:
        #    level_rekomendasi_str = "Ahli"
        #    level_rekomendasi_id = 4 # (Asumsi id 4 adalah Ahli)
    
    # 4. Cari Kursus yang Cocok (Logika ini tetap sama)
    lp_data = await call_supabase_api(
        "learning_paths", db_type="dicoding",
        params={"learning_path_name": f"eq.{request.kategori_minat}", "select": "learning_path_id", "limit": 1}
    )
    
    if not lp_data:
        raise HTTPException(status_code=404, detail=f"Alur belajar '{request.kategori_minat}' tidak ditemukan.")
        
    lp_id = lp_data[0]['learning_path_id']

    kursus_cocok = await call_supabase_api(
        "courses", db_type="dicoding",
        params={
            "learning_path_id": f"eq.{lp_id}",
            "course_level_str": f"eq.{level_rekomendasi_id}",
            "select": "course_id,course_name",
            "limit": 1
        }
    )
    
    nama_kursus_rekomendasi = "Kursus tidak ditemukan"
    id_kursus_rekomendasi = None
    if kursus_cocok:
        nama_kursus_rekomendasi = kursus_cocok[0].get('course_name')
        id_kursus_rekomendasi = kursus_cocok[0].get('course_id')

    # 5. Buat prompt untuk Gemini (Menghapus 'level' dari prompt)
    prompt = f"""
    Seorang pengguna baru saja menyelesaikan kuis minat '{request.kategori_minat}' dengan skor {skor} dari {total_soal}.
    Berdasarkan skor ini, kami merekomendasikan dia untuk mengambil kursus level '{level_rekomendasi_str}' bernama '{nama_kursus_rekomendasi}'.
    
    Tolong buatkan respons yang dinamis, ramah, dan memotivasi untuk pengguna ini (dalam Bahasa Indonesia), yang menjelaskan mengapa mereka mendapatkan rekomendasi ini 
    dan mengarahkan mereka untuk memulai kursus tersebut.
    
    
    jangan berikan balasan terkait chat ini, langsung ke point inti, 
    =======
    """
    
    # 6. Panggil Gemini (Logika ini tetap sama)
    jawaban_ai = await call_gemini_api(prompt)
    
    return SubmitResponse(
        bot_response=jawaban_ai,
        suggested_course_name=nama_kursus_rekomendasi,
        suggested_course_id=id_kursus_rekomendasi
    )