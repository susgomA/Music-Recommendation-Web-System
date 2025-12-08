document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global DOM References ---
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form'); 
    
    // References for the Chat Page (may be null on signup/login pages)
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm ? chatForm.querySelector('button[type="submit"]') : null; 
    
    // =========================================
    // HELPER FUNCTION: Display Message (Must be defined globally in this scope)
    // =========================================

    /**
     * Creates and appends a message bubble to the chat log.
     * @param {string} message - The text to display
     * @param {'user' | 'bot'} sender - The sender of the message
     */
    function displayMessage(message, sender) {
        if (!chatLog) return; // Only execute if chatLog exists (i.e., we are on index.html)
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        
        const senderClass = sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot';
        messageElement.classList.add(senderClass);
        
        // Use innerHTML for bot responses to handle HTML line breaks (<br>)
        if (sender === 'user') {
            messageElement.textContent = message;
        } else {
            messageElement.innerHTML = message; 
        }
        
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // Scroll to the bottom
    }

    /**
     * Toggles the input and button state to show loading/waiting.
     * Only works if we are on the chat page.
     * @param {boolean} disabled
     */
    function toggleInputState(disabled) {
        if (!chatInput || !sendButton) return; 
        chatInput.disabled = disabled;
        sendButton.disabled = disabled;
        sendButton.textContent = disabled ? 'Thinking...' : 'Send';
    }


    // =========================================
    // 1. SHOW/HIDE PASSWORD LOGIC (Applies to ALL forms)
    // =========================================
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); 
            const wrapper = btn.closest('.password-wrapper');
            const inputField = wrapper ? wrapper.querySelector('input[type="password"], input[type="text"]') : null;
            
            if (!inputField) return;

            if (inputField.type === 'password') {
                inputField.type = 'text';
                btn.textContent = 'Hide';
            } else {
                inputField.type = 'password';
                btn.textContent = 'Show';
            }
        });
    });


    // =========================================
    // 2. SIGNUP FORM SUBMISSION LOGIC
    // =========================================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());
            
            if (data.password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            try {
                const response = await fetch('/register', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Account created successfully! Please log in.');
                    window.location.href = result.redirect_url || "/login"; 
                } else {
                    alert('Signup Failed: ' + (result.error || 'Check the server logs.'));
                }

            } catch (error) {
                console.error('Network or Server Error:', error);
                alert('An unexpected error occurred during communication. Please try again.');
            }
        });
    }


    // =========================================
    // 3. LOGIN FORM SUBMISSION LOGIC
    // =========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/login', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message);
                    window.location.href = result.redirect_url || "/"; 
                } else {
                    alert(result.error || 'Login failed. Check credentials.');
                }

            } catch (error) {
                console.error('Network or Server Error:', error);
                alert('An unexpected error occurred. Could not connect to the server.');
            }
        });
    }

    
    // =========================================
    // 4. PERSISTENT CHAT HISTORY LOADING (New)
    // =========================================
    
    // This function only runs if chatLog exists (i.e., we are on index.html)
    async function loadChatHistory() {
        if (!chatLog) return; 

        try {
            const response = await fetch('/get_history');
            
            if (response.status === 401) {
                // User is not logged in; the @login_required decorator on /get_history blocked the request
                console.log("User not authenticated for history retrieval.");
                // We let the static welcome message (in index.html) show.
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to load history: HTTP Status ${response.status}`);
            }

            const data = await response.json();
            
            // Clear the default welcome message before rendering history
            chatLog.innerHTML = ''; 
            
            // Render the history messages
            data.history.forEach(msg => {
                const senderClass = msg.sender === 'user' ? 'user' : 'bot'; 
                displayMessage(msg.content, senderClass);
            });
            
            // If history is empty, show the welcome message
            if (data.history.length === 0) {
                 displayMessage('Welcome to Spookify! What OPM songs are you in the mood for?', 'bot');
            }
            
        } catch (error) {
            console.error('Error loading chat history:', error);
            displayMessage('Error: Could not load past messages.', 'bot');
        }
    }
    
    
    // =========================================
    // 5. CHAT SUBMISSION LOGIC (From index.html)
    // =========================================
    
    // This logic only runs if the chat form exists (i.e., we are on index.html)
    if (chatForm) {
        
        // --- Setup: Load history when page loads ---
        loadChatHistory();
        
        // --- Submission Handler ---
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const message = chatInput.value.trim();
            if (message === "") return;
            
            // 1. Display user message immediately
            displayMessage(message, 'user');
            chatInput.value = ''; 
            toggleInputState(true); 

            try {
                // 2. Send message to Flask backend /chat
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });

                const data = await response.json();
                
                if (!response.ok) {
                     // This catches the 429 quota error or 500 server error
                     throw new Error(data.response || `HTTP error! Status: ${response.status}`);
                }

                // 3. Display AI response
                displayMessage(data.response, 'bot');

            } catch (error) {
                console.error('Chat API error:', error);
                // Display the error message provided by the backend, or a generic one
                displayMessage(error.message || "🤖 Error: Could not connect to the recommender service.", 'bot');
            } finally {
                toggleInputState(false);
            }
        });
    }

});