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

router = APIRouter(prefix="/recommend", tags=["Rekomendasi"])

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

# --- KONFIGURASI BOBOT NILAI ---
SCORE_WEIGHTS = {
    "beginner": 1,
    "intermediate": 3,
    "advanced": 5
}

@router.get("/interests", response_model=List[InterestResponse])
async def get_interests():
    """Mengambil daftar Learning Path dari DB Dicoding"""
    target_list = [
        "AI Engineer", "Android Developer", "Back-End Developer JavaScript",
        "Data Scientist", "DevOps Engineer", "Front-End Web Developer",
        "Gen AI Engineer", "Google Cloud Professional", "iOS Developer",
        "MLOps Engineer", "Multi-Platform App Developer", "React Developer"
    ]
    filter_query = "in.(" + ",".join([f'"{name}"' for name in target_list]) + ")"
    
    data = await call_supabase_api(
        "learning_paths",
        db_type="dicoding",
        params={
            "select": "learning_path_id,learning_path_name",
            "learning_path_name": filter_query  
        }
    )

    if not data:
        raise HTTPException(status_code=404, detail="Daftar alur belajar tidak ditemukan.")
    
    return [InterestResponse(id=item['learning_path_id'], name=item['learning_path_name']) for item in data]


@router.get("/quiz", response_model=List[QuizQuestion])
async def get_quiz(kategori_minat: str = Query(..., example="Android Developer")):
    """Mengambil 5 soal acak per level dari DB Mock"""
    tech_category_mock = CATEGORY_MAP.get(kategori_minat, kategori_minat)
    
    # Ambil kolom difficulty juga untuk referensi (opsional di frontend)
    select_query = "id,question_desc,option_1,option_2,option_3,option_4,difficulty"
    
    try:
        data_beginner, data_intermediate, data_advanced = await asyncio.gather(
            call_supabase_api("Tech Questions", db_type="mock", params={"tech_category": f"eq.{tech_category_mock}", "difficulty": "eq.beginner", "select": select_query, "limit": 20}),
            call_supabase_api("Tech Questions", db_type="mock", params={"tech_category": f"eq.{tech_category_mock}", "difficulty": "eq.intermediate", "select": select_query, "limit": 20}),
            call_supabase_api("Tech Questions", db_type="mock", params={"tech_category": f"eq.{tech_category_mock}", "difficulty": "eq.advanced", "select": select_query, "limit": 20})
        )
    except Exception as e:
        print(f"Error fetching quiz: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil data kuis.")

    def pick_random(pool, count=5):
        return random.sample(pool, count) if pool and len(pool) > count else (pool or [])

    final_questions = pick_random(data_beginner) + pick_random(data_intermediate) + pick_random(data_advanced)
    
    if not final_questions:
        raise HTTPException(status_code=404, detail=f"Kuis untuk {tech_category_mock} kosong.")
    
    return [
        QuizQuestion(
            question_id=item['id'],
            question_desc=item['question_desc'],
            option_1=item['option_1'],
            option_2=item['option_2'],
            option_3=item['option_3'],
            option_4=item['option_4']
        ) for item in final_questions
    ]


@router.post("/submit", response_model=SubmitResponse)
async def handle_submission(request: SubmitRequest):
    """
    FITUR HYBRID + WEIGHTED SCORING:
    Menghitung skor berdasarkan tingkat kesulitan soal.
    """
    
    # --- STEP 1: PERSIAPAN DATA ---
    question_ids = [answer.question_id for answer in request.answers]
    if not question_ids:
        raise HTTPException(status_code=400, detail="Tidak ada jawaban.")

    # Ambil Kunci Jawaban + TAGS + DIFFICULTY dari DB Mock
    correct_answers_data = await call_supabase_api(
        "Tech Questions", db_type="mock",
        params={
            "id": f"in.({','.join(map(str, question_ids))})",
            "select": "id,question_desc,correct_answer,topic_tag,difficulty" # Tambah difficulty
        }
    )
    
    if not correct_answers_data:
        raise HTTPException(status_code=404, detail="Data soal tidak ditemukan.")

    qa_map = {item['id']: item for item in correct_answers_data}
    
    user_score = 0
    max_possible_score = 0
    
    wrong_tags = []      
    analisis_list = []   
    
    # --- STEP 2: PERIKSA JAWABAN & HITUNG BOBOT ---
    for answer in request.answers:
        if answer.question_id in qa_map:
            data_soal = qa_map[answer.question_id]
            user_ans = answer.selected_answer
            correct_ans = data_soal['correct_answer']
            difficulty = data_soal.get('difficulty', 'beginner') # Default beginner
            
            # Ambil nilai bobot (1, 3, atau 5)
            weight = SCORE_WEIGHTS.get(difficulty, 1)
            
            # Tambahkan ke skor maksimal (untuk pembagi nanti)
            max_possible_score += weight
            
            if user_ans == correct_ans:
                user_score += weight # Tambah poin sesuai kesulitan
            else:
                tag = data_soal.get('topic_tag') or "Konsep Dasar"
                wrong_tags.append(tag)
                detail = f"- Soal ({difficulty}): {data_soal['question_desc']}\n  Topik: {tag} (Salah)"
                analisis_list.append(detail)

    # --- STEP 3: LOGIKA LEVEL BARU (BERDASARKAN % BOBOT) ---
    persentase = 0
    if max_possible_score > 0:
        persentase = user_score / max_possible_score
    
    level_rekomendasi_id = 1 # Default Dasar
    level_str = "Dasar"
    
    
    if persentase >= 0.75: # > 
        level_rekomendasi_id = 4
        level_str = "Mahir"
    elif persentase >= 0.45: 
        level_rekomendasi_id = 3
        level_str = "Menengah"
    else:
        level_rekomendasi_id = 2
        level_str = "Pemula"

    # Cari Learning Path ID
    lp_data = await call_supabase_api(
        "learning_paths", db_type="dicoding",
        params={"learning_path_name": f"eq.{request.kategori_minat}", "select": "learning_path_id", "limit": 1}
    )
    lp_id = lp_data[0]['learning_path_id'] if lp_data else 1

    # Cari SATU KURSUS UTAMA
    kursus_cocok = await call_supabase_api(
        "courses", db_type="dicoding",
        params={
            "learning_path_id": f"eq.{lp_id}",
            "course_level_str": f"eq.{level_rekomendasi_id}", 
            "select": "course_id,course_name",
            "limit": 1
        }
    )
    
    nama_kursus_utama = kursus_cocok[0].get('course_name') if kursus_cocok else "Kursus Dasar Umum"
    id_kursus_utama = kursus_cocok[0].get('course_id') if kursus_cocok else 0

    # --- STEP 4: LOGIKA MICRO (TUTORIAL SPESIFIK) ---
    recommended_materials = []
    if wrong_tags:
        unique_tags = list(set(wrong_tags))[:3]
        for tag in unique_tags:
            tutorials = await call_supabase_api(
                "tutorials", db_type="dicoding",
                params={
                    "tutorial_title": f"ilike.%{tag}%", 
                    "select": "tutorial_title",
                    "limit": 2
                }
            )
            if tutorials:
                for t in tutorials:
                    recommended_materials.append(f"- Modul: {t['tutorial_title']}")

    material_str = "\n".join(recommended_materials) if recommended_materials else "- (Tidak ada modul spesifik, fokus pada materi dasar)"
    analisis_str = "\n".join(analisis_list) if analisis_list else "Semua jawaban benar! Sempurna."
    
    # --- STEP 5: PROMPT AI ---
    prompt = f"""
    Kamu adalah Learning Buddy.
    User mengerjakan kuis '{request.kategori_minat}'.
    
    HASIL KUIS (SISTEM BOBOT):
    - Total Poin: {user_score} dari {max_possible_score}.
    - Level Skill User: {level_str}
    - Kursus Rekomendasi Utama: {nama_kursus_utama}
    
    DETAIL KELEMAHAN:
    {analisis_str}
    
    SARAN MODUL SPESIFIK:
    {material_str}
    
    Tugas:
    1. Berikan ucapan selamat atau semangat yang personal (sebutkan skornya).
    2. Jelaskan secara singkat kenapa dia salah di topik {', '.join(set(wrong_tags))} (jika ada). Jangan terlalu teknis, pakai bahasa santai.
    3. REKOMENDASI:
       a. Sarankan user untuk mulai belajar kursus "{nama_kursus_utama}" sebagai tujuan utama.
       b. JIKA ada modul spesifik di atas, bilang "Coba baca modul ini untuk perbaikan cepat: ..."
    4. Tutup dengan kalimat motivasi.

    """
    
    jawaban_ai = await call_gemini_api(prompt)
    
    return SubmitResponse(
        bot_response=jawaban_ai,
        suggested_course_name=nama_kursus_utama,
        suggested_course_id=id_kursus_utama
    )