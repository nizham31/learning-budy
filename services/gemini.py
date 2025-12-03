import google.generativeai as genai
from core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


model = genai.GenerativeModel('gemini-2.5-flash')

async def call_gemini_api(prompt: str) -> str:
    """
    Memanggil Gemini API secara asinkron menggunakan Google Python SDK.
    """
    try:
        
        response = await model.generate_content_async(
            prompt,
            safety_settings={
                'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
                 'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
                 'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                 'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
                 
             }
        )
        return response.text
    
    except Exception as e:
        print(f"[ERROR] Error dari Google SDK: {e}")
        return f"Maaf, terjadi kesalahan saat memproses permintaan AI: {e}"