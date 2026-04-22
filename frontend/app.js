const chatWindow = document.getElementById('chat-window');
const chatScreen = document.getElementById('chat-screen');
const typingIndicator = document.getElementById('typing-indicator');
const optionsContainer = document.getElementById('options-container');
const questionEl = document.getElementById('chat-question');
const stepBar = document.getElementById('step-bar');
const stepLabel = document.getElementById('step-label');
const chatbotOrb = document.getElementById('chatbot-orb');
const API_BASE_URLS = [
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:10000'
];

let currentStep = 0;
let userData = {};
let stepHistory = [];
let concernFlowState = null;
const TOTAL_STEPS = 6;
let isChatMode = false;
let isConversationalMode = false;

const TITLE_MAP = {
    "Build my Routine": "Routine Builder",
    "Help Me Fix a Concern": "Concern Assessment",
    "Create My Custom Kit": "Custom Kit Creator"
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
    }
};

function openChat() {
    chatWindow.classList.remove('hidden');
    chatbotOrb.style.display = 'none'; // Hide orb when chat is open
    const qEl = document.getElementById('chat-question');
    if (currentStep === 0 && qEl && !qEl.textContent.trim()) {
        sendToBackend(0, {});
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

    // Update Title
    const intent = userData.intent;
    titleEl.textContent = TITLE_MAP[intent] || "SkinCare Guru";

    // Show/Hide Back Button
    if (currentStep > 0) {
        backBtn.classList.remove('hidden');
    } else {
        backBtn.classList.add('hidden');
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

    // 2. Footer — just attribution, no chat input
    const footer = document.querySelector('.chat-footer');
    if (footer) {
        footer.innerHTML = `
            <div class="footer-center">
                <div class="footer-attribution">Powered by GuruAi Labs</div>
            </div>
        `;
    }
}

function appendBotMessage(text, products, container) {
    const area = container || document.getElementById('chat-messages-area');
    if (!area) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-bubble';
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fa-solid fa-sparkles"></i></div>
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
        <div class="bubble-avatar"><i class="fa-solid fa-sparkles"></i></div>
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
    userData = {};
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
        chatScreen.style.opacity = '1';
        sendToBackend(0, {});
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
