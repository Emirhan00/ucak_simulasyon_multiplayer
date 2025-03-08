// Çok basit bir Socket.io sunucusu
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Express uygulaması oluştur
const app = express();

// Statik dosyaları sunmak için
app.use(express.static(path.join(__dirname, '../client')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/simple-test.html'));
});

// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.io sunucusu oluştur
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io bağlantılarını dinle
io.on('connection', (socket) => {
  console.log('Yeni bağlantı:', socket.id);
  
  // Bağlantı kurulduğunda test mesajı gönder
  socket.emit('welcome', { message: 'Bağlantı başarılı!' });
  
  // Mesaj alma
  socket.on('message', (data) => {
    console.log('Mesaj alındı:', data);
    
    // Mesajı tüm istemcilere gönder
    io.emit('broadcast', {
      sender: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    console.log('Bağlantı kesildi:', socket.id);
  });
});

// Sunucuyu başlat
const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Basit sunucu ${PORT} portunda çalışıyor`);
}); 