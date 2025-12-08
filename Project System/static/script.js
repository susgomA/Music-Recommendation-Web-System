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
    const sendButton = chatForm ? chatForm.querySelector('button[type="submit"]') : null;
    
    // Sidebar References
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');

    // --- State Management (Database-Driven) ---
    let currentSessionId = null; 
    let isChatActive = false; 

    // =========================================
    // 1. HELPER FUNCTIONS
    // =========================================

    /** Creates and appends a message bubble. */
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
        if (!chatInput || !sendButton) return;
        chatInput.disabled = disabled;
        sendButton.disabled = disabled;
        sendButton.textContent = disabled ? 'Thinking...' : 'Send';
    }
    
    function scrollToBottom() {
        if(chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    // UI function to handle chat area visual change
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
    
    /** REQUIRED: Deletes a specific session by calling the server endpoint. */
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
    
    /** REQUIRED: Loads a specific session's messages into the chat log by fetching from the server. */
    async function loadSession(sessionId) {
        if (!chatLog) return false; // Return false on initial check if element is missing
        
        try {
            const response = await fetch(`/load_session/${sessionId}`);
            
            // Check for 404 (session deleted)
            if (!response.ok) {
                 console.warn(`Attempted to load session ${sessionId} but received HTTP ${response.status}.`);
                 return false;
            }

            const data = await response.json();

            // Clear current log and render new session
            chatLog.innerHTML = ''; 
            
            data.history.forEach(msg => {
                const senderClass = msg.sender === 'user' ? 'user' : 'bot';
                displayMessage(msg.content, senderClass);
            });
            
            currentSessionId = sessionId;
            sessionStorage.setItem('current_chat_session', sessionId);
            startChatSession(true); // Start session UI and scroll
            
            return true; // Signal successful load
            
        } catch (error) {
            console.error('Error loading session:', error);
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Error loading session history.</div>';
            return false; // Signal failure
        }
    }


    /** Renders the list of chats in the sidebar by fetching from the server. */
    async function renderSidebarHistory() {
        if (!historyList) return;
        
        try {
            const response = await fetch('/get_chat_list');
            if (response.status === 401) return; 
            if (!response.ok) throw new Error(`Failed to load chat list: ${response.status}`);
            
            const data = await response.json();
            historyList.innerHTML = '';
            
            // 1. Determine the session ID to load (only if currentSessionId is null/invalid)
            if (!currentSessionId && data.sessions.length > 0) {
                 const latestSessionId = data.sessions[0].id;
                 
                 // If the list is fetched, attempt to load the latest session
                 await loadSession(latestSessionId); 
            }


            // 2. Sidebar Rendering Loop (Use the final currentSessionId for 'active' class)
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

    /** Starts a completely new chat session by getting a new ID from the server. */
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
            
            // 1. Update the client-side state with the NEW ID
            currentSessionId = data.session_id; 
            sessionStorage.setItem('current_chat_session', currentSessionId);
            
            // 2. Reset the UI to its initial state
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
            isChatActive = false;
            
            if (presetButtonsContainer) presetButtonsContainer.classList.remove('hidden');
            if (chatLog) chatLog.classList.remove('expanded'); 
            
            // 3. Re-render the sidebar to show the new, active session
            renderSidebarHistory(); 
            
            const sidebar = document.getElementById('sidebar');
            if(sidebar) sidebar.classList.remove('open');
            
        } catch (error) {
            console.error('Error starting new chat:', error);
            alert('Could not start new chat session due to a server error.');
        }
    }

    /** Core Chat Logic */
    async function sendMessage(message) {
        // ... (sendMessage logic remains the same) ...
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
                    session_id: currentSessionId // CRITICAL: Link message to the active session
                })
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.response || `HTTP error! status: ${response.status}`);
            }

            // CRITICAL: Update currentSessionId if the server created a new one (first message in a new chat)
            if (data.session_id && data.session_id !== currentSessionId) {
                 currentSessionId = data.session_id;
                 sessionStorage.setItem('current_chat_session', currentSessionId);
                 renderSidebarHistory(); // Refresh sidebar to show the new title
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
    // 4. AUTH & UI EVENT LISTENERS
    // =========================================
    
    // ... (All Authentication listeners remain the same) ...
    
    // FINAL EXECUTION BLOCK: ATTACHES LISTENERS AND STARTS ASYNC LOADING

    // --- FINAL EXECUTION ---
    async function initializeChatState() {
        if (!chatForm) return; 

        // 1. Try to load the stored session ID from session storage
        const storedSessionId = sessionStorage.getItem('current_chat_session');

        if (storedSessionId) {
            // Attempt to load the messages for the stored session. 
            const loaded = await loadSession(storedSessionId);

            // If loading the stored session failed (e.g., session was deleted on server), clear the state.
            if (!loaded) {
                currentSessionId = null;
                sessionStorage.removeItem('current_chat_session');
            }
        }
        
        // 2. Now, load/render the sidebar. This function will default to the latest chat
        // if currentSessionId is still null.
        await renderSidebarHistory(); 

        // 3. If after all attempts, no session is loaded (no history exists on server), 
        // ensure the welcome message is visible.
        if (!currentSessionId && chatLog) {
            chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
        }

        // --- Attach Chat Listeners (Synchronous) ---
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = chatInput.value.trim();
            if (messageText) {
                sendMessage(messageText); 
            }
        });      
        
        // Sidebar Toggle
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                sidebar.classList.toggle('open');
            });
        }

        // New Chat Button
        if (newChatBtn) {
            newChatBtn.addEventListener('click', startNewChat);
        }
        
        // ... (Add Textarea Resize and Preset Button Logic here) ...
    }
    
    if (chatForm) {
        initializeChatState();
    }
});