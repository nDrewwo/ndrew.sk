const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const ws = new WebSocket(isLocalhost ? 'ws://localhost:3002' : 'wss://api.ndrew.sk');
const api_chat = isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';

