from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any

# --- Model untuk /ask ---
class AskRequest(BaseModel):
    question: str
    preset: Literal["to the point", "teman", "instruktor", "rekan"] = "to the point"
    full_page_content: Optional[str] = None 
    visible_text: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None 

class AskResponse(BaseModel):
    bot_response: str

class ProgressRequest(BaseModel):
    email: str 

class ProgressResponse(BaseModel):
    bot_response: str
    
    progress_data: Optional[List[Dict[str, Any]]] = None 

# Model untuk GET /interests
class InterestResponse(BaseModel):
    id: int
    name: str

# Model untuk GET /quiz
class QuizQuestion(BaseModel):
    question_id: int
    question_desc: str
    option_1: str
    option_2: str
    option_3: str
    option_4: str

# Model untuk POST /submit
class QuizAnswer(BaseModel):
    question_id: int
    selected_answer: str 

class SubmitRequest(BaseModel):
    kategori_minat: str
    answers: List[QuizAnswer]

class SubmitResponse(BaseModel):
    bot_response: str
    suggested_course_name: Optional[str] = None
    suggested_course_id: Optional[int] = None

class AssessmentOption(BaseModel):
    text: str
    value: str 

class AssessmentQuestion(BaseModel):
    id: int
    question: str
    options: List[AssessmentOption]

class AssessmentSubmitRequest(BaseModel):
    answers: List[str] 

class AssessmentResponse(BaseModel):
    recommended_path: str
    description: str