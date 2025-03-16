/**
 * World.js
 * Oyun dünyasını oluşturan ve yöneten sınıf
 * Optimize edilmiş versiyon
 */
import { GameConstants } from '../constants/GameConstants.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        
        // Optimize edilmiş dünya özellikleri
        this.worldSize = 5000; // Dünya boyutu küçültüldü
        this.groundSize = 10000; // Yer düzlemi küçültüldü
        this.groundTextureSize = 512; // Texture boyutu küçültüldü
        this.islandCount = 3; // Ada sayısı azaltıldı
        this.cloudCount = 10; // Bulut sayısı azaltıldı
        this.buildingCount = 5; // Bina sayısı azaltıldı
        this.treesCount = 15; // Ağaç sayısı azaltıldı
        
        // LOD (Level of Detail) yönetimi
        this.lodEnabled = true;
        this.lodDistances = [0, 500, 1500, 3000];
        this.lodObjects = [];
        
        // Obje havuzu (Object pooling)
        this.objectPool = {
            clouds: [],
            trees: [],
            buildings: []
        };
        
        // Optimize edilmiş materials
        this.materials = {};
        
        // Optimize edilmiş nesne referansları
        this.objects = {
            ground: null,
            runway: null,
            islands: [],
            buildings: [],
            clouds: [],
            balloons: [],
            trees: []
        };
        
        // Atmosfer efektleri - daha hafif ayarlar
        this.fogColor = new THREE.Color(0xadd8e6);
        this.fogDensity = 0.0005; // Fog yoğunluğu azaltıldı
        this.fogEnabled = true;
        
        // Düşük poligonlu basit gökyüzü
        this.skyboxEnabled = true;
        this.skyboxSize = 8000;
        
        // Frustum culling için kamera referansı
        this.camera = null;
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        
        // Aktif nesneleri takip etmek için
        this.visibleObjects = new Set();
        
        // Instanced rendering için
        this.useInstancing = true;
        this.instancedMeshes = {};
        
        // Optimize edilmiş ışıklandırma
        this.setupLighting();
    }
    
    /**
     * Kamera referansını ayarla
     * @param {THREE.Camera} camera - Oyun kamerası
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Dünyayı oluştur - optimize edilmiş
     */
    create() {
        console.log("Creating optimized 3D world...");
        
        // Düşük detaylı materyal oluştur
        this.createLowDetailMaterials();
        
        // Basit skybox oluştur
        if (this.skyboxEnabled) {
            this.createSimpleSkybox();
        }
        
        // Zemin oluştur - LOD desteği ile
        this.createOptimizedGround();
        
        // Pist oluştur - basitleştirilmiş
        this.createSimpleRunway();
        
        // Optimize edilmiş havaalanı
        this.createSimpleAirport();
        
        // Daha az sayıda yüzen ada
        this.createFloatingIslands();
        
        // Instanced rendering ile ağaçlar
        if (this.useInstancing) {
            this.createInstancedTrees();
        } else {
            this.createOptimizedTrees();
        }
        
        // Daha hafif atmosferik efektler
        this.createOptimizedClouds();
        
        // Sis efekti - ayarlanabilir
        if (this.fogEnabled) {
            this.createSimpleFog();
        }
        
        console.log("Optimized 3D world created successfully");
    }
    
    /**
     * Düşük detaylı materyaller oluştur
     */
    createLowDetailMaterials() {
        try {
            console.log("Creating optimized materials...");
            
            // Texture loader
            const textureLoader = new THREE.TextureLoader();
            
            // Texture boyutunu küçültmek için ayarlar
            const textureSettings = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBFormat
            };
            
            // Tek bir zemin materyali - texture yükleme denemesi
            try {
                let groundTexture = null;
                
                // Texture yükleme başarısız olursa basit renk kullan
                try {
                    groundTexture = textureLoader.load('assets/textures/grass.jpg');
                    groundTexture.wrapS = THREE.RepeatWrapping;
                    groundTexture.wrapT = THREE.RepeatWrapping;
                    groundTexture.repeat.set(50, 50); // Daha az tekrar
                    groundTexture.anisotropy = 1; // Anisotropi kapalı (performans için)
                } catch (e) {
                    console.warn("Failed to load texture, using color material");
                }
                
                this.materials.ground = new THREE.MeshLambertMaterial({
                    map: groundTexture,
                    color: groundTexture ? undefined : 0x3a7e1a,
                    flatShading: true
                });
            } catch (textureError) {
                console.warn('Failed to load ground texture, using basic material');
                this.materials.ground = new THREE.MeshBasicMaterial({
                    color: 0x3a7e1a // Yeşil
                });
            }
            
            // Diğer materyaller - hepsi basit ve düşük maliyetli
            this.materials.runway = new THREE.MeshBasicMaterial({ color: 0x333333 });
            this.materials.runwayMarking = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.materials.building = new THREE.MeshLambertMaterial({ color: 0x808080 });
            this.materials.cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            this.materials.island = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            
            console.log("Optimized materials created");
        } catch (error) {
            console.error('Error creating materials:', error);
            
            // Hata durumunda en basit materyalları kullan
            this.materials.ground = new THREE.MeshBasicMaterial({ color: 0x3a7e1a });
            this.materials.runway = new THREE.MeshBasicMaterial({ color: 0x333333 });
            this.materials.runwayMarking = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.materials.building = new THREE.MeshBasicMaterial({ color: 0x808080 });
            this.materials.cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            this.materials.island = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        }
    }
    
    /**
     * Optimize edilmiş zemin oluştur
     */
    createOptimizedGround() {
        // Daha az segmentli zemin geometrisi
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 8, 8);
        
        // Zemin mesh'i oluştur
        const ground = new THREE.Mesh(groundGeometry, this.materials.ground);
        ground.rotation.x = -Math.PI / 2; // Yatay döndür
        ground.position.y = GameConstants.WORLD.GROUND_HEIGHT;
        ground.receiveShadow = false; // Gölgeler pahalı, kapatıldı
        
        // Frustum culling'i kapat - zemin her zaman görünür olmalı
        ground.frustumCulled = false;
        
        this.scene.add(ground);
        this.objects.ground = ground;
    }
    
    /**
     * Basit skybox oluştur
     */
    createSimpleSkybox() {
        // Basit renkli gökyüzü kutusu
        const skyboxGeometry = new THREE.BoxGeometry(this.skyboxSize, this.skyboxSize, this.skyboxSize);
        
        // Gökyüzü materyalleri - her yüz için aynı renk ama farklı tonlar
        const skyboxMaterials = [
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // sağ
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // sol
            new THREE.MeshBasicMaterial({ color: 0x6CA6CD, side: THREE.BackSide }), // üst
            new THREE.MeshBasicMaterial({ color: 0x87CEFA, side: THREE.BackSide }), // alt
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // ön
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // arka
        ];
        
        // Skybox oluştur
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
        skybox.frustumCulled = false; // her zaman görünür
        
        this.scene.add(skybox);
    }
    
    /**
     * Basit pist oluştur
     */
    createSimpleRunway() {
        // Daha az detaylı pist
        const runwayLength = 1000;
        const runwayWidth = 50;
        const runwayGeometry = new THREE.PlaneGeometry(runwayWidth, runwayLength);
        
        // Pist mesh'i oluştur
        const runway = new THREE.Mesh(runwayGeometry, this.materials.runway);
        runway.rotation.x = -Math.PI / 2; // Yatay döndür
        runway.position.y = GameConstants.WORLD.GROUND_HEIGHT + 0.01; // Zeminin biraz üzerinde
        runway.position.z = 0;
        
        this.scene.add(runway);
        this.objects.runway = runway;
        
        // Basit pist işaretleri
        const markingGeometry = new THREE.PlaneGeometry(5, 50);
        const centerMarking = new THREE.Mesh(markingGeometry, this.materials.runwayMarking);
        centerMarking.rotation.x = -Math.PI / 2;
        centerMarking.position.y = GameConstants.WORLD.GROUND_HEIGHT + 0.02;
        centerMarking.position.z = 0;
        
        this.scene.add(centerMarking);
    }
    
    /**
     * Optimize edilmiş bulutlar oluştur
     */
    createOptimizedClouds() {
        // Daha az detaylı bulut geometrisi
        const cloudGeometry = new THREE.SphereGeometry(50, 4, 4);
        
        // Bulut sayısı azaltıldı
        for (let i = 0; i < this.cloudCount; i++) {
            const cloudX = (Math.random() - 0.5) * this.worldSize * 0.8;
            const cloudY = 200 + Math.random() * 300;
            const cloudZ = (Math.random() - 0.5) * this.worldSize * 0.8;
            
            // Bulut oluştur - basit, düşük poligonlu
            const cloud = new THREE.Mesh(cloudGeometry, this.materials.cloud);
            cloud.position.set(cloudX, cloudY, cloudZ);
            cloud.scale.set(
                1 + Math.random(),
                0.8 + Math.random() * 0.3,
                1 + Math.random()
            );
            
            // Performans için frustum culling aktif
            cloud.frustumCulled = true;
            
            this.scene.add(cloud);
            this.objects.clouds.push(cloud);
        }
    }
    
    /**
     * Basit sis oluştur
     */
    createSimpleFog() {
        // Hafif sis efekti - daha az yoğun
        const fog = new THREE.FogExp2(this.fogColor, this.fogDensity);
        this.scene.fog = fog;
    }
    
    /**
     * Optimize edilmiş yüzen adaları oluştur
     */
    createFloatingIslands() {
        // Daha basit ada geometrisi
        const islandGeometry = new THREE.CylinderGeometry(100, 80, 30, 8, 1);
        
        // Daha az ada
        for (let i = 0; i < this.islandCount; i++) {
            const islandX = (Math.random() - 0.5) * this.worldSize * 0.7;
            const islandY = 100 + Math.random() * 300;
            const islandZ = (Math.random() - 0.5) * this.worldSize * 0.7;
            
            // Basit ada oluştur
            const island = new THREE.Mesh(islandGeometry, this.materials.island);
            island.position.set(islandX, islandY, islandZ);
            
            // Performans için frustum culling aktif
            island.frustumCulled = true;
            
            this.scene.add(island);
            this.objects.islands.push(island);
        }
    }
    
    /**
     * Instanced rendering ile ağaç oluştur
     */
    createInstancedTrees() {
        // Basit ağaç geometrisi
        const trunkGeometry = new THREE.CylinderGeometry(2, 2, 10, 6, 1);
        const topGeometry = new THREE.ConeGeometry(8, 15, 6, 1);
        
        // Ağaç materyalleri
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        // Örnek ağaç modeli oluştur
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 5;
        
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 17;
        
        // Grup oluştur
        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(top);
        
        // Ağaçları yerleştir
        for (let i = 0; i < this.treesCount; i++) {
            const treeX = (Math.random() - 0.5) * this.worldSize * 0.6;
            const treeZ = (Math.random() - 0.5) * this.worldSize * 0.6;
            
            // Klon oluştur
            const tree = treeGroup.clone();
            tree.position.set(treeX, GameConstants.WORLD.GROUND_HEIGHT, treeZ);
            
            this.scene.add(tree);
            this.objects.trees.push(tree);
        }
    }
    
    /**
     * Optimize edilmiş basit havaalanı
     */
    createSimpleAirport() {
        // Basit bina geometrisi
        const buildingGeometry = new THREE.BoxGeometry(40, 15, 20);
        const building = new THREE.Mesh(buildingGeometry, this.materials.building);
        building.position.set(0, GameConstants.WORLD.GROUND_HEIGHT + 7.5, -100);
        
        this.scene.add(building);
        this.objects.buildings.push(building);
    }
    
    /**
     * Dünyayı güncelle - optimize edilmiş
     * @param {number} deltaTime - Geçen süre
     */
    update(deltaTime) {
        // Kamera referansı varsa frustum culling yap
        if (this.camera) {
            this.updateFrustumCulling();
        }
        
        // Sadece bulutları hareket ettir - diğer nesneler statik
        this.updateClouds(deltaTime);
    }
    
    /**
     * Frustum culling güncelle
     */
    updateFrustumCulling() {
        // Projeksiyon matrisi güncelle
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        
        // Frustum güncelle
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
        
        // Bulutları frustum culling ile güncelle
        for (const cloud of this.objects.clouds) {
            // Bu nesne görünür mü?
            if (this.frustum.intersectsObject(cloud)) {
                if (!this.visibleObjects.has(cloud.id)) {
                    // Yeni görünür
                    this.visibleObjects.add(cloud.id);
                    cloud.visible = true;
                }
            } else {
                if (this.visibleObjects.has(cloud.id)) {
                    // Artık görünmüyor
                    this.visibleObjects.delete(cloud.id);
                    cloud.visible = false;
                }
            }
        }
        
        // Adaları frustum culling ile güncelle
        for (const island of this.objects.islands) {
            // Bu ada görünür mü?
            if (this.frustum.intersectsObject(island)) {
                if (!this.visibleObjects.has(island.id)) {
                    this.visibleObjects.add(island.id);
                    island.visible = true;
                }
            } else {
                if (this.visibleObjects.has(island.id)) {
                    this.visibleObjects.delete(island.id);
                    island.visible = false;
                }
            }
        }
    }
    
    /**
     * Bulutları hafifçe hareket ettir
     * @param {number} deltaTime - Geçen süre
     */
    updateClouds(deltaTime) {
        // Yalnızca görünür bulutları güncelle
        for (const cloud of this.objects.clouds) {
            if (cloud.visible) {
                // Çok hafif hareket
                cloud.position.x += deltaTime * 2 * (Math.random() - 0.5);
                cloud.position.z += deltaTime * 2 * (Math.random() - 0.5);
                
                // Dünya sınırları içinde tut
                if (cloud.position.x > this.worldSize / 2) {
                    cloud.position.x = -this.worldSize / 2;
                } else if (cloud.position.x < -this.worldSize / 2) {
                    cloud.position.x = this.worldSize / 2;
                }
                
                if (cloud.position.z > this.worldSize / 2) {
                    cloud.position.z = -this.worldSize / 2;
                } else if (cloud.position.z < -this.worldSize / 2) {
                    cloud.position.z = this.worldSize / 2;
                }
            }
        }
    }
    
    /**
     * Basit gölgelendirmeyle optimize edilmiş ışıklandırma
     */
    setupLighting() {
        // Ambient light - global aydınlatma için
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light - basit güneş
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(500, 1000, -200);
        
        // Gölgelendirmeyi kapat - performans için
        sunLight.castShadow = false;
        
        this.scene.add(sunLight);
    }
    
    /**
     * Performans ayarlarını güncelle
     * @param {Object} settings - Performans ayarları
     */
    updatePerformanceSettings(settings) {
        // Ayarları güncelle
        if (settings.fogEnabled !== undefined) {
            this.fogEnabled = settings.fogEnabled;
            if (!this.fogEnabled) {
                this.scene.fog = null;
            } else {
                this.createSimpleFog();
            }
        }
        
        // Bulutları gösterme/gizleme
        if (settings.cloudsEnabled !== undefined) {
            for (const cloud of this.objects.clouds) {
                cloud.visible = settings.cloudsEnabled;
            }
        }
        
        // Level of Detail (LOD) ayarı
        if (settings.lodEnabled !== undefined) {
            this.lodEnabled = settings.lodEnabled;
        }
    }
    
    /**
     * Optimize edilmiş ağaçlar
     */
    createOptimizedTrees() {
        // Basit ağaç, düşük poligon sayısı
        const trunkGeometry = new THREE.CylinderGeometry(2, 2, 10, 4, 1);
        const topGeometry = new THREE.ConeGeometry(6, 12, 4, 1);
        
        // Ağaç materyalleri
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        for (let i = 0; i < this.treesCount; i++) {
            const treeX = (Math.random() - 0.5) * this.worldSize * 0.7;
            const treeZ = (Math.random() - 0.5) * this.worldSize * 0.7;
            
            // Gövde
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(treeX, GameConstants.WORLD.GROUND_HEIGHT + 5, treeZ);
            
            // Yapraklar
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(treeX, GameConstants.WORLD.GROUND_HEIGHT + 16, treeZ);
            
            this.scene.add(trunk);
            this.scene.add(top);
        }
    }
} 