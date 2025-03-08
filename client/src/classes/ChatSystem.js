/**
 * ChatSystem.js
 * Oyun içi sohbet sistemini yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class ChatSystem {
    constructor(ui, networkManager) {
        this.ui = ui;
        this.networkManager = networkManager;
        this.messages = [];
        this.maxMessages = 50; // Maksimum mesaj sayısı
        this.chatOpen = false;
        this.chatTarget = 'all'; // all, team, player
        this.targetPlayerId = null;
        this.playerTeam = 'none';
    }
    
    /**
     * Sohbet sistemini başlat
     */
    init() {
        // UI elementlerini al
        this.chatInput = document.getElementById('chat-input');
        this.chatSendButton = document.getElementById('chat-send');
        this.chatMessages = document.getElementById('chat-messages');
        
        // Event listener'ları ekle
        this.setupEventListeners();
    }
    
    /**
     * Event listener'ları ekle
     */
    setupEventListeners() {
        // Enter tuşuna basıldığında mesaj gönder
        document.addEventListener('keydown', (event) => {
            // Enter tuşuna basıldı mı?
            if (event.key === 'Enter') {
                // Chat input aktif mi?
                if (document.activeElement === this.chatInput) {
                    this.sendMessage();
                    event.preventDefault();
                } else {
                    // Chat input'u aktif et
                    this.chatInput.focus();
                    event.preventDefault();
                }
            }
            
            // Escape tuşuna basıldığında chat input'u kapat
            if (event.key === 'Escape' && document.activeElement === this.chatInput) {
                this.chatInput.blur();
                event.preventDefault();
            }
            
            // Tab tuşuna basıldığında chat hedefini değiştir
            if (event.key === 'Tab' && document.activeElement === this.chatInput) {
                this.toggleChatTarget();
                event.preventDefault();
            }
        });
        
        // Gönder butonuna tıklandığında mesaj gönder
        this.chatSendButton.addEventListener('click', () => {
            this.sendMessage();
        });
    }
    
    /**
     * Chat hedefini değiştir (all -> team -> player -> all)
     */
    toggleChatTarget() {
        switch (this.chatTarget) {
            case 'all':
                if (this.playerTeam !== 'none') {
                    this.chatTarget = 'team';
                    this.chatInput.placeholder = 'Takım sohbeti...';
                } else {
                    this.chatTarget = 'player';
                    this.chatInput.placeholder = 'Özel mesaj... (oyuncu ID girin)';
                }
                break;
            case 'team':
                this.chatTarget = 'player';
                this.chatInput.placeholder = 'Özel mesaj... (oyuncu ID girin)';
                break;
            case 'player':
                this.chatTarget = 'all';
                this.chatInput.placeholder = 'Genel sohbet...';
                break;
            default:
                this.chatTarget = 'all';
                this.chatInput.placeholder = 'Genel sohbet...';
        }
    }
    
    /**
     * Mesaj gönder
     */
    sendMessage() {
        const message = this.chatInput.value.trim();
        
        // Mesaj boş mu?
        if (message === '') return;
        
        // Özel mesaj için hedef oyuncu ID'si
        if (this.chatTarget === 'player') {
            // Mesajın ilk kelimesi hedef oyuncu ID'si olmalı
            const parts = message.split(' ');
            if (parts.length >= 2) {
                this.targetPlayerId = parts[0];
                const actualMessage = parts.slice(1).join(' ');
                
                // Mesajı gönder
                this.networkManager.sendChatMessage(actualMessage, 'player', this.targetPlayerId);
                
                // Mesajı UI'a ekle
                this.addMessage(`[PM to ${this.targetPlayerId}] ${actualMessage}`, 'player-out');
            } else {
                // Hata mesajı göster
                this.addMessage('Özel mesaj formatı: [oyuncu_id] [mesaj]', 'system');
            }
        } else {
            // Genel veya takım mesajı
            this.networkManager.sendChatMessage(message, this.chatTarget);
            
            // Mesajı UI'a ekle (takım mesajı ise)
            if (this.chatTarget === 'team') {
                this.addMessage(`[TAKIM] ${message}`, 'team');
            }
        }
        
        // Input'u temizle
        this.chatInput.value = '';
    }
    
    /**
     * Mesaj al
     * @param {Object} data - Mesaj verisi
     */
    receiveMessage(data) {
        const { sender, message, type } = data;
        
        // Mesaj tipine göre UI'a ekle
        switch (type) {
            case 'all':
                this.addMessage(`${sender}: ${message}`, 'all');
                break;
            case 'team':
                this.addMessage(`[TAKIM] ${sender}: ${message}`, 'team');
                break;
            case 'player':
                this.addMessage(`[PM from ${sender}] ${message}`, 'player-in');
                break;
            case 'system':
                this.addMessage(message, 'system');
                break;
            default:
                this.addMessage(`${sender}: ${message}`, 'all');
        }
    }
    
    /**
     * Mesajı UI'a ekle
     * @param {string} message - Mesaj
     * @param {string} type - Mesaj tipi (all, team, player-in, player-out, system)
     */
    addMessage(message, type = 'all') {
        // Mesajı listeye ekle
        this.messages.push({ message, type, timestamp: Date.now() });
        
        // Maksimum mesaj sayısını aşıyorsa en eski mesajı sil
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        
        // UI'ı güncelle
        this.updateUI();
        
        // UI'da mesajı göster
        if (this.ui) {
            this.ui.addChatMessage(message, type);
        }
    }
    
    /**
     * UI'ı güncelle
     */
    updateUI() {
        // Chat mesajlarını temizle
        this.chatMessages.innerHTML = '';
        
        // Mesajları ekle
        this.messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${msg.type}`;
            messageElement.textContent = msg.message;
            this.chatMessages.appendChild(messageElement);
        });
        
        // Otomatik scroll
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    /**
     * Oyuncu takımını ayarla
     * @param {string} team - Oyuncu takımı
     */
    setPlayerTeam(team) {
        this.playerTeam = team;
    }
    
    /**
     * Sohbeti temizle
     */
    clearChat() {
        this.messages = [];
        this.updateUI();
    }
} 