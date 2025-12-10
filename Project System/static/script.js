/* --- PRELOADER SCRIPT --- */
window.addEventListener("load", function() {
    const loader = document.getElementById("preloader");
    setTimeout(function() {
        loader.classList.add("loader-hidden");
        loader.addEventListener("transitionend", function() {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
        });
    }, 1000);
});

/* --- CUSTOM MODAL LOGIC (NEW) --- */
const modal = {
    overlay: document.getElementById('custom-modal'),
    title: document.getElementById('modal-title'),
    message: document.getElementById('modal-message'),
    cancelBtn: document.getElementById('modal-cancel'),
    confirmBtn: document.getElementById('modal-confirm'),
    pendingCallback: null
};

// Initialize Modal Listeners
if (modal.overlay) {
    modal.cancelBtn.addEventListener('click', hideModal);
    modal.confirmBtn.addEventListener('click', () => {
        if (modal.pendingCallback) modal.pendingCallback();
        hideModal();
    });
    modal.overlay.addEventListener('click', (e) => {
        if (e.target === modal.overlay) hideModal();
    });
}

function showModal(title, text, type, callback) {
    modal.title.textContent = title;
    modal.message.textContent = text;
    modal.pendingCallback = callback;

    modal.confirmBtn.className = 'modal-btn confirm';
    modal.cancelBtn.style.display = 'block'; 

    if (type === 'delete') {
        modal.confirmBtn.textContent = 'Delete';
        modal.confirmBtn.style.backgroundColor = '#ef4444'; 
    } else if (type === 'info') {
        modal.confirmBtn.textContent = 'OK';
        modal.confirmBtn.className = 'modal-btn primary'; 
        modal.cancelBtn.style.display = 'none'; 
    }

    modal.overlay.classList.remove('hidden');
    setTimeout(() => {
        modal.overlay.classList.add('show');
    }, 10);
}

function hideModal() {
    modal.overlay.classList.remove('show');
    setTimeout(() => {
        modal.overlay.classList.add('hidden');
        modal.pendingCallback = null;
    }, 300); 
}

/* --- EXISTING SCRIPT BELOW... --- */
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Global DOM References ---
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');

    let currentSessionId = sessionStorage.getItem('current_chat_session'); 
    let isChatActive = false; 

    // Prevent Flash
    if (currentSessionId && chatLog && presetButtonsContainer) {
        chatLog.style.transition = 'none';
        presetButtonsContainer.style.transition = 'none';
        chatLog.classList.add('expanded');
        presetButtonsContainer.classList.add('hidden');
        isChatActive = true;
    }

    // --- Helper Functions ---
    function displayMessage(message, sender) {
        if (!chatLog) return; 
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        const senderClass = sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot';
        messageElement.classList.add(senderClass);
        messageElement.innerHTML = message; 
        chatLog.appendChild(messageElement);
        scrollToBottom(); 
    }

    function toggleInputState(disabled) {
        if (!chatInput) return;
        const btn = chatForm.querySelector('button');
        chatInput.disabled = disabled;
        if(btn) {
            btn.disabled = disabled;
            btn.textContent = disabled ? 'Thinking...' : 'Send';
        }
    }
    
    function scrollToBottom() {
        if(chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    function startChatSession(animated = true) {
        if (!isChatActive && presetButtonsContainer && chatLog) {
            isChatActive = true;
            if (!animated) {
                chatLog.style.transition = 'none';
                presetButtonsContainer.style.transition = 'none';
            }
            presetButtonsContainer.classList.add('hidden');
            chatLog.classList.add('expanded');
            if (!animated) {
                setTimeout(() => {
                    chatLog.style.transition = '';
                    presetButtonsContainer.style.transition = '';
                }, 50);
            }
        }
    }

    // --- Database / Persistence ---
    async function deleteSession(sessionId) {
        showModal('Delete Chat?', 'Are you sure you want to remove this history?', 'delete', async () => {
            try {
                const response = await fetch(`/delete_chat/${sessionId}`, { method: 'POST' });
                if (response.ok) {
                    if (sessionId === currentSessionId) {
                        startNewChat(); 
                    } else {
                        renderSidebarHistory(); 
                    }
                } else {
                    showModal('Error', 'Failed to delete chat on the server.', 'info');
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
            }
        });
    }
    
    async function loadSession(sessionId) {
        if (!chatLog) return false; 
        try {
            const response = await fetch(`/load_session/${sessionId}`);
            if (!response.ok) return false;
            const data = await response.json();
            if (data.history && data.history.length > 0) {
                chatLog.innerHTML = ''; 
                data.history.forEach(msg => {
                    const senderClass = msg.sender === 'user' ? 'user' : 'bot';
                    displayMessage(msg.content, senderClass);
                });
                return true; 
            } 
            return false;
        } catch (error) {
            console.error('Error loading session:', error);
            return false; 
        }
    }

    async function renderSidebarHistory() {
        if (!historyList) return;
        try {
            const response = await fetch('/get_chat_list');
            if (response.status === 401) return; 
            if (!response.ok) throw new Error(`Failed to load chat list: ${response.status}`);
            const data = await response.json();
            historyList.innerHTML = '';
            
            data.sessions.forEach(session => {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'history-item';
                if (session.id === currentSessionId) itemContainer.classList.add('active'); 
                
                const titleSpan = document.createElement('span');
                titleSpan.className = 'history-title';
                titleSpan.textContent = session.title || 'New Chat';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-chat-btn';
                deleteBtn.innerHTML = '&times;'; 
                deleteBtn.title = 'Delete chat';

                itemContainer.addEventListener('click', () => {
                    if (session.id !== currentSessionId) {
                        sessionStorage.setItem('current_chat_session', session.id);
                        window.location.reload();
                    }
                });

                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    deleteSession(session.id);
                });
                
                itemContainer.appendChild(titleSpan);
                itemContainer.appendChild(deleteBtn);
                historyList.appendChild(itemContainer);
            });
        } catch (error) {
            console.error('Error fetching chat list:', error);
        }
    }

    async function startNewChat() {
        if (!chatLog) return; 
        try {
            const response = await fetch('/new_chat', { method: 'POST' });
            
            if (response.status === 401) {
                 showModal('Login Required', 'You must be logged in to start a new chat.', 'info', () => {
                     window.location.href = '/login';
                 });
                 return;
            }

            const data = await response.json();
            currentSessionId = data.session_id; 
            sessionStorage.setItem('current_chat_session', currentSessionId);
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
            isChatActive = false;
            if (presetButtonsContainer) {
                presetButtonsContainer.classList.remove('hidden');
                presetButtonsContainer.style.transition = ''; 
            }
            if (chatLog) {
                chatLog.classList.remove('expanded'); 
                chatLog.style.transition = ''; 
            }
            renderSidebarHistory(); 
            if(sidebar) sidebar.classList.remove('open');
        } catch (error) {
            console.error('Error starting new chat:', error);
            showModal('Error', 'Could not start new chat session.', 'info');
        }
    }

    async function sendMessage(message) {
        if (message.trim() === "") return;
        startChatSession(true); 
        displayMessage(message.replace(/\n/g, '<br>'), 'user'); 
        if(chatInput) { chatInput.value = ''; chatInput.style.height = 'auto'; }
        toggleInputState(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, session_id: currentSessionId })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.response || `HTTP error! status: ${response.status}`);

            // Update Session ID if new
            if (data.session_id && data.session_id !== currentSessionId) {
                 currentSessionId = data.session_id;
                 sessionStorage.setItem('current_chat_session', currentSessionId);
            }
            
            // --- FIX: ALWAYS UPDATE HISTORY AFTER MESSAGE ---
            // This ensures the title updates from "New Chat" to the specific topic immediately
            renderSidebarHistory(); 
            // ------------------------------------------------

            displayMessage(data.response, 'bot');
        } catch (error) {
            console.error('Fetch error:', error);
            displayMessage(error.message || "🤖 Error: Could not connect to the recommender service.", 'bot');
        } finally {
            toggleInputState(false);
        }
    }
    
    async function initializeChatState() {
        if (!chatForm) return; 
        let sessionLoaded = false;
        if (currentSessionId) {
            sessionLoaded = await loadSession(currentSessionId);
        }
        if (!sessionLoaded) {
            currentSessionId = null; 
            sessionStorage.removeItem('current_chat_session');
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
            if (presetButtonsContainer) presetButtonsContainer.classList.remove('hidden');
            if (chatLog) chatLog.classList.remove('expanded');
            isChatActive = false;
        }
        setTimeout(() => {
            if(chatLog) chatLog.style.transition = '';
            if(presetButtonsContainer) presetButtonsContainer.style.transition = '';
        }, 100);
        await renderSidebarHistory(); 

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); 
                sendMessage(chatInput.value.trim()); 
            }
        });

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = chatInput.value.trim();
            if (messageText) sendMessage(messageText); 
        }); 
        
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                sidebar.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('open') && 
                    !sidebar.contains(e.target) && 
                    !menuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', startNewChat);
        }
        
        if (presetButtonsContainer) {
            presetButtonsContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('preset-btn')) {
                    const presetText = e.target.textContent.trim();
                    const message = `Recommend OPM music for a ${presetText} mood/playlist.`; 
                    sendMessage(message); 
                }
            });
        }
    }
    
    if (chatForm) {
        initializeChatState();
    }
});

/* =========================================
   DROPDOWN LOGIC
   ========================================= */
function toggleDropdown() {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

window.onclick = function(event) {
    if (!event.target.matches('.user-menu-btn') && !event.target.matches('.user-menu-btn *')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}