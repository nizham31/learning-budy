# Learning Buddy

adalah Chatbot berbasis LLM yang di integrasikan langsung ke sistem Dicoding, untuk membantu siswa belajar, fokus utama nya pada membantu dalam pertanyaan teknikal, Tracking progress dan rekomendasi learning path dan minat, 

## Fitur utama 

* fitur Rekomendasi : spesifik pada kekurangan siswa (berupa subskill) yang di dapat dari hasil assesment/quis dan merekomendasikan kelas yang ada pada dicoding.
* cek progress : tracking progress siswa dan rekomendasi alur belajar selanjutnya
* ask : menjawab pertanyaan dari siswa
* Tampilan sederhana dan jelas, 
* Roadmap

## Side Fitur
* Personalisasi : gaya bicara bisa berubah, terdapat 4 gaya bicara sebagai berikut
 ** Teman: pertanyaan akan dijawab dengan analogi, dan ramah cocok jika siswa baru memulai atau sulit memahami materi dengan bahasa teknis
 ** Mentor: Pertanyaan akan dijawab dengan lebih teknikal layak nya mentor belajar
 ** Rekan : Layaknya rekan, gaya ini akan membantu dalam praktek
 ** To The Point : ini adalah gaya bicara default jika siswa tidak mengubah, seperti nama nya ini akan menjawab langsung ke intinya

* Tanya layar : model bisa membaca modul pada layar siswa, sehingga memudahkan siswa bertanya pada materi spesifik dengan lebih mudah.
* Widget mudah di embed ke website utama

## Tech Stack 

### Backend
**Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
* **AI Engine**: [Google Gemini API](https://ai.google.dev/) (Model `gemini-2.5-flash`)
* **Database**: [Supabase](https://supabase.com/) (PostgreSQL) - Menggunakan 2 instance DB (Dicoding API & Mock Data).
* **Authentication**: JWT (JSON Web Tokens) dengan `python-jose`.

### Frontend (Widget)
* Core: Vue.js 3 (CDN Build).
* Styling: Custom CSS & Tailwind CSS.

### Deployment
* Platform: Vercel.

## Struktur projek 
* api/ : Logic utama backend (Routes & Endpoints)
* api/routes/ Endpoint: ask, progress, recommend, auth
* core/ : Konfigurasi inti (Settings, Security)
* schemas : Pydantic Models (Validasi Data)
* services/ : External Services (Gemini API, Supabase Client)
* template/ : Frontend Widget (HTML, JS, CSS)
* main.py : Entry point aplikasi FastAPI
* requirements.txt : Daftar library Python