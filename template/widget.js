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

    loadScript(VUE_CDN_URL, () => {
        loadCSS(WIDGET_CSS_URL);
        
        const appDiv = document.createElement('div');
        appDiv.id = 'learning-buddy-app';
        document.body.appendChild(appDiv);

        // 4. Buat Aplikasi Vue
        const { createApp } = Vue;
        
        createApp({
            // 5. Template (GANTI SELURUH BAGIAN INI)
            template: `
                <div>
                    <!-- Tombol Chat -->
                    <div class="chat-button" 
                         v-if="windowState !== 'fullscreen'" 
                         @click="togglePopup">
                        Chat
                    </div>
                    
                    <!-- Jendela Chat Utama -->
                    <div class="chat-window" 
                         v-if="windowState !== 'closed'"
                         :class="{ 'fullscreen': windowState === 'fullscreen' }">
                        
                        <!-- ========================== -->
                        <!-- == TEMPLATE A: MODE POPUP == -->
                        <!-- ========================== -->
                        <template v-if="windowState === 'popup'">
                            
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
                        </template>

                        <!-- =================================== -->
                        <!-- == TEMPLATE B: MODE FULLSCREEN == -->
                        <!-- =================================== -->
                        <template v-if="windowState === 'fullscreen'">
                            
                            <!-- Sidebar Panel Kuis / Asesmen -->
                            <div class="fs-sidebar" :class="{ 'quiz-active': showQuizPanel }">
                                <div v-show="showQuizPanel" class="fs-quiz-container">
                                    
                                    <!-- Header Progress Bar -->
                                    <div class="fs-quiz-header">
                                        <h4>{{ isAssessmentMode ? 'Tes Minat' : 'Kuis Teknis' }}</h4>
                                        
                                        <div class="fs-quiz-progress-bar">
                                            <!-- Gunakan activeContext.questions -->
                                            <div v-for="(q, index) in activeContext.questions"
                                                 :key="'prog-'+ (q.id || q.question_id)" 
                                                 class="fs-quiz-progress-segment"
                                                 :class="{
                                                     'active': index === activeContext.currentQuestionIndex,
                                                     'completed': isAssessmentMode ? assessmentContext.answers[index] : quizContext.userAnswers[q.question_id]
                                                 }">
                                            </div>
                                        </div>
                                        <span class="fs-quiz-counter">{{ activeContext.currentQuestionIndex + 1 }} / {{ activeContext.questions.length }}</span>
                                    </div>
                                    
                                    <!-- Body Soal -->
                                    <div class="fs-quiz-form" ref="quizFormFs">
                                        <template v-if="currentQuestion">
                                            <div class="fs-quiz-question">
                                                <!-- Judul Soal -->
                                                <p class="fs-quiz-desc">{{ isAssessmentMode ? currentQuestion.question : currentQuestion.question_desc }}</p>
                                                
                                                <!-- OPSI JAWABAN -->
                                                <div class="fs-quiz-options">
                                                    
                                                    <!-- MODE 1: ASESMEN (Opsi Dinamis dari Array) -->
                                                    <template v-if="isAssessmentMode">
                                                        <button v-for="opt in currentQuestion.options" 
                                                                :key="opt.value"
                                                                class="fs-quiz-option-btn"
                                                                :class="{ 'selected': assessmentContext.answers[assessmentContext.currentQuestionIndex] === opt.value }"
                                                                @click="selectAssessmentAnswer(opt.value)">
                                                            {{ opt.text }}
                                                        </button>
                                                    </template>

                                                    <!-- MODE 2: KUIS TEKNIS (Opsi Statis A-D) -->
                                                    <template v-else>
                                                        <button class="fs-quiz-option-btn" :class="{ 'selected': quizContext.userAnswers[currentQuestion.question_id] === currentQuestion.option_1 }" @click="selectAnswer(currentQuestion.option_1)">
                                                            <span>A.</span> {{ currentQuestion.option_1 }}
                                                        </button>
                                                        <button class="fs-quiz-option-btn" :class="{ 'selected': quizContext.userAnswers[currentQuestion.question_id] === currentQuestion.option_2 }" @click="selectAnswer(currentQuestion.option_2)">
                                                            <span>B.</span> {{ currentQuestion.option_2 }}
                                                        </button>
                                                        <button class="fs-quiz-option-btn" :class="{ 'selected': quizContext.userAnswers[currentQuestion.question_id] === currentQuestion.option_3 }" @click="selectAnswer(currentQuestion.option_3)">
                                                            <span>C.</span> {{ currentQuestion.option_3 }}
                                                        </button>
                                                        <button class="fs-quiz-option-btn" :class="{ 'selected': quizContext.userAnswers[currentQuestion.question_id] === currentQuestion.option_4 }" @click="selectAnswer(currentQuestion.option_4)">
                                                            <span>D.</span> {{ currentQuestion.option_4 }}
                                                        </button>
                                                    </template>

                                                </div>
                                            </div>
                                        </template>
                                    </div>
                                    
                                    <!-- Footer Navigasi -->
                                    <div class="fs-quiz-footer">
                                        <button class="fs-quiz-nav-btn" 
                                                @click="goToPrev"
                                                :disabled="activeContext.currentQuestionIndex === 0">
                                            &lt;&lt; PREV
                                        </button>
                                        
                                        <!-- Tombol NEXT -->
                                        <button class="fs-quiz-nav-btn" 
                                                v-if="activeContext.currentQuestionIndex < activeContext.questions.length - 1"
                                                @click="goToNext"
                                                :disabled="!currentAnswerSelected">
                                            NEXT &gt;&gt;
                                        </button>
                                        
                                        <!-- Tombol SUBMIT (Beda fungsi tergantung mode) -->
                                        <template v-if="activeContext.currentQuestionIndex === activeContext.questions.length - 1">
                                            <button v-if="isAssessmentMode" class="fs-quiz-submit" @click="submitAssessment" :disabled="!allQuestionsAnswered || isLoading">
                                                {{ isLoading ? 'Loading...' : 'Cek Hasil Minat' }}
                                            </button>
                                            <button v-else class="fs-quiz-submit" @click="submitFullQuiz" :disabled="!allQuestionsAnswered || isLoading">
                                                {{ isLoading ? 'Loading...' : 'Kirim Jawaban' }}
                                            </button>
                                        </template>
                                    </div>

                                </div>
                            </div>
                            
                            <!-- Area Chat (Tetap Sama) -->
                            <div class="fs-chat-area">
                                <div class="fs-header">
                                    <span>Today</span>
                                    <button class="chat-header-close fs-close" @click="closeChat">&times;</button>
                                </div>
                                <div class="fs-body" ref="chatBodyFs">
                                    <!-- ... (Loop Pesan Chat tidak berubah) ... -->
                                     <div v-for="(msg, index) in messages" :key="index" :class="['fs-message', msg.sender === 'klien' ? 'user' : 'buddy']">
                                        
                                        <div v-if="msg.sender === 'server'" class="fs-avatar buddy">
                                            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"></path></svg>
                                        </div>

                                         <div class="fs-bubble">
                                            <div v-html="formatMessage(msg.text)"></div>
                                            <!-- Tombol Quick Reply di Chat -->
                                            <div class="quick-reply-container" v-if="msg.options && msg.options.length > 0">
                                                <!-- Tambahkan logika khusus jika tombolnya adalah 'Cek Minat' -->
                                                <button v-for="option in msg.options" :key="option" class="quick-reply-button"
                                                    @click="sendQuickReply(option)">
                                                    {{ option }}
                                                </button>
                                            </div>
                                        </div>

                                        <div v-if="msg.sender === 'klien'" class="fs-avatar user">
                                            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"></path></svg>
                                            <div class="fs-avatar-tie"></div>
                                        </div>

                                    </div>
                                </div>
                                
                                <!-- Footer Fullscreen (Input) -->
                                <div class="fs-footer">
                                    <input 
                                        type="text" 
                                        class="fs-input" 
                                        :placeholder="inputPlaceholder" 
                                        v-model="newMessage"
                                        @keydown.enter="sendMessage"
                                        :disabled="isLoading || showQuizPanel">
                                    <button class="fs-send-button" @click="sendMessage" :disabled="isLoading || showQuizPanel">
                                        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                                    </button>
                                </div>

                            </div>
                        </template>
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
                    currentFlow: 'main_menu', 
                    inputPlaceholder: 'Ketik atau pilih opsi...',
                    
                    showQuizPanel: false, 

                    // State Kuis Teknis (LAMA)
                    quizContext: {
                        interest: null,
                        questions: [],
                        currentQuestionIndex: 0,
                        userAnswers: {} 
                    },

                     // State Asesmen Minat (BARU)
                    isAssessmentMode: false, // Flag penentu mode
                    assessmentContext: {
                        questions: [],
                        currentQuestionIndex: 0,
                        answers: [] // Array string kategori
                    }
                };
            },
            // 7. Computed Properties (TAMBAHKAN BLOK INI)
            computed: {
                // Helper Cerdas: Mengembalikan konteks yang sedang aktif
                activeContext() {
                    return this.isAssessmentMode ? this.assessmentContext : this.quizContext;
                },
                
                // Mengambil soal saat ini (berlaku untuk kedua mode)
                currentQuestion() {
                    const ctx = this.activeContext;
                    if (ctx.questions && ctx.questions.length > 0) {
                        return ctx.questions[ctx.currentQuestionIndex];
                    }
                    return null;
                },

                // Cek apakah soal ini sudah dijawab
                currentAnswerSelected() {
                    if (!this.currentQuestion) return false;
                    
                    if (this.isAssessmentMode) {
                        // Cek array answers di index saat ini
                        return !!this.assessmentContext.answers[this.assessmentContext.currentQuestionIndex];
                    } else {
                        // Cek object userAnswers dengan key question_id
                        return !!this.quizContext.userAnswers[this.currentQuestion.question_id];
                    }
                },

                // Cek kelengkapan (untuk tombol submit)
                allQuestionsAnswered() {
                    if (this.isAssessmentMode) {
                         // Filter slot kosong
                        const answered = this.assessmentContext.answers.filter(a => a).length;
                        return answered === this.assessmentContext.questions.length;
                    } else {
                        const answered = Object.keys(this.quizContext.userAnswers).length;
                        return this.quizContext.questions.length > 0 && answered === this.quizContext.questions.length;
                    }
                }
            },
            // 7. Methods (Logika UI & API)
            methods: {
                // --- Fungsi Bantuan & Navigasi UI ---
                scrollToBottom() {
                    this.$nextTick(() => {
                        // Cek ref mana yang sedang aktif (popup atau fullscreen)
                        const body = this.$refs.chatBody || this.$refs.chatBodyFs;
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
                        options: ["Cek Minat Belajar", "Cek Progres", "Rekomendasi Kuis", "Tanya Soal"] 
                    });
                    this.currentFlow = 'main_menu'; 
                    this.inputPlaceholder = 'Ketik atau pilih opsi...';
                    this.scrollToBottom();
                },

                // Reset state kuis
                resetQuizContext() {
                    this.quizContext = {
                        interest: null,
                        questions: [],
                        currentQuestionIndex: 0,
                        userAnswers: {}
                    };
                    this.showQuizPanel = false;
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
                                await this.callGetQuizApi();
                                break;
                            
                            // 6. User berada di menu utama
                            case 'main_menu':
                            default:
                                if (msgLower.includes("cek progres")) {
                                    this.messages.push({ sender: 'server', text: 'Tentu, silakan masukkan email Anda:' });
                                    this.currentFlow = 'awaiting_email';
                                    this.inputPlaceholder = 'Ketik email Anda...';

                                } else if (msgLower.includes("rekomendasi kuis")) {
                                    await this.startQuizFlow(); // Memulai alur kuis
                                
                                } else if (msgLower.includes("cek minat") || msgLower.includes("minat belajar")) {
                                     await this.startAssessmentFlow();
                                
                                } else if (msgLower.includes("tanya") || msgLower.includes("soal")) {
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

                // Panggil: GET /api/v1/recommend/quiz
                async callGetQuizApi() {
                    // (BARU) Tampilkan loading di chat
                    this.isLoading = true;
                    this.messages.push({ sender: 'server', text: 'Mempersiapkan kuis campuran untuk Anda...' });
                    this.scrollToBottom();

                    const params = new URLSearchParams({
                        kategori_minat: this.quizContext.interest,
                    });

                    const response = await fetch(`${API_BASE_URL}/api/v1/recommend/quiz?${params}`);
                    
                    this.isLoading = false; // Hentikan loading
                    this.removeLastOptions(); // Hapus "..."

                    if (!response.ok) {
                        const errData = await response.json();
                        this.messages.push({ sender: 'server', text: `Maaf, gagal memuat kuis: ${errData.detail}` });
                        this.scrollToBottom();
                        this.currentFlow = 'main_menu'; // Kembalikan ke menu
                        this.showInitialTemplates();
                        return; // Hentikan eksekusi
                    }
                    
                    const data = await response.json(); // List[QuizQuestion]
                    this.quizContext.questions = data;
                    this.quizContext.currentQuestionIndex = 0; // Reset
                    this.quizContext.answers = []; // Reset

                    if (this.quizContext.questions.length > 0) {
                        // (BARU) Tampilkan panel kuis dan paksa fullscreen
                        this.showQuizPanel = true;
                        this.goFullscreen();
                        this.currentFlow = 'recommend_await_quiz_answer'; // Ganti flow
                    } else {
                        this.messages.push({ sender: 'server', text: 'Tidak ada pertanyaan kuis yang ditemukan untuk minat tersebut.' });
                        this.currentFlow = 'main_menu';
                        this.showInitialTemplates();
                    }
                    this.scrollToBottom();
                },


                // (MODIFIKASI) Mengumpulkan semua jawaban dari kuis paginasi
                async submitFullQuiz() {
                    this.isLoading = true; 
                    
                    // 1. Cek ulang apakah semua sudah terjawab
                    if (!this.allQuestionsAnswered) {
                         alert("Harap jawab semua pertanyaan kuis sebelum mengirim.");
                         this.isLoading = false;
                         return;
                    }

                    // 2. Ubah format jawaban dari {q_id: "teks"} menjadi [{question_id: q_id, selected_answer: "teks"}]
                    const formattedAnswers = Object.entries(this.quizContext.userAnswers).map(([q_id, answer_text]) => {
                        return {
                            question_id: parseInt(q_id), // Pastikan ID adalah angka
                            selected_answer: answer_text
                        };
                    });

                    // 3. Simpan jawaban yg sudah diformat & panggil API
                    this.quizContext.answers = formattedAnswers;
                    
                    this.messages.push({ sender: 'klien', text: 'Kuis saya sudah selesai, ini jawabannya.' });
                    this.scrollToBottom();
                    
                    // 4. Panggil API submit yang lama (logikanya sudah diubah di backend)
                    await this.callSubmitQuizApi(); 
                },

                // Panggil: POST /api/v1/recommend/submit (MODIFIKASI)
                async callSubmitQuizApi() {
                    const body = {
                        kategori_minat: this.quizContext.interest,
                        answers: this.quizContext.answers
                    };

                    const response = await fetch(`${API_BASE_URL}/api/v1/recommend/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    
                    // (BARU) Sembunyikan panel kuis & matikan loading
                    this.showQuizPanel = false;
                    this.isLoading = false;

                    if (!response.ok) {
                        const errData = await response.json();
                        // throw new Error(errData.detail || 'Gagal mengirimkan kuis'); <-- Jangan lempar error
                        this.messages.push({ sender: 'server', text: `Maaf, gagal mengirim kuis: ${errData.detail}` });
                        this.scrollToBottom();
                        this.currentFlow = 'main_menu';
                        this.resetQuizContext();
                        this.showInitialTemplates(); // Tampilkan menu lagi
                        return;
                    }

                    const data = await response.json(); // SubmitResponse
                    
                    // Tampilkan rekomendasi dari Gemini
                    this.messages.push({
                        sender: 'server',
                        text: data.bot_response
                    });
                    
                    this.messages.push({
                        sender: 'server',
                        text: `Rekomendasi kursus untukmu: **${data.suggested_course_name}**`
                    });

                    this.currentFlow = 'main_menu';
                    this.resetQuizContext(); // resetQuizContext sudah menyembunyikan panel
                    this.scrollToBottom();
                    this.showInitialTemplates(); // Tampilkan menu lagi
                },
                
                // --- FITUR 4: ASESMEN MINAT (BARU) ---

                // 1. Mulai Flow Asesmen
                async startAssessmentFlow() {
                    this.isAssessmentMode = true; // Aktifkan mode
                    this.isLoading = true;
                    this.goFullscreen();
                    
                    try {
                        // Panggil API baru
                        const response = await fetch(`${API_BASE_URL}/api/v1/assessment/questions`);
                        const data = await response.json();
                        
                        if (!data || data.length === 0) throw new Error("Data asesmen kosong");
                        
                        this.assessmentContext = {
                            questions: data,
                            currentQuestionIndex: 0,
                            answers: new Array(data.length).fill(null)
                        };
                        
                        this.showQuizPanel = true; 

                    } catch (error) {
                        console.error(error);
                        this.messages.push({ sender: 'server', text: "Gagal memuat asesmen." });
                        this.closeChat();
                    } finally {
                        this.isLoading = false;
                    }
                },

                // Handler Jawaban Asesmen
                selectAssessmentAnswer(categoryValue) {
                    const idx = this.assessmentContext.currentQuestionIndex;
                    this.assessmentContext.answers[idx] = categoryValue;
                    // Auto-next opsional:
                    // if (idx < this.assessmentContext.questions.length - 1) this.goToNext();
                },

                // Submit Hasil Asesmen
                async submitAssessment() {
                    this.isLoading = true;
                    try {
                        const validAnswers = this.assessmentContext.answers.filter(a => a);
                        const response = await fetch(`${API_BASE_URL}/api/v1/assessment/submit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ answers: validAnswers })
                        });
                        const result = await response.json();
                        
                        this.showQuizPanel = false;
                        this.isAssessmentMode = false; // Reset mode
                        
                        this.messages.push({ sender: 'klien', text: "Saya sudah selesai tes minat." });
                        this.messages.push({ 
                            sender: 'server', 
                            text: `Berdasarkan jawabanmu, jalur yang paling cocok adalah: **${result.recommended_path}**\n\n${result.description}` 
                        });
                        
                        // Reset to main menu and show options
                        this.currentFlow = 'main_menu';
                        this.showInitialTemplates();

                    } catch (error) {
                        this.messages.push({ sender: 'server', text: "Gagal memproses hasil." });
                    } finally {
                        this.isLoading = false;
                        this.scrollToBottom();
                    }
                },

                // Handler Jawaban Kuis Teknis
                selectAnswer(optionText) {
                    if (!this.currentQuestion) return;
                    
                    // Simpan jawaban
                    this.quizContext.userAnswers[this.currentQuestion.question_id] = optionText;
                },


                // --- UPDATE FUNGSI NAVIGASI (SHARED) ---
                goToNext() {
                    const ctx = this.activeContext;
                    if (ctx.currentQuestionIndex < ctx.questions.length - 1) {
                        ctx.currentQuestionIndex++;
                    }
                },
                goToPrev() {
                    const ctx = this.activeContext;
                    if (ctx.currentQuestionIndex > 0) {
                        ctx.currentQuestionIndex--;
                    }
                },

            }
        }).mount('#learning-buddy-app'); // Mount aplikasi
    });
})();