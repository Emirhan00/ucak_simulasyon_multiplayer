/**
 * EngineSystem.js
 * Uçak motor sistemini yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class EngineSystem {
    /**
     * @param {Object} aircraft - Uçak nesnesi
     * @param {Object} config - Motor konfigürasyonu
     */
    constructor(aircraft, config) {
        this.aircraft = aircraft;
        this.config = config || {};
        
        // Motor parametreleri
        this.enginePower = this.config.enginePower || GameConstants.PHYSICS.AIRCRAFT.TYPES.FIGHTER.ENGINE_POWER;
        this.currentPower = 0; // Newton
        this.targetPower = 0; // Newton
        this.rpm = 0; // Motor RPM
        this.temperature = 20; // Celsius
        this.fuelConsumption = 0; // kg/s
        this.afterburnerActive = false;
        this.damaged = false;
        this.damageFactor = 1.0; // 1.0 = sağlam, 0.0 = tamamen hasarlı
        
        // Throttle tepki hızı
        this.throttleResponse = this.config.engineThrottleResponse || 2.0;
        
        // Ses efektleri
        this.engineSound = null;
        this.afterburnerSound = null;
    }
    
    /**
     * Motor sistemini güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Object} controls - Kontrol girdileri
     * @returns {number} - Güncel motor gücü (Newton)
     */
    update(deltaTime, controls) {
        // Throttle değerine göre hedef gücü hesapla
        this.targetPower = this.enginePower * controls.throttle;
        
        // Afterburner etkinse ek güç
        if (this.afterburnerActive && controls.throttle > 0.9) {
            this.targetPower *= 1.5; // %50 ek güç
        }
        
        // Hasar faktörünü uygula
        this.targetPower *= this.damageFactor;
        
        // Motor gücü interpolasyonu (kademeli değişim)
        const powerDiff = this.targetPower - this.currentPower;
        this.currentPower += powerDiff * Math.min(1.0, this.throttleResponse * deltaTime);
        
        // RPM hesabı
        const baseRPM = 800; // Minimum RPM
        const maxRPM = 2500; // Maksimum RPM
        this.rpm = baseRPM + (maxRPM - baseRPM) * (this.currentPower / (this.enginePower * 1.5));
        
        // Sıcaklık modellemesi
        const ambientTemp = 20; // Celsius
        const maxTemp = 800; // Celsius
        const tempFactor = Math.pow(this.currentPower / this.enginePower, 2); // Güç ile artan sıcaklık faktörü
        
        // Sıcaklık değişimi
        const targetTemp = ambientTemp + (maxTemp - ambientTemp) * tempFactor;
        this.temperature += (targetTemp - this.temperature) * deltaTime * 0.1;
        
        // Yakıt tüketimi
        const specificFuelConsumption = 0.4; // kg/kN/h
        this.fuelConsumption = (this.currentPower / 1000) * specificFuelConsumption / 3600; // kg/s
        
        // Aşırı ısınma kontrolü
        if (this.temperature > 750) {
            // Aşırı ısınma hasarı
            this.damageFactor = Math.max(0, this.damageFactor - deltaTime * 0.05);
        }
        
        // Ses güncelleme
        this.updateSounds(controls.throttle);
        
        return this.currentPower;
    }
    
    /**
     * İtki uygula
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    applyThrust(deltaTime) {
        if (!this.aircraft.body || this.currentPower <= 0) return;
        
        // İtki vektörü (yerel koordinatlarda)
        const thrustVector = new CANNON.Vec3(this.currentPower, 0, 0);
        
        // Dünya koordinatlarına dönüştür
        const worldThrustVector = this.aircraft.body.quaternion.vmult(thrustVector);
        
        // İtki uygula (biraz offset ile)
        const thrustPoint = new CANNON.Vec3();
        this.aircraft.body.pointToWorldFrame(new CANNON.Vec3(
            -this.config.fuselageLength / 2 || -5, 0, 0
        ), thrustPoint);
        
        this.aircraft.body.applyForce(worldThrustVector, thrustPoint);
    }
    
    /**
     * Afterburner'ı aç/kapat
     */
    toggleAfterburner() {
        this.afterburnerActive = !this.afterburnerActive;
        
        // Efektleri aktifleştir
        if (this.afterburnerActive) {
            // Afterburner partikül efekti başlat
            if (this.aircraft.effects) {
                this.aircraft.effects.startAfterburner();
            }
        } else {
            // Afterburner partikül efekti durdur
            if (this.aircraft.effects) {
                this.aircraft.effects.stopAfterburner();
            }
        }
    }
    
    /**
     * Ses efektlerini güncelle
     * @param {number} throttle - Throttle değeri (0-1)
     */
    updateSounds(throttle) {
        if (!this.aircraft.effects) return;
        
        const powerRatio = this.currentPower / this.enginePower;
        
        // Motor sesi çal
        this.aircraft.effects.playEngineSound(powerRatio);
    }
    
    /**
     * Motora hasar ver
     * @param {number} amount - Hasar miktarı (0-1)
     */
    applyDamage(amount) {
        this.damageFactor = Math.max(0, this.damageFactor - amount);
        if (this.damageFactor < 0.2) {
            this.damaged = true;
            // Hasar efektleri (duman, yangın, vb)
            if (this.aircraft.effects) {
                this.aircraft.effects.startEngineDamage();
            }
        }
    }
    
    /**
     * Motoru tamir et
     * @param {number} amount - Tamir miktarı (0-1)
     */
    repair(amount) {
        this.damageFactor = Math.min(1.0, this.damageFactor + amount);
        if (this.damageFactor > 0.5) {
            this.damaged = false;
            // Hasar efektlerini durdur
            if (this.aircraft.effects) {
                this.aircraft.effects.stopEngineDamage();
            }
        }
    }
} 