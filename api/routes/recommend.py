import asyncio
from fastapi import APIRouter, HTTPException, Query
from schemas.chat import (
    InterestResponse, QuizQuestion, 
    SubmitRequest, SubmitResponse
)
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api
from typing import List, Literal
import random

# Buat router khusus untuk endpoint 'recommend'
router = APIRouter(prefix="/recommend", tags=["Rekomendasi"])

# --- INI ADALAH SOLUSINYA ---
# Kamus untuk "menerjemahkan" nama dari API Dicoding
# ke nama kategori di API Mock Anda (sesuai screenshot)
CATEGORY_MAP = {
    "AI Engineer": "Machine Learning",
    "Android Developer": "Android",
    "Back-End Developer JavaScript": "Web",
    "Back-End Developer Python": "machine learning",
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
    # 1. Daftar nama persis yang ingin diambil dari Database Dicoding
    target_list = [
        "AI Engineer",
        "Android Developer",
        "Back-End Developer JavaScript",
        "Data Scientist",
        "DevOps Engineer",
        "Front-End Web Developer",
        "Gen AI Engineer",
        "Google Cloud Professional",
        "iOS Developer",
        "MLOps Engineer",
        "Multi-Platform App Developer",
        "React Developer"
    ]

    # 2. Format menjadi string filter Supabase: in.("Nama 1","Nama 2",...)
    # Penting: f'"{name}"' membungkus nama dengan kutip dua agar spasi terbaca benar
    filter_query = "in.(" + ",".join([f'"{name}"' for name in target_list]) + ")"


    # 3. Panggil API dengan filter tambahan
    data = await call_supabase_api(
        "learning_paths",
        db_type="dicoding",
        params={
            "select": "learning_path_id,learning_path_name",
            "learning_path_name": filter_query  # <-- Filter ditambahkan di sini
        }
    )

    if not data:
        # Fallback jika DB kosong atau filter tidak cocok
        raise HTTPException(status_code=404, detail="Daftar alur belajar tidak ditemukan.")
    
    interests = [
        InterestResponse(id=item['learning_path_id'], name=item['learning_path_name']) 
        for item in data
    ]
    return interests

# --- Endpoint 2: Mengambil Soal Kuis (DENGAN PERBAIKAN) ---

@router.get("/quiz", response_model=List[QuizQuestion])
async def get_quiz(
    kategori_minat: str = Query(..., example="Android Developer"), 
):
    """
    FITUR 1 (Step 2): Mengambil 5 soal kuis ACAK per level (Beginner, Intermediate, Advanced).
    """
    
    # 1. Terjemahkan nama minat
    # Jika key tidak ada, fallback ke string aslinya
    tech_category_mock = CATEGORY_MAP.get(kategori_minat, kategori_minat)
    print(f"[DEBUG] Menerjemahkan minat: '{kategori_minat}' -> '{tech_category_mock}'")
    
    select_query = "id,question_desc,option_1,option_2,option_3,option_4"
    
    # 2. Ambil kolam soal (pool) dari database
    # Kita set limit=20 agar punya cukup opsi untuk diacak
    try:
        data_beginner, data_intermediate, data_advanced = await asyncio.gather(
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.beginner",
                    "select": select_query,
                    "limit": 20 
                }
            ),
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.intermediate",
                    "select": select_query,
                    "limit": 20
                }
            ),
            call_supabase_api(
                "Tech Questions", db_type="mock",
                params={
                    "tech_category": f"eq.{tech_category_mock}",
                    "difficulty": "eq.advanced",
                    "select": select_query,
                    "limit": 20
                }
            )
        )
    except Exception as e:
        print(f"Error fetching quiz data: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil data kuis dari Supabase.")

    # 3. Fungsi Helper untuk Mengacak
    def pick_random_questions(data_pool, count=5):
        if not data_pool: 
            return []
        # Jika jumlah soal di DB kurang dari target (5), ambil semua yang ada
        if len(data_pool) <= count: 
            return data_pool
        # Jika lebih, acak dan ambil 5
        return random.sample(data_pool, count)

    # 4. Acak soal untuk setiap level
    final_beginner = pick_random_questions(data_beginner, 5)
    final_intermediate = pick_random_questions(data_intermediate, 5)
    final_advanced = pick_random_questions(data_advanced, 5)

    # 5. Gabungkan hasil
    data_combined = final_beginner + final_intermediate + final_advanced
    
    if not data_combined:
        raise HTTPException(status_code=404, detail=f"Kuis untuk {kategori_minat} (kategori: {tech_category_mock}) tidak ditemukan.")
    
    # 6. Mapping ke Schema
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

# ... import lainnya aman ...

@router.post("/submit", response_model=SubmitResponse)
async def handle_submission(request: SubmitRequest):
    """
    FITUR 1 (Step 3): Menerima jawaban kuis, menghitung skor,
    dan mengirim detail kesalahan ke AI untuk analisis personal.
    """
    
    # 1. Validasi Input
    question_ids = [answer.question_id for answer in request.answers]
    if not question_ids:
        raise HTTPException(status_code=400, detail="Tidak ada jawaban yang diterima.")

    # 2. Ambil Kunci Jawaban & TEKS SOAL dari Database
    # [Perubahan 1] Kita tambahkan 'question_desc' di select agar AI tahu konteks soalnya
    correct_answers_data = await call_supabase_api(
        "Tech Questions", db_type="mock",
        params={
            "id": f"in.({','.join(map(str, question_ids))})",
            "select": "id,question_desc,correct_answer" 
        }
    )
    
    if not correct_answers_data:
        raise HTTPException(status_code=404, detail="Soal kuis tidak ditemukan di database.")
        
    # Buat dictionary biar gampang mencocokkan: {id: {jawaban_benar: '...', soal: '...'}}
    qa_map = {
        item['id']: {
            'correct': item['correct_answer'], 
            'question': item['question_desc']
        } 
        for item in correct_answers_data
    }
    
    # 3. Hitung Skor & Kumpulkan Data Kesalahan
    skor = 0
    total_soal = len(request.answers)
    list_analisis = [] # [Perubahan 2] List untuk menampung detail jawaban

    for answer in request.answers:
        if answer.question_id in qa_map:
            data_soal = qa_map[answer.question_id]
            jawaban_user = answer.selected_answer
            jawaban_benar = data_soal['correct']
            
            if jawaban_user == jawaban_benar:
                skor += 1
                # Opsional: Bisa juga catat yang benar jika mau dipuji AI
            else:
                # Ini yang salah, kita catat formatnya untuk prompt
                detail = (
                    f"- Soal: {data_soal['question']}\n"
                    f"  Jawaban Kamu: {jawaban_user} (Salah)\n"
                    f"  Seharusnya: {jawaban_benar}"
                )
                list_analisis.append(detail)

    # Siapkan string kesalahan untuk Prompt (Jika kosong berarti sempurna)
    analisis_str = "\n".join(list_analisis) if list_analisis else "User menjawab semua soal dengan BENAR."

    # 4. Tentukan Level (Logika Sederhana Tetap Dipakai untuk memilih Course ID)
    level_rekomendasi_str = "Dasar"
    level_rekomendasi_id = 1 
    if total_soal > 0:
        persentase = skor / total_soal
        if persentase >= 0.6: 
            level_rekomendasi_str = "Menengah"
            level_rekomendasi_id = 3

    # 5. Cari Kursus (Tetap sama)
    lp_data = await call_supabase_api(
        "learning_paths", db_type="dicoding",
        params={"learning_path_name": f"eq.{request.kategori_minat}", "select": "learning_path_id", "limit": 1}
    )
    if not lp_data:
         # Fallback jika nama learning path beda dikit
         lp_id = 1 # Default atau error handling
    else:
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
    
    nama_kursus = kursus_cocok[0].get('course_name') if kursus_cocok else "Kursus Umum"
    id_kursus = kursus_cocok[0].get('course_id') if kursus_cocok else None

    # 6. Prompt Gemini [Perubahan 3 - Lebih Cerdas]
    # Kita masukkan data 'analisis_str' agar Gemini bisa bahas kesalahan user
    prompt = f"""
    Kamu adalah Learning Buddy, mentor coding yang suportif.
    
    Konteks:
    User baru saja mengerjakan kuis '{request.kategori_minat}'.
    - Skor: {skor} dari {total_soal}
    - Level Rekomendasi: {level_rekomendasi_str}
    - Kursus yang disarankan: {nama_kursus}
    
    Berikut adalah detail jawaban user (fokus pada kesalahannya):
    =========================================
    {analisis_str}
    =========================================
    
    Tugas:
    1. Berikan semangat berdasarkan skornya.
    2. JIKA ada jawaban salah, pilih 1 atau 2 kesalahan yang paling fatal/mendasar, lalu jelaskan secara singkat kenapa jawaban user salah dan apa konsep yang benar (gunakan bahasa santai). Jangan bahas semua kesalahan agar tidak kepanjangan.
    3. Arahkan user untuk mengambil kursus '{nama_kursus}' untuk memperbaiki pemahaman tersebut.
    4. Jaga respon tetap ringkas (maksimal 3 paragraf).
    5. buat rekomendasi kursus berdasrarkan kesalahan yang dibuat user berupa point-point dari yang paling basic ke yang lebih sulit.
    """
    
    # 7. Panggil Gemini
    jawaban_ai = await call_gemini_api(prompt)
    
    return SubmitResponse(
        bot_response=jawaban_ai,
        suggested_course_name=nama_kursus,
        suggested_course_id=id_kursus
    )