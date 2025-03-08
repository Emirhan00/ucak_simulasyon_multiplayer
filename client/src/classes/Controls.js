/**
 * Controls.js
 * Klavye ve fare kontrollerini yöneten sınıf
 */
export class Controls {
    constructor() {
        // Tuş durumları
        this.keys = {
            // Uçuş kontrolleri
            pitchUp: false,    // S, ArrowDown
            pitchDown: false,  // W, ArrowUp
            yawLeft: false,    // A, ArrowLeft
            yawRight: false,   // D, ArrowRight
            rollLeft: false,   // Q
            rollRight: false,  // E
            
            // Hız kontrolleri
            throttleUp: false,   // Shift
            throttleDown: false, // Ctrl
            
            // Silah kontrolleri
            fire: false,       // Space
            
            // Diğer kontroller
            toggleLandingGear: false, // G
            toggleCamera: false,      // C
            toggleHUD: false,         // H
            toggleMap: false,         // M
            toggleChat: false,        // T
            toggleScoreboard: false   // Tab
        };
        
        // Fare durumu
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false
        };
        
        // Tuş eşlemeleri
        this.keyMap = {
            'KeyW': 'pitchDown',
            'ArrowUp': 'pitchDown',
            'KeyS': 'pitchUp',
            'ArrowDown': 'pitchUp',
            'KeyA': 'yawLeft',
            'ArrowLeft': 'yawLeft',
            'KeyD': 'yawRight',
            'ArrowRight': 'yawRight',
            'KeyQ': 'rollLeft',
            'KeyE': 'rollRight',
            'ShiftLeft': 'throttleUp',
            'ShiftRight': 'throttleUp',
            'ControlLeft': 'throttleDown',
            'ControlRight': 'throttleDown',
            'Space': 'fire',
            'KeyG': 'toggleLandingGear',
            'KeyC': 'toggleCamera',
            'KeyH': 'toggleHUD',
            'KeyM': 'toggleMap',
            'KeyT': 'toggleChat',
            'Tab': 'toggleScoreboard'
        };
        
        // Tek seferlik tuş basımları
        this.keyPresses = {
            toggleLandingGear: false,
            toggleCamera: false,
            toggleHUD: false,
            toggleMap: false,
            toggleChat: false,
            toggleScoreboard: false
        };
        
        // Tuş basım zamanları (çift basım tespiti için)
        this.keyPressTimes = {};
        
        // Tuş basım aralığı (ms)
        this.doublePressInterval = 300;
        
        // Event listener'lar
        this.keydownListener = null;
        this.keyupListener = null;
        this.mousemoveListener = null;
        this.mousedownListener = null;
        this.mouseupListener = null;
    }
    
    /**
     * Kontrolleri başlat
     */
    init() {
        // Tuş basma olayı
        this.keydownListener = (event) => {
            // Eğer bir input alanında yazıyorsak, kontrolleri devre dışı bırak
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Tab tuşunun varsayılan davranışını engelle
            if (event.code === 'Tab') {
                event.preventDefault();
            }
            
            // Tuş eşlemesini kontrol et
            const action = this.keyMap[event.code];
            if (action) {
                // Tuş durumunu güncelle
                this.keys[action] = true;
                
                // Tek seferlik tuş basımları için
                if (this.keyPresses.hasOwnProperty(action)) {
                    const now = Date.now();
                    const lastPress = this.keyPressTimes[action] || 0;
                    
                    // Çift basım kontrolü
                    if (now - lastPress < this.doublePressInterval) {
                        // Çift basım algılandı
                        this.keyPresses[action] = true;
                    }
                    
                    this.keyPressTimes[action] = now;
                }
            }
        };
        
        // Tuş bırakma olayı
        this.keyupListener = (event) => {
            // Tuş eşlemesini kontrol et
            const action = this.keyMap[event.code];
            if (action) {
                // Tuş durumunu güncelle
                this.keys[action] = false;
            }
        };
        
        // Fare hareket olayı
        this.mousemoveListener = (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        
        // Fare basma olayı
        this.mousedownListener = (event) => {
            if (event.button === 0) { // Sol tık
                this.mouse.isDown = true;
                this.keys.fire = true;
            }
        };
        
        // Fare bırakma olayı
        this.mouseupListener = (event) => {
            if (event.button === 0) { // Sol tık
                this.mouse.isDown = false;
                this.keys.fire = false;
            }
        };
        
        // Event listener'ları ekle
        document.addEventListener('keydown', this.keydownListener);
        document.addEventListener('keyup', this.keyupListener);
        document.addEventListener('mousemove', this.mousemoveListener);
        document.addEventListener('mousedown', this.mousedownListener);
        document.addEventListener('mouseup', this.mouseupListener);
    }
    
    /**
     * Kontrolleri güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        // Tek seferlik tuş basımlarını sıfırla
        for (const key in this.keyPresses) {
            this.keyPresses[key] = false;
        }
    }
    
    /**
     * Kontrol durumlarını al
     * @returns {Object} - Kontrol durumları
     */
    getInputs() {
        return {
            pitch: (this.keys.pitchUp ? 1 : 0) - (this.keys.pitchDown ? 1 : 0),
            yaw: (this.keys.yawRight ? 1 : 0) - (this.keys.yawLeft ? 1 : 0),
            roll: (this.keys.rollRight ? 1 : 0) - (this.keys.rollLeft ? 1 : 0),
            throttle: (this.keys.throttleUp ? 1 : 0) - (this.keys.throttleDown ? 1 : 0),
            fire: this.keys.fire,
            toggleLandingGear: this.keyPresses.toggleLandingGear,
            toggleCamera: this.keyPresses.toggleCamera,
            toggleHUD: this.keyPresses.toggleHUD,
            toggleMap: this.keyPresses.toggleMap,
            toggleChat: this.keyPresses.toggleChat,
            toggleScoreboard: this.keyPresses.toggleScoreboard,
            mouse: {
                x: this.mouse.x,
                y: this.mouse.y,
                isDown: this.mouse.isDown
            }
        };
    }
    
    /**
     * Kontrolleri temizle
     */
    dispose() {
        // Event listener'ları kaldır
        document.removeEventListener('keydown', this.keydownListener);
        document.removeEventListener('keyup', this.keyupListener);
        document.removeEventListener('mousemove', this.mousemoveListener);
        document.removeEventListener('mousedown', this.mousedownListener);
        document.removeEventListener('mouseup', this.mouseupListener);
        
        // Tuş durumlarını sıfırla
        for (const key in this.keys) {
            this.keys[key] = false;
        }
        
        // Tek seferlik tuş basımlarını sıfırla
        for (const key in this.keyPresses) {
            this.keyPresses[key] = false;
        }
    }
} 