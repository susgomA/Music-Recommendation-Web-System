document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM References ---
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm.querySelector('button[type="submit"]');

    // --- Helper Functions ---

    /**
     * Creates and appends a message bubble to the chat log.
     * @param {string} message - The text to display
     * @param {'user' | 'bot'} sender - The sender of the message
     */
    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        
        if (sender === 'user') {
            messageElement.classList.add('chat-bubble-user');
            messageElement.textContent = message;
        } else {
            messageElement.classList.add('chat-bubble-bot');
            // Allow HTML for bot messages (e.g., links, formatting)
            messageElement.innerHTML = message; 
        }
        
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // Scroll to the bottom
    }

    /**
     * Toggles the input and button state to show loading/waiting.
     * @param {boolean} disabled
     */
    function toggleInputState(disabled) {
        chatInput.disabled = disabled;
        sendButton.disabled = disabled;
        sendButton.textContent = disabled ? 'Thinking...' : 'Send';
    }


    // --- AI Communication Function (New Core Logic) ---

    /**
     * Sends the user's message to the Flask backend's /chat endpoint.
     * @param {string} message - The prompt text to send to the Gemini model.
     */
    async function sendMessage(message) {
        if (message.trim() === "") return;

        // 1. Display user message immediately
        displayMessage(message, 'user');
        chatInput.value = ''; // Clear input
        
        toggleInputState(true); // Disable input while waiting for AI

        try {
            // 2. Fetch/POST request to the Flask backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            // Handle non-200 responses (e.g., 500 server error)
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 3. Display AI response (from data.response key)
            displayMessage(data.response, 'bot');

        } catch (error) {
            console.error('Fetch error:', error);
            const errorMessage = "🤖 **Error**: Sorry, the recommender is temporarily offline. Please check the server logs.";
            displayMessage(errorMessage, 'bot');
        } finally {
            toggleInputState(false); // Re-enable input
        }
    }


    // --- Event Listeners (Modified) ---
    
    // Handle form submission (User typing and pressing Enter/Send)
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        
        if (messageText) {
            // Use the new sendMessage function instead of the placeholder
            sendMessage(messageText); 
        }
    });

    // Handle preset button clicks (using event delegation)
    presetButtonsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('preset-btn')) {
            const presetText = e.target.textContent.trim();
            
            // Construct the message based on the preset button
            const message = `${presetText}`;
            
            // Use the new sendMessage function instead of the placeholder
            sendMessage(message); 
        }
    });

    // Optional: Add a welcome message after the DOM loads
    const initialMessage = chatLog.querySelector('.chat-bubble-bot');
    if (!initialMessage || initialMessage.textContent.includes('Welcome to Spookify')) {
        // Only run this if the chat log is empty or only contains the default welcome
        // This is necessary if you removed the HTML static message:
        // displayMessage("Mabuhay! I'm your quirky OPM recommender. What kind of music are you looking for?", 'bot');
    }

});