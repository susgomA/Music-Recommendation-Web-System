document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM References ---
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    
    // Sidebar References
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');

    // --- State Management ---
    let currentSessionId = null;
    let isChatActive = false;

    // --- 1. INITIALIZATION & PERSISTENCE ---
    
    function init() {
        // UPDATED LOGIC:
        // Check sessionStorage (survives reloads, clears on tab close)
        currentSessionId = sessionStorage.getItem('spookify_current_session');
        
        // If we found an active session ID in this tab, load it!
        if (currentSessionId) {
            loadSession(currentSessionId);
        }
        
        // Always render the history list from permanent storage
        renderSidebarHistory();
    }

    // Load a specific session into the chat log
    function loadSession(sessionId) {
        // History data lives in localStorage (permanent)
        const historyData = JSON.parse(localStorage.getItem('spookify_history') || '{}');
        const session = historyData[sessionId];

        if (session && session.messages.length > 0) {
            // Expand UI IMMEDIATELY (True) to prevent animation on reload
            startChatSession(true); 
            
            // Clear current log
            chatLog.innerHTML = ''; 
            
            // Re-render messages
            session.messages.forEach(msg => {
                displayMessage(msg.text, msg.sender, false); // false = don't save again
            });
            
            currentSessionId = sessionId;
            // Save active state to SESSION storage
            sessionStorage.setItem('spookify_current_session', sessionId);
            
            // Scroll to bottom instantly
            setTimeout(() => {
                chatLog.scrollTop = chatLog.scrollHeight;
            }, 0);
        } else {
            // If session not found (e.g. deleted), start new
            startNewChat();
        }
    }

    // Save a message to the current session
    function saveMessageToHistory(text, sender) {
        let historyData = JSON.parse(localStorage.getItem('spookify_history') || '{}');
        
        // If no session exists or we are starting a new one
        if (!currentSessionId) {
            currentSessionId = Date.now().toString(); 
            // Save active ID to SESSION storage
            sessionStorage.setItem('spookify_current_session', currentSessionId);
            
            // Create new session object
            historyData[currentSessionId] = {
                id: currentSessionId,
                title: text.substring(0, 30) + (text.length > 30 ? '...' : ''), 
                timestamp: Date.now(),
                messages: []
            };
        }

        // Ensure session exists in data
        if (!historyData[currentSessionId]) {
             historyData[currentSessionId] = {
                id: currentSessionId,
                title: text.substring(0, 30) + '...',
                timestamp: Date.now(),
                messages: []
            };
        }

        // Append message
        historyData[currentSessionId].messages.push({ text, sender });
        
        // Save history content to LOCAL storage (Permanent)
        localStorage.setItem('spookify_history', JSON.stringify(historyData));
        
        // Update sidebar
        renderSidebarHistory();
    }

    // Render the list of chats in the sidebar
    function renderSidebarHistory() {
        if (!historyList) return;
        
        historyList.innerHTML = '';
        const historyData = JSON.parse(localStorage.getItem('spookify_history') || '{}');
        
        const sessions = Object.values(historyData).sort((a, b) => b.timestamp - a.timestamp);

        sessions.forEach(session => {
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
    }

    // Delete a specific session
    function deleteSession(sessionId) {
        if(confirm("Delete this chat?")) {
            const historyData = JSON.parse(localStorage.getItem('spookify_history') || '{}');
            delete historyData[sessionId];
            localStorage.setItem('spookify_history', JSON.stringify(historyData));
            
            if (sessionId === currentSessionId) {
                startNewChat();
            } else {
                renderSidebarHistory(); 
            }
        }
    }

    // Start a completely new chat
    function startNewChat() {
        currentSessionId = null;
        // Clear session storage so if we reload now, it stays on new chat
        sessionStorage.removeItem('spookify_current_session');
        
        chatLog.innerHTML = '<div class="chat-bubble chat-bubble-bot">Welcome to A3 Music!</div>';
        presetButtonsContainer.classList.remove('hidden');
        chatLog.classList.remove('expanded');
        isChatActive = false;
        
        renderSidebarHistory();
        if(sidebar) sidebar.classList.remove('open');
    }

    // --- 2. UI LOGIC ---

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

    if(chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    function startChatSession(immediate = false) {
        if (!isChatActive && presetButtonsContainer && chatLog) {
            isChatActive = true;
            
            if (immediate) {
                presetButtonsContainer.style.transition = 'none';
                chatLog.style.transition = 'none';
                
                presetButtonsContainer.classList.add('hidden');
                chatLog.classList.add('expanded');
                
                void chatLog.offsetWidth; 
                
                setTimeout(() => {
                    presetButtonsContainer.style.transition = '';
                    chatLog.style.transition = '';
                }, 10);
                
                setTimeout(scrollToBottom, 0);
            } else {
                presetButtonsContainer.classList.add('hidden');
                chatLog.classList.add('expanded');
                setTimeout(scrollToBottom, 550); 
            }
        }
    }

    function scrollToBottom() {
        if(chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }

    function displayMessage(message, sender, save = true) {
        if(!chatLog) return;
        
        if (save) {
            saveMessageToHistory(message, sender);
        }

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        
        if (sender === 'user') {
            messageElement.classList.add('chat-bubble-user');
            messageElement.innerHTML = message;
        } else {
            messageElement.classList.add('chat-bubble-bot');
            messageElement.innerHTML = message; 
        }
        
        chatLog.appendChild(messageElement);
        scrollToBottom();
        setTimeout(scrollToBottom, 50);
    }

    function toggleInputState(disabled) {
        if(chatInput) chatInput.disabled = disabled;
        if(sendButton) {
            sendButton.disabled = disabled;
            sendButton.textContent = disabled ? 'Thinking...' : 'Send';
        }
    }

    async function sendMessage(message) {
        if (message.trim() === "") return;

        startChatSession(false);

        displayMessage(message.replace(/\n/g, '<br>'), 'user');
        
        if(chatInput) {
            chatInput.value = ''; 
            chatInput.style.height = 'auto'; 
        }
        
        toggleInputState(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            displayMessage(data.response, 'bot');

        } catch (error) {
            console.error('Fetch error:', error);
            const errorMessage = "🤖 **Error**: Sorry, the recommender is temporarily offline.";
            displayMessage(errorMessage, 'bot');
        } finally {
            toggleInputState(false);
            setTimeout(scrollToBottom, 100);
        }
    }

    // --- Event Listeners ---
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = chatInput.value.trim();
            if (messageText) {
                sendMessage(messageText); 
            }
        });
    }

    if (presetButtonsContainer) {
        presetButtonsContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('preset-btn')) {
                const presetText = e.target.textContent.trim();
                const message = `${presetText}`;
                sendMessage(message); 
            }
        });
    }

    // --- Run Init ---
    init();
});