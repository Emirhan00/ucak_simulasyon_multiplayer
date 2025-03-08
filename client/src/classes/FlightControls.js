/**
 * FlightControls.js
 * Uçuş kontrol sistemini yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class FlightControls {
    constructor() {
        // Kontrol değerleri (-1 ile 1 arasında)
        this.pitch = 0;    // -1 (down) to 1 (up)
        this.roll = 0;     // -1 (left) to 1 (right)
        this.yaw = 0;      // -1 (left) to 1 (right)
        this.throttle = 0; // 0 to 1
        this.flaps = 0;    // 0 to 1 (0, 0.33, 0.66, 1.0)
        this.gear = 1;     // 0 (up) or 1 (down)
        this.airbrake = 0; // 0 to 1
        this.fire = false; // true/false
        this.boost = false; // true/false
        
        // Yeni kontroller
        this.engineToggle = false; // Motor açma/kapama
        this.gearToggle = false;   // İniş takımı açma/kapama
        this.flapsToggle = false;  // Flap açma/kapama
        this.brakes = false;       // Frenler
        this.view = 0;             // Kamera görünümü (0: kokpit, 1: dış, 2: takip)
        this.takeoffToggle = false; // Kalkış modu
        this.landingToggle = false; // İniş modu
        
        // Keyboard durumları
        this.keyStates = {
            'KeyW': false,     // Pitch up (burun yukarı)
            'KeyS': false,     // Pitch down (burun aşağı)
            'KeyA': false,     // Roll left (sola yatma)
            'KeyD': false,     // Roll right (sağa yatma)
            'KeyQ': false,     // Yaw left (sola dönme)
            'KeyE': false,     // Yaw right (sağa dönme)
            'ArrowUp': false,  // Throttle up (gaz artırma)
            'ArrowDown': false, // Throttle down (gaz azaltma)
            'ShiftLeft': false, // Boost (hızlandırma)
            'KeyF': false,     // Flaps toggle
            'KeyG': false,     // Gear toggle
            'KeyB': false,     // Airbrake/Brake
            'Space': false,    // Fire
            'KeyR': false,     // Engine start/stop
            'KeyV': false,     // View change
            'KeyC': false,     // Look around (free look)
            'KeyT': false,     // Takeoff mode
            'KeyL': false,     // Landing mode
            'Escape': false    // Menu
        };
        
        // Önceki tuş durumları (toggle kontrolü için)
        this.prevKeyStates = { ...this.keyStates };
        
        // Event listener'lar
        this.keydownListener = null;
        this.keyupListener = null;
        
        // Fare kontrolü
        this.mouseEnabled = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.1;
        this.mouseCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.mouseDownListener = null;
        this.mouseMoveListener = null;
        this.mouseUpListener = null;
        
        console.log('FlightControls initialized');
    }
    
    /**
     * Kontrolleri başlat
     */
    init() {
        console.log('Initializing flight controls');
        
        // prevKeyStates nesnesini başlat
        this.prevKeyStates = { ...this.keyStates };
        
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
            
            // Tuş durumunu güncelle
            if (this.keyStates.hasOwnProperty(event.code)) {
                this.keyStates[event.code] = true;
                console.log(`Key pressed: ${event.code}`);
                event.preventDefault();
            }
        };
        
        // Tuş bırakma olayı
        this.keyupListener = (event) => {
            // Tuş durumunu güncelle
            if (this.keyStates.hasOwnProperty(event.code)) {
                this.keyStates[event.code] = false;
                console.log(`Key released: ${event.code}`);
                event.preventDefault();
            }
        };
        
        // Fare olayları
        this.mouseDownListener = (event) => {
            if (event.button === 2) { // Sağ tık
                this.mouseEnabled = true;
                document.body.style.cursor = 'none';
                this.mouseCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                event.preventDefault();
            }
        };
        
        this.mouseMoveListener = (event) => {
            if (this.mouseEnabled) {
                this.mouseX = (event.clientX - this.mouseCenter.x) * this.mouseSensitivity;
                this.mouseY = (event.clientY - this.mouseCenter.y) * this.mouseSensitivity;
                event.preventDefault();
            }
        };
        
        this.mouseUpListener = (event) => {
            if (event.button === 2) { // Sağ tık
                this.mouseEnabled = false;
                document.body.style.cursor = 'auto';
                this.mouseX = 0;
                this.mouseY = 0;
                event.preventDefault();
            }
        };
        
        // Event listener'ları ekle
        document.addEventListener('keydown', this.keydownListener);
        document.addEventListener('keyup', this.keyupListener);
        document.addEventListener('mousedown', this.mouseDownListener);
        document.addEventListener('mousemove', this.mouseMoveListener);
        document.addEventListener('mouseup', this.mouseUpListener);
        document.addEventListener('contextmenu', (e) => e.preventDefault()); // Sağ tık menüsünü engelle
        
        console.log('Flight controls initialized');
    }
    
    /**
     * Kontrolleri güncelle
     */
    updateControls() {
        // Pitch (W/S tuşları)
        this.pitch = 0;
        if (this.keyStates['KeyW']) this.pitch += 1;
        if (this.keyStates['KeyS']) this.pitch -= 1;
        
        // Roll (A/D tuşları)
        this.roll = 0;
        if (this.keyStates['KeyA']) this.roll -= 1;
        if (this.keyStates['KeyD']) this.roll += 1;
        
        // Yaw (Q/E tuşları)
        this.yaw = 0;
        if (this.keyStates['KeyQ']) this.yaw -= 1;
        if (this.keyStates['KeyE']) this.yaw += 1;
        
        // Throttle (ArrowUp/ArrowDown tuşları)
        if (this.keyStates['ArrowUp']) this.throttle = Math.min(this.throttle + 0.01, 1);
        if (this.keyStates['ArrowDown']) this.throttle = Math.max(this.throttle - 0.01, 0);
        
        // Boost (Shift tuşu)
        this.boost = this.keyStates['ShiftLeft'];
        
        // Fire (Space tuşu)
        this.fire = this.keyStates['Space'];
        
        // Brakes (B tuşu)
        this.brakes = this.keyStates['KeyB'];
        
        // Toggle kontrolleri (bir kez basıldığında değişen)
        // Engine toggle (R tuşu)
        if (this.keyStates['KeyR'] && !this.prevKeyStates['KeyR']) {
            this.engineToggle = true;
        } else {
            this.engineToggle = false;
        }
        
        // Gear toggle (G tuşu)
        if (this.keyStates['KeyG'] && !this.prevKeyStates['KeyG']) {
            this.gearToggle = true;
        } else {
            this.gearToggle = false;
        }
        
        // Flaps toggle (F tuşu)
        if (this.keyStates['KeyF'] && !this.prevKeyStates['KeyF']) {
            this.flapsToggle = true;
        } else {
            this.flapsToggle = false;
        }
        
        // View toggle (V tuşu)
        if (this.keyStates['KeyV'] && !this.prevKeyStates['KeyV']) {
            this.view = (this.view + 1) % 3; // 0, 1, 2 arasında döngü
        }
        
        // Takeoff toggle (T tuşu)
        if (this.keyStates['KeyT'] && !this.prevKeyStates['KeyT']) {
            this.takeoffToggle = true;
        } else {
            this.takeoffToggle = false;
        }
        
        // Landing toggle (L tuşu)
        if (this.keyStates['KeyL'] && !this.prevKeyStates['KeyL']) {
            this.landingToggle = true;
        } else {
            this.landingToggle = false;
        }
        
        // Önceki tuş durumlarını güncelle
        for (const key in this.keyStates) {
            this.prevKeyStates[key] = this.keyStates[key];
        }
    }
    
    /**
     * Kontrolleri güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        // Kontrolleri güncelle
        this.updateControls();
    }
    
    /**
     * Kontrol durumlarını al
     * @returns {Object} - Kontrol durumları
     */
    getInputs() {
        return {
            pitch: this.pitch,
            roll: this.roll,
            yaw: this.yaw,
            throttle: this.throttle,
            boost: this.boost,
            flaps: this.flaps,
            gear: this.gear,
            airbrake: this.airbrake,
            fire: this.fire,
            engineToggle: this.engineToggle,
            gearToggle: this.gearToggle,
            flapsToggle: this.flapsToggle,
            brakes: this.brakes,
            view: this.view,
            takeoffToggle: this.takeoffToggle,
            landingToggle: this.landingToggle
        };
    }
    
    /**
     * Kontrolleri temizle
     */
    dispose() {
        // Event listener'ları kaldır
        document.removeEventListener('keydown', this.keydownListener);
        document.removeEventListener('keyup', this.keyupListener);
        document.removeEventListener('mousedown', this.mouseDownListener);
        document.removeEventListener('mousemove', this.mouseMoveListener);
        document.removeEventListener('mouseup', this.mouseUpListener);
        
        // Kontrol değerlerini sıfırla
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
        this.throttle = 0;
        this.flaps = 0;
        this.gear = 1;
        this.airbrake = 0;
        this.fire = false;
        this.boost = false;
        this.engineToggle = false;
        this.gearToggle = false;
        this.flapsToggle = false;
        this.brakes = false;
        this.view = 0;
        this.takeoffToggle = false;
        this.landingToggle = false;
        
        // Tuş durumlarını sıfırla
        for (const key in this.keyStates) {
            this.keyStates[key] = false;
        }
        
        // Fare durumunu sıfırla
        this.mouseEnabled = false;
        this.mouseX = 0;
        this.mouseY = 0;
        document.body.style.cursor = 'auto';
        
        console.log('Flight controls disposed');
    }
} 