/**
 * AerodynamicsUtils.js
 * Aerodinamik hesaplamalar için yardımcı fonksiyonlar
 */
import { GameConstants } from '../constants/GameConstants.js';

export class AerodynamicsUtils {
    /**
     * Kaldırma kuvveti (Lift) hesapla
     * @param {number} airDensity - Hava yoğunluğu (kg/m³)
     * @param {number} velocity - Hız (m/s)
     * @param {number} wingArea - Kanat alanı (m²)
     * @param {number} liftCoefficient - Kaldırma katsayısı
     * @returns {number} - Kaldırma kuvveti (Newton)
     */
    static calculateLift(airDensity, velocity, wingArea, liftCoefficient) {
        // L = 0.5 * ρ * v² * A * Cl
        return 0.5 * airDensity * velocity * velocity * wingArea * liftCoefficient;
    }
    
    /**
     * Hücum açısına (AoA) göre kaldırma katsayısını hesapla
     * @param {number} angleOfAttack - Hücum açısı (derece)
     * @returns {number} - Kaldırma katsayısı
     */
    static getLiftCoefficientFromAOA(angleOfAttack) {
        const AOA_MIN = GameConstants.PHYSICS.AIRCRAFT.AOA_MIN;
        const AOA_OPTIMAL = GameConstants.PHYSICS.AIRCRAFT.AOA_OPTIMAL;
        const AOA_MAX = GameConstants.PHYSICS.AIRCRAFT.AOA_MAX;
        
        // AOA'ya bağlı lift coefficient eğrisini modelleyen fonksiyon
        if (angleOfAttack < AOA_MIN || angleOfAttack > AOA_MAX) {
            // Stall durumu
            return 0.3; // Dramatik düşüş
        } else if (angleOfAttack < AOA_OPTIMAL) {
            // Lineer artış bölgesi
            return 0.1 + (angleOfAttack - AOA_MIN) * 0.8 / (AOA_OPTIMAL - AOA_MIN);
        } else {
            // Peak sonrası azalma
            return 0.9 - (angleOfAttack - AOA_OPTIMAL) * 0.6 / (AOA_MAX - AOA_OPTIMAL);
        }
    }
    
    /**
     * Hava direnci (Drag) hesapla
     * @param {number} airDensity - Hava yoğunluğu (kg/m³)
     * @param {number} velocity - Hız (m/s)
     * @param {number} dragCoefficient - Sürükleme katsayısı
     * @param {number} referenceArea - Referans alan (m²)
     * @returns {number} - Sürükleme kuvveti (Newton)
     */
    static calculateDrag(airDensity, velocity, dragCoefficient, referenceArea) {
        // D = 0.5 * ρ * v² * Cd * A
        return 0.5 * airDensity * velocity * velocity * dragCoefficient * referenceArea;
    }
    
    /**
     * Hücum açısına (AoA) göre sürükleme katsayısını hesapla
     * @param {number} angleOfAttack - Hücum açısı (derece)
     * @param {Object} configuration - Uçak konfigürasyonu
     * @returns {number} - Sürükleme katsayısı
     */
    static getDragCoefficient(angleOfAttack, configuration) {
        // Base drag + induced drag (AoA'ya bağlı)
        const baseDrag = configuration.dragCoefficient || GameConstants.PHYSICS.AIRCRAFT.DRAG_COEFFICIENT;
        const inducedDragFactor = 0.005; // Induced drag faktörü
        
        return baseDrag + inducedDragFactor * Math.pow(angleOfAttack, 2);
    }
    
    /**
     * İrtifaya bağlı hava yoğunluğunu hesapla
     * @param {number} altitude - İrtifa (metre)
     * @returns {number} - Hava yoğunluğu (kg/m³)
     */
    static calculateAirDensity(altitude) {
        const STANDARD_AIR_DENSITY = GameConstants.PHYSICS.AIRCRAFT.AIR_DENSITY; // Deniz seviyesinde (kg/m³)
        const SCALE_HEIGHT = 8500; // Ölçek yüksekliği (metre)
        
        return STANDARD_AIR_DENSITY * Math.exp(-altitude / SCALE_HEIGHT);
    }
    
    /**
     * Kontrol yüzeylerinin etkisini hesapla
     * @param {Object} aircraft - Uçak nesnesi
     * @param {number} velocity - Hız (m/s)
     * @param {number} airDensity - Hava yoğunluğu (kg/m³)
     * @param {Object} controls - Kontrol girdileri
     * @param {Object} config - Uçak konfigürasyonu
     * @returns {Object} - Kontrol yüzeylerinin oluşturduğu tork vektörleri
     */
    static calculateControlSurfaceEffects(aircraft, velocity, airDensity, controls, config) {
        // Dinamik basınç (q)
        const dynamicPressure = 0.5 * airDensity * velocity * velocity;
        
        // Control surface etkililiği hıza bağlı
        const controlEffectiveness = Math.min(1.0, velocity / 50); // 50 m/s'de tam etki
        
        // Pitch moment (elevator)
        const elevatorArea = config.elevatorArea || GameConstants.PHYSICS.AIRCRAFT.ELEVATOR_AREA;
        const elevatorEffectiveness = config.elevatorEffectiveness || GameConstants.PHYSICS.AIRCRAFT.ELEVATOR_EFFECTIVENESS;
        const elevatorLeverArm = config.elevatorLeverArm || GameConstants.PHYSICS.AIRCRAFT.ELEVATOR_LEVER_ARM;
        
        const pitchForce = dynamicPressure * elevatorArea * elevatorEffectiveness * controls.pitch * controlEffectiveness;
        const pitchTorque = new CANNON.Vec3(pitchForce * elevatorLeverArm, 0, 0);
        
        // Roll moment (ailerons)
        const aileronArea = config.aileronArea || GameConstants.PHYSICS.AIRCRAFT.AILERON_AREA;
        const aileronEffectiveness = config.aileronEffectiveness || GameConstants.PHYSICS.AIRCRAFT.AILERON_EFFECTIVENESS;
        const aileronLeverArm = config.aileronLeverArm || GameConstants.PHYSICS.AIRCRAFT.AILERON_LEVER_ARM;
        
        const rollForce = dynamicPressure * aileronArea * aileronEffectiveness * controls.roll * controlEffectiveness;
        const rollTorque = new CANNON.Vec3(0, 0, -rollForce * aileronLeverArm);
        
        // Yaw moment (rudder)
        const rudderArea = config.rudderArea || GameConstants.PHYSICS.AIRCRAFT.RUDDER_AREA;
        const rudderEffectiveness = config.rudderEffectiveness || GameConstants.PHYSICS.AIRCRAFT.RUDDER_EFFECTIVENESS;
        const rudderLeverArm = config.rudderLeverArm || GameConstants.PHYSICS.AIRCRAFT.RUDDER_LEVER_ARM;
        
        const yawForce = dynamicPressure * rudderArea * rudderEffectiveness * controls.yaw * controlEffectiveness;
        const yawTorque = new CANNON.Vec3(0, yawForce * rudderLeverArm, 0);
        
        return {
            pitchTorque,
            rollTorque,
            yawTorque
        };
    }
} 