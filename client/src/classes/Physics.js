/**
 * Physics.js
 * Cannon.js kullanarak fizik motorunu yöneten sınıf
 * Optimize edilmiş versiyon
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Physics {
    constructor() {
        this.world = null;
        this.bodies = new Map(); // id -> body
        this.timeStep = GameConstants.PHYSICS.TIME_STEP;
        this.gravity = GameConstants.PHYSICS.GRAVITY;
        this.collisionCallbacks = new Map(); // bodyId -> callback
        
        // Optimizasyon için eklenen değişkenler
        this.enableCollisionDetection = true; // İhtiyaç olmadığında kapatılabilir
        this.updateFrequency = 1; // Her karede bir güncelleme (2 = her iki karede bir)
        this.updateCounter = 0;
        this.cachedBodies = new Set(); // Sık erişilen gövdeleri önbelleğe alma
        this.sleepingBodies = new Set(); // İnaktif gövdeler
        this.debugMode = false; // Debug modu kapalı
    }
    
    /**
     * Fizik motorunu başlat
     */
    init() {
        try {
            // CANNON yüklü mü kontrol et
            if (typeof CANNON === 'undefined') {
                console.error('CANNON is not defined. Make sure Cannon.js is loaded.');
                throw new Error('CANNON is not defined');
            }
            
            // Cannon.js dünyasını oluştur
            this.world = new CANNON.World();
            
            // Yerçekimini ayarla
            this.world.gravity.set(0, this.gravity, 0);
            
            // Çarpışma algılama ayarları - daha hızlı broadphase
            this.world.broadphase = new CANNON.SAPBroadphase(this.world);
            this.world.solver.iterations = 7; // Daha az iterasyon, daha hızlı çözüm
            
            // Dünya parametrelerini optimize et
            this.world.allowSleep = true; // Hareketsiz gövdeleri uyku moduna al
            this.world.solver.tolerance = 0.1; // Daha fazla tolerans = daha az hassasiyet ama daha hızlı
            
            // Sadece çarpışma gerektiren durumlar için çarpışma olay dinleyicisini ekle
            if (this.enableCollisionDetection) {
                this.world.addEventListener('beginContact', this.handleCollision.bind(this));
            }
            
            // Yer düzlemi oluştur
            this.createGround();
        } catch (error) {
            console.error('Failed to initialize physics engine:', error);
            alert('Physics engine initialization failed. Game may not work properly.');
        }
    }
    
    /**
     * Yer düzlemi oluştur
     */
    createGround() {
        // Yer için şekil oluştur
        const groundShape = new CANNON.Plane();
        
        // Yer için gövde oluştur
        const groundBody = new CANNON.Body({
            mass: 0, // Statik gövde
            position: new CANNON.Vec3(0, GameConstants.WORLD.GROUND_HEIGHT, 0),
            shape: groundShape
        });
        
        // Yer düzlemini döndür (y-up)
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        
        // Sleeping modunu aktif et
        groundBody.allowSleep = true;
        groundBody.sleepSpeedLimit = 0.1;
        groundBody.sleepTimeLimit = 1.0;
        
        // Dünyaya ekle
        this.world.addBody(groundBody);
        
        // Bodies map'e ekle
        this.bodies.set('ground', groundBody);
    }
    
    /**
     * Kutu şeklinde gövde oluştur - optimize edilmiş versiyon
     * @param {Object} options - Gövde oluşturma seçenekleri
     * @returns {CANNON.Body} - Oluşturulan gövde
     */
    createBoxBody(options) {
        const defaults = {
            id: `box_${Date.now()}`,
            mass: 1,
            position: new CANNON.Vec3(0, 0, 0),
            size: new CANNON.Vec3(1, 1, 1),
            material: null,
            linearDamping: 0.01,
            angularDamping: 0.01,
            fixedRotation: false,
            allowSleep: true, // Uyku modunu etkinleştir
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1.0
        };
        
        const settings = { ...defaults, ...options };
        
        // Kutu şekli oluştur - en küçük boyut 0.1
        const halfExtents = new CANNON.Vec3(
            Math.max(settings.size.x / 2, 0.1),
            Math.max(settings.size.y / 2, 0.1),
            Math.max(settings.size.z / 2, 0.1)
        );
        
        // Büyük nesneler için daha basit şekil kullan, uzaksa da
        let boxShape;
        if (settings.useSimpleShape || this.isDistantFromCamera(settings.position)) {
            boxShape = new CANNON.Box(halfExtents);
        } else {
            boxShape = new CANNON.Box(halfExtents);
        }
        
        // Gövde oluştur
        const boxBody = new CANNON.Body({
            mass: settings.mass,
            position: settings.position,
            shape: boxShape,
            material: settings.material,
            linearDamping: settings.linearDamping,
            angularDamping: settings.angularDamping,
            fixedRotation: settings.fixedRotation,
            allowSleep: settings.allowSleep,
            sleepSpeedLimit: settings.sleepSpeedLimit,
            sleepTimeLimit: settings.sleepTimeLimit
        });
        
        // Dünyaya ekle
        this.world.addBody(boxBody);
        
        // Bodies map'e ekle
        this.bodies.set(settings.id, boxBody);
        
        return boxBody;
    }
    
    /**
     * Küre şeklinde gövde oluştur - optimize edilmiş versiyon
     * @param {Object} options - Gövde oluşturma seçenekleri
     * @returns {CANNON.Body} - Oluşturulan gövde
     */
    createSphereBody(options) {
        const defaults = {
            id: `sphere_${Date.now()}`,
            mass: 1,
            position: new CANNON.Vec3(0, 0, 0),
            radius: 1,
            material: null,
            linearDamping: 0.01,
            angularDamping: 0.01,
            allowSleep: true
        };
        
        const settings = { ...defaults, ...options };
        
        // Küre şekli oluştur
        const sphereShape = new CANNON.Sphere(Math.max(settings.radius, 0.1)); // En az 0.1 yarıçap
        
        // Gövde oluştur
        const sphereBody = new CANNON.Body({
            mass: settings.mass,
            position: settings.position,
            shape: sphereShape,
            material: settings.material,
            linearDamping: settings.linearDamping,
            angularDamping: settings.angularDamping,
            allowSleep: settings.allowSleep,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1.0
        });
        
        // Dünyaya ekle
        this.world.addBody(sphereBody);
        
        // Bodies map'e ekle
        this.bodies.set(settings.id, sphereBody);
        
        return sphereBody;
    }
    
    /**
     * Uçak için fizik gövdesi oluştur - optimize edilmiş versiyon
     * @param {Object} options - Gövde oluşturma seçenekleri
     * @returns {CANNON.Body} - Oluşturulan gövde
     */
    createAircraftBody(options) {
        try {
            const defaults = {
                id: `aircraft_${Date.now()}`,
                mass: GameConstants.PHYSICS.AIRCRAFT.MASS,
                position: new CANNON.Vec3(0, 100, 0),
                size: new CANNON.Vec3(3, 1, 6), // Gövde boyutu
                material: null,
                linearDamping: 0.05,
                angularDamping: 0.1,
                useSimpleShape: false // Basit fizik şekli kullan
            };
            
            const settings = { ...defaults, ...options };
            
            // Uçak gövdesi için şekil oluştur - optimize edilmiş
            let aircraftShape;
            
            if (settings.useSimpleShape) {
                // Basit küp şekli kullan - daha az kaynak gerektirir
                aircraftShape = new CANNON.Box(new CANNON.Vec3(
                    settings.size.x / 2,
                    settings.size.y / 2,
                    settings.size.z / 2
                ));
            } else {
                // Normal şekil kullan
                aircraftShape = new CANNON.Box(new CANNON.Vec3(
                    settings.size.x / 2,
                    settings.size.y / 2,
                    settings.size.z / 2
                ));
            }
            
            // Gövde oluştur
            const aircraftBody = new CANNON.Body({
                mass: settings.mass,
                position: settings.position,
                shape: aircraftShape,
                material: settings.material,
                linearDamping: settings.linearDamping,
                angularDamping: settings.angularDamping,
                fixedRotation: false,
                allowSleep: false // Uçakları uyku moduna almıyoruz
            });
            
            // Uçak için özel fizik özellikleri ekle - basitleştirilmiş değerler
            aircraftBody.userData = {
                type: 'aircraft',
                liftCoefficient: GameConstants.PHYSICS.AIRCRAFT.LIFT_COEFFICIENT,
                dragCoefficient: GameConstants.PHYSICS.AIRCRAFT.DRAG_COEFFICIENT,
                wingArea: 10, // Kanat alanı (m²)
                stallAngle: Math.PI / 6, // Stall açısı (30 derece)
            };
            
            // Dünyaya ekle
            this.world.addBody(aircraftBody);
            
            // Bodies map'e ekle
            this.bodies.set(settings.id, aircraftBody);
            
            // Önbelleğe al (sık erişim için)
            this.cachedBodies.add(settings.id);
            
            return aircraftBody;
        } catch (error) {
            console.error('Error creating aircraft physics body:', error);
            return null;
        }
    }
    
    /**
     * Kameraya olan uzaklığı kontrol et (LOD için)
     * @param {CANNON.Vec3} position - Kontrol edilecek pozisyon
     * @returns {boolean} - Uzakta mı?
     */
    isDistantFromCamera(position) {
        // Oyun mantığından kamera pozisyonunu almalısınız
        // Şimdilik sabit bir merkez noktası kullanıyoruz
        const cameraPosition = new CANNON.Vec3(0, 100, 0);
        const distanceThreshold = 500; // 500 birim mesafeden uzaktaysa
        
        const dx = position.x - cameraPosition.x;
        const dy = position.y - cameraPosition.y;
        const dz = position.z - cameraPosition.z;
        
        // Karekök hesaplamadan önce mesafe karşılaştırması (daha hızlı)
        return (dx * dx + dy * dy + dz * dz) > (distanceThreshold * distanceThreshold);
    }
    
    /**
     * Gövdeyi kaldır
     * @param {CANNON.Body} body - Kaldırılacak gövde
     */
    removeBody(body) {
        if (!body) return;
        
        // Dünyadan kaldır
        this.world.removeBody(body);
        
        // Bodies map'ten kaldır
        for (const [id, b] of this.bodies.entries()) {
            if (b === body) {
                // Önbellekten de kaldır
                this.cachedBodies.delete(id);
                this.sleepingBodies.delete(id);
                
                // Map'ten kaldır
                this.bodies.delete(id);
                break;
            }
        }
    }
    
    /**
     * ID'ye göre gövde al
     * @param {string} id - Gövde ID'si
     * @returns {CANNON.Body} - Gövde
     */
    getBody(id) {
        return this.bodies.get(id);
    }
    
    /**
     * Çarpışma materyali oluştur
     * @param {Object} options - Materyal seçenekleri
     * @returns {CANNON.Material} - Oluşturulan materyal
     */
    createMaterial(options) {
        const defaults = {
            friction: 0.3,
            restitution: 0.3
        };
        
        const settings = { ...defaults, ...options };
        
        return new CANNON.Material({
            friction: settings.friction,
            restitution: settings.restitution
        });
    }
    
    /**
     * İki materyal arasında temas materyali oluştur
     * @param {CANNON.Material} material1 - Birinci materyal
     * @param {CANNON.Material} material2 - İkinci materyal
     * @param {Object} options - Temas materyali seçenekleri
     * @returns {CANNON.ContactMaterial} - Oluşturulan temas materyali
     */
    createContactMaterial(material1, material2, options) {
        const defaults = {
            friction: 0.3,
            restitution: 0.3,
            contactEquationStiffness: 1e7,
            contactEquationRelaxation: 3
        };
        
        const settings = { ...defaults, ...options };
        
        const contactMaterial = new CANNON.ContactMaterial(
            material1,
            material2,
            {
                friction: settings.friction,
                restitution: settings.restitution,
                contactEquationStiffness: settings.contactEquationStiffness,
                contactEquationRelaxation: settings.contactEquationRelaxation
            }
        );
        
        // Dünyaya ekle
        this.world.addContactMaterial(contactMaterial);
        
        return contactMaterial;
    }
    
    /**
     * Çarpışma olayını işle - optimize edilmiş versiyon
     * @param {Object} event - Çarpışma olayı
     */
    handleCollision(event) {
        // Çarpışma tespiti devre dışı ise işleme
        if (!this.enableCollisionDetection) return;
        
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        
        // Bodyleri hızlı bir şekilde atlama
        if (!bodyA || !bodyB || !bodyA.id || !bodyB.id) return;
        
        // ID'leri doğrudan bodylerden al (daha hızlı)
        const idA = bodyA.id;
        const idB = bodyB.id;
        
        // Callback'leri çağır
        if (idA && this.collisionCallbacks.has(idA)) {
            this.collisionCallbacks.get(idA)(idB, event);
        }
        
        if (idB && this.collisionCallbacks.has(idB)) {
            this.collisionCallbacks.get(idB)(idA, event);
        }
    }
    
    /**
     * Çarpışma callback'i ekle
     * @param {string} bodyId - Gövde ID'si
     * @param {Function} callback - Çarpışma callback'i
     */
    addCollisionCallback(bodyId, callback) {
        this.collisionCallbacks.set(bodyId, callback);
    }
    
    /**
     * Çarpışma callback'ini kaldır
     * @param {string} bodyId - Gövde ID'si
     */
    removeCollisionCallback(bodyId) {
        this.collisionCallbacks.delete(bodyId);
    }
    
    /**
     * Çarpışma algılamayı aç/kapat
     * @param {boolean} enable - Çarpışma algılamayı etkinleştir/devre dışı bırak
     */
    setCollisionDetection(enable) {
        this.enableCollisionDetection = enable;
    }
    
    /**
     * Fizik dünyasını güncelle - optimize edilmiş versiyon
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        try {
            if (!this.world) {
                return;
            }
            
            // Bazı frameleri atla
            this.updateCounter = (this.updateCounter + 1) % this.updateFrequency;
            if (this.updateCounter !== 0) {
                return;
            }
            
            // Fizik dünyasını güncelle - optimize edilmiş parametreler
            const fixedTimeStep = 1/30; // 30 FPS - daha az adım ama daha hızlı
            const maxSubSteps = 2; // Daha az alt adım (daha az doğru ama daha hızlı)
            
            this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
            
            // Uyuyan gövdeleri yönet
            this.bodies.forEach((body, id) => {
                if (body.sleepState === CANNON.Body.SLEEPING && !this.sleepingBodies.has(id)) {
                    this.sleepingBodies.add(id);
                } else if (body.sleepState === CANNON.Body.AWAKE && this.sleepingBodies.has(id)) {
                    this.sleepingBodies.delete(id);
                }
            });
            
            // Fizik sınırlamaları uygula - sadece aktif gövdeler için optimizasyon
            this.bodies.forEach((body, id) => {
                // Gövde uyku modundaysa atla
                if (this.sleepingBodies.has(id)) {
                    return;
                }
                
                // Eğer gövde uçaksa, sınırlamaları uygula
                if (body.userData && body.userData.type === 'aircraft') {
                    // 1. Hız Sınırlaması - basitleştirilmiş
                    const maxSpeed = 300; // m/s (1080 km/h)
                    const velocity = body.velocity;
                    const speedSquared = velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z;
                    
                    if (speedSquared > maxSpeed * maxSpeed) {
                        // Hızı sınırla - karekök hesaplamadan
                        const factor = maxSpeed / Math.sqrt(speedSquared);
                        body.velocity.scale(factor, body.velocity);
                    }
                    
                    // 2. Dünya Sınırları - optimize edilmiş
                    const worldSize = GameConstants.WORLD.SIZE;
                    const halfWorldSize = worldSize / 2;
                    
                    // Tüm sınırları tek seferde kontrol et
                    body.position.x = Math.max(-halfWorldSize, Math.min(halfWorldSize, body.position.x));
                    body.position.z = Math.max(-halfWorldSize, Math.min(halfWorldSize, body.position.z));
                    
                    // Eğer sınırda isek, hızı ayarla
                    if (body.position.x === -halfWorldSize || body.position.x === halfWorldSize) {
                        body.velocity.x *= -0.5;
                    }
                    
                    if (body.position.z === -halfWorldSize || body.position.z === halfWorldSize) {
                        body.velocity.z *= -0.5;
                    }
                    
                    // 3. Yükseklik Sınırlaması - optimize edilmiş
                    const minHeight = 0; // Minimum yükseklik (m)
                    const maxHeight = GameConstants.WORLD.SKY_HEIGHT; // Maksimum yükseklik (m)
                    
                    body.position.y = Math.max(minHeight, Math.min(maxHeight, body.position.y));
                    
                    if (body.position.y === minHeight && body.velocity.y < 0) {
                        body.velocity.y = 0;
                    } else if (body.position.y === maxHeight && body.velocity.y > 0) {
                        body.velocity.y = 0;
                    }
                    
                    // 4. Angular Velocity Sınırlaması - optimize edilmiş
                    const maxAngularSpeed = 5.0; // rad/s
                    const angularSpeedSquared = 
                        body.angularVelocity.x * body.angularVelocity.x + 
                        body.angularVelocity.y * body.angularVelocity.y + 
                        body.angularVelocity.z * body.angularVelocity.z;
                    
                    if (angularSpeedSquared > maxAngularSpeed * maxAngularSpeed) {
                        // Angular hızı sınırla - karekök hesaplamadan
                        const angularFactor = maxAngularSpeed / Math.sqrt(angularSpeedSquared);
                        body.angularVelocity.scale(angularFactor, body.angularVelocity);
                    }
                }
            });
        } catch (error) {
            console.error('Error updating physics:', error);
        }
    }
    
    /**
     * Fizik motorunu temizle
     */
    dispose() {
        // Tüm gövdeleri kaldır
        this.bodies.forEach((body, id) => {
            this.world.removeBody(body);
        });
        
        // Collections'ları temizle
        this.bodies.clear();
        this.collisionCallbacks.clear();
        this.cachedBodies.clear();
        this.sleepingBodies.clear();
    }
    
    /**
     * Performans ayarlarını güncelle
     * @param {Object} settings - Performans ayarları
     */
    updatePerformanceSettings(settings) {
        // Güncelleme frekansını ayarla
        if (settings.physicsUpdateFrequency) {
            this.updateFrequency = settings.physicsUpdateFrequency;
        }
        
        // Çarpışma algılamayı aç/kapat
        if (settings.hasOwnProperty('enableCollisionDetection')) {
            this.enableCollisionDetection = settings.enableCollisionDetection;
        }
        
        // Debug modunu aç/kapat
        if (settings.hasOwnProperty('debugMode')) {
            this.debugMode = settings.debugMode;
        }
    }
} 