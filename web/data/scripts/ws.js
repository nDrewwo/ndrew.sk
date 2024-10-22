const ws = new WebSocket('ws://localhost:3002');
// const api_chat = 'http://localhost:3002';
const api_chat = 'https://api-ndrew.sk/';
let currentUsername = '';

// Load chat history on page load
fetch(api_chat + '/messages')
    .then(response => response.json())
    .then(data => {
        const chatHistory = document.getElementById('chat-history');
        data.forEach(message => {
            appendMessage(message.username, message.message);
        });
    });

// Helper function to append a message to the chat history
function appendMessage(username, message) {
    const chatHistory = document.getElementById('chat-history');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `
        <p class="name">${username}:</p>
        <p class="msgContent">${message}</p>
    `;
    chatHistory.appendChild(messageDiv);
}

// Helper function to append a system message
function appendSystemMessage(message) {
    const chatHistory = document.getElementById('chat-history');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `
        <p class="name">system:</p>
        <p class="msgContent">${message}</p>
    `;
    chatHistory.appendChild(messageDiv);
}

// Send message to WebSocket when pressing enter
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.querySelector('#chat-input input');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message.length > 0) {
                    ws.send(JSON.stringify({ message }));
                    chatInput.value = '';
                }
            }
        });
    }
});

// Receive new message from WebSocket server
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);

    if (data.system) {
        // System message, such as nickname change notifications
        appendSystemMessage(data.message);
    } else {
        // Normal chat message
        appendMessage(data.username, data.message);
    }
};