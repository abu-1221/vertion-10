/**
 * AI Assistant Component
 * Features: AI Chat, Model Selector, Smart Router
 */

const AI_CONFIG = {
    // API KEY is now handled securely by the backend proxy
    PROXY_ENDPOINT: "/api/ai/chat",
    DEFAULT_MODEL: "gemini-2.0-flash"
};

class AISmartBuddy {
    constructor() {
        this.activeModel = AI_CONFIG.DEFAULT_MODEL;
        this.chatHistory = [];
        this.isProcessing = false;

        this.init();
    }

    init() {
        this.createElements();
        this.bindEvents();
        this.makeDraggable();
        this.addWelcomeMessage();
    }

    createElements() {
        // Create AI Panel HTML with Minimize feature
        const panelHtml = `
            <div class="ai-panel" id="aiPanel">
                <div class="ai-header" id="aiHeader">
                    <div class="ai-header-info">
                        <div class="ai-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            </svg>
                        </div>
                        <div>
                            <div class="ai-title">Smart Assistant</div>
                            <div class="ai-status">Online</div>
                        </div>
                    </div>
                    <div class="ai-header-actions">
                        <button class="ai-minimize-btn" id="aiMinimize" title="Minimize">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <button class="ai-close" id="aiClose">✕</button>
                    </div>
                </div>
                
                <div class="ai-body-wrapper" id="aiBodyWrapper">
                    <div class="ai-model-selector" id="aiModelSelector">
                        <div class="ai-model-chip active" data-model="flash">Flash 2.5</div>
                        <div class="ai-model-chip" data-model="flash-2">Flash 2.0</div>
                        <div class="ai-model-chip" data-model="pro">Pro 2.5</div>
                        <div class="ai-model-chip" data-model="gemini-2.5">Adaptive</div>
                    </div>

                    <div class="ai-chat-area" id="aiChatArea"></div>
                    
                    <div class="ai-quick-topics" id="aiQuickTopics" style="padding: 0 1.25rem 0.75rem; display: flex; gap: 0.5rem; overflow-x: auto; scrollbar-width: none;">
                    </div>

                    <div class="ai-input-area">
                        <form id="aiChatForm" class="ai-input-wrapper">
                            <input type="text" class="ai-input" id="aiInput" placeholder="Ask me something..." autocomplete="off">
                            <button type="submit" class="ai-send" id="aiSend">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHtml);

        // References
        this.panel = document.getElementById('aiPanel');
        this.header = document.getElementById('aiHeader');
        this.chatArea = document.getElementById('aiChatArea');
        this.form = document.getElementById('aiChatForm');
        this.input = document.getElementById('aiInput');
        this.closeBtn = document.getElementById('aiClose');
        this.minBtn = document.getElementById('aiMinimize');
        this.bodyWrapper = document.getElementById('aiBodyWrapper');
        this.modelChips = document.querySelectorAll('.ai-model-chip');
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserQuery();
        });

        // Toggle panel from sidebar buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.ai-buddy-btn');
            if (btn) {
                this.togglePanel(!this.panel.classList.contains('active'));
                
                // Close mobile sidebar to ensure full visibility
                document.getElementById('sidebar')?.classList.remove('active');
                document.getElementById('menuToggle')?.classList.remove('active');
                document.getElementById('sidebarOverlay')?.classList.remove('active');
            }
        });

        // Close button
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel(false);
        });

        // Minimize switch
        this.minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMin = this.panel.classList.toggle('minimized');
            this.minBtn.innerHTML = isMin ? 
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' : 
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
            this.minBtn.title = isMin ? 'Maximize' : 'Minimize';
        });

        // Quick topic buttons
        document.querySelectorAll('.topic-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.q;
                if (query) {
                    this.input.value = query;
                    this.handleUserQuery();
                }
            });
        });

        // Model selection
        this.modelChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.modelChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.activeModel = chip.dataset.model;
            });
        });
    }

    makeDraggable() {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const onStart = (e) => {
            // Disable dragging on mobile if panel is likely fullscreen
            if (window.innerWidth <= 768) return;

            e = e || window.event;
            const isTouch = e.type === 'touchstart';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;

            pos3 = clientX;
            pos4 = clientY;
            
            if (isTouch) {
                document.ontouchend = closeDragElement;
                document.ontouchmove = elementDrag;
            } else {
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }
        };

        this.header.onmousedown = onStart;
        this.header.ontouchstart = onStart;

        const elementDrag = (e) => {
            e = e || window.event;
            const isTouch = e.type === 'touchmove';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;

            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

            // Set the element's new position:
            this.panel.style.top = (this.panel.offsetTop - pos2) + "px";
            this.panel.style.left = (this.panel.offsetLeft - pos1) + "px";
            this.panel.style.bottom = 'auto';
            this.panel.style.right = 'auto';
        };

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    togglePanel(show) {
        if (show) {
            this.panel.classList.add('active');
            if (window.innerWidth > 768) {
                this.input.focus();
            }
        } else {
            this.panel.classList.remove('active');
        }
    }

    addMessage(text, role) {
        const msgDiv = document.createElement('div');
        // UI always uses 'bot' or 'user' classes
        const displayRole = (role === 'bot' || role === 'model' || role === 'assistant') ? 'bot' : 'user';
        msgDiv.className = `ai-message ${displayRole}`;

        // Simple formatting for code blocks or multi-line text
        if (text.includes('```')) {
            const formatted = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
            msgDiv.innerHTML = formatted.replace(/\n/g, '<br>');
        } else {
            msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        }

        this.chatArea.appendChild(msgDiv);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;

        // Store role as 'user' or 'assistant' (Anthropic style) or 'model' (Gemini style)
        // We'll normalize to 'user'/'assistant' here and map later
        const normalizedRole = displayRole === 'bot' ? 'assistant' : 'user';

        // Interleaving guard: if last message has same role, append text
        if (this.chatHistory.length > 0 && this.chatHistory[this.chatHistory.length - 1].role === normalizedRole) {
            this.chatHistory[this.chatHistory.length - 1].parts[0].text += "\n" + text;
        } else {
            this.chatHistory.push({ role: normalizedRole, parts: [{ text }] });
        }
    }

    addWelcomeMessage() {
        const path = window.location.pathname.toLowerCase();
        let role = 'Guest';
        if (path.includes('staff')) role = 'Staff';
        else if (path.includes('student')) role = 'Student';

        this.addMessage(`Hello ${role}! I am your JMC Smart Assistant. I can help you with anything from navigating the system to solving complex aptitude questions or giving career advice. How can I assist you today?`, 'bot');
    }

    async handleUserQuery() {
        const query = this.input.value.trim();
        if (!query || this.isProcessing) return;

        this.input.value = '';
        this.addMessage(query, 'user');

        // 1. SMART OFFLINE ROUTER (Zero Latency Fallback)
        // This ensures the workflow is "Perfect" even without internet/API connection
        if (this.handleNavigationLocally(query)) return;

        this.setProcessing(true);

        try {
            const response = await this.callAI(query);
            this.processAIResponse(response);
        } catch (error) {
            console.error("AI Error:", error);
            // If API fails, notify but don't break the experience
            this.addMessage(`⚠️ Intelligence System Offline. I'm currently using my local routing logic. You can still navigate using keywords like "analytics", "tests", "reports", etc.`, 'bot');
        } finally {
            this.setProcessing(false);
        }
    }

    handleNavigationLocally(query) {
        const q = query.toLowerCase();

        // Comprehensive Keyword Map for smart navigation
        const routes = {
            'analytics': ['chart', 'stat', 'analytics', 'performance', 'graph', 'progress'],
            'create-test': ['create', 'new test', 'add test', 'build test', 'generate'],
            'manage-tests': ['manage', 'list', 'edit', 'all tests', 'history'],
            'students': ['student list', 'view students', 'all students', 'database'],
            'student-lookup': ['lookup', 'find', 'search', 'get student', 'registration'],
            'availability': ['take test', 'available', 'current', 'exams'],
            'tests': ['my tests', 'attended', 'results', 'past'],
            'reports': ['download', 'certificate', 'transcript', 'merit', 'report']
        };

        for (const [sectionId, keywords] of Object.entries(routes)) {
            if (keywords.some(k => q.includes(k))) {
                this.addMessage(`Switching to **${sectionId.replace('-', ' ')}** section...`, 'bot');
                this.navigateToSection(sectionId);
                return true;
            }
        }
        return false;
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        const sendBtn = document.getElementById('aiSend');
        if (processing) {
            sendBtn.style.opacity = '0.5';
            sendBtn.innerHTML = '<span class="spinner-sm"></span>';
        } else {
            sendBtn.style.opacity = '1';
            sendBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            `;
        }
    }

    getSystemPrompt() {
        const path = window.location.pathname.toLowerCase();
        const isStaff = path.includes('staff');
        const isStudent = path.includes('student');

        let roleContext = '';
        let sections = '';

        if (isStaff) {
            roleContext = 'Staff Member';
            sections = '- Create Test (id: create-test)\n- Manage Tests (id: manage-tests)\n- Students (id: students)\n- Student Lookup (id: student-lookup)';
        } else if (isStudent) {
            roleContext = 'Student Candidate';
            sections = '- Availability (id: availability)\n- Tests Attended (id: tests)\n- Analytics (id: analytics)\n- Reports (id: reports)';
        } else {
            roleContext = 'Guest / Public User';
            sections = '- No logged-in sections available. User is on the public landing/login pages.';
        }

        return `
            You are JMC Smart Assistant, a highly capable AI assistant built for JMC TEST.
            User Context: ${roleContext}
            Current Logged-In Portal Sections (if applicable):
            ${sections}
            
            Key Directives:
            1. You function as a comprehensive AI assistant similar to ChatGPT. You are fully capable of answering all types of prompts, including providing detailed test advice, solving and explaining aptitude questions, generating formatted code/text, and giving career guidance.
            2. If the user wants to navigate to a specific portal section mentioned above, include [NAVIGATE: section-id] at the very end of your response. (Do not use this for Guests).
            3. Keep your responses professional, intelligent, and helpful. Format your text nicely using markdown when applicable (bolding, lists, code blocks).
        `;
    }

    async callAI(userInput) {
        const systemPrompt = this.getSystemPrompt();
        
        // Sanitize history to ensure interleaved roles (User, Model, User, Model...)
        const sanitizedHistory = [];
        this.chatHistory.forEach((msg) => {
            const role = msg.role === 'user' ? 'user' : 'model';
            // Prevent same role twice in a row
            if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === role) {
                sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += "\n" + msg.parts[0].text;
            } else {
                sanitizedHistory.push({ role, parts: msg.parts });
            }
        });

        const body = {
            contents: sanitizedHistory.slice(-20),
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            modelId: this.activeModel === 'flash' ? 'gemini-2.0-flash' : 'gemini-2.0-pro'
        };

        const response = await fetch(AI_CONFIG.PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("Invalid response from AI Proxy");
        }

        return data.candidates[0].content.parts[0].text;
    }

    processAIResponse(responseText) {
        // Check for navigation command
        const navMatch = responseText.match(/\[NAVIGATE: ([\w-]+)\]/);

        // Clean text (remove command)
        let cleanText = responseText.replace(/\[NAVIGATE: ([\w-]+)\]/, '').trim();

        this.addMessage(cleanText, 'bot');

        if (navMatch) {
            const sectionId = navMatch[1];
            this.navigateToSection(sectionId);
        }
    }

    navigateToSection(sectionId) {
        const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if (navItem) {
            setTimeout(() => {
                navItem.click();
                this.addMessage(`Redirecting you to ${navItem.querySelector('span').textContent}...`, 'bot');
            }, 1000);
        } else {
            // Check for student subsections or special sections
            const lookup = {
                'create-test': 'create-test',
                'manage': 'manage-tests',
                'students': 'students',
                'lookup': 'student-lookup',
                'available': 'availability',
                'my-tests': 'tests',
                'stats': 'analytics',
                'results': 'reports'
            };

            const mappedId = lookup[sectionId];
            const mappedItem = document.querySelector(`.nav-item[data-section="${mappedId}"]`);
            if (mappedItem) mappedItem.click();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AISmartBuddy();
});
