const auth = 'http://localhost:5500/web/auth.html';
// const auth = 'https://ndrew.sk/auth';
const validateToken = 'http://localhost:3002/validate-token';
// const validateToken = 'https://api.ndrew.sk/validate-token';

const featureTogglesEndpoint = 'https://api.ndrew.sk/feature-toggles';

fetch(validateToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include' // Include cookies in the request
})
.then(response => {
    if (!response.ok) {
        throw new Error('Invalid token');
    }
})
.catch(() => {
    window.location.href = auth;
});

fetch(featureTogglesEndpoint)
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch feature toggles');
        }
        return response.json();
    })
    .then(toggles => {
        const form = document.querySelector('.widowContent form');
        const updateButton = form.querySelector('button[type="submit"]');
        toggles.forEach(toggle => {
            const featureDiv = document.createElement('div');
            featureDiv.className = 'feature';

            const title = document.createElement('h2');
            title.textContent = toggle.name;

            const label = document.createElement('label');
            label.className = 'switch';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = toggle.value === 1;

            const slider = document.createElement('span');
            slider.className = 'slider';

            label.appendChild(input);
            label.appendChild(slider);
            featureDiv.appendChild(title);
            featureDiv.appendChild(label);
            form.insertBefore(featureDiv, updateButton);
        });
    })
    .catch(error => {
        console.error('Error loading feature toggles:', error.message);
    });