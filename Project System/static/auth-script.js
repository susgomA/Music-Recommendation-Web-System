// Shared script for login.html and signup.html

document.addEventListener('DOMContentLoaded', () => {
    
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    // --- Show/Hide Password Logic ---
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            // Check the type of the password input
            if (passwordInput.type === 'password') {
                // Change to text to show
                passwordInput.type = 'text';
                togglePasswordBtn.textContent = 'Hide';
            } else {
                // Change back to password to hide
                passwordInput.type = 'password';
                togglePasswordBtn.textContent = 'Show';
            }
        });
    }

    // --- Form Submission Handler (for testing) ---
    // This just prevents the page from reloading.
    // In a real app, you'd send this data to a server.
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); 
            // We don't use alert()
            console.log('Form submitted!');
            // Here you would add your logic to process the login/signup
            // For now, we'll just redirect to the main page on successful submit
            
            // Simulate a successful action and redirect
            if (form.id === 'login-form') {
                console.log('Logging in...');
                // In a real app, you'd wait for server response
                // window.location.href = 'index.html'; // Example redirect
            } else if (form.id === 'signup-form') {
                console.log('Signing up...');
                // In a real app, you'd wait for server response
                // window.location.href = 'login.html'; // Example redirect to login
            }
        });
    }

});
