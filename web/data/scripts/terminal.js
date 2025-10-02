// Initialize the socket connection
const socket = io();

// Get references to the terminal and input elements
const terminal = document.getElementById('terminal');
const input = document.getElementById('terminalinput'); // Changed from 'input' to 'terminalinput'
const inputPrefix = document.getElementById('inputPrefix').textContent;

// Function to scroll the 'widowContent' div to the bottom
function scrollToBottom() {
    const terminalWindow = document.getElementById('terminalwindow');
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
}

// Event listener for the Enter key press on the input field
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevents default action (form submission or newline in input)

        const command = input.value;
        // Add the command to the terminal
        terminal.innerHTML += `<div>${inputPrefix} ${command}</div>`;
        
        // Emit the command to the server
        socket.emit('command', command);
        
        // Clear the input field
        input.value = '';
        
        // Scroll to the bottom after adding the command
        scrollToBottom();
    }
});

// Listen for 'output' events from the server
socket.on('output', (data) => {
    // Add the server output to the terminal
    terminal.innerHTML += `<div>${data}</div>`;
    
    // Scroll to the bottom after receiving output from the server
    scrollToBottom();
});

socket.on('clearTerminal', () => {
    document.getElementById('terminal').innerHTML = '';
});