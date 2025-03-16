/**
 * Oyun sabitleri
 */
export const GameConstants = {
    // Fizik sabitleri
    PHYSICS: {
        GRAVITY: -9.8, // m/s²
        TIME_STEP: 1/60, // saniye
        AIRCRAFT: {
            MASS: 1000, // kg
            DRAG_COEFFICIENT: 0.1,
            LIFT_COEFFICIENT: 0.2,
            MAX_SPEED: 100, // m/s
            ACCELERATION: 10, // m/s²
            ROTATION_SPEED: 1.0, // radyan/saniye
            BOOST_MULTIPLIER: 1.5,
            // Yeni fizik parametreleri
            WING_AREA: 15, // m²
            STALL_ANGLE: Math.PI / 6, // 30 derece
            STALL_RECOVERY_ANGLE: Math.PI / 12, // 15 derece
            AIR_DENSITY: 1.225, // kg/m³
            PITCH_SENSITIVITY: 1.2,
            YAW_SENSITIVITY: 0.8,
            ROLL_SENSITIVITY: 1.5,
            
            // Aerodinamik parametreler
            AOA_MIN: -15, // Negatif stall açısı (derece)
            AOA_OPTIMAL: 5, // Optimal kaldırma açısı (derece)
            AOA_MAX: 18, // Pozitif stall açısı (derece)
            
            // Kontrol yüzeyleri
            ELEVATOR_AREA: 2.5, // m²
            ELEVATOR_EFFECTIVENESS: 1.0,
            ELEVATOR_LEVER_ARM: 5.0, // m
            
            AILERON_AREA: 2.0, // m²
            AILERON_EFFECTIVENESS: 1.0,
            AILERON_LEVER_ARM: 5.0, // m
            
            RUDDER_AREA: 1.5, // m²
            RUDDER_EFFECTIVENESS: 1.0,
            RUDDER_LEVER_ARM: 5.0, // m
            
            // Uçak tipleri için konfigürasyonlar
            TYPES: {
                FIGHTER: {
                    MASS: 8000,
                    WING_AREA: 30,
                    WINGSPAN: 12,
                    ENGINE_POWER: 80000,
                    DRAG_COEFFICIENT: 0.022,
                    LIFT_COEFFICIENT: 0.3,
                    MAX_LIFT_COEFFICIENT: 1.6,
                    ELEVATOR_EFFECTIVENESS: 1.5,
                    AILERON_EFFECTIVENESS: 1.3,
                    RUDDER_EFFECTIVENESS: 1.2
                },
                TRAINER: {
                    MASS: 1200,
                    WING_AREA: 18,
                    WINGSPAN: 10,
                    ENGINE_POWER: 3000,
                    DRAG_COEFFICIENT: 0.030,
                    LIFT_COEFFICIENT: 0.25,
                    MAX_LIFT_COEFFICIENT: 1.5,
                    ELEVATOR_EFFECTIVENESS: 0.9,
                    AILERON_EFFECTIVENESS: 0.8,
                    RUDDER_EFFECTIVENESS: 0.7
                },
                BOMBER: {
                    MASS: 25000,
                    WING_AREA: 160,
                    WINGSPAN: 30,
                    ENGINE_POWER: 120000,
                    DRAG_COEFFICIENT: 0.035,
                    LIFT_COEFFICIENT: 0.2,
                    MAX_LIFT_COEFFICIENT: 1.3,
                    ELEVATOR_EFFECTIVENESS: 0.6,
                    AILERON_EFFECTIVENESS: 0.5,
                    RUDDER_EFFECTIVENESS: 0.4
                }
            }
        }
    },
    
    // Uçak tipleri
    AIRCRAFT_TYPES: {
        FIGHTER: {
            name: 'Fighter',
            maxSpeed: 100, // m/s
            acceleration: 15, // m/s²
            rotationSpeed: 1.2, // radyan/saniye
            health: 100,
            ammo: 200,
            damage: 10,
            color: 0xff0000 // kırmızı
        },
        BOMBER: {
            name: 'Bomber',
            maxSpeed: 80, // m/s
            acceleration: 8, // m/s²
            rotationSpeed: 0.8, // radyan/saniye
            health: 150,
            ammo: 100,
            damage: 20,
            color: 0x00ff00 // yeşil
        },
        SCOUT: {
            name: 'Scout',
            maxSpeed: 120, // m/s
            acceleration: 20, // m/s²
            rotationSpeed: 1.5, // radyan/saniye
            health: 80,
            ammo: 150,
            damage: 5,
            color: 0x0000ff // mavi
        }
    },
    
    // Oyun modları
    GAME_MODES: {
        FREE_FLIGHT: 'free-flight',
        TEAM_DEATHMATCH: 'team-deathmatch',
        BALLOON_HUNT: 'balloon-hunt',
        CAPTURE_FLAG: 'capture-flag'
    },
    
    // Takımlar
    TEAMS: {
        RED: {
            name: 'Red Team',
            color: 0xff0000
        },
        BLUE: {
            name: 'Blue Team',
            color: 0x0000ff
        }
    },
    
    // Dünya sabitleri
    WORLD: {
        SIZE: 5000, // metre
        GROUND_HEIGHT: 0,
        SKY_HEIGHT: 1000,
        CLOUD_COUNT: 50,
        BUILDING_COUNT: 100,
        FLOATING_ISLAND_COUNT: 20,
        BALLOON_COUNT: 30
    },
    
    // Ağ sabitleri
    NETWORK: {
        UPDATE_RATE: 60, // ms
        INTERPOLATION_DELAY: 100, // ms
        // Tarayıcı ortamında çalışacak şekilde düzeltildi
        SERVER_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://ucak-simulasyonu.vercel.app'
    },
    
    // UI sabitleri
    UI: {
        RADAR_RANGE: 1000, // metre
        RADAR_UPDATE_RATE: 500, // ms
        HIT_INFO_DURATION: 3000 // ms
    },
    
    // Görev sabitleri
    MISSIONS: {
        BALLOON_POINTS: 50,
        PLAYER_KILL_POINTS: 100,
        FLAG_CAPTURE_POINTS: 200
    },
    
    // Güç artırımları
    POWERUPS: {
        TYPES: {
            SPEED: 'speed',
            AMMO: 'ammo',
            HEALTH: 'health',
            SHIELD: 'shield'
        },
        DURATION: 10000, // ms
        SPAWN_RATE: 30000 // ms
    }
}; 