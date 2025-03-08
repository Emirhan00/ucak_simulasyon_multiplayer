document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const messagesList = document.getElementById('messages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    // Join a default chat room
    const roomId = 'default';
    socket.emit('join_chat', { roomId });

    // Listen for incoming chat messages
    socket.on('receive_message', (data) => {
        const li = document.createElement('li');
        li.textContent = `${data.sender}: ${data.message}`;
        messagesList.appendChild(li);
    });

    // Function to send a message
    function sendMessage() {
        const message = chatInput.value;
        if (message.trim() !== '') {
            socket.emit('send_message', { roomId, sender: 'Anonymous', message });
            chatInput.value = '';
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 