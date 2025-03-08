/**
 * Physics.js
 * Cannon.js kullanarak fizik motorunu yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Physics {
    constructor() {
        this.world = null;
        this.bodies = new Map(); // id -> body
        this.timeStep = GameConstants.PHYSICS.TIME_STEP;
        this.gravity = GameConstants.PHYSICS.GRAVITY;
        this.collisionCallbacks = new Map(); // bodyId -> callback
    }
    
    /**
     * Fizik motorunu başlat
     */
    init() {
        console.log('Initializing physics engine');
        
        try {
            // CANNON yüklü mü kontrol et
            if (typeof CANNON === 'undefined') {
                console.error('CANNON is not defined. Make sure Cannon.js is loaded.');
                throw new Error('CANNON is not defined');
            }
            
            console.log('Creating CANNON.World');
            // Cannon.js dünyasını oluştur
            this.world = new CANNON.World();
            
            // Yerçekimini ayarla (düşük yerçekimi)
            console.log('Setting gravity to:', 0, this.gravity, 0);
            this.world.gravity.set(0, this.gravity, 0);
            
            // Çarpışma algılama ayarları
            console.log('Setting up broadphase');
            this.world.broadphase = new CANNON.NaiveBroadphase();
            this.world.solver.iterations = 10;
            
            // Çarpışma olayını dinle
            console.log('Adding collision event listener');
            this.world.addEventListener('beginContact', this.handleCollision.bind(this));
            
            // Yer düzlemi oluştur
            console.log('Creating ground plane');
            this.createGround();
            
            console.log('Physics engine initialized successfully');
            
            // Dünya nesnesinin oluşturulduğunu doğrula
            if (!this.world) {
                throw new Error('Physics world is null after initialization');
            }
        } catch (error) {
            console.error('Failed to initialize physics engine:', error);
            console.error('Stack trace:', error.stack);
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
        
        // Dünyaya ekle
        this.world.addBody(groundBody);
        
        // Bodies map'e ekle
        this.bodies.set('ground', groundBody);
    }
    
    /**
     * Kutu şeklinde gövde oluştur
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
            fixedRotation: false
        };
        
        const settings = { ...defaults, ...options };
        
        // Kutu şekli oluştur
        const boxShape = new CANNON.Box(new CANNON.Vec3(
            settings.size.x / 2,
            settings.size.y / 2,
            settings.size.z / 2
        ));
        
        // Gövde oluştur
        const boxBody = new CANNON.Body({
            mass: settings.mass,
            position: settings.position,
            shape: boxShape,
            material: settings.material,
            linearDamping: settings.linearDamping,
            angularDamping: settings.angularDamping,
            fixedRotation: settings.fixedRotation
        });
        
        // Dünyaya ekle
        this.world.addBody(boxBody);
        
        // Bodies map'e ekle
        this.bodies.set(settings.id, boxBody);
        
        return boxBody;
    }
    
    /**
     * Küre şeklinde gövde oluştur
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
            angularDamping: 0.01
        };
        
        const settings = { ...defaults, ...options };
        
        // Küre şekli oluştur
        const sphereShape = new CANNON.Sphere(settings.radius);
        
        // Gövde oluştur
        const sphereBody = new CANNON.Body({
            mass: settings.mass,
            position: settings.position,
            shape: sphereShape,
            material: settings.material,
            linearDamping: settings.linearDamping,
            angularDamping: settings.angularDamping
        });
        
        // Dünyaya ekle
        this.world.addBody(sphereBody);
        
        // Bodies map'e ekle
        this.bodies.set(settings.id, sphereBody);
        
        return sphereBody;
    }
    
    /**
     * Uçak için fizik gövdesi oluştur
     * @param {Object} options - Gövde oluşturma seçenekleri
     * @returns {CANNON.Body} - Oluşturulan gövde
     */
    createAircraftBody(options) {
        console.log('Creating aircraft physics body with options:', options);
        
        // CANNON yüklü mü kontrol et
        if (typeof CANNON === 'undefined') {
            console.error('CANNON is not defined. Make sure Cannon.js is loaded.');
            throw new Error('CANNON is not defined');
        }
        
        if (!this.world) {
            console.error('Physics world is not initialized');
            throw new Error('Physics world is not initialized');
        }
        
        try {
            console.log('GameConstants:', GameConstants);
            console.log('GameConstants.PHYSICS:', GameConstants.PHYSICS);
            console.log('GameConstants.PHYSICS.AIRCRAFT:', GameConstants.PHYSICS.AIRCRAFT);
            
            const defaults = {
                id: `aircraft_${Date.now()}`,
                mass: GameConstants.PHYSICS.AIRCRAFT.MASS,
                position: new CANNON.Vec3(0, 100, 0),
                size: new CANNON.Vec3(3, 1, 6), // Gövde boyutu
                material: null,
                linearDamping: 0.05,
                angularDamping: 0.1
            };
            
            console.log('Default settings:', defaults);
            
            const settings = { ...defaults, ...options };
            console.log('Merged settings:', settings);
            
            // Uçak gövdesi için şekil oluştur
            console.log('Creating aircraft shape with size:', settings.size);
            const aircraftShape = new CANNON.Box(new CANNON.Vec3(
                settings.size.x / 2,
                settings.size.y / 2,
                settings.size.z / 2
            ));
            console.log('Aircraft shape created');
            
            // Gövde oluştur
            console.log('Creating aircraft body with mass:', settings.mass, 'and position:', settings.position);
            const aircraftBody = new CANNON.Body({
                mass: settings.mass,
                position: settings.position,
                shape: aircraftShape,
                material: settings.material,
                linearDamping: settings.linearDamping,
                angularDamping: settings.angularDamping,
                fixedRotation: false
            });
            console.log('Aircraft body created');
            
            // Uçak için özel fizik özellikleri ekle
            aircraftBody.userData = {
                type: 'aircraft',
                liftCoefficient: GameConstants.PHYSICS.AIRCRAFT.LIFT_COEFFICIENT,
                dragCoefficient: GameConstants.PHYSICS.AIRCRAFT.DRAG_COEFFICIENT,
                wingArea: 10, // Kanat alanı (m²)
                stallAngle: Math.PI / 6, // Stall açısı (30 derece)
            };
            console.log('Aircraft body user data set:', aircraftBody.userData);
            
            // Dünyaya ekle
            console.log('Adding aircraft body to physics world');
            this.world.addBody(aircraftBody);
            
            // Bodies map'e ekle
            console.log('Adding aircraft body to bodies map with ID:', settings.id);
            this.bodies.set(settings.id, aircraftBody);
            
            console.log('Aircraft physics body created with ID:', settings.id);
            
            return aircraftBody;
        } catch (error) {
            console.error('Error creating aircraft physics body:', error);
            console.error('Stack trace:', error.stack);
            throw new Error('Failed to create aircraft physics body: ' + error.message);
        }
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
     * Çarpışma olayını işle
     * @param {Object} event - Çarpışma olayı
     */
    handleCollision(event) {
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        
        // Bodies map'ten ID'leri bul
        let idA = null;
        let idB = null;
        
        for (const [id, body] of this.bodies.entries()) {
            if (body === bodyA) {
                idA = id;
            } else if (body === bodyB) {
                idB = id;
            }
            
            if (idA && idB) break;
        }
        
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
     * Fizik dünyasını güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        try {
            if (!this.world) {
                console.error('Physics world is not initialized');
                return;
            }
            
            // Fizik dünyasını güncelle
            // Sabit zaman adımı kullan (daha stabil fizik için)
            const fixedTimeStep = 1/60; // 60 FPS
            const maxSubSteps = 3; // Maksimum alt adım sayısı
            
            this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
            
            // Gövdelerin pozisyonlarını logla (sadece debug modunda)
            const debugMode = false;
            if (debugMode && this.bodies.size > 0) {
                console.log('Number of physics bodies:', this.bodies.size);
                
                // İlk 3 gövdenin pozisyonlarını logla (performans için sınırlı sayıda)
                let count = 0;
                this.bodies.forEach((body, id) => {
                    if (count < 3) {
                        console.log(`Body ${id} position:`, body.position, 'velocity:', body.velocity);
                        count++;
                    }
                });
            }
            
            // Fizik sınırlamaları uygula
            this.bodies.forEach((body, id) => {
                // Eğer gövde uçaksa, sınırlamaları uygula
                if (body.userData && body.userData.type === 'aircraft') {
                    // 1. Hız Sınırlaması
                    const maxSpeed = 300; // m/s (1080 km/h)
                    const velocity = body.velocity;
                    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
                    
                    if (speed > maxSpeed) {
                        // Hızı sınırla
                        const factor = maxSpeed / speed;
                        body.velocity.scale(factor, body.velocity);
                        console.warn(`Aircraft ${id} speed limited from ${speed.toFixed(2)} to ${maxSpeed} m/s`);
                    }
                    
                    // 2. Dünya Sınırları
                    const worldSize = GameConstants.WORLD.SIZE;
                    const halfWorldSize = worldSize / 2;
                    
                    // X ekseni sınırlaması
                    if (body.position.x < -halfWorldSize) {
                        body.position.x = -halfWorldSize;
                        body.velocity.x = Math.abs(body.velocity.x) * 0.5; // Geri sekme
                    } else if (body.position.x > halfWorldSize) {
                        body.position.x = halfWorldSize;
                        body.velocity.x = -Math.abs(body.velocity.x) * 0.5; // Geri sekme
                    }
                    
                    // Z ekseni sınırlaması
                    if (body.position.z < -halfWorldSize) {
                        body.position.z = -halfWorldSize;
                        body.velocity.z = Math.abs(body.velocity.z) * 0.5; // Geri sekme
                    } else if (body.position.z > halfWorldSize) {
                        body.position.z = halfWorldSize;
                        body.velocity.z = -Math.abs(body.velocity.z) * 0.5; // Geri sekme
                    }
                    
                    // 3. Yükseklik Sınırlaması
                    const minHeight = 0; // Minimum yükseklik (m)
                    const maxHeight = GameConstants.WORLD.SKY_HEIGHT; // Maksimum yükseklik (m)
                    
                    if (body.position.y < minHeight) {
                        body.position.y = minHeight;
                        // Yere çarpmayı önle
                        if (body.velocity.y < 0) {
                            body.velocity.y = 0;
                        }
                    } else if (body.position.y > maxHeight) {
                        body.position.y = maxHeight;
                        // Yukarı çıkmayı sınırla
                        if (body.velocity.y > 0) {
                            body.velocity.y = 0;
                        }
                    }
                    
                    // 4. Angular Velocity Sınırlaması
                    const maxAngularSpeed = 5.0; // rad/s
                    const angularSpeed = body.angularVelocity.length();
                    
                    if (angularSpeed > maxAngularSpeed) {
                        // Angular hızı sınırla
                        const angularFactor = maxAngularSpeed / angularSpeed;
                        body.angularVelocity.scale(angularFactor, body.angularVelocity);
                    }
                }
            });
        } catch (error) {
            console.error('Error updating physics:', error);
            console.error('Stack trace:', error.stack);
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
        
        // Bodies map'i temizle
        this.bodies.clear();
        
        // Çarpışma callback'lerini temizle
        this.collisionCallbacks.clear();
        
        console.log('Physics engine disposed');
    }
} 