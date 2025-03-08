/**
 * socket.js
 * Socket.io konfigürasyonu
 */

module.exports = {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
}; 