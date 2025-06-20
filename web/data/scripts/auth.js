const loginEndpoint = 'https://api.ndrew.sk/login';
const protectedDash = 'https://ndrew.sk/dash';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(loginEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include' 
        });

        if (response.ok) {
            window.location.href = protectedDash; // Redirect after successful login
        } else {
            alert('Invalid password');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});