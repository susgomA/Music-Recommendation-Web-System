document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global DOM References ---
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    
    // Chat Page References
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const presetButtonsContainer = document.getElementById('preset-buttons');
    const sendButton = chatForm ? chatForm.querySelector('button[type="submit"]') : null;
    
    // =========================================
    // 0. TOAST NOTIFICATION SYSTEM
    // =========================================
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    // =========================================
    // HELPER FUNCTIONS
    // =========================================
    
    function displayMessage(message, sender) {
        if (!chatLog) return; 
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        const senderClass = sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot';
        messageElement.classList.add(senderClass);
        messageElement.innerHTML = sender === 'user' ? message : message;
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; 
    }

    function toggleInputState(disabled) {
        if (!chatInput || !sendButton) return;
        chatInput.disabled = disabled;
        sendButton.disabled = disabled;
        sendButton.textContent = disabled ? 'Thinking...' : 'Send';
    }

    function showError(inputId, message) {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.focus();
        }
        showToast(message, 'error');
    }

    function clearErrors(form) {
        if (!form) return;
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => input.classList.remove('input-error'));
    }


    // =========================================
    // 1. SHOW/HIDE PASSWORD LOGIC
    // =========================================
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const wrapper = btn.closest('.password-wrapper');
            const inputField = wrapper ? wrapper.querySelector('input') : null;
            if (inputField) {
                if (inputField.type === 'password') {
                    inputField.type = 'text';
                    btn.textContent = 'Hide';
                } else {
                    inputField.type = 'password';
                    btn.textContent = 'Show';
                }
            }
        });
    });

    // =========================================
    // 2. AUTOMATIC AGE & BIRTHDAY RESTRICTION (NEW)
    // =========================================
    if (signupForm) {
        const birthdayInput = document.getElementById('birthday');
        const ageInput = document.getElementById('age');

        if (birthdayInput && ageInput) {
            // A. Disable manual typing in Age
            ageInput.readOnly = true; 
            // Optional: make it look disabled/grayed out
            ageInput.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
            ageInput.style.cursor = 'not-allowed';

            // B. Set MAX date to exactly 12 years ago (No one younger than 12 can sign up)
            const today = new Date();
            const maxDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
            
            // Format to YYYY-MM-DD for the HTML attribute
            const yyyy = maxDate.getFullYear();
            const mm = String(maxDate.getMonth() + 1).padStart(2, '0');
            const dd = String(maxDate.getDate()).padStart(2, '0');
            
            birthdayInput.max = `${yyyy}-${mm}-${dd}`;

            // C. Auto-Calculate Age when Birthday changes
            birthdayInput.addEventListener('change', function() {
                const birthDate = new Date(this.value);
                const today = new Date();
                
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                
                // Adjust if birthday hasn't happened yet this year
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                
                ageInput.value = age;
                
                // Remove error style if it exists
                ageInput.classList.remove('input-error');
            });
        }
    }


    // =========================================
    // 3. REAL-TIME INPUT VALIDATION
    // =========================================
    
    const clearInputError = (e) => e.target.classList.remove('input-error');

    // --- Signup Form Inputs ---
    if (signupForm) {
        const nameInput = document.getElementById('name');
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        // Name: Max 34
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                if (e.target.value.length > 34) e.target.value = e.target.value.slice(0, 34);
                clearInputError(e);
            });
        }
        
        // Username: Max 25
        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => {
                if (e.target.value.length > 25) e.target.value = e.target.value.slice(0, 25);
                clearInputError(e);
            });
        }
        
        // Email: Max 34
        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
                if (e.target.value.length > 34) e.target.value = e.target.value.slice(0, 34);
                clearInputError(e);
            });
        }
        
        // Password: Max 25
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                if (e.target.value.length > 25) e.target.value = e.target.value.slice(0, 25);
                clearInputError(e);
            });
        }
    }

    // --- Login Form Inputs ---
    if (loginForm) {
        const loginUsername = loginForm.querySelector('#username');
        const loginPassword = loginForm.querySelector('#password');

        // Username: Max 25
        if (loginUsername) {
            loginUsername.addEventListener('input', (e) => {
                if (e.target.value.length > 25) e.target.value = e.target.value.slice(0, 25);
                clearInputError(e);
            });
        }

        // Password: Max 25
        if (loginPassword) {
            loginPassword.addEventListener('input', (e) => {
                if (e.target.value.length > 25) e.target.value = e.target.value.slice(0, 25);
                clearInputError(e);
            });
        }
    }


    // =========================================
    // 4. SIGNUP FORM SUBMISSION
    // =========================================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(signupForm);

            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());
            
            // --- Validation ---
            
            // Age/Birthday Check
            // Since the calendar is restricted, this is just a backup check
            const ageVal = parseInt(data.age, 10);
            if (isNaN(ageVal) || ageVal < 12) {
                showError('birthday', "You must be 12 years or older."); 
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showError('email', "Invalid email (must contain '@' and domain).");
                return;
            }

            // Min Length Check (Max is handled by input slice)
            if (data.password.length < 8) {
                showError('password', "Password must be at least 8 characters.");
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
                    showToast('Account created! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = result.redirect_url || "/login";
                    }, 1500);
                } else {
                    if (result.error && result.error.toLowerCase().includes('username')) {
                         showError('username', result.error);
                    } else if (result.error && result.error.toLowerCase().includes('email')) {
                         showError('email', result.error);
                    } else {
                         showToast(result.error || 'Signup Failed', 'error');
                    }
                }
            } catch (error) {
                console.error('Network error:', error);
                showToast('Server connection failed.', 'error');
            }
        });
    }


    // =========================================
    // 5. LOGIN FORM SUBMISSION
    // =========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(loginForm);

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            // --- Login Validation ---
            if (data.username.length > 25) {
                showError('username', "Username is too long (max 25).");
                return;
            }
            if (data.password.length > 25) {
                showError('password', "Password is too long (max 25).");
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('Login successful! Welcome back.', 'success');
                    setTimeout(() => {
                        window.location.href = result.redirect_url || "/";
                    }, 1000);
                } else {
                    const userField = loginForm.querySelector('#username');
                    const passField = loginForm.querySelector('#password');
                    if(userField) userField.classList.add('input-error');
                    if(passField) passField.classList.add('input-error');
                    
                    showToast(result.error || 'Invalid credentials', 'error');
                }

            } catch (error) {
                console.error('Network error:', error);
                showToast('Server connection failed.', 'error');
            }
        });
    }

    // =========================================
    // 6. CHAT LOGIC
    // =========================================
    async function loadChatHistory() {
        if (!chatLog) return; 
        try {
            const response = await fetch('/get_history');
            if (response.status === 401) return;
            if (!response.ok) throw new Error('History failed');
            const data = await response.json();
            chatLog.innerHTML = '';
            data.history.forEach(msg => {
                displayMessage(msg.content, msg.sender === 'user' ? 'user' : 'bot');
            });
            if (data.history.length === 0) displayMessage('Welcome to A3 Music!', 'bot');
        } catch (error) {
            console.error(error);
        }
    }
    
    if (chatForm) {
        loadChatHistory();
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message === "") return;
            displayMessage(message, 'user');
            chatInput.value = '';
            toggleInputState(true);

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.response);
                displayMessage(data.response, 'bot');
            } catch (error) {
                displayMessage("🤖 Error connecting to service.", 'bot');
            } finally {
                toggleInputState(false);
            }
        });
        
        if (presetButtonsContainer) {
            presetButtonsContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('preset-btn')) {
                    const presetText = e.target.textContent.trim();
                    const message = `Recommend OPM music for a ${presetText} mood/playlist.`; 
                    chatInput.value = message;
                    chatForm.dispatchEvent(new Event('submit')); 
                }
            });
        }
    }
});