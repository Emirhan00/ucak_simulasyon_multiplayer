/**
 * FlightControls.js
 * Uçuş kontrol sistemini yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class FlightControls {
    constructor() {
        // Kontrol durumları
        this.pitch = 0;        // -1 (aşağı) ile 1 (yukarı) arası
        this.roll = 0;         // -1 (sola yat) ile 1 (sağa yat) arası
        this.yaw = 0;          // -1 (sola dön) ile 1 (sağa dön) arası
        this.throttle = 0.3;   // 0 ile 1 arası - başlangıç değeri 0.3 (sabit hız)
        this.brake = false;
        this.boost = false;
        this.fire = false;
        this.engineToggle = false;
        this.landingGearToggle = false;
        this.flapToggle = false;
        this.cameraToggle = false;
        this.takeoffToggle = false;    // Kalkış modu
        this.landingToggle = false;    // İniş modu
        
        // Basitleştirilmiş kontroller için
        this.forward = false;  // W - ileri / hızlan
        this.backward = false; // S - geri / yavaşla
        this.left = false;     // A - sola dön
        this.right = false;    // D - sağa dön
        
        // Tuş durumları
        this.keyStates = {
            'KeyW': false,             // Burun yukarı
            'KeyS': false,             // Burun aşağı
            'KeyA': false,             // Sola dön
            'KeyD': false,             // Sağa dön
            'KeyQ': false,             // Sola yat
            'KeyE': false,             // Sağa yat
            'ArrowUp': false,          // Gaz artır
            'ArrowDown': false,        // Gaz azalt
            'Space': false,            // Ateş et
            'KeyR': false,             // Motor aç/kapa
            'KeyF': false,             // Flap aç/kapa
            'KeyG': false,             // İniş takımı aç/kapa
            'KeyB': false,             // Fren
            'ShiftLeft': false,        // Boost
            'ShiftRight': false,       // Boost
            'KeyV': false,             // Kamera değiştir
            'KeyT': false,             // Kalkış modu
            'KeyL': false              // İniş modu
        };
        
        // Tuş olayları dinleyicileri
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.keyUpHandler = this.handleKeyUp.bind(this);
        
        // Fare olayları dinleyicileri
        this.mouseDownHandler = this.handleMouseDown.bind(this);
        this.mouseUpHandler = this.handleMouseUp.bind(this);
        this.mouseMoveHandler = this.handleMouseMove.bind(this);
        
        // Fare durumu
        this.mouseButtons = {
            left: false,
            right: false,
            middle: false
        };
        
        this.mousePosition = {
            x: 0,
            y: 0
        };
        
        // Kontrol modu: 'realistic' veya 'simple'
        this.controlMode = 'simple';
    }
    
    init() {
        console.log('Initializing flight controls');
        
        // Klavye ve fare olayları dinleyicilerini ekle
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
        window.addEventListener('mousedown', this.mouseDownHandler);
        window.addEventListener('mouseup', this.mouseUpHandler);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        
        console.log('Flight controls initialized');
    }
    
    handleKeyDown(event) {
        // Tuş durumunu güncelle
        if (this.keyStates.hasOwnProperty(event.code)) {
            this.keyStates[event.code] = true;
            event.preventDefault();
        }
    }
    
    handleKeyUp(event) {
        // Tuş durumunu güncelle
        if (this.keyStates.hasOwnProperty(event.code)) {
            this.keyStates[event.code] = false;
            
            // Toggle butonları için
            if (event.code === 'KeyR') {
                this.engineToggle = true;
            } else if (event.code === 'KeyG') {
                this.landingGearToggle = true;
            } else if (event.code === 'KeyF') {
                this.flapToggle = true;
            } else if (event.code === 'KeyV') {
                this.cameraToggle = true;
            } else if (event.code === 'KeyT') {
                this.takeoffToggle = true;
            } else if (event.code === 'KeyL') {
                this.landingToggle = true;
            }
            
            event.preventDefault();
        }
    }
    
    handleMouseDown(event) {
        // Fare buton durumunu güncelle
        switch(event.button) {
            case 0: // Sol tık
                this.mouseButtons.left = true;
                this.fire = true;
                break;
            case 1: // Orta tık
                this.mouseButtons.middle = true;
                break;
            case 2: // Sağ tık
                this.mouseButtons.right = true;
                break;
        }
    }
    
    handleMouseUp(event) {
        // Fare buton durumunu güncelle
        switch(event.button) {
            case 0: // Sol tık
                this.mouseButtons.left = false;
                this.fire = false;
                break;
            case 1: // Orta tık
                this.mouseButtons.middle = false;
                break;
            case 2: // Sağ tık
                this.mouseButtons.right = false;
                break;
        }
    }
    
    handleMouseMove(event) {
        // Fare pozisyonunu güncelle
        this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    updateControls() {
        // Önceki durumları sıfırla (toggle butonları hariç)
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
        this.brake = false;
        this.boost = false;
        this.engineToggle = false;
        this.landingGearToggle = false;
        this.flapToggle = false;
        this.cameraToggle = false;
        this.takeoffToggle = false;
        this.landingToggle = false;
        
        // Basitleştirilmiş kontrolleri güncelle
        this.forward = this.keyStates['KeyW'];
        this.backward = this.keyStates['KeyS'];
        this.left = this.keyStates['KeyA'];
        this.right = this.keyStates['KeyD'];
        
        if (this.controlMode === 'simple') {
            // Basitleştirilmiş mod - WASD
            if (this.forward) {
                this.pitch = -0.5;  // Burun yukarı
                // Gaz değişimini kaldırdık, sadece pitch kontrolü
            }
            
            if (this.backward) {
                this.pitch = 0.5;   // Burun aşağı
                // Gaz değişimini kaldırdık, sadece pitch kontrolü
            }
            
            if (this.left) {
                this.roll = -0.3;   // Sola yatma
                this.yaw = -0.5;    // Sola dönme
            }
            
            if (this.right) {
                this.roll = 0.3;    // Sağa yatma
                this.yaw = 0.5;     // Sağa dönme
            }
            
            // Gaz için yukarı/aşağı ok tuşları - daha hassas kontrol
            if (this.keyStates['ArrowUp']) {
                this.throttle += 0.01;  // Daha yavaş artış
            }
            
            if (this.keyStates['ArrowDown']) {
                this.throttle -= 0.01;  // Daha yavaş azalış
            }
        } else {
            // Gerçekçi mod - orijinal kontroller
            if (this.keyStates['KeyW']) {
                this.pitch = -1;
            }
            
            if (this.keyStates['KeyS']) {
                this.pitch = 1;
            }
            
            if (this.keyStates['KeyQ']) {
                this.roll = -1;
            }
            
            if (this.keyStates['KeyE']) {
                this.roll = 1;
            }
            
            if (this.keyStates['KeyA']) {
                this.yaw = -1;
            }
            
            if (this.keyStates['KeyD']) {
                this.yaw = 1;
            }
            
            if (this.keyStates['ArrowUp']) {
                this.throttle += 0.01;
            }
            
            if (this.keyStates['ArrowDown']) {
                this.throttle -= 0.01;
            }
        }
        
        // Ortak kontroller
        this.fire = this.mouseButtons.left || this.keyStates['Space'];
        this.brake = this.keyStates['KeyB'];
        this.boost = this.keyStates['ShiftLeft'] || this.keyStates['ShiftRight'];
        
        // Throttle sınırla
        this.throttle = Math.max(0, Math.min(1, this.throttle));
    }
    
    update(deltaTime) {
        this.updateControls();
    }
    
    getInputs() {
        return {
            pitch: this.pitch,
            roll: this.roll,
            yaw: this.yaw,
            throttle: this.throttle,
            brake: this.brake,
            boost: this.boost,
            fire: this.fire,
            engineToggle: this.engineToggle,
            landingGearToggle: this.landingGearToggle,
            flapToggle: this.flapToggle,
            cameraToggle: this.cameraToggle,
            takeoffToggle: this.takeoffToggle,
            landingToggle: this.landingToggle
        };
    }
    
    dispose() {
        // Olay dinleyicileri kaldır
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        window.removeEventListener('mousedown', this.mouseDownHandler);
        window.removeEventListener('mouseup', this.mouseUpHandler);
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        
        console.log('Flight controls disposed');
    }
    
    // Control modunu değiştir
    toggleControlMode() {
        this.controlMode = this.controlMode === 'simple' ? 'realistic' : 'simple';
        console.log(`Control mode changed to: ${this.controlMode}`);
    }
} 