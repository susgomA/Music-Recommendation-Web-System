document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth References ---
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');

    // =========================================
    // SHOW/HIDE PASSWORD LOGIC
    // =========================================
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent form submission
            e.preventDefault();

            // Find the input relative to this button
            const wrapper = btn.closest('.password-wrapper');
            const passwordInput = wrapper.querySelector('input');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                btn.textContent = 'Hide';
            } else {
                passwordInput.type = 'password';
                btn.textContent = 'Show';
            }
        });
    });

    // --- Form Submission (Debugging) ---
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            // e.preventDefault(); 
            console.log('Form submitted!');
        });
    }

});