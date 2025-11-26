(function () {
  // 1. Konfigurasi
  const API_BASE_URL = "http://localhost:8000"; // Sesuaikan jika backend di-deploy
  const WIDGET_CSS_URL = API_BASE_URL + "/widget/style/widget.css"; // Asumsi CSS ada di backend
  const VUE_CDN_URL = "https://unpkg.com/vue@3/dist/vue.global.js";

  // 2. Fungsi Pemuat (Loader)
  function loadScript(src, callback) {
    const script = document.createElement("script");
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  }
  function loadCSS(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  // 3. Mulai Muat Vue
  loadScript(VUE_CDN_URL, () => {
    loadCSS(WIDGET_CSS_URL);

    const appDiv = document.createElement("div");
    appDiv.id = "learning-buddy-app";
    document.body.appendChild(appDiv);

    // 4. Buat Aplikasi Vue
    const { createApp } = Vue;

    createApp({
      // 5. Template
      template: `
                <div>
                    <!-- Tombol Chat -->
                    <div>
                    <!-- 
                      TOMBOL CHAT FLOATING (Updated) 
                      Sekarang menggunakan Icon SVG, bukan text 'Chat' 
                    -->
                    <div class="chat-button" 
                         v-if="windowState !== 'fullscreen'" 
                         @click="togglePopup">
                        
                        <!-- Ikon Close (X) jika popup terbuka -->
                        <svg v-if="windowState === 'popup'" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>

                        <!-- Ikon Chat Bubble jika tertutup -->
                        <svg v-else viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12.375m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                    </div>
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
                                <!-- LOADING INDICATOR POPUP -->
                                <div v-if="isLoading" class="chat-message server typing">
                                    <div class="typing-indicator">
                                        <div class="typing-dot"></div>
                                        <div class="typing-dot"></div>
                                        <div class="typing-dot"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="chat-footer">
                                <!-- Dropdown Mode Chat (Popup) -->
                                <select v-model="chatMode" class="mode-select" :disabled="isLoading">
                                    <option value="to the point">To the Point</option>
                                    <option value="teman">Teman</option>
                                    <option value="instruktor">Instruktur</option>
                                    <option value="rekan">Rekan Kerja</option>
                                </select>

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
                            
                            <div class="fs-sidebar" :class="{ 'quiz-active': showQuizPanel }">
                                <div v-show="showQuizPanel" class="fs-quiz-container">
                                    
                                    <div class="fs-quiz-header">
                                        <h4>{{ isAssessmentMode ? 'Tes Minat' : 'Kuis Teknis' }}</h4>
                                        
                                        <div class="fs-quiz-progress-bar">
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
                                    
                                    <div class="fs-quiz-form" ref="quizFormFs">
                                        <template v-if="currentQuestion">
                                            <div class="fs-quiz-question">
                                                <p class="fs-quiz-desc">{{ isAssessmentMode ? currentQuestion.question : currentQuestion.question_desc }}</p>
                                                
                                                <div class="fs-quiz-options">
                                                    
                                                    <!-- MODE 1: ASESMEN -->
                                                    <template v-if="isAssessmentMode">
                                                        <button v-for="opt in currentQuestion.options" 
                                                                :key="opt.value"
                                                                class="fs-quiz-option-btn"
                                                                :class="{ 'selected': assessmentContext.answers[assessmentContext.currentQuestionIndex] === opt.value }"
                                                                @click="selectAssessmentAnswer(opt.value)">
                                                            {{ opt.text }}
                                                        </button>
                                                    </template>

                                                    <!-- MODE 2: KUIS TEKNIS -->
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
                                    
                                    <div class="fs-quiz-footer">
                                        <button class="fs-quiz-nav-btn" 
                                                @click="goToPrev"
                                                :disabled="activeContext.currentQuestionIndex === 0">
                                            &lt;&lt; PREV
                                        </button>
                                        
                                        <button class="fs-quiz-nav-btn" 
                                                v-if="activeContext.currentQuestionIndex < activeContext.questions.length - 1"
                                                @click="goToNext"
                                                :disabled="!currentAnswerSelected">
                                            NEXT &gt;&gt;
                                        </button>
                                        
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
                            
                            <div class="fs-chat-area">
                                <div class="fs-header">
                                    <span>Today</span>
                                    <button class="chat-header-close fs-close" @click="closeChat">&times;</button>
                                </div>
                                <div class="fs-body" ref="chatBodyFs">
     <div v-for="(msg, index) in messages" :key="index" :class="['fs-message', msg.sender === 'klien' ? 'user' : 'buddy']">
        
        <div v-if="msg.sender === 'server'" class="fs-avatar buddy">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"></path></svg>
        </div>

        <div class="fs-bubble">
            <div v-html="formatMessage(msg.text)"></div>
            <div class="quick-reply-container" v-if="msg.options && msg.options.length > 0">
                <button v-for="option in msg.options" :key="option" class="quick-reply-button" @click="sendQuickReply(option)">
                    {{ option }}
                </button>
            </div>
        </div>

        <div v-if="msg.sender === 'klien'" class="fs-avatar user">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"></path></svg>
            <div class="fs-avatar-tie"></div>
        </div>

    </div>

    <!-- LOADING INDICATOR FULLSCREEN -->
    <div v-if="isLoading && !showQuizPanel" class="fs-message buddy">
        <div class="fs-avatar buddy">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"></path></svg>
        </div>
        <div class="fs-bubble typing">
             <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    </div>
</div>
                                
                                <div class="fs-footer">
                                    <!-- Dropdown Mode Chat (Fullscreen) -->
                                    <select v-model="chatMode" class="mode-select fs-mode" :disabled="isLoading || showQuizPanel">
                                        <option value="to the point">To the Point</option>
                                        <option value="teman">Teman</option>
                                        <option value="instruktor">Instruktur</option>
                                        <option value="rekan">Rekan Kerja</option>
                                    </select>

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
          windowState: "closed",
          isLoading: false,
          newMessage: "",
          messages: [],

          currentFlow: "main_menu",
          inputPlaceholder: "Ketik atau pilih opsi...",
          showQuizPanel: false,

          // (BARU) State Mode Chat
          chatMode: "to the point", // Default sesuai backend

          quizContext: {
            interest: null,
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: {},
          },
          isAssessmentMode: false,
          assessmentContext: {
            questions: [],
            currentQuestionIndex: 0,
            answers: [],
          },
        };
      },
      // 7. Computed Properties
      computed: {
        activeContext() {
          return this.isAssessmentMode
            ? this.assessmentContext
            : this.quizContext;
        },
        currentQuestion() {
          const ctx = this.activeContext;
          if (ctx.questions && ctx.questions.length > 0) {
            return ctx.questions[ctx.currentQuestionIndex];
          }
          return null;
        },
        currentAnswerSelected() {
          if (!this.currentQuestion) return false;
          if (this.isAssessmentMode) {
            return !!this.assessmentContext.answers[
              this.assessmentContext.currentQuestionIndex
            ];
          } else {
            return !!this.quizContext.userAnswers[
              this.currentQuestion.question_id
            ];
          }
        },
        allQuestionsAnswered() {
          if (this.isAssessmentMode) {
            const answered = this.assessmentContext.answers.filter(
              (a) => a
            ).length;
            return answered === this.assessmentContext.questions.length;
          } else {
            const answered = Object.keys(this.quizContext.userAnswers).length;
            return (
              this.quizContext.questions.length > 0 &&
              answered === this.quizContext.questions.length
            );
          }
        },
      },
      // 8. Methods
      methods: {
        scrollToBottom() {
          this.$nextTick(() => {
            const body = this.$refs.chatBody || this.$refs.chatBodyFs;
            if (body) {
              body.scrollTop = body.scrollHeight;
            }
          });
        },
        formatMessage(text) {
          let formatted = String(text);
          formatted = formatted.replace(
            /^### (.*$)/gim,
            '<h3 style="margin: 12px 0 6px 0; font-size: 15px; font-weight: 700;">$1</h3>'
          );

          formatted = formatted.replace(
            /^## (.*$)/gim,
            '<h2 style="margin: 14px 0 8px 0; font-size: 16px; font-weight: 700;">$1</h2>'
          );

          formatted = formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
          );

          formatted = formatted.replace(
            /^\s*[\-\*]\s+(.*)$/gm,
            '<div style="display: flex; align-items: flex-start; margin-left: 8px; margin-bottom: 4px;"><span style="margin-right:6px;">•</span><span>$1</span></div>'
          );
          formatted = formatted.replace(
            /(?<!\w)\*([^\*\n]+)\*(?!\w)/g,
            "<em>$1</em>"
          );

          formatted = formatted.replace(/\n/g, "<br>");

          return formatted;
        },
        removeLastOptions() {
          for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].sender === "server") {
              if (this.messages[i].options) {
                this.messages[i].options = null;
              }
              break;
            }
          }
        },
        togglePopup() {
          if (this.windowState === "closed") {
            this.windowState = "popup";
            if (this.messages.length === 0) {
              this.showInitialTemplates();
            }
          } else {
            this.windowState = "closed";
          }
        },
        goFullscreen() {
          this.windowState = "fullscreen";
        },
        closeChat() {
          this.windowState = "closed";
        },

        showInitialTemplates() {
          this.messages.push({
            sender: "server",
            text: "Halo! Saya Learning Buddy. Anda bisa pilih salah satu opsi di bawah ini:",
            options: [
              "Cek Minat Belajar",
              "Cek Progres",
              "Rekomendasi Kuis",
              "Tanya Soal",
            ],
          });
          this.currentFlow = "main_menu";
          this.inputPlaceholder = "Ketik atau pilih opsi...";
          this.scrollToBottom();
        },
        resetQuizContext() {
          this.quizContext = {
            interest: null,
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: {},
          };
          this.showQuizPanel = false;
        },

        sendQuickReply(text) {
          this.messages.push({ sender: "klien", text: text });
          this.scrollToBottom();
          this.removeLastOptions();
          this.handleMessage(text);
        },
        sendMessage() {
          const msgText = this.newMessage.trim();
          if (msgText === "" || this.isLoading) return;

          this.messages.push({ sender: "klien", text: msgText });
          this.newMessage = "";
          this.scrollToBottom();
          this.handleMessage(msgText);
        },

        // --- BARU: Fungsi untuk Mengambil Konteks Halaman ---
        getPageContext() {
            const appElement = document.getElementById('learning-buddy-app');
            
            // 1. Full Content (Exclude Widget)
            let fullContent = "";
            // Loop direct children of body untuk menghindari widget
            Array.from(document.body.children).forEach(child => {
                if (child !== appElement && !child.contains(appElement)) {
                    fullContent += (child.innerText || "") + "\n";
                }
            });

            // 2. Visible Viewport (Exclude Widget)
            let visibleTexts = [];
            // Targetkan elemen teks spesifik untuk mengurangi noise
            const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div'); 
            
            elements.forEach(el => {
                // Skip jika elemen adalah bagian dari widget
                if (appElement && (appElement === el || appElement.contains(el))) return;

                const rect = el.getBoundingClientRect();
                // Logic: Jika elemen ada di dalam area viewport (dengan sedikit toleransi 50px)
                if (rect.top >= -50 && rect.bottom <= (window.innerHeight + 50)) {
                   // Cek apakah elemen punya teks yang cukup panjang & valid
                   if (el.innerText && el.innerText.trim().length > 5 && el.offsetParent !== null) {
                       visibleTexts.push(el.innerText.trim());
                   }
                }
            });
            
            // Hapus duplikat sederhana
            visibleTexts = [...new Set(visibleTexts)];
            
            return {
                full: fullContent.trim(),
                visible: visibleTexts.join("\n")
            };
        },

        async handleMessage(msgText) {
          this.isLoading = true;
          this.removeLastOptions();
          const msgLower = msgText.toLowerCase();

          try {
            switch (this.currentFlow) {
              case "awaiting_email":
                // Logic lama jika masih ada (fallback)
                await this.callProgressApi(msgText);
                break;
              case "awaiting_question":
                await this.callAskApi(msgText);
                break;
              case "recommend_await_interest":
                this.quizContext.interest = msgText;
                await this.callGetQuizApi();
                break;
              case "main_menu":
              default:
                if (msgLower.includes("cek progres")) {
                  // --- PERUBAHAN DI SINI: Email Hardcoded ---
                  // Masukkan email yang ingin Anda gunakan secara otomatis
                  const myEmail = "rafy@gmail.com"; 

                  this.messages.push({
                    sender: "server",
                    text: `Baik, saya akan mengecek progres belajar untuk email: ${myEmail}...`,
                  });
                  
                  // Langsung panggil API tanpa meminta input user lagi
                  await this.callProgressApi(myEmail);
                  
                } else if (msgLower.includes("rekomendasi kuis")) {
                  await this.startQuizFlow();
                } else if (
                  msgLower.includes("cek minat") ||
                  msgLower.includes("minat belajar")
                ) {
                  await this.startAssessmentFlow();
                } else if (
                  msgLower.includes("tanya") ||
                  msgLower.includes("soal")
                ) {
                  this.messages.push({
                    sender: "server",
                    text: "Silakan ketik pertanyaan Anda:",
                  });
                  this.currentFlow = "awaiting_question";
                  this.inputPlaceholder = "Ketik pertanyaan Anda...";
                } else {
                  await this.callAskApi(msgText);
                }
                break;
            }
          } catch (error) {
            console.error("Error in handleMessage:", error);
            this.messages.push({
              sender: "server",
              text: `Maaf, terjadi kesalahan: ${error.message}`,
            });
          } finally {
            this.isLoading = false;
            this.scrollToBottom();
            if (this.currentFlow === "main_menu" && !this.isLoading) {
              const lastMsg = this.messages[this.messages.length - 1];
              if (!lastMsg.options) {
                this.showInitialTemplates();
              }
            }
          }
        },

        async callProgressApi(email) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/progress`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email }),
            });
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.detail || `Email tidak ditemukan`);
            }
            const data = await response.json();
            this.messages.push({ sender: "server", text: data.bot_response });
          } catch (error) {
            console.error("Error di callProgressApi:", error);
            this.messages.push({
              sender: "server",
              text: `Maaf, terjadi kesalahan: ${error.message}`,
            });
          } finally {
            this.currentFlow = "main_menu";
            this.inputPlaceholder = "Ketik atau pilih opsi...";
          }
        },

        // FITUR 2: Tanya Soal (Updated dengan On-Page RAG)
        async callAskApi(question) {
          try {
            // 1. TRIGGER: Ambil Konteks Halaman secara otomatis di sini
            const pageCtx = this.getPageContext();
            
            // 2. Kirim ke Backend
            const response = await fetch(`${API_BASE_URL}/api/v1/ask`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: question,
                preset: this.chatMode,
                full_page_content: pageCtx.full,  // <-- Kirim full modul
                visible_text: pageCtx.visible     // <-- Kirim fokus user
              }),
            });
            if (!response.ok) throw new Error("API /ask gagal");

            const data = await response.json();
            this.messages.push({ sender: "server", text: data.bot_response });
          } catch (error) {
            console.error("Error di callAskApi:", error);
            this.messages.push({
              sender: "server",
              text: `Maaf, terjadi kesalahan: ${error.message}`,
            });
          } finally {
            this.currentFlow = "main_menu";
            this.inputPlaceholder = "Ketik atau pilih opsi...";
          }
        },

        async startQuizFlow() {
          this.resetQuizContext();
          const response = await fetch(
            `${API_BASE_URL}/api/v1/recommend/interests`
          );
          if (!response.ok) throw new Error(`API /recommend/interests gagal`);

          const data = await response.json();
          const interests = data.map((item) => item.name);

          this.messages.push({
            sender: "server",
            text: "Tentu! Silakan pilih minat Anda:",
            options: interests,
          });
          this.currentFlow = "recommend_await_interest";
        },

        async callGetQuizApi() {
          this.isLoading = true;
          this.messages.push({
            sender: "server",
            text: "Mempersiapkan kuis campuran untuk Anda...",
          });
          this.scrollToBottom();

          const params = new URLSearchParams({
            kategori_minat: this.quizContext.interest,
          });

          const response = await fetch(
            `${API_BASE_URL}/api/v1/recommend/quiz?${params}`
          );

          this.isLoading = false;
          this.removeLastOptions();

          if (!response.ok) {
            const errData = await response.json();
            this.messages.push({
              sender: "server",
              text: `Maaf, gagal memuat kuis: ${errData.detail}`,
            });
            this.scrollToBottom();
            this.currentFlow = "main_menu";
            this.showInitialTemplates();
            return;
          }

          const data = await response.json();
          this.quizContext.questions = data;
          this.quizContext.currentQuestionIndex = 0;
          this.quizContext.answers = [];

          if (this.quizContext.questions.length > 0) {
            this.showQuizPanel = true;
            this.goFullscreen();
            this.currentFlow = "recommend_await_quiz_answer";
          } else {
            this.messages.push({
              sender: "server",
              text: "Tidak ada pertanyaan kuis yang ditemukan untuk minat tersebut.",
            });
            this.currentFlow = "main_menu";
            this.showInitialTemplates();
          }
          this.scrollToBottom();
        },

        async submitFullQuiz() {
          this.isLoading = true;
          if (!this.allQuestionsAnswered) {
            alert("Harap jawab semua pertanyaan kuis sebelum mengirim.");
            this.isLoading = false;
            return;
          }
          const formattedAnswers = Object.entries(
            this.quizContext.userAnswers
          ).map(([q_id, answer_text]) => {
            return {
              question_id: parseInt(q_id),
              selected_answer: answer_text,
            };
          });
          this.quizContext.answers = formattedAnswers;
          this.messages.push({
            sender: "klien",
            text: "Kuis saya sudah selesai, ini jawabannya.",
          });
          this.scrollToBottom();
          await this.callSubmitQuizApi();
        },

        async callSubmitQuizApi() {
          const body = {
            kategori_minat: this.quizContext.interest,
            answers: this.quizContext.answers,
          };
          const response = await fetch(
            `${API_BASE_URL}/api/v1/recommend/submit`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );

          this.showQuizPanel = false;
          this.isLoading = false;

          if (!response.ok) {
            const errData = await response.json();
            this.messages.push({
              sender: "server",
              text: `Maaf, gagal mengirim kuis: ${errData.detail}`,
            });
            this.scrollToBottom();
            this.currentFlow = "main_menu";
            this.resetQuizContext();
            this.showInitialTemplates();
            return;
          }

          const data = await response.json();
          this.messages.push({ sender: "server", text: data.bot_response });
          this.messages.push({
            sender: "server",
            text: `Rekomendasi kursus untukmu: **${data.suggested_course_name}**`,
          });
          this.currentFlow = "main_menu";
          this.resetQuizContext();
          this.scrollToBottom();
          this.showInitialTemplates();
        },

        async startAssessmentFlow() {
          this.isAssessmentMode = true;
          this.isLoading = true;
          this.goFullscreen();
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/v1/assessment/questions`
            );
            const data = await response.json();
            if (!data || data.length === 0)
              throw new Error("Data asesmen kosong");
            this.assessmentContext = {
              questions: data,
              currentQuestionIndex: 0,
              answers: new Array(data.length).fill(null),
            };
            this.showQuizPanel = true;
          } catch (error) {
            console.error(error);
            this.messages.push({
              sender: "server",
              text: "Gagal memuat asesmen.",
            });
            this.closeChat();
          } finally {
            this.isLoading = false;
            this.scrollToBottom();
          }
        },

        selectAssessmentAnswer(categoryValue) {
          const idx = this.assessmentContext.currentQuestionIndex;
          this.assessmentContext.answers[idx] = categoryValue;
        },

        async submitAssessment() {
          this.isLoading = true;
          try {
            const validAnswers = this.assessmentContext.answers.filter(
              (a) => a
            );
            const response = await fetch(
              `${API_BASE_URL}/api/v1/assessment/submit`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: validAnswers }),
              }
            );
            const result = await response.json();

            this.showQuizPanel = false;
            this.isAssessmentMode = false;
            this.messages.push({
              sender: "klien",
              text: "Saya sudah selesai tes minat.",
            });
            this.messages.push({
              sender: "server",
              text: `Berdasarkan jawabanmu, jalur yang paling cocok adalah: **${result.recommended_path}**\n\n${result.description}`,
            });
            this.currentFlow = "main_menu";
            this.showInitialTemplates();
          } catch (error) {
            this.messages.push({
              sender: "server",
              text: "Gagal memproses hasil.",
            });
          } finally {
            this.isLoading = false;
            this.scrollToBottom();
          }
        },

        selectAnswer(optionText) {
          if (!this.currentQuestion) return;
          this.quizContext.userAnswers[this.currentQuestion.question_id] =
            optionText;
        },

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
      },
    }).mount("#learning-buddy-app");
  });
})();