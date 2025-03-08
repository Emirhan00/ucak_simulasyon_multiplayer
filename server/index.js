// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

// Controllers for HTTP routes
const AuthController = require('./src/controllers/AuthController');
const RoomController = require('./src/controllers/RoomController');

// Socket event handlers
const ChatEvents = require('./src/events/ChatEvents');
const GameEvents = require('./src/events/GameEvents');

// Express uygulamasını oluştur
const app = express();

// CORS ayarları
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ucak-simulasyonu.vercel.app', /\.vercel\.app$/] 
    : ['http://localhost:8000', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

// JSON body parser
app.use(express.json());

// API rotaları
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username } = req.body;
    const authController = new AuthController();
    const userData = await authController.loginOrCreate(username);
    res.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const roomController = new RoomController();
    const rooms = await roomController.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Statik dosyaları sunmak için
app.use(express.static(path.join(__dirname, '../client')));

// Ana sayfa
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// HTTP sunucusunu oluştur
const server = http.createServer(app);

// Socket.IO sunucusunu oluştur
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://ucak-simulasyonu.vercel.app', /\.vercel\.app$/] 
      : ['http://localhost:8000', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO bağlantılarını dinle
io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  // Test mesajı gönder
  socket.emit('test', { message: 'Bağlantı başarılı!' });

  // Chat olaylarını ekle
  try {
    const chatEvents = new ChatEvents(io);
    chatEvents.setupEvents(socket);
  } catch (error) {
    console.error('Error setting up chat events:', error);
  }

  // Oyun olaylarını ekle
  try {
    const gameEvents = new GameEvents(io);
    gameEvents.setupEvents(socket);
  } catch (error) {
    console.error('Error setting up game events:', error);
  }

  // Bağlantı kesildiğinde
  socket.on('disconnect', (reason) => {
    console.log('User disconnected: ' + socket.id + ', reason: ' + reason);
  });
});

// Veritabanı bağlantısını başlat
try {
  require('./db');
  console.log('Database module loaded');
} catch (error) {
  console.error('Error loading database module:', error);
}

// Vercel için serverless fonksiyon olarak dışa aktar
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  // Geliştirme ortamında sunucuyu başlat
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 