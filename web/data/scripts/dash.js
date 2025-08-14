const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const auth = isLocalhost 
    ? 'http://localhost:5500/web/auth.html'
    : 'https://ndrew.sk/auth';

const validateToken = isLocalhost 
    ? 'http://localhost:3002/validate-token'
    : 'https://api.ndrew.sk/validate-token';

const featureTogglesEndpoint = isLocalhost 
    ? 'http://localhost:3002/feature-toggles'
    : 'https://api.ndrew.sk/feature-toggles';

const updateFeatureTogglesEndpoint = isLocalhost 
    ? 'http://localhost:3002/update-feature-toggles'
    : 'https://api.ndrew.sk/update-feature-toggles'; 

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

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const toggles = Array.from(document.querySelectorAll('.feature')).map(feature => {
                const name = feature.querySelector('h2').textContent;
                const value = feature.querySelector('input[type="checkbox"]').checked ? 1 : 0;
                return { name, value };
            });

            fetch(updateFeatureTogglesEndpoint, { // Use constant for update endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({ toggles })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update feature toggles');
                }
                alert('Feature toggles updated successfully');
            })
            .catch(error => {
                console.error('Error updating feature toggles:', error.message);
                alert('Error updating feature toggles');
            });
        });
    })
    .catch(error => {
        console.error('Error loading feature toggles:', error.message);
    });