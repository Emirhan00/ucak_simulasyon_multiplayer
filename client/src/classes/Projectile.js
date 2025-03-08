/**
 * Projectile.js
 * Ateş edilen mermileri ve çarpışma tespitini yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Projectile {
    constructor(options) {
        // Temel özellikler
        this.id = options.id || `projectile_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.ownerId = options.ownerId; // Ateş eden oyuncu ID'si
        this.ownerName = options.ownerName || 'Unknown';
        this.team = options.team || 'none';
        
        // Referanslar
        this.scene = options.scene;
        this.physics = options.physics;
        this.effects = options.effects;
        
        // Mermi özellikleri
        this.speed = options.speed || 200; // m/s
        this.damage = options.damage || 10;
        this.lifeTime = options.lifeTime || 2; // saniye
        this.currentLifeTime = 0;
        this.isActive = true;
        
        // Pozisyon ve yön
        this.position = options.position.clone();
        this.direction = options.direction.clone().normalize();
        
        // Raycaster
        this.raycaster = new THREE.Raycaster(
            this.position.clone(),
            this.direction.clone(),
            0,
            this.speed * this.lifeTime
        );
        
        // Mermi mesh'i
        this.mesh = null;
        
        // Mermiyi oluştur
        this.createProjectile();
    }
    
    /**
     * Mermiyi oluştur
     */
    createProjectile() {
        // Mermi geometrisi
        const geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        geometry.rotateX(Math.PI / 2); // Yatay döndür
        
        // Mermi materyali
        const material = new THREE.MeshBasicMaterial({
            color: this.team === 'red' ? 0xff0000 : this.team === 'blue' ? 0x0000ff : 0xffff00,
            emissive: this.team === 'red' ? 0xff0000 : this.team === 'blue' ? 0x0000ff : 0xffff00,
            emissiveIntensity: 0.5
        });
        
        // Mermi mesh'i
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Mermiyi yöne doğru döndür
        this.mesh.lookAt(this.position.clone().add(this.direction));
        
        // Sahneye ekle
        this.scene.add(this.mesh);
        
        // İz efekti oluştur
        if (this.effects) {
            this.effects.createTrailEffect(this.position, this.direction);
        }
    }
    
    /**
     * Mermiyi güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} targets - Hedefler (uçaklar, balonlar, vb.)
     * @returns {Object|null} - Çarpışma bilgisi veya null
     */
    update(deltaTime, targets) {
        if (!this.isActive) return null;
        
        // Yaşam süresini güncelle
        this.currentLifeTime += deltaTime;
        
        // Yaşam süresi doldu mu?
        if (this.currentLifeTime >= this.lifeTime) {
            this.destroy();
            return null;
        }
        
        // Mermiyi hareket ettir
        const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(movement);
        this.mesh.position.copy(this.position);
        
        // Raycaster'ı güncelle
        this.raycaster.set(this.position, this.direction);
        
        // Hedefleri kontrol et
        if (targets && targets.length > 0) {
            // Hedef mesh'leri topla
            const targetMeshes = [];
            const targetMap = new Map(); // mesh -> target
            
            targets.forEach(target => {
                if (target.getMesh && target.id !== this.ownerId) {
                    const mesh = target.getMesh();
                    if (mesh) {
                        targetMeshes.push(mesh);
                        targetMap.set(mesh, target);
                    }
                }
            });
            
            // Çarpışma kontrolü
            const intersects = this.raycaster.intersectObjects(targetMeshes, true);
            
            if (intersects.length > 0) {
                // En yakın hedefi bul
                const intersection = intersects[0];
                let hitTarget = null;
                
                // Hedef mesh'i bul
                let currentMesh = intersection.object;
                while (currentMesh && !targetMap.has(currentMesh)) {
                    currentMesh = currentMesh.parent;
                }
                
                if (currentMesh) {
                    hitTarget = targetMap.get(currentMesh);
                }
                
                if (hitTarget) {
                    // Vuruş efekti oluştur
                    if (this.effects) {
                        this.effects.createHitEffect(intersection.point);
                    }
                    
                    // Mermiyi yok et
                    this.destroy();
                    
                    // Çarpışma bilgisini döndür
                    return {
                        targetId: hitTarget.id,
                        targetType: hitTarget.type || 'unknown',
                        point: intersection.point,
                        damage: this.damage
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Mermiyi yok et
     */
    destroy() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Sahne'den kaldır
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        // Geometri ve materyali temizle
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
    }
    
    /**
     * Mermi aktif mi?
     * @returns {boolean} - Mermi aktif mi?
     */
    isActiveProjectile() {
        return this.isActive;
    }
    
    /**
     * Mermi ID'sini al
     * @returns {string} - Mermi ID'si
     */
    getId() {
        return this.id;
    }
    
    /**
     * Mermi sahibinin ID'sini al
     * @returns {string} - Mermi sahibinin ID'si
     */
    getOwnerId() {
        return this.ownerId;
    }
    
    /**
     * Mermi pozisyonunu al
     * @returns {THREE.Vector3} - Mermi pozisyonu
     */
    getPosition() {
        return this.position.clone();
    }
    
    /**
     * Mermi yönünü al
     * @returns {THREE.Vector3} - Mermi yönü
     */
    getDirection() {
        return this.direction.clone();
    }
    
    /**
     * Mermi hasarını al
     * @returns {number} - Mermi hasarı
     */
    getDamage() {
        return this.damage;
    }
} 