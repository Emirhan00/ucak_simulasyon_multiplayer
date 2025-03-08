// Basit Socket.io test sunucusu
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statik dosyaları sunmak için
app.use(express.static(path.join(__dirname, '../client')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Socket.io bağlantıları
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);
  
  // Test mesajı gönder
  socket.emit('test', { message: 'Bağlantı başarılı!' });
  
  // player:login olayını dinle
  socket.on('player:login', (data) => {
    console.log('Kullanıcı giriş yaptı:', data);
    
    // Başarılı giriş yanıtı gönder
    socket.emit('login_success', {
      id: 'test-user-id',
      username: data.username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isOnline: true,
      room: {
        id: 'default-room',
        name: 'Test Odası',
        gameMode: 'free-flight',
        players: [{
          id: 'test-user-id',
          username: data.username,
          position: { x: 0, y: 100, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          team: 'blue'
        }]
      }
    });
  });
  
  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı:', socket.id);
  });
});

// Sunucuyu başlat
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test sunucusu ${PORT} portunda çalışıyor`);
}); 