const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Login page loaded, initializing cursor...");

    // Check if cursor elements exist, if not create them
    let cursorDot = document.querySelector("[data-cursor-dot]");
    let cursorOutline = document.querySelector("[data-cursor-outline]");

    if (!cursorDot || !cursorOutline) {
        console.log("Creating cursor elements...");
        cursorDot = document.createElement('div');
        cursorDot.classList.add('cursor-dot');
        cursorDot.setAttribute('data-cursor-dot', '');
        
        cursorOutline = document.createElement('div');
        cursorOutline.classList.add('cursor-outline');
        cursorOutline.setAttribute('data-cursor-outline', '');
        
        document.body.prepend(cursorOutline);
        document.body.prepend(cursorDot);
    }

    // Cursor Movement
    window.addEventListener("mousemove", (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        // Simple delay/smoothing for outline could be added here if needed
        cursorOutline.style.left = `${posX}px`;
        cursorOutline.style.top = `${posY}px`;
    });

    // Hover effects
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, input, a')) {
            document.body.classList.add("hovering");
        } else {
            document.body.classList.remove("hovering");
        }
    });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Store token
            localStorage.setItem('admin_token', data.token);
            // Redirect to admin dashboard
            window.location.href = '/admin.html';
        } else {
            errorMsg.textContent = data.error || 'Login failed';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Network error';
        errorMsg.style.display = 'block';
    }
});
    }
});

// Forgot Password Logic
const forgotToggle = document.getElementById('btn-forgot-toggle');
const forgotSection = document.getElementById('forgot-password-section');
const forgotForm = document.getElementById('forgot-form');
const forgotMsg = document.getElementById('forgot-msg');

if (forgotToggle) {
    forgotToggle.addEventListener('click', () => {
        if (forgotSection.style.display === 'none') {
            forgotSection.style.display = 'block';
        } else {
            forgotSection.style.display = 'none';
        }
    });
}

if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        forgotMsg.style.display = 'none';
        forgotMsg.style.color = 'var(--accent-color)';
        forgotMsg.textContent = 'Processing...';
        forgotMsg.style.display = 'block';

        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await res.json();

            if (res.ok) {
                forgotMsg.textContent = data.message;
                forgotMsg.style.color = '#00ff9d'; // Success green
            } else {
                forgotMsg.textContent = data.error || 'Reset failed';
                forgotMsg.style.color = '#ff4d4d'; // Error red
            }
        } catch (err) {
            console.error(err);
            forgotMsg.textContent = 'Network error';
            forgotMsg.style.color = '#ff4d4d';
        }
    });
}
