/**
 * server.js
 * Ana sunucu dosyası, HTTP ve WebSocket sunucularını başlatır
 */

// Modülleri import et
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const socketIo = require('socket.io');

// Konfigürasyon
const config = require('./src/config/server');
const socketConfig = require('./src/config/socket');

// Veritabanı bağlantısı
const db = require('./db');

// Socket yöneticisi
const SocketManager = require('./src/sockets/SocketManager');

// Kontrolcüler
const AuthController = require('./src/controllers/AuthController');
const RoomController = require('./src/controllers/RoomController');
const GameController = require('./src/controllers/GameController');

// Express uygulaması oluştur
const app = express();

// Middleware'leri ayarla
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyaları serve et
app.use(express.static(path.join(__dirname, '../client')));

// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.io sunucusu oluştur
const io = socketIo(server, socketConfig);

// Socket yöneticisini başlat
const socketManager = new SocketManager(io);
socketManager.init();

// API rotaları
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Ana rotayı client/index.html'e yönlendir
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Sunucuyu başlat
server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});

// Hata yakalama
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Sunucuyu dışa aktar
module.exports = { app, server, io }; 