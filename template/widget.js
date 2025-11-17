(function() {
    // 1. Konfigurasi
    const API_BASE_URL = "http://localhost:8000"; // Sesuaikan jika backend di-deploy
    const WIDGET_CSS_URL = API_BASE_URL + "/widget/widget.css"; // Asumsi CSS ada di backend
    const VUE_CDN_URL = "https://unpkg.com/vue@3/dist/vue.global.js";

    // 2. Fungsi Pemuat (Loader)
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }
    function loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // 3. Mulai Muat Vue
    loadScript(VUE_CDN_URL, () => {
        loadCSS(WIDGET_CSS_URL);
        
        const appDiv = document.createElement('div');
        appDiv.id = 'learning-buddy-app';
        document.body.appendChild(appDiv);

        // 4. Buat Aplikasi Vue
        const { createApp } = Vue;
        
        createApp({
            // 5. Template (Tidak berubah, sudah bagus)
            template: `
                <div>
                    <div class="chat-button" 
                         v-if="windowState !== 'fullscreen'" 
                         @click="togglePopup">
                        Chat
                    </div>
                    
                    <div class="chat-window" 
                         v-if="windowState !== 'closed'"
                         :class="{ 'fullscreen': windowState === 'fullscreen' }">
                        
                        <div class="chat-header">
                            <span>Learning Buddy</span>
                            <div>
                                <button 
                                    class="chat-header-fullscreen" 
                                    v-if="windowState === 'popup'" 
                                    @click="goFullscreen">
                                    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                                </button>
                                <button class="chat-header-close" @click="closeChat">&times;</button>
                            </div>
                        </div>
                        
                        <div class="chat-body" ref="chatBody">
                            <div v-for="(msg, index) in messages" :key="index" :class="['chat-message', msg.sender]">
                                <div v-html="formatMessage(msg.text)"></div>
                                <div class="quick-reply-container" v-if="msg.options && msg.options.length > 0">
                                    <button 
                                        v-for="option in msg.options"
                                        :key="option"
                                        class="quick-reply-button"
                                        @click="sendQuickReply(option)">
                                        {{ option }}
                                    </button>
                                </div>
                            </div>
                            <div v-if="isLoading" class="chat-message server typing">...</div>
                        </div>
                        
                        <div class="chat-footer">
                            <input 
                                type="text" 
                                class="chat-input" 
                                :placeholder="inputPlaceholder" 
                                v-model="newMessage"
                                @keydown.enter="sendMessage"
                                :disabled="isLoading">
                            <button class="send-button" @click="sendMessage" :disabled="isLoading">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `,
            // 6. Data (State Management)
            data() {
                return {
                    windowState: 'closed', 
                    isLoading: false,
                    newMessage: '',
                    messages: [], 
                    
                    // Alur saat ini:
                    // 'main_menu', 'awaiting_email', 'awaiting_question',
                    // 'recommend_await_interest', 'recommend_await_level', 'recommend_await_quiz_answer'
                    currentFlow: 'main_menu', 
                    inputPlaceholder: 'Ketik atau pilih opsi...',
                    
                    // "Ingatan" untuk alur kuis
                    quizContext: {
                        interest: null,
                        level: null,
                        questions: [],
                        currentQuestionIndex: 0,
                        answers: [] // List of { question_id, selected_answer }
                    }
                };
            },
            // 7. Methods (Logika UI & API)
            methods: {
                // --- Fungsi Bantuan & Navigasi UI ---
                scrollToBottom() {
                    this.$nextTick(() => {
                        const body = this.$refs.chatBody;
                        if (body) { body.scrollTop = body.scrollHeight; }
                    });
                },
                formatMessage(text) {
                    return String(text).replace(/\n/g, '<br>');
                },
                removeLastOptions() {
                    for (let i = this.messages.length - 1; i >= 0; i--) {
                        if (this.messages[i].sender === 'server') {
                            if (this.messages[i].options) {
                                this.messages[i].options = null;
                            }
                            break; 
                        }
                    }
                },
                
                // --- Fungsi Tampilan (Navigasi UI) ---
                togglePopup() {
                    if (this.windowState === 'closed') {
                        this.windowState = 'popup';
                        if (this.messages.length === 0) {
                            this.showInitialTemplates();
                        }
                    } else {
                        this.windowState = 'closed';
                    }
                },
                goFullscreen() { this.windowState = 'fullscreen'; },
                closeChat() { this.windowState = 'closed'; },

                // Menampilkan menu utama
                showInitialTemplates() {
                    this.messages.push({
                        sender: 'server',
                        text: "Halo! Saya Learning Buddy. Anda bisa pilih salah satu opsi di bawah ini:",
                        options: ["Cek Progres", "Rekomendasi Kuis", "Tanya Soal"] 
                    });
                    this.currentFlow = 'main_menu'; 
                    this.inputPlaceholder = 'Ketik atau pilih opsi...';
                    this.scrollToBottom();
                },

                // Reset state kuis
                resetQuizContext() {
                    this.quizContext = {
                        interest: null,
                        level: null,
                        questions: [],
                        currentQuestionIndex: 0,
                        answers: []
                    };
                },
                
                // --- Fungsi Pengiriman Pesan ---
                sendQuickReply(text) {
                    this.messages.push({ sender: 'klien', text: text });
                    this.scrollToBottom();
                    this.removeLastOptions();
                    this.handleMessage(text); // Kirim ke "otak"
                },
                sendMessage() {
                    const msgText = this.newMessage.trim();
                    if (msgText === '' || this.isLoading) return;

                    this.messages.push({ sender: 'klien', text: msgText });
                    this.newMessage = '';
                    this.scrollToBottom();
                    this.handleMessage(msgText); // Kirim ke "otak"
                },

                // --- "Otak" Frontend (State Machine) ---
                async handleMessage(msgText) {
                    this.isLoading = true;
                    this.removeLastOptions();
                    const msgLower = msgText.toLowerCase();
                    
                    try {
                        switch (this.currentFlow) {
                            // 1. User mengetik email setelah memilih "Cek Progres"
                            case 'awaiting_email':
                                await this.callProgressApi(msgText); // msgText adalah email
                                break;
                                
                            // 2. User mengetik pertanyaan setelah memilih "Tanya Soal"
                            case 'awaiting_question':
                                await this.callAskApi(msgText); // msgText adalah pertanyaan
                                break;

                            // 3. User memilih minat untuk kuis
                            case 'recommend_await_interest':
                                this.quizContext.interest = msgText;
                                this.askQuizLevel();
                                break;
                            
                            // 4. User memilih level untuk kuis
                            case 'recommend_await_level':
                                this.quizContext.level = msgText;
                                await this.callGetQuizApi();
                                break;

                            // 5. User menjawab pertanyaan kuis
                            case 'recommend_await_quiz_answer':
                                this.handleQuizAnswer(msgText);
                                break;

                            // 6. User berada di menu utama
                            case 'main_menu':
                            default:
                                if (msgLower === 'cek progres') {
                                    this.messages.push({ sender: 'server', text: 'Tentu, silakan masukkan email Anda:' });
                                    this.currentFlow = 'awaiting_email';
                                    this.inputPlaceholder = 'Ketik email Anda...';
                                } else if (msgLower === 'rekomendasi kuis') {
                                    await this.startQuizFlow(); // Memulai alur kuis
                                } else if (msgLower === 'tanya soal') {
                                    this.messages.push({ sender: 'server', text: 'Silakan ketik pertanyaan Anda:' });
                                    this.currentFlow = 'awaiting_question';
                                    this.inputPlaceholder = 'Ketik pertanyaan Anda...';
                                } else {
                                    // Jika user mengetik di menu utama, anggap itu pertanyaan
                                    await this.callAskApi(msgText);
                                }
                                break;
                        }
                    } catch (error) {
                        console.error("Error in handleMessage:", error);
                        this.messages.push({ sender: 'server', text: `Maaf, terjadi kesalahan: ${error.message}` });
                    } finally {
                        this.isLoading = false;
                        this.scrollToBottom();
                        
                        // Jika alur sudah kembali ke menu utama, tampilkan opsi lagi
                        if (this.currentFlow === 'main_menu' && !this.isLoading) {
                           // Cek agar tidak duplikat menu
                           const lastMsg = this.messages[this.messages.length - 1];
                           if (!lastMsg.options) {
                               this.showInitialTemplates();
                           }
                        }
                    }
                },

                // --- Fungsi Panggilan API (Sesuai Backend) ---
                
                // FITUR 3: Cek Progres (SUDAH DISESUAIKAN)
                async callProgressApi(email) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/v1/progress`, { 
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email })
                        });

                        if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.detail || `Email tidak ditemukan`);
                        }
                        
                        const data = await response.json();

                        // Backend mengembalikan { bot_response: "..." }
                        this.messages.push({ sender: "server", text: data.bot_response });

                    } catch (error) {
                        console.error("Error di callProgressApi:", error);
                        this.messages.push({ sender: "server", text: `Maaf, terjadi kesalahan: ${error.message}` });
                    } finally {
                        this.currentFlow = "main_menu"; 
                        this.inputPlaceholder = 'Ketik atau pilih opsi...';
                    }
                },

                // FITUR 2: Tanya Soal (SUDAH DISESUAIKAN)
                async callAskApi(question) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/v1/ask`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                question: question,
                                preset: "santai" // Bisa juga "to the point"
                            }) 
                        });
                        if (!response.ok) throw new Error('API /ask gagal');
                        
                        const data = await response.json();
                        this.messages.push({ sender: 'server', text: data.bot_response });
                    } catch (error) {
                         console.error("Error di callAskApi:", error);
                        this.messages.push({ sender: "server", text: `Maaf, terjadi kesalahan: ${error.message}` });
                    } finally {
                        this.currentFlow = 'main_menu'; 
                        this.inputPlaceholder = 'Ketik atau pilih opsi...'; 
                    }
                },

                // --- FITUR 1: Alur Rekomendasi Kuis (BARU) ---

                // Panggil: GET /api/v1/recommend/interests
                async startQuizFlow() {
                    this.resetQuizContext(); // Bersihkan ingatan kuis sebelumnya
                    const response = await fetch(`${API_BASE_URL}/api/v1/recommend/interests`);
                    if (!response.ok) throw new Error(`API /recommend/interests gagal`);
                    
                    const data = await response.json(); // List[InterestResponse]
                    const interests = data.map(item => item.name); // Ambil namanya saja

                    this.messages.push({
                        sender: 'server',
                        text: 'Tentu! Silakan pilih minat Anda:',
                        options: interests
                    });
                    this.currentFlow = 'recommend_await_interest';
                },

                // Lokal: Tampilkan pilihan level
                askQuizLevel() {
                    this.messages.push({
                        sender: 'server',
                        text: 'Pilih level Anda:',
                        options: ["beginner", "intermediate", "advanced"]
                    });
                    this.currentFlow = 'recommend_await_level';
                },

                // Panggil: GET /api/v1/recommend/quiz
                async callGetQuizApi() {
                    const params = new URLSearchParams({
                        kategori_minat: this.quizContext.interest,
                        level: this.quizContext.level
                    });

                    const response = await fetch(`${API_BASE_URL}/api/v1/recommend/quiz?${params}`);
                    
                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.detail || 'Kuis tidak ditemukan');
                    }
                    
                    const data = await response.json(); // List[QuizQuestion]
                    this.quizContext.questions = data;
                    this.quizContext.currentQuestionIndex = 0;
                    this.quizContext.answers = [];

                    if (this.quizContext.questions.length > 0) {
                        this.showNextQuizQuestion();
                    } else {
                        throw new Error("Tidak ada pertanyaan kuis yang ditemukan.");
                    }
                },

                // Lokal: Tampilkan pertanyaan kuis berikutnya
                showNextQuizQuestion() {
                    const q = this.quizContext.questions[this.quizContext.currentQuestionIndex];
                    this.messages.push({
                        sender: 'server',
                        text: q.question_desc,
                        options: [q.option_1, q.option_2, q.option_3, q.option_4]
                    });
                    this.currentFlow = 'recommend_await_quiz_answer';
                },

                // Lokal: Menangani jawaban kuis dari user
                handleQuizAnswer(selectedAnswerText) {
                    // Simpan jawaban dalam format yang benar
                    const q = this.quizContext.questions[this.quizContext.currentQuestionIndex];
                    this.quizContext.answers.push({
                        question_id: q.question_id,
                        selected_answer: selectedAnswerText
                    });

                    // Lanjut ke pertanyaan berikutnya
                    this.quizContext.currentQuestionIndex++;

                    if (this.quizContext.currentQuestionIndex < this.quizContext.questions.length) {
                        this.showNextQuizQuestion();
                    } else {
                        // Kuis selesai, kirim jawaban
                        this.callSubmitQuizApi();
                    }
                },

                // Panggil: POST /api/v1/recommend/submit
                async callSubmitQuizApi() {
                    this.messages.push({ sender: 'server', text: 'Kuis selesai. Menganalisis jawaban Anda...' });
                    
                    const body = {
                        kategori_minat: this.quizContext.interest,
                        level: this.quizContext.level,
                        answers: this.quizContext.answers
                    };

                    const response = await fetch(`${API_BASE_URL}/api/v1/recommend/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.detail || 'Gagal mengirimkan kuis');
                    }

                    const data = await response.json(); // SubmitResponse
                    
                    // Tampilkan rekomendasi dari Gemini
                    this.messages.push({
                        sender: 'server',
                        text: data.bot_response
                    });

                    this.currentFlow = 'main_menu';
                    this.resetQuizContext();
                }
            }
        }).mount('#learning-buddy-app'); // Mount aplikasi
    });
})();