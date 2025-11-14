document.addEventListener('DOMContentLoaded', () => {
            const chatLog = document.getElementById('chat-log');
            const chatForm = document.getElementById('chat-form');
            const chatInput = document.getElementById('chat-input');
            const presetButtonsContainer = document.getElementById('preset-buttons');

            // --- Event Listeners ---
            
            // Handle form submission
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const messageText = chatInput.value.trim();
                
                if (messageText) {
                    // 1. Display the user's message
                    displayMessage(messageText, 'user');
                    // 2. Clear the input
                    chatInput.value = '';
                    // 3. Show the "login required" message
                    showLoginPrompt();
                }
            });

            // Handle preset button clicks (using event delegation)
            presetButtonsContainer.addEventListener('click', (e) => {
                // Check if the clicked element is a button
                if (e.target.tagName === 'BUTTON' && e.target.classList.contains('preset-btn')) {
                    const presetText = e.target.textContent.trim();
                    // 1. Display the user's "click" as a message
                    displayMessage(presetText, 'user');
                    // 2. Show the "not available" message
                    showNotAvailablePrompt();
                }
            });


            // --- Helper Functions ---

            /**
             * Displays a message in the chat log
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
                    // Use innerHTML for the bot to allow clickable links
                    messageElement.innerHTML = message; 
                }
                
                chatLog.appendChild(messageElement);
                
                // Scroll to the bottom
                chatLog.scrollTop = chatLog.scrollHeight;
            }

            /**
             * Shows the "Please login" prompt from the bot
             */
            function showLoginPrompt() {
                // Add a slight delay to simulate "thinking"
                setTimeout(() => {
                    const loginMessage = 'You need to <a href="#">Sign up</a> / <a href="#">Login</a> first to get personalized recommendations.';
                    displayMessage(loginMessage, 'bot');
                }, 500);
            }

            /**
             * Shows the "Not available" prompt from the bot
             */
            function showNotAvailablePrompt() {
                // Add a slight delay to simulate "thinking"
                setTimeout(() => {
                    const notAvailableMessage = 'This preset is not yet available in guest mode.';
                    displayMessage(notAvailableMessage, 'bot');
                }, 500);
            }

        });