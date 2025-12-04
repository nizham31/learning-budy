from fastapi import APIRouter, Depends
from schemas.chat import ProgressResponse
from services.gemini import call_gemini_api
from services.supabase import call_supabase_api
from api.deps import get_current_user_email
import json

router = APIRouter(prefix="/progress", tags=["Progres Siswa"])

@router.post("/", response_model=ProgressResponse)
async def handle_progress(current_email: str = Depends(get_current_user_email)):
    """
    FITUR 3 (SNEAK PEEK + DUAL PAYLOAD):
    - Bot Response: Motivasi teks.
    - Progress Data: JSON data roadmap (N+5) untuk dikonsumsi Frontend.
    """
    
    # 1. Ambil Data Progres dari DB Mock
    raw_data = await call_supabase_api(
        "Student Progress", 
        db_type="mock",      
        params={
            "email": f"eq.{current_email}", 
            "select": "*"                  
        }
    )
    
    if not raw_data:
        return ProgressResponse(bot_response=f"Halo! Saya tidak menemukan data kelas untuk akun {current_email}. Yuk mulai ambil kelas di Dicoding!")
    
    summary_list = []
    active_courses = []     # List string untuk prompt AI
    
    total_score_sum = 0
    count_exam = 0

    # 2. Loop setiap kursus
    for item in raw_data:
        total_modul = item.get('active_tutorials', 0)
        selesai_modul = item.get('completed_tutorials', 0)
        course_name = item.get('course_name', 'Kelas Tanpa Nama')
        is_lulus = item.get('is_graduated', 0) == 1
        nilai_ujian = item.get('exam_score')
        
        persen = 0
        if total_modul > 0:
            persen = round((selesai_modul / total_modul) * 100, 1)

        # --- LOGIC SNEAK PEEK (N+5) ---
        current_focus = "Menunggu Kelulusan / Ujian"
        upcoming_topics = [] 
        
        if not is_lulus and total_modul > 0 and selesai_modul < total_modul:
            try:
                # A. Cari Course ID
                course_search = await call_supabase_api(
                    "courses", db_type="dicoding",
                    params={
                        "course_name": f"ilike.%{course_name}%",
                        "select": "course_id",
                        "limit": 1
                    }
                )
                
                if course_search:
                    c_id = course_search[0]['course_id']
                    
                    # B. Cari 5 Tutorial ke depan
                    next_tutorials = await call_supabase_api(
                        "tutorials", db_type="dicoding",
                        params={
                            "course_id": f"eq.{c_id}",
                            "order": "tutorial_id.asc",
                            "limit": 5,             
                            "offset": selesai_modul 
                        }
                    )
                    
                    if next_tutorials:
                        current_focus = next_tutorials[0]['tutorial_title']
                        if len(next_tutorials) > 1:
                            upcoming_topics = [t['tutorial_title'] for t in next_tutorials[1:]]
                    else:
                        current_focus = "Modul Data Tidak Ditemukan"
                else:
                    current_focus = "Info Course Detail Tidak Ditemukan"
            
            except Exception as e:
                print(f"[ERROR PROGRESS] Gagal cari modul: {e}")
                current_focus = "Tidak dapat memuat data modul"

        elif is_lulus:
            current_focus = "LULUS (Selesai)"

        # Simpan Info Lengkap (Ini yang akan dimakan Frontend)
        info = {
            "kursus": course_name,
            "progres_persen": persen, # Integer/Float biar gampang diolah FE
            "total_modul": total_modul,
            "selesai_modul": selesai_modul,
            "status": "LULUS" if is_lulus else "BELUM LULUS",
            "sedang_dipelajari": current_focus,
            "akan_datang": upcoming_topics, # List Roadmap (N+1 s/d N+5)
            "nilai": nilai_ujian
        }
        summary_list.append(info)
        
        # Logic untuk Prompt AI (Narasi)
        if is_lulus:
            if nilai_ujian:
                total_score_sum += int(nilai_ujian)
                count_exam += 1
        else:
            if persen > 0:
                roadmap_str = f"Saat ini: {current_focus}. Next: {', '.join(upcoming_topics)}"
                active_courses.append(f"{course_name} -> {roadmap_str}")

    avg_score = round(total_score_sum / count_exam, 1) if count_exam > 0 else 0

    # 3. Susun Context untuk AI
    context_str = f"""
    DATA PROGRES USER:
    - Nama User: {raw_data[0].get('name', 'Siswa')}
    
    DETAIL COURSE & ROADMAP:
    {json.dumps(summary_list, indent=2)}
    """

    # 4. Prompt Gemini (Instruksi Narasi)
    prompt = f"""
    Kamu adalah Learning Buddy.
    Berikan laporan progres belajar kepada user dengan gaya santai tapi tetap formal dengan nada gembira.
    
    DATA PROGRES:
    {context_str}
    
    Tugas:
    1. Sapa user.
    2. FOKUS UTAMA: Bahas kelas yang BELUM LULUS.
       - Sebutkan modul yang sedang dia pelajari ("sedang_dipelajari").
       - BERIKAN SNEAK PEEK: Ceritakan secara singkat apa yang akan dia pelajari selanjutnya ("akan_datang").
       - narasi materi selanjut nya dibuat dalam poitn per point
    3. Jika "akan_datang" kosong (berarti modul terakhir), semangati untuk Final Submission/Ujian.
    4. Jika ada kelas LULUS, ucapkan selamat.
    5. berikan saran kalau user ingin mempelajari lebih detail materi tersebut bisa bertanya ke kamu dan kamu siap bantu
    """
    
    jawaban_ai = await call_gemini_api(prompt)
    
    return ProgressResponse(bot_response=jawaban_ai,   #AI chatBubble 
                            progress_data=summary_list # UI Roadmap/Grafik
)