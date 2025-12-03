import httpx
from core.config import settings
from typing import Optional, List, Dict, Any, Literal


# Konfigurasi untuk DUA klien Supabase
CLIENT_CONFIGS = {
    "dicoding": {
        "base_url": settings.DICODING_SUPABASE_URL,
        "headers": {
            "apikey": settings.DICODING_SUPABASE_KEY,
            "Authorization": f"Bearer {settings.DICODING_SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" # Agar Supabase mengembalikan data setelah insert
        }
    },
    "mock": {
        "base_url": settings.MOCK_SUPABASE_URL,
        "headers": {
            "apikey": settings.MOCK_SUPABASE_KEY,
            "Authorization": f"Bearer {settings.MOCK_SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    }
}

async def call_supabase_api(
    endpoint: str, 
    method: Literal["GET", "POST"] = "GET", # Tambah dukungan POST
    db_type: Literal["dicoding", "mock"] = "dicoding", 
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None # Tambah body untuk insert
) -> Optional[Any]: # Return Any karena bisa List atau Dict
    
    config = CLIENT_CONFIGS.get(db_type)
    if not config:
        print(f"Error: Konfigurasi db_type '{db_type}' tidak ditemukan.")
        return None
        
    async with httpx.AsyncClient() as client:
        try:
            url = f"{config['base_url']}/{endpoint}"
            
            if method == "GET":
                response = await client.get(
                    url,
                    headers=config['headers'],
                    params=params
                )
            elif method == "POST":
                response = await client.post(
                    url,
                    headers=config['headers'],
                    params=params,
                    json=json_body
                )
            else:
                return None

            response.raise_for_status() 
            return response.json()
        
        except httpx.HTTPStatusError as e:
            print(f"Error HTTP Supabase ({db_type} - {method}): {e}")
            # Coba print detail error dari Supabase jika ada
            try:
                print("Detail:", e.response.text)
            except:
                pass
            return None
        except Exception as e:
            print(f"Error tidak terduga Supabase: {e}")
            return None