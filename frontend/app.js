const chatWindow = document.getElementById('chat-window');
const chatScreen = document.getElementById('chat-screen');
const typingIndicator = document.getElementById('typing-indicator');
const optionsContainer = document.getElementById('options-container');
const questionEl = document.getElementById('chat-question');
const stepBar = document.getElementById('step-bar');
const stepLabel = document.getElementById('step-label');
const chatbotOrb = document.getElementById('chatbot-orb');
const API_BASE_URLS = [
    '', // Use relative path for unified deployment on Render
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:10000'
];

let currentStep = 0;
let userData = {
    session_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
};
let stepHistory = [];
let concernFlowState = null;
const TOTAL_STEPS = 6;
let isChatMode = false;
let isConversationalMode = false;

const TITLE_MAP = {
    "Build my Routine": "Routine Builder",
    "Help Me Fix a Concern": "Concern Assessment",
    "Create My Custom Kit": "Custom Kit Creator",
    "Hii, how can i help you": "AI Voice Assistant"
};

const ENTRY_MAP = {
    "Build my Routine": {
        icon: "fa-wand-magic-sparkles",
        desc: "Choose the perfect products for your daily skincare from top brands."
    },
    "Help Me Fix a Concern": {
        icon: "fa-magnifying-glass",
        desc: "Expert diagnostic for targeted skin solutions and specialized care."
    },
    "Create My Custom Kit": {
        icon: "fa-box-open",
        desc: "Identify your skin type and get a customized recommendation for your daily core."
    },
    "Hii, how can i help you": {
        icon: "fa-microphone-lines",
        desc: "Chat naturally with our AI assistant for personalized advice and instant answers."
    }
};

function openChat() {
    chatWindow.classList.remove('hidden');
    chatbotOrb.style.display = 'none'; // Hide orb when chat is open
    const qEl = document.getElementById('chat-question');
    if (currentStep === 0 && qEl && !qEl.textContent.trim()) {
        sendToBackend(0, userData);
    }
}

function closeChat() {
    chatWindow.classList.add('hidden');
    chatWindow.classList.remove('full-screen-results'); // Revert full screen
    chatbotOrb.style.display = 'flex'; // Show orb when chat is closed
}

function updateHeader() {
    const titleEl = document.getElementById('chat-header-title');
    const backBtn = document.getElementById('back-btn');
    const voiceBtn = document.getElementById('voice-toggle-btn');

    // Update Title
    const intent = userData.intent;
    titleEl.textContent = TITLE_MAP[intent] || "SkinCare Guru";

    // Show/Hide Back Button
    if (currentStep > 0) {
        backBtn.classList.remove('hidden');
    } else {
        backBtn.classList.add('hidden');
    }

    // Show/Hide Voice Toggle Button (visible once user picks an intent)
    if (voiceBtn && currentStep > 0) {
        const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        if (supported) {
            voiceBtn.classList.remove('hidden');
        }
    } else if (voiceBtn && currentStep === 0) {
        voiceBtn.classList.add('hidden');
    }
}

function updateProgress(step) {
    const pct = step === 0 ? 0 : Math.min((step / TOTAL_STEPS) * 100, 100);
    stepBar.style.width = pct + '%';
    if (step === 0) {
        stepLabel.textContent = '';
    } else if (step <= TOTAL_STEPS) {
        stepLabel.textContent = ''; // Removed "Step X of Y" as requested
    } else {
        stepLabel.textContent = ''; // Removed "Ready" message as requested
        stepBar.style.width = '100%';
    }
}

async function parseApiResponse(response) {
    const text = await response.text();
    let payload = null;

    try {
        payload = text ? JSON.parse(text) : null;
    } catch (err) {
        payload = null;
    }

    if (!response.ok) {
        const apiMessage = payload?.detail || payload?.message || `Request failed with status ${response.status}.`;
        throw new Error(apiMessage);
    }

    if (!payload) {
        throw new Error('The server returned an empty response.');
    }

    return payload;
}

async function requestChatApi(payload) {
    let lastError = null;

    for (const baseUrl of API_BASE_URLS) {
        try {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await parseApiResponse(response);
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('Could not reach the chatbot backend on ports 8000, 8001, or 10000.');
}

async function sendToBackend(step, data) {
    // Re-query DOM elements (they may get replaced when restarting from chat mode)
    const qEl = document.getElementById('chat-question');
    const optsEl = document.getElementById('options-container');
    const typEl = document.getElementById('typing-indicator');

    if (qEl) qEl.style.opacity = '0';
    if (optsEl) optsEl.innerHTML = '';
    if (typEl) typEl.classList.remove('hidden');

    try {
        const result = await requestChatApi({ step, data });
        if (typEl) typEl.classList.add('hidden');
        renderStep(result, step);
    } catch (err) {
        if (typEl) typEl.classList.add('hidden');
        if (qEl) {
            qEl.textContent = "⚠️ Couldn't connect to the server. Please make sure the backend is running.";
            qEl.textContent = err.message || qEl.textContent;
            qEl.style.opacity = '1';
        }
    }
}

function cleanDisplayText(value) {
    if (!value) return '';

    return String(value)
        .replace(/Lumiï¿½ra|Lumi�ra/g, 'Lumira')
        .replace(/Lumiï¿½re|Lumi�re/g, 'Lumiere')
        .replace(/Aurï¿½a|Aur�a/g, 'Aurea')
        .replace(/ï¿½clat|�clat/g, 'Eclat')
        .replace(/Rosï¿½|Ros�/g, 'Rose')
        .replace(/Â£/g, '£')
        .replace(/â€¢/g, '•')
        .replace(/\uFFFD/g, '');
}

function buildMessageHTML(text, products) {
    let html = cleanDisplayText(text)
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^SELECTED_PRODUCTS:.*$/gim, '')
        .replace(/^HIDDEN LINE.*$/gim, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/(<br>\s*){3,}/g, '<br><br>');

    if (products && products.length > 0) {
        html += `<div class="products-heading"><strong>Products</strong></div>`;
        html += `<div class="products-container">`;
        products.forEach(p => {
            const productName = cleanDisplayText(p.name);
            const productBrand = cleanDisplayText(p.brand);
            const productPrice = cleanDisplayText(p.price);
            html += `
            <div class="product-card">
                <img src="${p.image}" class="product-img" alt="${p.name}" onerror="this.src='https://via.placeholder.com/100x100/f5e6d0/a07840?text=✿'">
                <div class="product-info">
                    <h4>${productName}</h4>
                    <p>${p.brand} • ${p.price}</p>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    return cleanDisplayText(html);
}

function enterChatMode(res) {
    // If already in chat mode, just append the new message
    if (isChatMode) {
        removeTypingBubble();
        appendBotMessage(res.message, res.products);
        return;
    }

    isChatMode = true;
    updateProgress(999);
    updateHeader();

    // Store products for follow-up API calls
    if (res.products) {
        userData.recommended_products = res.products;
    }
    if (res.routine) {
        if (res.routine.morning) userData.morning_routine = res.routine.morning;
        if (res.routine.evening) userData.evening_routine = res.routine.evening;
    }

    // 1. Clear and prepare the scrollable chat screen
    chatScreen.innerHTML = '';
    chatScreen.classList.remove('centered-layout');
    chatScreen.classList.add('final-output-page');

    // Messages Area (scrollable part)
    const msgsArea = document.createElement('div');
    msgsArea.id = 'chat-messages-area';
    msgsArea.className = 'chat-messages-area';
    chatScreen.appendChild(msgsArea);

    // Initial Recommendation as first bot bubble
    appendBotMessage(res.message, res.products, msgsArea);

    // 2. Footer — add chat input if needed, else just attribution
    const footer = document.querySelector('.chat-footer');
    if (footer) {
        if (userData.intent === "Hii, how can i help you") {
            footer.innerHTML = `
                <div class="input-container chat-mode-input">
                    <textarea class="chat-textarea" id="chat-mode-textarea" placeholder="${res.placeholder || 'Ask a question...'}"></textarea>
                    <div class="input-footer">
                        <button class="send-btn-circle" id="chat-mode-send-btn">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            `;
            const textarea = footer.querySelector('#chat-mode-textarea');
            const sendBtn = footer.querySelector('#chat-mode-send-btn');
            
            const submit = () => {
                const val = textarea.value.trim();
                if (val) {
                    userData.follow_up_chat = val;
                    appendUserMessage(val);
                    textarea.value = '';
                    appendTypingBubble(document.getElementById('chat-messages-area'));
                    
                    requestChatApi({ step: 999, data: userData }).then(result => {
                        removeTypingBubble();
                        if (result.route_to) {
                            // If the AI voice assistant decided to route, redirect to that flow
                            userData.intent = result.route_to;
                            isChatMode = false;
                            
                            // Let the user know before jumping
                            appendBotMessage(result.message || `Routing you to ${result.route_to}...`);
                            
                            setTimeout(() => {
                                // Restore wizard layout
                                chatScreen.classList.remove('final-output-page');
                                chatScreen.innerHTML = `
                                    <div id="typing-indicator" class="typing-indicator hidden">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <div id="chat-question" class="chat-question"></div>
                                    <div id="options-container" class="options-container"></div>
                                `;
                                footer.innerHTML = `
                                    <div class="footer-center">
                                        <div class="footer-attribution">Powered by GuruAi Labs</div>
                                    </div>
                                `;
                                sendToBackend(1, userData);
                            }, 2500);
                        } else {
                            appendBotMessage(result.message, result.products);
                        }
                    }).catch(err => {
                        removeTypingBubble();
                        appendBotMessage("⚠️ " + (err.message || "Connection error."));
                    });
                }
            };
            sendBtn.onclick = submit;
            textarea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };
            
            // Auto-trigger voice mode if backend requests it
            if (res.voice_mode) {
                setTimeout(() => {
                    if (typeof toggleVoiceMode === 'function' && !VoiceAgent.isOn()) {
                        toggleVoiceMode();
                    }
                }, 800);
            }
            
            // Auto-focus input
            setTimeout(() => textarea.focus(), 400);
        } else {
            footer.innerHTML = `
                <div class="footer-center">
                    <div class="footer-attribution">Powered by GuruAi Labs</div>
                </div>
            `;
        }
    }
}

function appendBotMessage(text, products, container) {
    const area = container || document.getElementById('chat-messages-area');
    if (!area) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-bubble';
    bubble.innerHTML = `
        <div class="bubble-avatar"><img src="images/guru-logo.png" alt="Guru"></div>
        <div class="bubble-body">${buildMessageHTML(text, products)}</div>
    `;

    area.appendChild(bubble);
    // Auto-scroll to bottom
    area.scrollTop = area.scrollHeight;
}

function appendUserMessage(text) {
    const area = document.getElementById('chat-messages-area');
    if (!area) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user-bubble';
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fa-solid fa-user"></i></div>
        <div class="bubble-body">${text}</div>
    `;
    area.appendChild(bubble);
    // Auto-scroll to bottom
    area.scrollTop = area.scrollHeight;
}

function appendTypingBubble(container) {
    const area = container || document.getElementById('chat-messages-area');
    if (!area) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-bubble typing-bubble';
    bubble.id = 'inline-typing';
    bubble.innerHTML = `
        <div class="bubble-avatar"><img src="images/guru-logo.png" alt="Guru"></div>
        <div class="bubble-body">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
    `;
    area.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function removeTypingBubble() {
    const t = document.getElementById('inline-typing');
    if (t) t.remove();
}


function renderStep(res, step) {
    // Reset layout for non-chat screens
    chatScreen.className = 'chat-screen';
    const isConcernAssessment = res.type === "form" && Array.isArray(res.groups) && res.groups.some(group => group.type === "textarea");
    if (isConcernAssessment) {
        chatScreen.classList.add('concern-assessment-screen');
    }
    chatScreen.innerHTML = `
        <div id="typing-indicator" class="typing-indicator hidden">
            <span></span><span></span><span></span>
        </div>
        <div id="chat-question" class="chat-question"></div>
        <div id="options-container" class="options-container"></div>
    `;

    // --- If this is the final output, enter persistent chat mode ---
    if (res.next_step === 999 || step >= 999) {
        enterChatMode(res);
        return;
    }

    if (isConcernAssessment) {
        renderConcernFlow(res);
        return;
    }

    // Re-query wizard DOM elements
    const qEl = document.getElementById('chat-question');

    // --- Update header & progress ---
    updateHeader();
    updateProgress(step);

    // --- Dynamic Layout Centering ---
    if (step > 0) {
        chatScreen.classList.add('centered-layout');
    } else {
        chatScreen.classList.remove('centered-layout');
    }

    // --- Set the question text with rich formatting ---
    if (qEl) qEl.innerHTML = buildMessageHTML(res.message, res.products);

    // Animate in
    if (qEl) requestAnimationFrame(() => {
        qEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        qEl.style.transform = 'translateY(8px)';
        qEl.style.opacity = '0';
        setTimeout(() => {
            qEl.style.opacity = '1';
            qEl.style.transform = 'translateY(0)';
        }, 30);
    });

    renderOptions(res, step);
}

function renderConcernFlow(res) {
    concernFlowState = {
        groups: Array.isArray(res.groups) ? res.groups : [],
        next_step: res.next_step,
        index: 0
    };

    chatScreen.innerHTML = `
        <div id="chat-messages-area" class="chat-messages-area"></div>
    `;

    const area = document.getElementById('chat-messages-area');
    if (!area) return;

    appendBotMessage(res.message, null, area);
    renderConcernQuestion();
}

function renderConcernQuestion() {
    const area = document.getElementById('chat-messages-area');
    if (!area || !concernFlowState) return;

    const current = concernFlowState.groups[concernFlowState.index];
    if (!current) {
        transitionToStep(concernFlowState.next_step);
        return;
    }

    const existingInput = area.querySelector('.concern-input-container');
    if (existingInput) existingInput.remove();

    const questionBubble = document.createElement('div');
    questionBubble.className = 'chat-bubble bot-bubble concern-question-bubble';
    questionBubble.innerHTML = `
        <div class="bubble-body">${current.title}</div>
    `;
    area.appendChild(questionBubble);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'input-container concern-input-container';
    inputWrap.innerHTML = `
        <textarea class="chat-textarea concern-textarea" placeholder="${current.placeholder || 'Type here...'}"></textarea>
        <div class="input-footer">
            <button class="send-btn-circle">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
    `;

    const textarea = inputWrap.querySelector('textarea');
    const sendBtn = inputWrap.querySelector('.send-btn-circle');

    const submit = () => {
        const val = textarea.value.trim();
        if (!val) return;

        userData[current.data_key] = val;
        appendUserMessage(val);
        inputWrap.remove();
        concernFlowState.index += 1;

        if (concernFlowState.index >= concernFlowState.groups.length) {
            showConcernContinue(area);
        } else {
            setTimeout(() => renderConcernQuestion(), 120);
        }
    };

    sendBtn.onclick = submit;
    textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    area.appendChild(inputWrap);
    setTimeout(() => textarea.focus(), 250);
    area.scrollTop = area.scrollHeight;
}

function showConcernContinue(area) {
    const container = area || document.getElementById('chat-messages-area');
    if (!container) return;

    const existing = container.querySelector('.concern-continue-wrap');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'concern-continue-wrap';
    wrap.innerHTML = `
        <div class="chat-bubble bot-bubble concern-question-bubble">
            <div class="bubble-body">Thanks, I’ve got everything I need. Tap continue and I’ll build your recommendation.</div>
        </div>
        <button class="btn-large concern-continue-btn btn-ready" type="button">Continue <i class="fa-solid fa-arrow-right"></i></button>
    `;

    const btn = wrap.querySelector('.concern-continue-btn');
    btn.onclick = () => transitionToStep(concernFlowState.next_step);

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function renderOptions(res, step) {
    const optsEl = document.getElementById('options-container');
    if (!optsEl) return;
    optsEl.innerHTML = '';

    if (res.type === "vertical_cards") {
        res.options.forEach((opt, i) => {
            const card = document.createElement('div');
            card.className = 'vertical-card';
            card.style.animationDelay = `${i * 0.1}s`;
            card.innerHTML = `
                <h4>${opt.title}</h4>
                <p>${opt.desc}</p>
            `;
            card.onclick = () => selectOption(opt.title, res.data_key, res.next_step);
            if (optsEl) optsEl.appendChild(card);
        });
    } else if (res.type === "kit_config") {
        const config = document.createElement('div');
        config.className = 'kit-config-container';

        // Concerns Multi-Select
        const concernGrp = document.createElement('div');
        concernGrp.className = 'form-group';
        concernGrp.innerHTML = `<div class="form-subtitle">${res.concerns.title}</div>`;
        const concernOpts = document.createElement('div');
        concernOpts.className = 'form-options';

        userData[res.concerns.data_key] = userData[res.concerns.data_key] || [];

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-large';
        nextBtn.innerHTML = `Continue <i class="fa-solid fa-arrow-right"></i>`;
        nextBtn.onclick = () => {
            if (userData[res.concerns.data_key].length > 0) {
                transitionToStep(res.next_step);
            }
        };

        const checkKitComplete = () => {
            const hasConcerns = userData[res.concerns.data_key] && userData[res.concerns.data_key].length > 0;
            nextBtn.disabled = !hasConcerns;
            if (hasConcerns) {
                nextBtn.classList.add('btn-ready');
            } else {
                nextBtn.classList.remove('btn-ready');
            }
        };

        res.concerns.options.forEach(opt => {
            const pill = document.createElement('div');
            pill.className = 'pill-option';
            if (userData[res.concerns.data_key].includes(opt)) pill.classList.add('selected');
            pill.textContent = opt;
            pill.onclick = () => {
                const idx = userData[res.concerns.data_key].indexOf(opt);
                if (idx > -1) {
                    userData[res.concerns.data_key].splice(idx, 1);
                    pill.classList.remove('selected');
                } else {
                    userData[res.concerns.data_key].push(opt);
                    pill.classList.add('selected');
                }
                checkKitComplete();
            };
            concernOpts.appendChild(pill);
        });
        concernGrp.appendChild(concernOpts);
        config.appendChild(concernGrp);

        // Product Count Slider
        const sliderGrp = document.createElement('div');
        sliderGrp.className = 'slider-group';
        userData[res.quantity.data_key] = userData[res.quantity.data_key] || res.quantity.min + 1;

        sliderGrp.innerHTML = `
            <div class="slider-header">${res.quantity.title}: <span id="count-val">${userData[res.quantity.data_key]}</span></div>
            <input type="range" class="range-input" min="${res.quantity.min}" max="${res.quantity.max}" value="${userData[res.quantity.data_key]}">
            <div class="range-labels">
                <span>${res.quantity.min} products</span>
                <span>${res.quantity.max} products</span>
            </div>
        `;
        const slider = sliderGrp.querySelector('input');
        const countVal = sliderGrp.querySelector('#count-val');
        slider.oninput = () => {
            countVal.textContent = slider.value;
            userData[res.quantity.data_key] = slider.value;
        };
        config.appendChild(sliderGrp);

        // Initial state check
        checkKitComplete();

        config.appendChild(nextBtn);
        if (optsEl) optsEl.appendChild(config);

    } else if (res.type === "form") {
        const form = document.createElement('div');
        form.className = 'form-container';
        if (Array.isArray(res.groups) && res.groups.some(group => group.type === "textarea")) {
            form.classList.add('concern-assessment-form');
        }

        // Helper: re-check if all groups have a selection and toggle button state
        const checkFormComplete = () => {
            const complete = res.groups.every(g => userData[g.data_key]);
            nextBtn.disabled = !complete;
            if (complete) {
                nextBtn.classList.add('btn-ready');
            } else {
                nextBtn.classList.remove('btn-ready');
            }
        };

        res.groups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'form-group';
            groupDiv.innerHTML = `<div class="form-subtitle">${group.title}</div>`;

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'form-options';

            if (group.type === "textarea") {
                const textarea = document.createElement('textarea');
                textarea.className = 'chat-textarea form-textarea';
                textarea.placeholder = group.placeholder || "Type here...";
                textarea.value = userData[group.data_key] || '';
                textarea.oninput = () => {
                    userData[group.data_key] = textarea.value.trim();
                    checkFormComplete();
                };
                optionsDiv.appendChild(textarea);
            } else {
                group.options.forEach(opt => {
                    const pill = document.createElement('div');
                    pill.className = 'pill-option';
                    if (userData[group.data_key] === opt) pill.classList.add('active');
                    pill.textContent = opt;
                    pill.onclick = () => {
                        optionsDiv.querySelectorAll('.pill-option').forEach(p => p.classList.remove('active'));
                        pill.classList.add('active');
                        userData[group.data_key] = opt;
                        checkFormComplete();
                    };
                    optionsDiv.appendChild(pill);
                });
            }
            groupDiv.appendChild(optionsDiv);
            form.appendChild(groupDiv);
        });

        if (res.info_box) {
            const infoBox = document.createElement('div');
            infoBox.className = 'info-box';
            infoBox.innerHTML = `
                <div class="info-box-title">${res.info_box.title}</div>
                <div class="info-box-text">${res.info_box.text}</div>
            `;
            form.appendChild(infoBox);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-large';
        nextBtn.innerHTML = `Continue <i class="fa-solid fa-arrow-right"></i>`;

        // Start disabled until all groups are answered
        nextBtn.disabled = true;

        nextBtn.onclick = () => {
            const complete = res.groups.every(g => userData[g.data_key]);
            if (complete) {
                transitionToStep(res.next_step);
            }
        };
        form.appendChild(nextBtn);
        if (optsEl) optsEl.appendChild(form);
    } else if (res.type === "input") {
        const container = document.createElement('div');
        container.className = 'input-container';
        container.innerHTML = `
            <textarea class="chat-textarea" placeholder="${res.placeholder || 'Type here...'}"></textarea>
            <div class="input-footer">
                <button class="send-btn-circle">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        `;
        const textarea = container.querySelector('textarea');
        const sendBtn = container.querySelector('.send-btn-circle');

        const submit = () => {
            const val = textarea.value.trim();
            if (val) {
                userData[res.data_key] = val;
                transitionToStep(res.next_step);
            }
        };

        sendBtn.onclick = submit;
        textarea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };

        if (optsEl) optsEl.appendChild(container);
        
        // Auto-trigger voice mode if this was the conversational intent
        if (userData.intent === "Hii, how can i help you") {
            setTimeout(() => {
                if (typeof toggleVoiceMode === 'function' && !VoiceAgent.isOn()) {
                    toggleVoiceMode();
                }
            }, 800);
        }
        
        setTimeout(() => textarea.focus(), 400);
    } else if (res.options && res.options.length > 0) {
        res.options.forEach((opt, i) => {
            if (step === 0) {
                // Special rendering for Entry Cards
                const info = ENTRY_MAP[opt] || { icon: "fa-sparkles", desc: "Start journey" };
                const card = document.createElement('div');
                card.className = 'entry-card';
                card.style.animationDelay = `${i * 0.1}s`;
                card.innerHTML = `
                    <div class="entry-card-icon">
                        <i class="fa-solid ${info.icon}"></i>
                    </div>
                    <div class="entry-card-info">
                        <h4>${opt}</h4>
                        <p>${info.desc}</p>
                    </div>
                `;
                card.onclick = () => selectOption(opt, res.data_key, res.next_step);
                if (optsEl) optsEl.appendChild(card);
            } else {
                // Standard pill buttons for subsequent steps
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt;
                btn.style.animationDelay = `${i * 0.06}s`;
                btn.onclick = () => selectOption(opt, res.data_key, res.next_step);
                if (optsEl) optsEl.appendChild(btn);
            }
        });
    }
}

function transitionToStep(nextStep) {
    if (stepHistory.length > 0) {
        const lastState = stepHistory[stepHistory.length - 1].userData;
        let msgs = [];
        for (let key in userData) {
            if (key !== '_last_user_message' && JSON.stringify(userData[key]) !== JSON.stringify(lastState[key])) {
                let val = userData[key];
                if (Array.isArray(val)) val = val.join(", ");
                msgs.push(String(val));
            }
        }
        if (msgs.length > 0) {
            userData._last_user_message = msgs.join("\n");
        }
    } else if (userData.intent && currentStep === 0) {
        userData._last_user_message = String(userData.intent);
    } else if (userData.follow_up_chat) {
        userData._last_user_message = String(userData.follow_up_chat);
    }

    // Save current state to history before moving forward
    stepHistory.push({
        step: currentStep,
        userData: JSON.parse(JSON.stringify(userData))
    });

    // Slide current screen out
    chatScreen.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    chatScreen.style.opacity = '0';
    chatScreen.style.transform = 'translateX(-20px)';

    setTimeout(() => {
        chatScreen.style.transform = 'translateX(20px)';
        chatScreen.style.opacity = '0';
        currentStep = nextStep;

        sendToBackend(currentStep, userData);

        // Clear the one-off message so it doesn't repeat
        delete userData._last_user_message;

        setTimeout(() => {
            chatScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            chatScreen.style.opacity = '1';
            chatScreen.style.transform = 'translateX(0)';
        }, 60);
    }, 250);
}

function selectOption(optionText, dataKey, nextStep) {
    if (dataKey) userData[dataKey] = optionText;
    transitionToStep(nextStep);
}

function restartChat() {
    chatWindow.classList.remove('full-screen-results');

    // Turn off voice mode if active
    if (VoiceAgent.isOn()) {
        VoiceAgent.toggleVoiceMode();
    }
    TTSAgent.stop();

    // Re-hide voice toggle button
    const voiceBtn = document.getElementById('voice-toggle-btn');
    if (voiceBtn) voiceBtn.classList.add('hidden');

    userData = {
        session_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    };
    currentStep = 0;
    stepHistory = [];
    concernFlowState = null;
    isChatMode = false;
    isConversationalMode = false;

    chatScreen.style.transition = 'opacity 0.3s ease';
    chatScreen.style.opacity = '0';
    setTimeout(() => {
        // Restore wizard layout
        chatScreen.classList.remove('final-output-page');
        chatScreen.innerHTML = `
            <div id="typing-indicator" class="typing-indicator hidden">
                <span></span><span></span><span></span>
            </div>
            <div id="chat-question" class="chat-question"></div>
            <div id="options-container" class="options-container"></div>
        `;
        const footer = document.querySelector('.chat-footer');
        if (footer) {
            footer.innerHTML = `
                <div class="footer-center">
                    <div class="footer-attribution">Powered by GuruAi Labs</div>
                </div>
            `;
        }
        chatScreen.style.opacity = '1';
        sendToBackend(0, userData);
    }, 300);
}

function goBack() {
    if (stepHistory.length === 0) return;

    const prevState = stepHistory.pop();
    currentStep = prevState.step;
    userData = prevState.userData;

    // Slide current screen out (to the right)
    chatScreen.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    chatScreen.style.opacity = '0';
    chatScreen.style.transform = 'translateX(20px)';

    setTimeout(() => {
        chatScreen.style.transform = 'translateX(-20px)';
        chatScreen.style.opacity = '0';
        sendToBackend(currentStep, userData);

        setTimeout(() => {
            chatScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            chatScreen.style.opacity = '1';
            chatScreen.style.transform = 'translateX(0)';
        }, 60);
    }, 200);
}

/* ═══════════════════════════════════════════════════════════
   VOICE AGENT — Step 3: Speech-to-Text (STT) Engine
   ─────────────────────────────────────────────────────────
   All code is self-contained in the VoiceAgent namespace.
   It reads the active DOM textarea but never mutates any
   existing variable or function defined above this block.
   ═══════════════════════════════════════════════════════════ */

const VoiceAgent = (() => {

    // ── State ──────────────────────────────────────────────
    let recognition   = null;   // SpeechRecognition instance (lazy init)
    let isListening   = false;  // true while mic is open
    let voiceModeOn   = false;  // true when user has enabled voice mode
    let finalTranscript = '';   // accumulated result

    // ── DOM refs (resolved once on first use) ─────────────
    const overlay       = () => document.getElementById('voice-overlay');
    const statusLabel   = () => document.getElementById('voice-status-label');
    const toggleBtn     = () => document.getElementById('voice-toggle-btn');
    const toggleIcon    = () => document.getElementById('voice-toggle-icon');

    // ── Init SpeechRecognition (lazy, with fallback) ───────
    function initRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;

        const r = new SR();
        r.lang           = 'en-US';
        r.interimResults = true;   // show partial results in label
        r.maxAlternatives = 1;
        r.continuous     = false;  // stop after one utterance

        // ── on partial / final result ──────────────────────
        r.onresult = (event) => {
            let interim = '';
            finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += text;
                } else {
                    interim += text;
                }
            }

            // Show live transcription in status label
            const lbl = statusLabel();
            if (lbl) lbl.textContent = interim || finalTranscript || 'Listening…';
        };

        // ── recognition ended (either by silence or manually) ──
        r.onend = () => {
            isListening = false;

            if (finalTranscript.trim()) {
                _injectTranscript(finalTranscript.trim());
                _showOverlay(false);
                _setStatusLabel('Listening…');   // reset for next time
            } else {
                // Nothing heard — give feedback then close
                _setStatusLabel('Nothing heard. Try again.');
                setTimeout(() => {
                    _showOverlay(false);
                    _setStatusLabel('Listening…');
                }, 1800);
            }
        };

        // ── error handler ──────────────────────────────────
        r.onerror = (event) => {
            isListening = false;
            const messages = {
                'not-allowed' : 'Microphone blocked. Please allow access in your browser.',
                'no-speech'   : 'No speech detected. Please try again.',
                'network'     : 'Network error. Check your connection.',
                'audio-capture': 'No microphone found.',
            };
            _setStatusLabel(messages[event.error] || 'Error: ' + event.error);
            setTimeout(() => {
                _showOverlay(false);
                _setStatusLabel('Listening…');
            }, 2200);
        };

        return r;
    }

    // ── Find the active textarea in the current DOM ────────
    function _getActiveTextarea() {
        // Priority order: concern-textarea > chat-textarea > chat-inline-textarea
        return (
            document.querySelector('.concern-textarea') ||
            document.querySelector('.chat-textarea')    ||
            document.querySelector('.chat-inline-textarea')
        );
    }

    // ── Inject transcript into textarea + trigger handlers ─
    function _injectTranscript(text) {
        const ta = _getActiveTextarea();
        if (!ta) return;

        ta.value = text;

        // Fire native input event so existing oninput / checkFormComplete runs
        ta.dispatchEvent(new Event('input', { bubbles: true }));

        // Auto-focus so the user can see it
        ta.focus();

        // Attempt auto-submit: simulate Enter key on send buttons
        // This triggers the existing submit() closure inside renderConcernQuestion
        // and the input-container send button — no function references needed.
        const sendBtn = (
            document.querySelector('.concern-input-container .send-btn-circle') ||
            document.querySelector('.input-container .send-btn-circle')
        );
        if (sendBtn) {
            // Small delay so the user sees what was transcribed before it submits
            setTimeout(() => sendBtn.click(), 600);
        }
    }

    // ── Overlay helpers ────────────────────────────────────
    function _showOverlay(show) {
        const el = overlay();
        if (!el) return;
        if (show) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    function _setStatusLabel(text) {
        const lbl = statusLabel();
        if (lbl) lbl.textContent = text;
    }

    // ── Update the header toggle button appearance ─────────
    function _updateToggleBtn() {
        const btn  = toggleBtn();
        const icon = toggleIcon();
        if (!btn || !icon) return;

        if (voiceModeOn) {
            btn.classList.add('voice-active');
            btn.title = 'Voice Mode: ON — click to disable';
            icon.className = 'fa-solid fa-microphone';
        } else {
            btn.classList.remove('voice-active');
            btn.title = 'Toggle Voice Mode';
            icon.className = 'fa-solid fa-microphone-slash';
        }
    }

    // ── Start listening ────────────────────────────────────
    function _startListening() {
        if (isListening) return;

        // Lazy init
        if (!recognition) {
            recognition = initRecognition();
        }

        if (!recognition) {
            // Step 6: use styled toast instead of browser alert
            if (typeof _showVoiceToast === 'function') {
                _showVoiceToast('⚠️ Voice input requires Chrome or Edge browser.', 'warn');
            }
            voiceModeOn = false;
            _updateToggleBtn();
            return;
        }

        // Check if there is an active textarea to receive the result
        if (!_getActiveTextarea()) {
            _setStatusLabel('Please open a text input first, then tap the mic.');
            _showOverlay(true);
            setTimeout(() => _showOverlay(false), 2000);
            return;
        }

        finalTranscript = '';
        _setStatusLabel('Listening…');
        _showOverlay(true);
        isListening = true;

        try {
            recognition.start();
        } catch (e) {
            // recognition may already be started — abort and restart
            recognition.abort();
            setTimeout(() => {
                isListening = false;
                _startListening();
            }, 300);
        }
    }

    // ── Public API ─────────────────────────────────────────

    /** Called by onclick="toggleVoiceMode()" on the header button */
    function toggleVoiceMode() {
        voiceModeOn = !voiceModeOn;
        _updateToggleBtn();

        if (voiceModeOn) {
            // Immediately start listening when turned on
            _startListening();
        } else {
            // Turn off — abort any active session
            if (isListening && recognition) {
                recognition.abort();
                isListening = false;
            }
            _showOverlay(false);
        }
    }

    /** Called by onclick="cancelVoice()" on the overlay cancel button */
    function cancelVoice() {
        if (isListening && recognition) {
            recognition.abort();
            isListening = false;
        }
        _showOverlay(false);
        _setStatusLabel('Listening…');
    }

    return { toggleVoiceMode, cancelVoice, listen: _startListening, isOn: () => voiceModeOn, isListeningNow: () => isListening };

})();

// ── Expose to global scope (required by HTML onclick attributes) ──
function toggleVoiceMode() { VoiceAgent.toggleVoiceMode(); }
function cancelVoice()     { VoiceAgent.cancelVoice();     }

/* ═══════════════════════════════════════════════════════════
   VOICE AGENT — Step 4: Text-to-Speech (TTS) Engine
   ─────────────────────────────────────────────────────────
   Strategy: MutationObserver on document.body watches for
   new .bot-bubble elements. When voice mode is ON, their
   text content is spoken using SpeechSynthesis.
   Zero existing functions are modified.
   ═══════════════════════════════════════════════════════════ */

const TTSAgent = (() => {

    // ── State ──────────────────────────────────────────────
    let selectedVoice  = null;   // best available voice (resolved async)
    let isSpeaking     = false;

    // Max characters to read aloud (prevents reading 3-minute essays)
    const MAX_SPEAK_CHARS = 380;

    // ── Voice priority list (best → acceptable fallback) ──
    const PREFERRED_VOICES = [
        'Google UK English Female',
        'Google US English',
        'Microsoft Zira - English (United States)',
        'Microsoft Hazel - English (Great Britain)',
        'Samantha',    // macOS/iOS
        'Karen',       // macOS
        'Victoria',    // macOS
    ];

    // ── Resolve the best available voice ──────────────────
    function _pickBestVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return null;

        // Try preferred voices in order
        for (const name of PREFERRED_VOICES) {
            const match = voices.find(v => v.name === name);
            if (match) return match;
        }

        // Fall back to any English voice
        const english = voices.find(v => v.lang.startsWith('en'));
        return english || voices[0];
    }

    // ── Strip HTML tags and markdown for clean speech ─────
    function _cleanTextForSpeech(rawHtml) {
        // Remove HTML tags
        let text = rawHtml.replace(/<[^>]*>/g, ' ');

        // Remove markdown bold/italic/headers
        text = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g,     '$1')
            .replace(/^#{1,6}\s*/gm,   '')
            .replace(/^[-•]\s+/gm,     '')   // bullet points → plain text
            .replace(/Step\s+\d+:\s*/gi, '') // strip "Step 1:" prefixes
            .replace(/\s{2,}/g,        ' ')
            .trim();

        // Decode common HTML entities
        text = text
            .replace(/&amp;/g,  '&')
            .replace(/&nbsp;/g, ' ')
            .replace(/&bull;/g, '')
            .replace(/&#8226;/g,'');

        return text;
    }

    // ── Build a short speakable summary from bubble text ──
    function _buildSpeakable(bubble) {
        const bodyEl = bubble.querySelector('.bubble-body');
        if (!bodyEl) return '';

        const raw  = bodyEl.innerHTML || bodyEl.textContent || '';
        const text = _cleanTextForSpeech(raw);

        if (!text) return '';

        // If the text is long (e.g. a full recommendation), read a friendly
        // intro sentence + the first ~2 sentences, then tell user to scroll.
        if (text.length > MAX_SPEAK_CHARS) {
            // Extract up to 2 sentences
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
            const intro = sentences.slice(0, 2).join(' ').trim();
            const short = intro.length > 40 ? intro : text.substring(0, MAX_SPEAK_CHARS);
            return short + '… Scroll to read the full recommendation.';
        }

        return text;
    }

    // ── Speak a piece of text ──────────────────────────────
    function speak(text) {
        if (!text || !window.speechSynthesis) return;

        // Cancel any currently playing speech
        window.speechSynthesis.cancel();
        isSpeaking = false;

        const utterance = new SpeechSynthesisUtterance(text);

        // Resolve voice (voices may not be ready on first call)
        if (!selectedVoice) selectedVoice = _pickBestVoice();
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.rate   = 0.96;  // Slightly slower — feels more consultative
        utterance.pitch  = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => { isSpeaking = true; };
        utterance.onend   = () => { isSpeaking = false; };
        utterance.onerror = () => { isSpeaking = false; };

        window.speechSynthesis.speak(utterance);
    }

    // ── Stop any ongoing speech ────────────────────────────
    function stop() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }
    }

    // ── MutationObserver: watch for new bot bubbles ────────
    function _startObserver() {
        const observer = new MutationObserver((mutations) => {
            // Only act when voice mode is ON (reads VoiceAgent internal state
            // indirectly via the CSS class on the toggle button)
            const toggleBtn = document.getElementById('voice-toggle-btn');
            if (!toggleBtn || !toggleBtn.classList.contains('voice-active')) return;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) continue;

                    // Direct match — the node itself is a bot-bubble
                    if (node.classList.contains('bot-bubble') &&
                        !node.classList.contains('typing-bubble')) {
                        const text = _buildSpeakable(node);
                        if (text) speak(text);
                        return;  // Only speak one bubble per mutation batch
                    }

                    // Descendant match — bubble was added inside a container
                    const bubbles = node.querySelectorAll(
                        '.bot-bubble:not(.typing-bubble)'
                    );
                    if (bubbles.length > 0) {
                        // Speak only the last (most recent) bubble
                        const last = bubbles[bubbles.length - 1];
                        const text = _buildSpeakable(last);
                        if (text) speak(text);
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree:   true
        });
    }

    // ── Also speak wizard questions (non-bubble screens) ──
    // These are rendered into #chat-question, not .bot-bubble
    function _watchWizardQuestion() {
        const qEl = document.getElementById('chat-question');
        if (!qEl) return;

        const qObserver = new MutationObserver(() => {
            const toggleBtn = document.getElementById('voice-toggle-btn');
            if (!toggleBtn || !toggleBtn.classList.contains('voice-active')) return;

            const raw  = qEl.innerHTML || '';
            const text = _cleanTextForSpeech(raw);
            if (text && text.length > 3) speak(text);
        });

        qObserver.observe(qEl, { childList: true, subtree: true, characterData: true });
    }

    // ── Bootstrap on DOM ready ─────────────────────────────
    function init() {
        // Pre-load voices (Chrome requires a user gesture or voiceschanged event)
        if (window.speechSynthesis) {
            // Voices may load async in Chrome
            window.speechSynthesis.onvoiceschanged = () => {
                selectedVoice = _pickBestVoice();
            };
            // Try immediately (works in Firefox / Safari)
            selectedVoice = _pickBestVoice();
        }

        _startObserver();

        // Watch the wizard question element — it exists in the initial HTML
        // but may be replaced by renderStep; re-attach after each transition.
        // We poll lightly for #chat-question in case it gets swapped.
        setInterval(() => {
            const q = document.getElementById('chat-question');
            if (q && !q._ttsWatched) {
                q._ttsWatched = true;
                const qObs = new MutationObserver(() => {
                    const toggleBtn = document.getElementById('voice-toggle-btn');
                    if (!toggleBtn || !toggleBtn.classList.contains('voice-active')) return;
                    const text = _cleanTextForSpeech(q.innerHTML || '');
                    if (text && text.length > 3) speak(text);
                });
                qObs.observe(q, { childList: true, subtree: true, characterData: true });
            }
        }, 800);
    }

    return { init, speak, stop, isSpeakingNow: () => isSpeaking };

})();

// ── Boot TTS when DOM is ready ─────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TTSAgent.init());
} else {
    TTSAgent.init();
}

/* ═══════════════════════════════════════════════════════════
   VOICE AGENT — Step 5: Core Logic Sync (Auto-Loop)
   ─────────────────────────────────────────────────────────
   After TTS finishes speaking a bot message, automatically
   re-open the mic so the conversation flows hands-free.
   Uses polling against SpeechSynthesis.speaking + public
   APIs exposed by VoiceAgent & TTSAgent — zero closures opened.
   ═══════════════════════════════════════════════════════════ */

const VoiceLoopSync = (() => {

    let loopTimer  = null;   // setInterval handle
    let lastBotMsg = '';     // prevent re-speaking the same message

    // ── How long after TTS ends before mic re-opens (ms) ──
    const RESTART_DELAY_MS = 900;

    // ── Check if an input textarea is currently visible ───
    function _hasActiveInput() {
        return !!(
            document.querySelector('.concern-textarea') ||
            document.querySelector('.chat-textarea')    ||
            document.querySelector('.chat-inline-textarea')
        );
    }

    // ── Core loop tick ────────────────────────────────────
    function _tick() {
        // Only run when voice mode is ON
        if (!VoiceAgent.isOn()) return;

        // Don't start STT while TTS is speaking
        if (TTSAgent.isSpeakingNow()) return;

        // Don't start STT while already listening
        if (VoiceAgent.isListeningNow()) return;

        // Only start if there's a textarea to receive input
        if (!_hasActiveInput()) return;

        // Re-open mic after a short natural pause
        setTimeout(() => {
            // Double-check nothing changed during the delay
            if (!VoiceAgent.isOn())          return;
            if (TTSAgent.isSpeakingNow())    return;
            if (VoiceAgent.isListeningNow()) return;
            if (!_hasActiveInput())          return;

            VoiceAgent.listen();
        }, RESTART_DELAY_MS);
    }

    function start() {
        if (loopTimer) return;
        // Poll every 600ms — lightweight, no DOM thrashing
        loopTimer = setInterval(_tick, 600);
    }

    function stop() {
        if (loopTimer) {
            clearInterval(loopTimer);
            loopTimer = null;
        }
    }

    // Auto-start the loop when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    return { start, stop };

})();

/* ═══════════════════════════════════════════════════════════
   VOICE AGENT — Step 6: Permissions & Error Handling
   ─────────────────────────────────────────────────────────
   1. Browser compatibility check — hides voice button if
      SpeechRecognition is not available.
   2. Microphone permission pre-check — warns user BEFORE
      they tap the mic if permission is denied.
   3. Styled toast notification system — replaces browser
      alert() with a premium in-app notification.
   ═══════════════════════════════════════════════════════════ */

/* ── Step 6a: Styled Toast Notification System ────────────
   _showVoiceToast(message, type) is referenced by VoiceAgent
   (Step 3) via typeof guard — it must be defined globally.   */

function _showVoiceToast(message, type = 'info') {
    // Remove any existing toast
    const existing = document.getElementById('voice-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'voice-toast';
    toast.className = `voice-toast voice-toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <span class="voice-toast-icon">${type === 'warn' ? '⚠️' : type === 'error' ? '🚫' : '✅'}</span>
        <span class="voice-toast-text">${message}</span>
        <button class="voice-toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    // Insert inside chat window if open, otherwise body
    const chatWindow = document.getElementById('chat-window');
    const target = (chatWindow && !chatWindow.classList.contains('hidden'))
        ? chatWindow
        : document.body;

    target.appendChild(toast);

    // Auto-dismiss after 4 seconds
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
}

/* ── Step 6b: Browser Compatibility Check ─────────────────
   Runs once on load. Hides the voice toggle if STT is
   unavailable, and adds a tooltip explaining why.            */

function _checkVoiceCompatibility() {
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const btn = document.getElementById('voice-toggle-btn');
    if (!btn) return;

    if (!supported) {
        // Keep button hidden entirely if browser doesn't support STT
        btn.classList.add('hidden');
        btn.style.opacity  = '0.35';
        btn.style.cursor   = 'not-allowed';
        btn.title = 'Voice input requires Chrome or Edge browser';
        btn.onclick = (e) => {
            e.stopPropagation();
            _showVoiceToast('⚠️ Voice input requires Chrome or Edge. Your current browser is not supported.', 'warn');
        };
    }
}

/* ── Step 6c: Microphone Permission Pre-Check ─────────────
   Uses navigator.permissions (where available) to check mic
   state before the user even taps the button. If denied,
   we show a toast with actionable instructions immediately.  */

async function _checkMicPermission() {
    if (!navigator.permissions) return;  // not available in all browsers

    try {
        const status = await navigator.permissions.query({ name: 'microphone' });

        if (status.state === 'denied') {
            // Mark the toggle button as denied
            const btn = document.getElementById('voice-toggle-btn');
            if (btn) {
                btn.title = 'Microphone blocked — click for help';
                btn.classList.add('voice-perm-denied');
            }
        }

        // React to live permission changes (e.g. user grants from browser bar)
        status.onchange = () => {
            const btn = document.getElementById('voice-toggle-btn');
            if (!btn) return;

            if (status.state === 'granted') {
                btn.classList.remove('voice-perm-denied');
                btn.title = 'Toggle Voice Mode';
                _showVoiceToast('✅ Microphone access granted! Tap the mic to start.', 'info');
            } else if (status.state === 'denied') {
                btn.classList.add('voice-perm-denied');
                btn.title = 'Microphone blocked — click for help';
                if (VoiceAgent.isOn()) {
                    // Force voice mode off
                    VoiceAgent.toggleVoiceMode();
                }
                _showVoiceToast('🚫 Microphone was blocked. Please allow access in browser settings.', 'error');
            }
        };
    } catch (_) {
        // navigator.permissions.query may throw on some browsers — silently ignore
    }
}

/* ── Step 6d: Permission-aware toggle override ────────────
   Wraps the header button click to check mic state first
   and show a helpful toast if denied, instead of failing silently. */

(function _patchVoiceToggleForPermissions() {
    // Wait for DOM to be ready
    const boot = () => {
        const btn = document.getElementById('voice-toggle-btn');
        if (!btn) return;

        // Store original onclick
        const _originalOnClick = btn.onclick;

        btn.onclick = async (e) => {
            // If browser doesn't support STT, let the existing handler show toast
            const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            if (!supported) {
                _showVoiceToast('⚠️ Voice input requires Chrome or Edge browser.', 'warn');
                return;
            }

            // Check mic permission before toggling ON
            if (!VoiceAgent.isOn() && navigator.permissions) {
                try {
                    const status = await navigator.permissions.query({ name: 'microphone' });
                    if (status.state === 'denied') {
                        _showVoiceToast(
                            '🚫 Microphone access is blocked. Click the lock icon in your browser address bar → allow microphone → refresh.',
                            'error'
                        );
                        return;
                    }
                } catch (_) { /* permissions API not available — proceed */ }
            }

            // All good — call original toggle
            if (_originalOnClick) _originalOnClick.call(btn, e);
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

/* ── Step 6 Bootstrap ─────────────────────────────────────── */
(function _bootStep6() {
    const run = () => {
        _checkVoiceCompatibility();
        _checkMicPermission();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
