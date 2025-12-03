document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM References ---
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm.querySelector('button[type="submit"]');

    // Flag to track if the chat session has started
    let isChatActive = false;

    // --- Auto-Resize Textarea Logic ---
    if(chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // --- Handle Enter Key to Send ---
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // --- Start Chat Session (Layout Transition) ---
    function startChatSession() {
        if (!isChatActive && presetButtonsContainer && chatLog) {
            isChatActive = true;
            presetButtonsContainer.classList.add('hidden');
            chatLog.classList.add('expanded');
            setTimeout(scrollToBottom, 550); 
        }
    }

    function scrollToBottom() {
        if(chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }

    function displayMessage(message, sender) {
        if(!chatLog) return;
        
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

    // --- AI Communication ---
    async function sendMessage(message) {
        if (message.trim() === "") return;

        startChatSession();

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
});