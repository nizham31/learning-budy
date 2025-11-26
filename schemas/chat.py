from pydantic import BaseModel
from typing import Optional, Literal, List

# --- Model untuk /ask ---
class AskRequest(BaseModel):
    question: str
    preset: Literal["to the point", "teman", "instruktor", "rekan"] = "to the point"
    full_page_content: Optional[str] = None 
    visible_text: Optional[str] = None

class AskResponse(BaseModel):
    bot_response: str

# --- Model untuk /progress ---
class ProgressRequest(BaseModel):
    email: str # Kita kembalikan ke email sesuai struktur CSV

class ProgressResponse(BaseModel):
    bot_response: str

# --- Model BARU untuk Alur Rekomendasi ---

# Model untuk GET /interests
class InterestResponse(BaseModel):
    id: int
    name: str

# Model untuk GET /quiz (hanya soal & opsi, tanpa jawaban)
class QuizQuestion(BaseModel):
    question_id: int
    question_desc: str
    option_1: str
    option_2: str
    option_3: str
    option_4: str

# Model untuk POST /submit (jawaban dari user)
class QuizAnswer(BaseModel):
    question_id: int
    selected_answer: str # Teks dari jawaban yang dipilih

class SubmitRequest(BaseModel):
    kategori_minat: str
    answers: List[QuizAnswer]

# Model untuk response /submit (rekomendasi final)
class SubmitResponse(BaseModel):
    bot_response: str
    suggested_course_name: Optional[str] = None
    suggested_course_id: Optional[int] = None

class AssessmentOption(BaseModel):
    text: str
    value: str # Ini akan berisi kategori (misal: "Mobile Development")

class AssessmentQuestion(BaseModel):
    id: int
    question: str
    options: List[AssessmentOption]

class AssessmentSubmitRequest(BaseModel):
    answers: List[str] # List kategori yang dipilih user (misal: ["Mobile", "Web", "Mobile"...])

class AssessmentResponse(BaseModel):
    recommended_path: str
    description: str
    
# --- Hapus Model RecommendRequest & RecommendResponse yang lama ---
# class RecommendRequest(BaseModel): ... (HAPUS INI)
# class RecommendResponse(BaseModel): ... (HAPUS INI)