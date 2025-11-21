document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM References ---
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const toggleChatBtn = document.getElementById('toggle-chat-btn');

    // --- Auto-Resize Textarea Logic ---
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

    // --- Expand/Shrink Logic ---
    function setChatExpansion(expand) {
        if (expand) {
            chatLog.classList.add('expanded');
            toggleChatBtn.textContent = '[-]';
        } else {
            chatLog.classList.remove('expanded');
            toggleChatBtn.textContent = '[+]';
        }
        // Scroll to bottom after transition triggers
        setTimeout(scrollToBottom, 350); 
    }

    toggleChatBtn.addEventListener('click', () => {
        const isExpanded = chatLog.classList.contains('expanded');
        setChatExpansion(!isExpanded);
    });

    // --- Scroll Helper ---
    function scrollToBottom() {
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // --- Helper Functions ---

    function displayMessage(message, sender) {
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
        
        // Scroll immediately
        scrollToBottom();
        // Scroll again slightly later to handle image loading or rendering delays
        setTimeout(scrollToBottom, 50);
    }

    function toggleInputState(disabled) {
        chatInput.disabled = disabled;
        sendButton.disabled = disabled;
        sendButton.textContent = disabled ? 'Thinking...' : 'Send';
    }


    // --- AI Communication Function ---

    async function sendMessage(message) {
        if (message.trim() === "") return;

        // 1. Display user message
        displayMessage(message.replace(/\n/g, '<br>'), 'user');
        
        chatInput.value = ''; 
        chatInput.style.height = 'auto'; // Reset height
        
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
            const errorMessage = "🤖 **Error**: Sorry, the recommender is temporarily offline. Please check the server logs.";
            displayMessage(errorMessage, 'bot');
        } finally {
            toggleInputState(false);
            // One final scroll check
            setTimeout(scrollToBottom, 100);
        }
    }


    // --- Event Listeners ---
    
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        
        if (messageText) {
            sendMessage(messageText); 
        }
    });

    presetButtonsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('preset-btn')) {
            const presetText = e.target.textContent.trim();
            const message = `${presetText}`;
            sendMessage(message); 
        }
    });

});