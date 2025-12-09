document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global DOM References ---
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    // References for the Chat Page
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    
    // Sidebar References
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');

    // --- State Management ---
    let currentSessionId = null; 
    let isChatActive = false; 

    // =========================================
    // 1. HELPER FUNCTIONS
    // =========================================

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
    
    function startChatSession(immediate = false) {
        if (!isChatActive && presetButtonsContainer && chatLog) {
            isChatActive = true;
            presetButtonsContainer.classList.add('hidden');
            chatLog.classList.add('expanded');
        }
    }

    // =========================================
    // 2. DATABASE / PERSISTENCE FUNCTIONS
    // =========================================
    
    async function deleteSession(sessionId) {
        if(confirm("Delete this chat?")) {
            try {
                const response = await fetch(`/delete_chat/${sessionId}`, { method: 'POST' });
                if (response.ok) {
                    if (sessionId === currentSessionId) {
                        startNewChat(); 
                    } else {
                        renderSidebarHistory(); 
                    }
                } else {
                    alert('Failed to delete chat on the server.');
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
            }
        }
    }
    
    async function loadSession(sessionId) {
        if (!chatLog) return false; 
        
        try {
            const response = await fetch(`/load_session/${sessionId}`);
            
            if (!response.ok) {
                 console.warn(`Attempted to load session ${sessionId} but received HTTP ${response.status}.`);
                 return false;
            }

            const data = await response.json();

            chatLog.innerHTML = ''; 
            
            data.history.forEach(msg => {
                const senderClass = msg.sender === 'user' ? 'user' : 'bot';
                displayMessage(msg.content, senderClass);
            });
            
            currentSessionId = sessionId;
            sessionStorage.setItem('current_chat_session', sessionId);
            startChatSession(true);
            
            return true; 
            
        } catch (error) {
            console.error('Error loading session:', error);
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Error loading session history.</div>';
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
            
            if (!currentSessionId && data.sessions.length > 0) {
                 const latestSessionId = data.sessions[0].id;
                 await loadSession(latestSessionId); 
            }

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
                        loadSession(session.id);
                        renderSidebarHistory(); 
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
                 alert("You must be logged in to start a new chat.");
                 window.location.href = '/login'; 
                 return;
            }

            const data = await response.json();
            
            currentSessionId = data.session_id; 
            sessionStorage.setItem('current_chat_session', currentSessionId);
            
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
            isChatActive = false;
            
            if (presetButtonsContainer) presetButtonsContainer.classList.remove('hidden');
            if (chatLog) chatLog.classList.remove('expanded'); 
            
            renderSidebarHistory(); 
            
            if(sidebar) sidebar.classList.remove('open');
            
        } catch (error) {
            console.error('Error starting new chat:', error);
            alert('Could not start new chat session due to a server error.');
        }
    }

    /** Core Chat Logic */
    async function sendMessage(message) {
        if (message.trim() === "") return;

        startChatSession(false); 

        displayMessage(message.replace(/\n/g, '<br>'), 'user'); 
        
        if(chatInput) { chatInput.value = ''; chatInput.style.height = 'auto'; }
        
        toggleInputState(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: message,
                    session_id: currentSessionId 
                })
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.response || `HTTP error! status: ${response.status}`);
            }

            if (data.session_id && data.session_id !== currentSessionId) {
                 currentSessionId = data.session_id;
                 sessionStorage.setItem('current_chat_session', currentSessionId);
                 renderSidebarHistory(); 
            }

            displayMessage(data.response, 'bot');

        } catch (error) {
            console.error('Fetch error:', error);
            displayMessage(error.message || "🤖 Error: Could not connect to the recommender service.", 'bot');
        } finally {
            toggleInputState(false);
        }
    }
    
    // =========================================
    // 3. FINAL EXECUTION & EVENT LISTENERS
    // =========================================
    
    async function initializeChatState() {
        if (!chatForm) return; 

        const storedSessionId = sessionStorage.getItem('current_chat_session');
        if (storedSessionId) {
            const loaded = await loadSession(storedSessionId);
            if (!loaded) {
                currentSessionId = null;
                sessionStorage.removeItem('current_chat_session');
            }
        }
        
        await renderSidebarHistory(); 

        if (!currentSessionId && chatLog) {
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
        }

        // --- Handle "Enter" Key ---
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); 
                sendMessage(chatInput.value.trim()); 
            }
        });

        // --- Handle Submit Button ---
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = chatInput.value.trim();
            if (messageText) {
                sendMessage(messageText); 
            }
        }); 
        
        // --- Sidebar Toggle Logic ---
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                sidebar.classList.toggle('open');
            });

            // Close when clicking outside
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
        
        // --- PRESET BUTTONS (Auto-Send) ---
        if (presetButtonsContainer) {
            presetButtonsContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('preset-btn')) {
                    const presetText = e.target.textContent.trim();
                    const message = `Recommend OPM music for a ${presetText} mood/playlist.`; 
                    
                    // Immediately send the message
                    sendMessage(message); 
                }
            });
        }
    }
    
    if (chatForm) {
        initializeChatState();
    }
});