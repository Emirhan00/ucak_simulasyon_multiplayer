/**
 * UI.js
 * Kullanıcı arayüzünü yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class UI {
    constructor() {
        // UI elementleri
        this.elements = {
            // Ekranlar
            loginScreen: null,
            lobbyScreen: null,
            roomScreen: null,
            
            // Oyuncu bilgileri
            playerName: null,
            playerCount: null,
            playerScore: null,
            
            // Uçuş verileri
            altitude: null,
            speed: null,
            verticalSpeed: null,
            
            // Görev listesi
            missionList: null,
            
            // Mermi sayacı
            currentAmmo: null,
            maxAmmo: null,
            
            // Radar
            radarCanvas: null,
            radarContext: null,
            
            // Vuruş bilgisi
            hitInfo: null,
            
            // Sohbet
            chatMessages: null,
            chatInput: null,
            
            // Skor tablosu
            scoreTable: null,
            
            // Oda listesi
            roomList: null
        };
        
        // Radar güncelleme zamanı
        this.lastRadarUpdateTime = 0;
        
        // Vuruş bilgisi zamanlayıcısı
        this.hitInfoTimer = null;
        
        // Skor tablosu güncelleme zamanlayıcısı
        this.scoreTableUpdateTimer = null;
        
        // Oda seçimi callback'i
        this.onRoomSelectCallback = null;
        
        // Kalkış ve iniş durumu göstergeleri
        this.takeoffStatusShown = false;
        this.landingStatusShown = false;
    }
    
    /**
     * UI'ı başlat
     */
    init() {
        console.log('UI.init called');
        
        try {
            // UI elementlerini al
            this.getElements();
            
            // UI elementlerini kontrol et
            console.log('UI elements:', {
                loginScreen: !!this.elements.loginScreen,
                lobbyScreen: !!this.elements.lobbyScreen,
                roomScreen: !!this.elements.roomScreen,
                playerName: !!this.elements.playerName,
                roomList: !!this.elements.roomList
            });
            
            // Radar'ı başlat
            this.initRadar();
            
            console.log('UI initialized');
        } catch (error) {
            console.error('Error initializing UI:', error);
            // Hata olsa bile devam et, kritik olmayan UI elementleri eksik olabilir
            console.log('UI initialization continued despite errors');
        }
    }
    
    /**
     * UI elementlerini al
     */
    getElements() {
        console.log('UI.getElements called');
        
        // Ekranlar
        this.elements.loginScreen = document.getElementById('login-screen');
        this.elements.lobbyScreen = document.getElementById('lobby-screen');
        this.elements.roomScreen = document.getElementById('room-screen');
        
        // Lobi elementleri
        this.elements.roomList = document.getElementById('room-list');
        this.elements.createRoomBtn = document.getElementById('create-room-btn');
        this.elements.refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
        this.elements.roomName = document.getElementById('room-name');
        this.elements.roomPassword = document.getElementById('room-password');
        this.elements.maxPlayers = document.getElementById('max-players');
        this.elements.gameMode = document.getElementById('game-mode');
        this.elements.createRoomSubmit = document.getElementById('create-room-submit');
        
        // Oda elementleri
        this.elements.roomTitle = document.getElementById('room-title');
        this.elements.playerList = document.getElementById('player-list');
        this.elements.roomSettings = document.getElementById('room-settings');
        this.elements.readyBtn = document.getElementById('ready-btn');
        this.elements.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        // Oyuncu bilgileri
        this.elements.playerName = document.getElementById('player-name');
        this.elements.playerCount = document.getElementById('player-count');
        this.elements.playerScore = document.getElementById('player-score');
        
        // Uçuş verileri
        this.elements.altitude = document.getElementById('altitude');
        this.elements.speed = document.getElementById('speed');
        this.elements.verticalSpeed = document.getElementById('vertical-speed');
        
        // Görev listesi
        this.elements.missionList = document.getElementById('mission-list');
        
        // Mermi sayacı
        this.elements.currentAmmo = document.getElementById('current-ammo');
        this.elements.maxAmmo = document.getElementById('max-ammo');
        
        // Radar
        this.elements.radarCanvas = document.getElementById('radar-canvas');
        
        // Vuruş bilgisi
        this.elements.hitInfo = document.getElementById('hit-info');
        
        // Sohbet
        this.elements.chatMessages = document.getElementById('chat-messages');
        this.elements.chatInput = document.getElementById('chat-input');
        this.elements.chatSend = document.getElementById('chat-send');
        
        // Skor tablosu
        this.elements.scoreTable = document.getElementById('score-table');
        this.elements.scoreTableBody = document.getElementById('score-table-body');
        
        // Geri bildirim
        this.elements.feedbackBtn = document.getElementById('feedback-btn');
        this.elements.feedbackModal = document.getElementById('feedback-modal');
        this.elements.feedbackType = document.getElementById('feedback-type');
        this.elements.feedbackText = document.getElementById('feedback-text');
        this.elements.submitFeedback = document.getElementById('submit-feedback');
        this.elements.closeModal = document.querySelector('.close-modal');
        
        // Eksik elementleri kontrol et
        const missingElements = Object.entries(this.elements)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
        
        if (missingElements.length > 0) {
            console.warn('Missing UI elements:', missingElements);
        }
    }
    
    /**
     * Radar'ı başlat
     */
    initRadar() {
        if (!this.elements.radarCanvas) return;
        
        // Canvas context'i al
        this.elements.radarContext = this.elements.radarCanvas.getContext('2d');
        
        // Canvas boyutunu ayarla
        this.elements.radarCanvas.width = this.elements.radarCanvas.clientWidth;
        this.elements.radarCanvas.height = this.elements.radarCanvas.clientHeight;
    }
    
    /**
     * UI'ı güncelle
     * @param {Object} data - Güncelleme verileri
     */
    update(data) {
        if (!data) return;
        
        try {
            // Uçuş verilerini güncelle
            this.updateFlightData(data);
            
            // Mermi sayısını güncelle
            this.updateAmmoCounter(data);
            
            // Uçuş durumunu göster
            this.updateFlightStatus(data);
            
            // Radarı güncelle
            if (data.position && data.targets) {
                this.updateRadar(data.position, data.targets);
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }
    
    /**
     * Uçuş verilerini güncelle
     * @param {Object} data - Güncelleme verileri
     */
    updateFlightData(data) {
        // Yükseklik
        if (data.altitude !== undefined) {
            this.updateElement('altitude', Math.round(data.altitude));
        }
        
        // Hız
        if (data.speed !== undefined) {
            this.updateElement('speed', Math.round(data.speed * 3.6)); // m/s -> km/h
        }
        
        // Dikey hız
        if (data.verticalSpeed !== undefined) {
            this.updateElement('vertical-speed', Math.round(data.verticalSpeed));
        }
    }
    
    /**
     * Mermi sayacını güncelle
     * @param {Object} data - Güncelleme verileri
     */
    updateAmmoCounter(data) {
        if (data.ammo !== undefined) {
            this.updateElement('current-ammo', data.ammo);
        }
        
        if (data.maxAmmo !== undefined) {
            this.updateElement('max-ammo', data.maxAmmo);
        }
    }
    
    /**
     * Uçuş durumunu güncelle
     * @param {Object} data - Güncelleme verileri
     */
    updateFlightStatus(data) {
        // Kalkış durumu
        if (data.isTakingOff && !this.takeoffStatusShown) {
            this.showHitInfo('Kalkış modu aktif', 'info');
            this.takeoffStatusShown = true;
        } else if (!data.isTakingOff) {
            this.takeoffStatusShown = false;
        }
        
        // İniş durumu
        if (data.isLanding && !this.landingStatusShown) {
            this.showHitInfo('İniş modu aktif', 'info');
            this.landingStatusShown = true;
        } else if (!data.isLanding) {
            this.landingStatusShown = false;
        }
    }
    
    /**
     * Belirli bir elementi güncelle
     * @param {string} elementId - Element ID'si
     * @param {any} value - Yeni değer
     */
    updateElement(elementId, value) {
        const element = this.elements[elementId] || document.getElementById(elementId);
        
        if (element) {
            element.textContent = value;
            
            // Elementi önbelleğe al
            if (!this.elements[elementId]) {
                this.elements[elementId] = element;
            }
        }
    }
    
    /**
     * Radar'ı güncelle
     * @param {THREE.Vector3} playerPosition - Oyuncu pozisyonu
     * @param {Array} targets - Hedefler
     */
    updateRadar(playerPosition, targets) {
        if (!this.elements.radarContext) return;
        
        const ctx = this.elements.radarContext;
        const canvas = this.elements.radarCanvas;
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radarRange = GameConstants.UI.RADAR_RANGE;
        
        // Radar'ı temizle
        ctx.clearRect(0, 0, width, height);
        
        // Radar arka planı
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Radar çemberleri
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        
        // Dış çember
        ctx.beginPath();
        ctx.arc(centerX, centerY, width / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Orta çember
        ctx.beginPath();
        ctx.arc(centerX, centerY, width / 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // İç çember
        ctx.beginPath();
        ctx.arc(centerX, centerY, width / 6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Çapraz çizgiler
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();
        
        // Oyuncu (merkez)
        ctx.fillStyle = 'rgba(0, 255, 0, 1)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Hedefleri çiz
        if (targets && targets.length > 0) {
            targets.forEach(target => {
                // Hedefin oyuncuya göre pozisyonu
                const relX = target.position.x - playerPosition.x;
                const relZ = target.position.z - playerPosition.z;
                
                // Radar üzerindeki pozisyonu
                const radarX = centerX + (relX / radarRange) * (width / 2);
                const radarY = centerY + (relZ / radarRange) * (height / 2);
                
                // Radar alanı içinde mi?
                if (
                    radarX >= 0 && radarX <= width &&
                    radarY >= 0 && radarY <= height &&
                    Math.sqrt(relX * relX + relZ * relZ) <= radarRange
                ) {
                    // Hedef tipine göre renk
                    let color = 'rgba(255, 0, 0, 1)'; // Düşman (varsayılan)
                    
                    if (target.type === 'friendly') {
                        color = 'rgba(0, 0, 255, 1)'; // Dost
                    } else if (target.type === 'neutral') {
                        color = 'rgba(255, 255, 0, 1)'; // Nötr
                    } else if (target.type === 'balloon') {
                        color = 'rgba(255, 0, 255, 1)'; // Balon
                    }
                    
                    // Hedefi çiz
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(radarX, radarY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    /**
     * Görev listesini güncelle
     * @param {Array} missions - Görevler
     */
    updateMissionList(missions) {
        if (!this.elements.missionList) return;
        
        // Görev listesini temizle
        this.elements.missionList.innerHTML = '';
        
        // Görevleri ekle
        missions.forEach(mission => {
            const li = document.createElement('li');
            li.textContent = mission.description;
            
            if (mission.completed) {
                li.classList.add('completed');
            }
            
            this.elements.missionList.appendChild(li);
        });
    }
    
    /**
     * Vuruş bilgisini göster
     * @param {string} message - Mesaj
     * @param {string} type - Tip (hit, damage, kill, info, success, warning, error)
     */
    showHitInfo(message, type = 'hit') {
        // Element yoksa konsola yaz ve çık
        if (!this.elements.hitInfo) {
            console.warn('Hit info element not found, showing message in console:', message, type);
            console.log(`%c${message}`, `color: ${this.getColorForType(type)}; font-weight: bold;`);
            return;
        }
        
        // Zamanlayıcıyı temizle
        if (this.hitInfoTimer) {
            clearTimeout(this.hitInfoTimer);
        }
        
        // Mesajı ayarla
        this.elements.hitInfo.textContent = message;
        
        // Tipi ayarla
        this.elements.hitInfo.className = '';
        this.elements.hitInfo.classList.add('show');
        this.elements.hitInfo.classList.add(type);
        
        // Zamanlayıcı ayarla
        this.hitInfoTimer = setTimeout(() => {
            this.elements.hitInfo.classList.remove('show');
        }, GameConstants.UI.HIT_INFO_DURATION || 3000);
    }
    
    /**
     * Mesaj tipi için renk döndür
     * @param {string} type - Mesaj tipi
     * @returns {string} - CSS renk kodu
     */
    getColorForType(type) {
        switch (type) {
            case 'hit': return '#ff9900';
            case 'damage': return '#ff0000';
            case 'kill': return '#9900ff';
            case 'info': return '#0099ff';
            case 'success': return '#00cc00';
            case 'warning': return '#ffcc00';
            case 'error': return '#ff3300';
            default: return '#ffffff';
        }
    }
    
    /**
     * Sohbet mesajı ekle
     * @param {string} message - Mesaj
     * @param {string} type - Tip (all, team, private, system)
     * @param {string} sender - Gönderen
     */
    addChatMessage(message, type = 'all', sender = null) {
        if (!this.elements.chatMessages) return;
        
        // Mesaj elementi oluştur
        const div = document.createElement('div');
        div.classList.add('chat-message');
        div.classList.add(`chat-${type}`);
        
        // Mesaj içeriği
        let content = '';
        
        if (type === 'system') {
            content = `<span class="system-message">${message}</span>`;
        } else {
            content = `<span class="sender">${sender || 'Unknown'}:</span> ${message}`;
        }
        
        div.innerHTML = content;
        
        // Mesajı ekle
        this.elements.chatMessages.appendChild(div);
        
        // Otomatik kaydır
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    /**
     * Skor tablosunu güncelle
     * @param {Array} players - Oyuncular
     */
    updateScoreTable(players) {
        if (!this.elements.scoreTableBody) return;
        
        // Skor tablosunu temizle
        this.elements.scoreTableBody.innerHTML = '';
        
        // Oyuncuları skora göre sırala
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        
        // Oyuncuları ekle
        sortedPlayers.forEach(player => {
            const tr = document.createElement('tr');
            
            // Oyuncu adı
            const tdName = document.createElement('td');
            tdName.textContent = player.name || player.username;
            
            // Eğer bu oyuncu yerel oyuncu ise vurgula
            if (player.id === window.currentPlayerId) {
                tdName.style.fontWeight = 'bold';
                tdName.style.color = '#4CAF50';
            }
            
            tr.appendChild(tdName);
            
            // Skor
            const tdScore = document.createElement('td');
            tdScore.textContent = player.score || 0;
            tr.appendChild(tdScore);
            
            // Öldürme
            const tdKills = document.createElement('td');
            tdKills.textContent = player.kills || 0;
            tr.appendChild(tdKills);
            
            // Ölüm
            const tdDeaths = document.createElement('td');
            tdDeaths.textContent = player.deaths || 0;
            tr.appendChild(tdDeaths);
            
            this.elements.scoreTableBody.appendChild(tr);
        });
        
        // Eğer oyuncu yoksa "No players" mesajı göster
        if (sortedPlayers.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = 'No players';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            this.elements.scoreTableBody.appendChild(tr);
        }
    }
    
    /**
     * Oda listesini güncelle
     * @param {Array} rooms - Odalar
     */
    updateRoomList(rooms) {
        if (!this.elements.roomList) return;
        
        // Oda listesini temizle
        this.elements.roomList.innerHTML = '';
        
        // Odaları ekle
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.classList.add('room-item');
            div.dataset.roomId = room.id;
            
            // Oda içeriği
            let content = `
                <div class="room-name">${room.name}</div>
                <div class="room-info">
                    <span class="room-players">${room.players.length}/${room.maxPlayers}</span>
                    <span class="room-mode">${room.gameMode}</span>
                    ${room.hasPassword ? '<span class="room-locked">🔒</span>' : ''}
                </div>
            `;
            
            div.innerHTML = content;
            
            // Tıklama olayı
            div.addEventListener('click', () => {
                // Şifre gerekiyorsa
                if (room.hasPassword) {
                    const password = prompt('Enter room password:');
                    if (password !== null) {
                        this.onRoomSelect(room.id, password);
                    }
                } else {
                    this.onRoomSelect(room.id);
                }
            });
            
            this.elements.roomList.appendChild(div);
        });
    }
    
    /**
     * Oda seçildiğinde
     * @param {string} roomId - Oda ID'si
     * @param {string} password - Şifre (opsiyonel)
     */
    onRoomSelect(roomId, password = null) {
        // Bu fonksiyon dışarıdan ayarlanacak
        if (this.onRoomSelectCallback) {
            this.onRoomSelectCallback(roomId, password);
        }
    }
    
    /**
     * Oda bilgilerini güncelle
     * @param {Object} roomData - Oda verileri
     */
    updateRoomInfo(roomData) {
        // Oda başlığı
        const roomTitle = document.getElementById('room-title');
        if (roomTitle) {
            roomTitle.textContent = roomData.name;
        }
        
        // Oda ayarları
        const roomSettings = document.getElementById('room-settings');
        if (roomSettings) {
            roomSettings.innerHTML = `
                <div>Game Mode: ${roomData.gameMode}</div>
                <div>Max Players: ${roomData.maxPlayers}</div>
                ${roomData.hasPassword ? '<div>Password Protected: Yes</div>' : ''}
            `;
        }
    }
    
    /**
     * Oyuncu listesini güncelle
     * @param {Array} players - Oyuncular
     */
    updatePlayerList(players) {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;
        
        // Oyuncu listesini temizle
        playerList.innerHTML = '';
        
        // Oyuncuları ekle
        players.forEach(player => {
            const div = document.createElement('div');
            div.classList.add('player-item');
            
            // Oyuncu içeriği
            let content = `
                <div class="player-name">${player.name}</div>
                <div class="player-status ${player.isReady ? 'ready' : 'not-ready'}">
                    ${player.isReady ? 'Ready' : 'Not Ready'}
                </div>
            `;
            
            div.innerHTML = content;
            playerList.appendChild(div);
        });
    }
    
    /**
     * Oyuncu sayısını güncelle
     * @param {number} count - Oyuncu sayısı
     */
    updatePlayerCount(count) {
        if (this.elements.playerCount) {
            this.elements.playerCount.textContent = count;
        }
    }
    
    /**
     * Oyuncu adını güncelle
     * @param {string} name - Oyuncu adı
     */
    updatePlayerName(name) {
        if (this.elements.playerName) {
            this.elements.playerName.textContent = name;
        }
    }
    
    /**
     * Giriş ekranını göster
     */
    showLoginScreen() {
        this.hideAllScreens();
        if (this.elements.loginScreen) {
            this.elements.loginScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Lobi ekranını göster
     */
    showLobbyScreen() {
        console.log('UI.showLobbyScreen called');
        this.hideAllScreens();
        
        if (this.elements.lobbyScreen) {
            console.log('Showing lobby screen');
            this.elements.lobbyScreen.classList.remove('hidden');
            
            // Oda listesini temizle ve yeniden yükle
            if (this.elements.roomList) {
                this.elements.roomList.innerHTML = '<div class="loading">Loading rooms...</div>';
            }
        } else {
            console.error('Lobby screen element not found');
        }
    }
    
    /**
     * Oda ekranını göster
     */
    showRoomScreen() {
        this.hideAllScreens();
        if (this.elements.roomScreen) {
            this.elements.roomScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Tüm ekranları gizle
     */
    hideAllScreens() {
        if (this.elements.loginScreen) {
            this.elements.loginScreen.classList.add('hidden');
        }
        
        if (this.elements.lobbyScreen) {
            this.elements.lobbyScreen.classList.add('hidden');
        }
        
        if (this.elements.roomScreen) {
            this.elements.roomScreen.classList.add('hidden');
        }
    }
    
    /**
     * Oda seçim callback'ini ayarla
     * @param {Function} callback - Callback fonksiyonu
     */
    setRoomSelectCallback(callback) {
        this.onRoomSelectCallback = callback;
    }
} 