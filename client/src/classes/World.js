/**
 * World.js
 * Oyun dünyasını oluşturan ve yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = {
            ground: null,
            sky: null,
            runway: null,        // Pist
            runwayLights: [],    // Pist ışıkları
            taxiways: [],        // Taksi yolları
            hangar: null,        // Hangar
            controlTower: null,  // Kontrol kulesi
            clouds: [],
            buildings: [],
            floatingIslands: [],
            balloons: [],
            zeppelins: []
        };
        this.materials = {
            ground: null,
            beach: null,
            runway: null,        // Pist materyali
            runwayMarking: null, // Pist işaretleri
            building: null,
            roof: null,
            cloud: null,
            balloon: null,
            zeppelin: null,
            island: null
        };
        this.worldSize = GameConstants.WORLD.SIZE;
        
        // Pist parametreleri
        this.runwayLength = 1000; // Pist uzunluğu (m)
        this.runwayWidth = 50;    // Pist genişliği (m)
        this.runwayPosition = new THREE.Vector3(0, 0.1, 0); // Pist pozisyonu
        
        console.log('World initialized');
    }
    
    /**
     * Dünyayı oluştur
     */
    create() {
        try {
            console.log("Dünya oluşturuluyor...");
            
            // THREE yüklü mü kontrol et
            if (typeof THREE === 'undefined') {
                console.error('THREE is not defined. Make sure Three.js is loaded.');
                throw new Error('THREE is not defined');
            }
            
            // Scene kontrolü
            if (!this.scene) {
                console.error('Scene is not defined');
                throw new Error('Scene is not defined');
            }
            
            // Materyalleri oluştur
            this.createMaterials();
            
            // Zemini oluştur
            this.createGround();
            
            // Pisti oluştur
            this.createRunway();
            
            // Havaalanı yapılarını oluştur
            this.createAirport();
            
            // Bulutları oluştur
            this.createClouds();
            
            // Binaları oluştur
            this.createBuildings();
            
            // Balonları oluştur
            this.createBalloons();
            
            // Zeplinleri oluştur
            this.createZeppelins();
            
            // Adaları oluştur
            this.createFloatingIslands();
            
            console.log("Dünya başarıyla oluşturuldu!");
        } catch (error) {
            console.error('Error creating world:', error);
            throw error; // Kritik bir hata, yeniden fırlat
        }
    }
    
    /**
     * Materyalleri oluştur
     */
    createMaterials() {
        try {
            console.log("Materyaller oluşturuluyor...");
            
            // TextureLoader oluştur
            const textureLoader = new THREE.TextureLoader();
            
            // Varsayılan texture
            const defaultTexture = new THREE.Texture();
            defaultTexture.needsUpdate = true;
            
            // Zemin materyali
            try {
                const groundTexture = textureLoader.load('assets/textures/grass.jpg');
                groundTexture.wrapS = THREE.RepeatWrapping;
                groundTexture.wrapT = THREE.RepeatWrapping;
                groundTexture.repeat.set(100, 100);
                this.materials.ground = new THREE.MeshStandardMaterial({
                    map: groundTexture,
                    roughness: 0.8,
                    metalness: 0.2
                });
            } catch (textureError) {
                console.warn('Failed to load ground texture, using default');
                this.materials.ground = new THREE.MeshStandardMaterial({
                    color: 0x3a7e1a, // Yeşil
                    roughness: 0.8,
                    metalness: 0.2
                });
            }
            
            // Plaj materyali
            const beachTexture = new THREE.TextureLoader().load('assets/textures/sand.jpg');
            beachTexture.wrapS = THREE.RepeatWrapping;
            beachTexture.wrapT = THREE.RepeatWrapping;
            beachTexture.repeat.set(20, 20);
            
            this.materials.beach = new THREE.MeshStandardMaterial({
                map: beachTexture,
                roughness: 0.9,
                metalness: 0.1
            });
            
            // Pist materyali
            const runwayTexture = new THREE.TextureLoader().load('assets/textures/runway.jpg');
            runwayTexture.wrapS = THREE.RepeatWrapping;
            runwayTexture.wrapT = THREE.RepeatWrapping;
            runwayTexture.repeat.set(1, 10);
            
            this.materials.runway = new THREE.MeshStandardMaterial({
                map: runwayTexture,
                roughness: 0.7,
                metalness: 0.3
            });
            
            // Pist işaretleri materyali
            this.materials.runwayMarking = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.1
            });
            
            // Bina materyali
            this.materials.building = new THREE.MeshStandardMaterial({
                color: 0x808080,
                roughness: 0.7,
                metalness: 0.3
            });
            
            // Çatı materyali
            this.materials.roof = new THREE.MeshStandardMaterial({
                color: 0x505050,
                roughness: 0.6,
                metalness: 0.2
            });
            
            // Bulut materyali
            this.materials.cloud = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 1.0,
                metalness: 0.0,
                transparent: true,
                opacity: 0.8
            });
            
            // Balon materyali
            this.materials.balloon = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                roughness: 0.5,
                metalness: 0.2
            });
            
            // Zeplin materyali
            this.materials.zeppelin = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.6,
                metalness: 0.3
            });
            
            // Ada materyali
            this.materials.island = new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.8,
                metalness: 0.1
            });
            
            console.log("Materyaller başarıyla oluşturuldu!");
        } catch (error) {
            console.error('Error creating materials:', error);
            
            // Hata durumunda basit materyaller oluştur
            this.materials.ground = new THREE.MeshBasicMaterial({ color: 0x3a7e1a });
            this.materials.runway = new THREE.MeshBasicMaterial({ color: 0x333333 });
            this.materials.runwayMarking = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.materials.building = new THREE.MeshBasicMaterial({ color: 0x808080 });
            this.materials.roof = new THREE.MeshBasicMaterial({ color: 0x505050 });
            this.materials.cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
            this.materials.balloon = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.materials.zeppelin = new THREE.MeshBasicMaterial({ color: 0xcccccc });
            this.materials.island = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
            
            console.warn('Created fallback materials due to error');
        }
    }
    
    /**
     * Zemini oluştur
     */
    createGround() {
        // Zemin geometrisi
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 32, 32);
        
        // Zemin mesh'i oluştur
        const ground = new THREE.Mesh(groundGeometry, this.materials.ground);
        ground.rotation.x = -Math.PI / 2; // Yatay döndür
        ground.position.y = GameConstants.WORLD.GROUND_HEIGHT;
        ground.receiveShadow = true;
        
        this.scene.add(ground);
        this.objects.ground = ground;
        
        // Plaj oluştur
        const beachGeometry = new THREE.PlaneGeometry(this.worldSize / 3, this.worldSize / 10, 32, 32);
        const beach = new THREE.Mesh(beachGeometry, this.materials.beach);
        beach.rotation.x = -Math.PI / 2; // Yatay döndür
        beach.position.set(0, GameConstants.WORLD.GROUND_HEIGHT + 0.01, this.worldSize / 3); // Zeminin biraz üzerinde
        beach.receiveShadow = true;
        
        this.scene.add(beach);
    }
    
    /**
     * Pisti oluştur
     */
    createRunway() {
        console.log("Pist oluşturuluyor...");
        
        // Ana pist
        const runwayGeometry = new THREE.BoxGeometry(
            this.runwayWidth,
            0.1, // Yükseklik
            this.runwayLength
        );
        
        const runway = new THREE.Mesh(runwayGeometry, this.materials.runway);
        runway.position.set(
            this.runwayPosition.x,
            GameConstants.WORLD.GROUND_HEIGHT + 0.05, // Zeminin biraz üzerinde
            this.runwayPosition.z
        );
        runway.rotation.x = -Math.PI / 2;
        runway.receiveShadow = true;
        this.scene.add(runway);
        this.objects.runway = runway;
        
        // Pist işaretleri
        this.createRunwayMarkings();
        
        // Pist ışıkları
        this.createRunwayLights();
        
        console.log("Pist başarıyla oluşturuldu!");
    }
    
    /**
     * Pist işaretlerini oluştur
     */
    createRunwayMarkings() {
        // Orta çizgi
        const centerLineGeometry = new THREE.BoxGeometry(
            0.5, // Genişlik
            0.05, // Yükseklik
            this.runwayLength - 10 // Uzunluk (pistten biraz kısa)
        );
        
        const centerLine = new THREE.Mesh(centerLineGeometry, this.materials.runwayMarking);
        centerLine.position.set(
            this.runwayPosition.x,
            GameConstants.WORLD.GROUND_HEIGHT + 0.11, // Pistin biraz üzerinde
            this.runwayPosition.z
        );
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.receiveShadow = true;
        this.scene.add(centerLine);
        
        // Kenar çizgileri
        const edgeLineGeometry = new THREE.BoxGeometry(
            0.5, // Genişlik
            0.05, // Yükseklik
            this.runwayLength // Uzunluk
        );
        
        // Sol kenar
        const leftEdge = new THREE.Mesh(edgeLineGeometry, this.materials.runwayMarking);
        leftEdge.position.set(
            this.runwayPosition.x - this.runwayWidth / 2 + 1,
            GameConstants.WORLD.GROUND_HEIGHT + 0.11,
            this.runwayPosition.z
        );
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.receiveShadow = true;
        this.scene.add(leftEdge);
        
        // Sağ kenar
        const rightEdge = new THREE.Mesh(edgeLineGeometry, this.materials.runwayMarking);
        rightEdge.position.set(
            this.runwayPosition.x + this.runwayWidth / 2 - 1,
            GameConstants.WORLD.GROUND_HEIGHT + 0.11,
            this.runwayPosition.z
        );
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.receiveShadow = true;
        this.scene.add(rightEdge);
        
        // Eşik işaretleri (pist başı ve sonu)
        for (let end = -1; end <= 1; end += 2) {
            const thresholdPosition = this.runwayPosition.z + (end * this.runwayLength / 2) - (end * 5);
            
            // Eşik çizgileri
            for (let i = -4; i <= 4; i++) {
                const thresholdLineGeometry = new THREE.BoxGeometry(
                    1.5, // Genişlik
                    0.05, // Yükseklik
                    3 // Uzunluk
                );
                
                const thresholdLine = new THREE.Mesh(thresholdLineGeometry, this.materials.runwayMarking);
                thresholdLine.position.set(
                    this.runwayPosition.x + (i * 2),
                    GameConstants.WORLD.GROUND_HEIGHT + 0.11,
                    thresholdPosition
                );
                thresholdLine.rotation.x = -Math.PI / 2;
                thresholdLine.receiveShadow = true;
                this.scene.add(thresholdLine);
            }
            
            // Pist numaraları (basitleştirilmiş)
            const runwayNumberGeometry = new THREE.BoxGeometry(
                4, // Genişlik
                0.05, // Yükseklik
                6 // Uzunluk
            );
            
            const runwayNumber = new THREE.Mesh(runwayNumberGeometry, this.materials.runwayMarking);
            runwayNumber.position.set(
                this.runwayPosition.x,
                GameConstants.WORLD.GROUND_HEIGHT + 0.11,
                thresholdPosition + (end * 15)
            );
            runwayNumber.rotation.x = -Math.PI / 2;
            runwayNumber.receiveShadow = true;
            this.scene.add(runwayNumber);
        }
    }
    
    /**
     * Pist ışıklarını oluştur
     */
    createRunwayLights() {
        // Işık materyali
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1,
            roughness: 0.3,
            metalness: 0.8
        });
        
        // Pist kenar ışıkları
        const lightGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
        
        this.objects.runwayLights = [];
        
        // Pist kenarlarına ışıklar yerleştir
        for (let side = -1; side <= 1; side += 2) {
            for (let z = -this.runwayLength / 2 + 5; z <= this.runwayLength / 2 - 5; z += 20) {
                const light = new THREE.Mesh(lightGeometry, lightMaterial);
                light.position.set(
                    this.runwayPosition.x + (side * this.runwayWidth / 2),
                    GameConstants.WORLD.GROUND_HEIGHT + 0.15,
                    this.runwayPosition.z + z
                );
                light.rotation.x = Math.PI / 2;
                this.scene.add(light);
                this.objects.runwayLights.push(light);
                
                // Nokta ışığı ekle
                const pointLight = new THREE.PointLight(0xffff00, 0.5, 10);
                pointLight.position.copy(light.position);
                pointLight.position.y += 0.5;
                this.scene.add(pointLight);
            }
        }
        
        // Yaklaşma ışıkları
        for (let end = -1; end <= 1; end += 2) {
            const approachZ = this.runwayPosition.z + (end * (this.runwayLength / 2 + 30));
            
            for (let x = -10; x <= 10; x += 5) {
                const light = new THREE.Mesh(lightGeometry, lightMaterial);
                light.position.set(
                    this.runwayPosition.x + x,
                    GameConstants.WORLD.GROUND_HEIGHT + 0.15,
                    approachZ
                );
                light.rotation.x = Math.PI / 2;
                this.scene.add(light);
                this.objects.runwayLights.push(light);
                
                // Nokta ışığı ekle
                const pointLight = new THREE.PointLight(0xffff00, 0.5, 10);
                pointLight.position.copy(light.position);
                pointLight.position.y += 0.5;
                this.scene.add(pointLight);
            }
        }
    }
    
    /**
     * Havaalanı yapılarını oluştur
     */
    createAirport() {
        // Kontrol kulesi
        this.createControlTower();
        
        // Hangar
        this.createHangar();
        
        // Taksi yolları
        this.createTaxiways();
    }
    
    /**
     * Kontrol kulesini oluştur
     */
    createControlTower() {
        // Kule tabanı
        const towerBaseGeometry = new THREE.BoxGeometry(10, 5, 10);
        const towerBase = new THREE.Mesh(towerBaseGeometry, this.materials.building);
        towerBase.position.set(
            this.runwayPosition.x + 30,
            GameConstants.WORLD.GROUND_HEIGHT + 2.5,
            this.runwayPosition.z - 20
        );
        towerBase.castShadow = true;
        towerBase.receiveShadow = true;
        this.scene.add(towerBase);
        
        // Kule gövdesi
        const towerBodyGeometry = new THREE.BoxGeometry(6, 15, 6);
        const towerBody = new THREE.Mesh(towerBodyGeometry, this.materials.building);
        towerBody.position.set(
            this.runwayPosition.x + 30,
            GameConstants.WORLD.GROUND_HEIGHT + 12.5,
            this.runwayPosition.z - 20
        );
        towerBody.castShadow = true;
        towerBody.receiveShadow = true;
        this.scene.add(towerBody);
        
        // Kule kabini
        const towerCabinGeometry = new THREE.BoxGeometry(10, 5, 10);
        const towerCabin = new THREE.Mesh(towerCabinGeometry, this.materials.building);
        towerCabin.position.set(
            this.runwayPosition.x + 30,
            GameConstants.WORLD.GROUND_HEIGHT + 22.5,
            this.runwayPosition.z - 20
        );
        towerCabin.castShadow = true;
        towerCabin.receiveShadow = true;
        this.scene.add(towerCabin);
        
        // Kule çatısı
        const towerRoofGeometry = new THREE.ConeGeometry(7, 5, 4);
        const towerRoof = new THREE.Mesh(towerRoofGeometry, this.materials.roof);
        towerRoof.position.set(
            this.runwayPosition.x + 30,
            GameConstants.WORLD.GROUND_HEIGHT + 27.5,
            this.runwayPosition.z - 20
        );
        towerRoof.castShadow = true;
        towerRoof.receiveShadow = true;
        this.scene.add(towerRoof);
        
        this.objects.controlTower = {
            base: towerBase,
            body: towerBody,
            cabin: towerCabin,
            roof: towerRoof
        };
    }
    
    /**
     * Hangarı oluştur
     */
    createHangar() {
        // Hangar gövdesi
        const hangarBodyGeometry = new THREE.BoxGeometry(30, 15, 40);
        const hangarBody = new THREE.Mesh(hangarBodyGeometry, this.materials.building);
        hangarBody.position.set(
            this.runwayPosition.x - 40,
            GameConstants.WORLD.GROUND_HEIGHT + 7.5,
            this.runwayPosition.z - 30
        );
        hangarBody.castShadow = true;
        hangarBody.receiveShadow = true;
        this.scene.add(hangarBody);
        
        // Hangar çatısı
        const hangarRoofGeometry = new THREE.BoxGeometry(32, 2, 42);
        const hangarRoof = new THREE.Mesh(hangarRoofGeometry, this.materials.roof);
        hangarRoof.position.set(
            this.runwayPosition.x - 40,
            GameConstants.WORLD.GROUND_HEIGHT + 16,
            this.runwayPosition.z - 30
        );
        hangarRoof.castShadow = true;
        hangarRoof.receiveShadow = true;
        this.scene.add(hangarRoof);
        
        this.objects.hangar = {
            body: hangarBody,
            roof: hangarRoof
        };
    }
    
    /**
     * Taksi yollarını oluştur
     */
    createTaxiways() {
        // Taksi yolu materyali
        const taxiwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Ana taksi yolu
        const mainTaxiwayGeometry = new THREE.BoxGeometry(15, 0.1, 100);
        const mainTaxiway = new THREE.Mesh(mainTaxiwayGeometry, taxiwayMaterial);
        mainTaxiway.position.set(
            this.runwayPosition.x - 20,
            GameConstants.WORLD.GROUND_HEIGHT + 0.06,
            this.runwayPosition.z - 20
        );
        mainTaxiway.rotation.x = -Math.PI / 2;
        mainTaxiway.receiveShadow = true;
        this.scene.add(mainTaxiway);
        
        // Bağlantı taksi yolu
        const connectorTaxiwayGeometry = new THREE.BoxGeometry(30, 0.1, 15);
        const connectorTaxiway = new THREE.Mesh(connectorTaxiwayGeometry, taxiwayMaterial);
        connectorTaxiway.position.set(
            this.runwayPosition.x - 5,
            GameConstants.WORLD.GROUND_HEIGHT + 0.06,
            this.runwayPosition.z + 20
        );
        connectorTaxiway.rotation.x = -Math.PI / 2;
        connectorTaxiway.receiveShadow = true;
        this.scene.add(connectorTaxiway);
        
        this.objects.taxiways = [mainTaxiway, connectorTaxiway];
    }
    
    /**
     * Bulutları oluştur
     */
    createClouds() {
        const cloudCount = GameConstants.WORLD.CLOUD_COUNT;
        
        for (let i = 0; i < cloudCount; i++) {
            // Bulut grubu oluştur
            const cloudGroup = new THREE.Group();
            
            // Rastgele pozisyon
            const x = (Math.random() - 0.5) * this.worldSize;
            const y = 200 + Math.random() * 300; // 200-500 arası yükseklik
            const z = (Math.random() - 0.5) * this.worldSize;
            
            cloudGroup.position.set(x, y, z);
            
            // Rastgele boyut
            const scale = 1 + Math.random() * 2; // 1-3 arası ölçek
            cloudGroup.scale.set(scale, scale, scale);
            
            // Rastgele rotasyon
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Bulut parçaları oluştur (3-6 arası küre)
            const cloudPartCount = 3 + Math.floor(Math.random() * 4);
            
            for (let j = 0; j < cloudPartCount; j++) {
                // Küre geometrisi
                const radius = 5 + Math.random() * 5; // 5-10 arası yarıçap
                const cloudGeometry = new THREE.SphereGeometry(radius, 8, 8);
                
                // Küre mesh'i oluştur
                const cloudPart = new THREE.Mesh(cloudGeometry, this.materials.cloud);
                
                // Rastgele pozisyon (grup içinde)
                const partX = (Math.random() - 0.5) * 15;
                const partY = (Math.random() - 0.5) * 5;
                const partZ = (Math.random() - 0.5) * 15;
                
                cloudPart.position.set(partX, partY, partZ);
                
                // Gruba ekle
                cloudGroup.add(cloudPart);
            }
            
            // Sahneye ekle
            this.scene.add(cloudGroup);
            this.objects.clouds.push(cloudGroup);
        }
    }
    
    /**
     * Binaları oluştur
     */
    createBuildings() {
        const buildingCount = GameConstants.WORLD.BUILDING_COUNT;
        
        for (let i = 0; i < buildingCount; i++) {
            // Bina grubu oluştur
            const buildingGroup = new THREE.Group();
            
            // Rastgele pozisyon
            const x = (Math.random() - 0.5) * this.worldSize * 0.8; // Dünya sınırlarından biraz içeride
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            
            // Plaja yakın olmasını engelle
            if (Math.abs(z - this.worldSize / 3) < 100) {
                continue; // Bu binayı atla
            }
            
            buildingGroup.position.set(x, GameConstants.WORLD.GROUND_HEIGHT, z);
            
            // Rastgele boyut
            const width = 10 + Math.random() * 20; // 10-30 arası genişlik
            const height = 10 + Math.random() * 40; // 10-50 arası yükseklik
            const depth = 10 + Math.random() * 20; // 10-30 arası derinlik
            
            // Bina gövdesi
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(buildingGeometry, this.materials.building);
            building.position.y = height / 2; // Zeminin üzerine yerleştir
            building.castShadow = true;
            building.receiveShadow = true;
            
            buildingGroup.add(building);
            
            // Çatı
            const roofGeometry = new THREE.ConeGeometry(width / 2, height / 4, 4);
            const roof = new THREE.Mesh(roofGeometry, this.materials.roof);
            roof.position.y = height + height / 8; // Binanın üzerine yerleştir
            roof.rotation.y = Math.PI / 4; // 45 derece döndür
            roof.castShadow = true;
            
            buildingGroup.add(roof);
            
            // Sahneye ekle
            this.scene.add(buildingGroup);
            this.objects.buildings.push(buildingGroup);
        }
    }
    
    /**
     * Havada asılı adaları oluştur
     */
    createFloatingIslands() {
        const islandCount = GameConstants.WORLD.FLOATING_ISLAND_COUNT;
        
        for (let i = 0; i < islandCount; i++) {
            // Ada grubu oluştur
            const islandGroup = new THREE.Group();
            
            // Rastgele pozisyon
            const x = (Math.random() - 0.5) * this.worldSize * 0.8;
            const y = 100 + Math.random() * 300; // 100-400 arası yükseklik
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            
            islandGroup.position.set(x, y, z);
            
            // Rastgele boyut
            const width = 20 + Math.random() * 40; // 20-60 arası genişlik
            const height = 5 + Math.random() * 10; // 5-15 arası yükseklik
            const depth = 20 + Math.random() * 40; // 20-60 arası derinlik
            
            // Ada gövdesi
            const islandGeometry = new THREE.BoxGeometry(width, height, depth);
            const island = new THREE.Mesh(islandGeometry, this.materials.island);
            island.castShadow = true;
            island.receiveShadow = true;
            
            islandGroup.add(island);
            
            // Adaya ağaçlar ekle
            const treeCount = 1 + Math.floor(Math.random() * 5); // 1-5 arası ağaç
            
            for (let j = 0; j < treeCount; j++) {
                // Ağaç gövdesi
                const trunkGeometry = new THREE.BoxGeometry(2, 8, 2);
                const trunk = new THREE.Mesh(trunkGeometry, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
                
                // Ağaç yaprakları
                const leavesGeometry = new THREE.ConeGeometry(5, 10, 8);
                const leaves = new THREE.Mesh(leavesGeometry, new THREE.MeshStandardMaterial({ color: 0x2E7D32 }));
                
                // Pozisyonları ayarla
                trunk.position.y = 4;
                leaves.position.y = 12;
                
                // Ağaç grubu oluştur
                const treeGroup = new THREE.Group();
                treeGroup.add(trunk);
                treeGroup.add(leaves);
                
                // Ağacı adaya yerleştir
                const treeX = (Math.random() - 0.5) * (width - 10);
                const treeZ = (Math.random() - 0.5) * (depth - 10);
                treeGroup.position.set(treeX, height / 2, treeZ);
                
                islandGroup.add(treeGroup);
            }
            
            // Sahneye ekle
            this.scene.add(islandGroup);
            this.objects.floatingIslands.push(islandGroup);
        }
    }
    
    /**
     * Balonları oluştur
     */
    createBalloons() {
        const balloonCount = GameConstants.WORLD.BALLOON_COUNT;
        
        for (let i = 0; i < balloonCount; i++) {
            // Balon grubu oluştur
            const balloonGroup = new THREE.Group();
            
            // Rastgele pozisyon
            const x = (Math.random() - 0.5) * this.worldSize;
            const y = 100 + Math.random() * 400; // 100-500 arası yükseklik
            const z = (Math.random() - 0.5) * this.worldSize;
            
            balloonGroup.position.set(x, y, z);
            
            // Balon gövdesi
            const balloonGeometry = new THREE.SphereGeometry(10, 16, 16);
            const balloon = new THREE.Mesh(balloonGeometry, this.materials.balloon);
            balloon.castShadow = true;
            
            balloonGroup.add(balloon);
            
            // Balon sepeti
            const basketGeometry = new THREE.BoxGeometry(5, 3, 5);
            const basket = new THREE.Mesh(basketGeometry, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            basket.position.y = -15;
            basket.castShadow = true;
            
            balloonGroup.add(basket);
            
            // İpler
            const ropeCount = 4;
            const ropePositions = [
                { x: 5, z: 0 },
                { x: -5, z: 0 },
                { x: 0, z: 5 },
                { x: 0, z: -5 }
            ];
            
            for (let j = 0; j < ropeCount; j++) {
                const ropeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 15, 8);
                const rope = new THREE.Mesh(ropeGeometry, new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
                
                // İpi pozisyonla
                rope.position.set(ropePositions[j].x, -7.5, ropePositions[j].z);
                
                // İpi döndür
                rope.rotation.x = Math.PI / 2;
                
                balloonGroup.add(rope);
            }
            
            // Sahneye ekle
            this.scene.add(balloonGroup);
            this.objects.balloons.push(balloonGroup);
        }
    }
    
    /**
     * Zeplinleri oluştur
     */
    createZeppelins() {
        const zeppelinCount = 5; // Sabit sayıda zeplin
        
        for (let i = 0; i < zeppelinCount; i++) {
            // Zeplin grubu oluştur
            const zeppelinGroup = new THREE.Group();
            
            // Rastgele pozisyon
            const x = (Math.random() - 0.5) * this.worldSize;
            const y = 300 + Math.random() * 200; // 300-500 arası yükseklik
            const z = (Math.random() - 0.5) * this.worldSize;
            
            zeppelinGroup.position.set(x, y, z);
            
            // Rastgele rotasyon
            zeppelinGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Zeplin gövdesi
            const bodyGeometry = new THREE.CylinderGeometry(10, 10, 60, 16, 1, false, 0, Math.PI * 2);
            bodyGeometry.rotateZ(Math.PI / 2); // Yatay döndür
            
            const body = new THREE.Mesh(bodyGeometry, this.materials.zeppelin);
            body.castShadow = true;
            
            zeppelinGroup.add(body);
            
            // Zeplin kabin
            const cabinGeometry = new THREE.BoxGeometry(10, 5, 15);
            const cabin = new THREE.Mesh(cabinGeometry, new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
            cabin.position.y = -10;
            cabin.castShadow = true;
            
            zeppelinGroup.add(cabin);
            
            // Zeplin kuyruk
            const tailGeometry = new THREE.ConeGeometry(10, 20, 16);
            tailGeometry.rotateZ(-Math.PI / 2); // Yatay döndür
            
            const tail = new THREE.Mesh(tailGeometry, this.materials.zeppelin);
            tail.position.x = -40;
            tail.castShadow = true;
            
            zeppelinGroup.add(tail);
            
            // Zeplin pervaneler
            const propellerCount = 2;
            const propellerPositions = [
                { x: -5, y: -10, z: -10 },
                { x: -5, y: -10, z: 10 }
            ];
            
            for (let j = 0; j < propellerCount; j++) {
                const propellerGeometry = new THREE.BoxGeometry(1, 10, 1);
                const propeller = new THREE.Mesh(propellerGeometry, new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
                
                propeller.position.set(propellerPositions[j].x, propellerPositions[j].y, propellerPositions[j].z);
                
                zeppelinGroup.add(propeller);
            }
            
            // Sahneye ekle
            this.scene.add(zeppelinGroup);
            this.objects.zeppelins.push(zeppelinGroup);
        }
    }
    
    /**
     * Dünyayı güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        // Bulutları hareket ettir
        this.objects.clouds.forEach(cloud => {
            cloud.position.x += 0.1 * deltaTime;
            
            // Dünya sınırlarını aşarsa diğer tarafa geçir
            if (cloud.position.x > this.worldSize / 2) {
                cloud.position.x = -this.worldSize / 2;
            }
        });
        
        // Zeplinleri hareket ettir
        this.objects.zeppelins.forEach(zeppelin => {
            // İleri doğru hareket
            zeppelin.position.x += Math.sin(zeppelin.rotation.y) * 2 * deltaTime;
            zeppelin.position.z += Math.cos(zeppelin.rotation.y) * 2 * deltaTime;
            
            // Pervaneleri döndür
            zeppelin.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'BoxGeometry' && child.geometry.parameters.height === 10) {
                    child.rotation.z += 5 * deltaTime;
                }
            });
            
            // Dünya sınırlarını aşarsa yönünü değiştir
            if (
                zeppelin.position.x > this.worldSize / 2 ||
                zeppelin.position.x < -this.worldSize / 2 ||
                zeppelin.position.z > this.worldSize / 2 ||
                zeppelin.position.z < -this.worldSize / 2
            ) {
                zeppelin.rotation.y += Math.PI; // 180 derece döndür
            }
        });
        
        // Balonları hafifçe hareket ettir
        this.objects.balloons.forEach(balloon => {
            // Rastgele hafif hareket
            balloon.position.x += (Math.random() - 0.5) * 0.2 * deltaTime;
            balloon.position.z += (Math.random() - 0.5) * 0.2 * deltaTime;
            balloon.position.y += (Math.random() - 0.5) * 0.1 * deltaTime;
            
            // Dünya sınırlarını aşmasını engelle
            if (balloon.position.x > this.worldSize / 2) {
                balloon.position.x = this.worldSize / 2;
            } else if (balloon.position.x < -this.worldSize / 2) {
                balloon.position.x = -this.worldSize / 2;
            }
            
            if (balloon.position.z > this.worldSize / 2) {
                balloon.position.z = this.worldSize / 2;
            } else if (balloon.position.z < -this.worldSize / 2) {
                balloon.position.z = -this.worldSize / 2;
            }
            
            if (balloon.position.y < 50) {
                balloon.position.y = 50;
            } else if (balloon.position.y > 500) {
                balloon.position.y = 500;
            }
        });
    }
    
    /**
     * Dünyayı temizle
     */
    dispose() {
        // Tüm objeleri kaldır
        for (const key in this.objects) {
            if (Array.isArray(this.objects[key])) {
                this.objects[key].forEach(obj => {
                    this.scene.remove(obj);
                    
                    // Geometrileri ve materyalleri temizle
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
                
                this.objects[key] = [];
            } else if (this.objects[key]) {
                this.scene.remove(this.objects[key]);
                
                // Geometrileri ve materyalleri temizle
                if (this.objects[key].geometry) this.objects[key].geometry.dispose();
                if (this.objects[key].material) this.objects[key].material.dispose();
                
                this.objects[key] = null;
            }
        }
        
        // Materyalleri temizle
        for (const key in this.materials) {
            if (this.materials[key]) {
                this.materials[key].dispose();
                this.materials[key] = null;
            }
        }
    }
} 