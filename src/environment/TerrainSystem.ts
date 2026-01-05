import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * Advanced terrain system with realistic elevation, slopes, and geological features
 */
export class TerrainSystem {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private terrainMesh: THREE.Mesh | null = null;
  private terrainGeometry: THREE.BufferGeometry | null = null;

  // Terrain parameters
  private width: number = 100;
  private depth: number = 100;
  private resolution: number = 128; // Grid resolution for height samples
  private maxHeight: number = 4; // Reduced for flatter terrain
  private minHeight: number = -2; // Raised minimum for beach level

  // Noise parameters for natural terrain generation
  private octaves: number = 4;
  private persistence: number = 0.5;
  private lacunarity: number = 2.0;
  private scale: number = 20.0;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  /**
   * Simple 2D Perlin-like noise function (using multiple sine waves)
   */
  private noise2D(x: number, y: number, seed: number = 0): number {
    // Simple pseudo-random noise using sine functions
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return n - Math.floor(n);
  }

  /**
   * Fractal Brownian Motion (fBm) for natural-looking terrain
   */
  private fbm(x: number, y: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < this.octaves; i++) {
      const sampleX = x * frequency / this.scale;
      const sampleY = y * frequency / this.scale;

      // Sample multiple octaves of noise
      const noise1 = this.noise2D(sampleX, sampleY, i * 10);
      const noise2 = this.noise2D(sampleX + 100, sampleY + 100, i * 10 + 5);
      const noise = (noise1 + noise2) * 0.5;

      value += noise * amplitude;
      maxValue += amplitude;

      amplitude *= this.persistence;
      frequency *= this.lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Generate height value for a given position with geological features
   */
  private getTerrainHeight(x: number, z: number): number {
    // Base terrain using fractal noise (scaled down for flatter terrain)
    let height = this.fbm(x, z) * 0.6;

    // Create beach gradient (slopes from water up to land)
    // Beach extends from z = -30 to z = 0, sloping upward
    const beachStart = -30;
    const beachEnd = 0;
    if (z > beachStart && z < beachEnd) {
      const beachProgress = (z - beachStart) / (beachEnd - beachStart);
      const beachSlope = beachProgress * 1.5; // Gentle slope from -1.5 to 0
      height += beachSlope - 1.5;
    } else if (z <= beachStart) {
      // Deep water area
      height -= 1.5;
    }

    // Add central depression for tide pool
    const poolCenterX = 0;
    const poolCenterZ = 5;
    const distToPoolCenter = Math.sqrt(
      Math.pow(x - poolCenterX, 2) + Math.pow(z - poolCenterZ, 2)
    );

    // Create bowl-shaped depression (shallower)
    if (distToPoolCenter < 6) {
      const poolDepth = 0.8;
      const bowlFactor = 1 - (distToPoolCenter / 6);
      height -= poolDepth * bowlFactor * bowlFactor;
    }

    // Add ridge on one side (coastal cliff - flatter)
    const ridgeX = -15;
    const distToRidge = Math.abs(x - ridgeX);
    if (distToRidge < 10) {
      const ridgeHeight = 2.0; // Reduced height
      const ridgeFactor = 1 - (distToRidge / 10);
      height += ridgeHeight * ridgeFactor * ridgeFactor;
    }

    // Add some flatter rocky outcrops (wider and lower)
    const outcrop1Dist = Math.sqrt(Math.pow(x - 10, 2) + Math.pow(z - 8, 2));
    if (outcrop1Dist < 5) {
      height += 0.6 * (1 - outcrop1Dist / 5); // Wider, flatter
    }

    const outcrop2Dist = Math.sqrt(Math.pow(x + 5, 2) + Math.pow(z + 12, 2));
    if (outcrop2Dist < 4) {
      height += 0.5 * (1 - outcrop2Dist / 4); // Wider, flatter
    }

    // Clamp to terrain range
    height = Math.max(this.minHeight, Math.min(this.maxHeight, height));

    return height;
  }

  /**
   * Calculate normal vector at a given position
   */
  private getTerrainNormal(x: number, z: number, step: number = 0.5): THREE.Vector3 {
    const h = this.getTerrainHeight(x, z);
    const hx = this.getTerrainHeight(x + step, z);
    const hz = this.getTerrainHeight(x, z + step);

    const tangentX = new THREE.Vector3(step, hx - h, 0).normalize();
    const tangentZ = new THREE.Vector3(0, hz - h, step).normalize();

    return new THREE.Vector3().crossVectors(tangentZ, tangentX).normalize();
  }

  /**
   * Calculate slope angle in degrees at a position
   */
  private getSlope(x: number, z: number): number {
    const normal = this.getTerrainNormal(x, z);
    const up = new THREE.Vector3(0, 1, 0);
    const angle = Math.acos(normal.dot(up));
    return THREE.MathUtils.radToDeg(angle);
  }

  /**
   * Create terrain mesh with varied topography
   */
  createTerrain() {
    // Create high-resolution plane geometry
    const geometry = new THREE.PlaneGeometry(
      this.width,
      this.depth,
      this.resolution,
      this.resolution
    );

    // Rotate to horizontal
    geometry.rotateX(-Math.PI / 2);

    // Get position attribute
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array((positions.length / 3) * 3);

    // Apply height to each vertex and calculate colors based on height/slope
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Set height
      const height = this.getTerrainHeight(x, z);
      positions[i + 1] = height;

      // Color based on height and slope with better gradients
      const slope = this.getSlope(x, z);
      const normalizedHeight = (height - this.minHeight) / (this.maxHeight - this.minHeight);

      // Color palette with smooth gradients
      let color = new THREE.Color();

      // Beach area (low elevation near water)
      if (height < -0.8) {
        // Underwater/deep areas - dark brown rock
        color.setHSL(0.08, 0.4, 0.12 + Math.random() * 0.03);
      } else if (height < -0.2) {
        // Wet shore - dark sand with gray tones
        color.setHSL(0.1, 0.25, 0.25 + Math.random() * 0.05);
      } else if (height < 0.3) {
        // Beach sand - tan/beige gradient
        const sandGradient = (height + 0.2) / 0.5; // 0 to 1
        color.setHSL(
          0.12 + Math.random() * 0.02, // Warm sand hue
          0.35 + sandGradient * 0.15,
          0.45 + sandGradient * 0.15 + Math.random() * 0.08
        );
      } else if (slope > 30) {
        // Steep rocky areas - gray with variation
        color.setHSL(
          0.15 + Math.random() * 0.05,
          0.15,
          0.35 + Math.random() * 0.15
        );
      } else if (normalizedHeight > 0.6) {
        // Higher areas - mix of rock and vegetation
        color.setHSL(
          0.18 + Math.random() * 0.1,
          0.3 + Math.random() * 0.1,
          0.3 + Math.random() * 0.1
        );
      } else {
        // Mid-level areas - coastal vegetation/rock mix
        color.setHSL(
          0.15 + Math.random() * 0.08,
          0.25 + Math.random() * 0.15,
          0.35 + Math.random() * 0.1
        );
      }

      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    // Update geometry
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Create material with vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });

    // Create mesh
    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;

    this.scene.add(this.terrainMesh);
    this.terrainGeometry = geometry;

    console.log('✓ Terrain with grade variations created');

    // Create physics collider for terrain
    this.createTerrainCollider();
  }

  /**
   * Create physics collider for terrain (simplified heightfield)
   */
  private createTerrainCollider() {
    // For now, use a simple static box as the ground
    // A full heightfield collider would require RAPIER's heightfield support
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundBody = this.physicsWorld.createRigidBody(groundBodyDesc);

    // Create a flat collider at average height
    const avgHeight = (this.maxHeight + this.minHeight) / 2;
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(
      this.width / 2,
      0.5,
      this.depth / 2
    ).setTranslation(0, avgHeight - 0.5, 0);

    this.physicsWorld.createCollider(groundColliderDesc, groundBody);

    console.log('✓ Terrain physics collider created');
  }

  /**
   * Get height at a specific world position (for object placement)
   */
  getHeightAt(x: number, z: number): number {
    return this.getTerrainHeight(x, z);
  }

  /**
   * Get normal at a specific world position
   */
  getNormalAt(x: number, z: number): THREE.Vector3 {
    return this.getTerrainNormal(x, z);
  }

  /**
   * Get slope at a specific world position (in degrees)
   */
  getSlopeAt(x: number, z: number): number {
    return this.getSlope(x, z);
  }

  /**
   * Check if a position is suitable for placing an object
   */
  isSuitableForPlacement(x: number, z: number, maxSlope: number = 30): boolean {
    const slope = this.getSlope(x, z);
    const height = this.getTerrainHeight(x, z);

    // Not suitable if too steep or underwater
    return slope <= maxSlope && height > -0.5;
  }

  /**
   * Add detail objects based on terrain features (rocks, plants, etc.)
   */
  addTerrainDetails() {
    // Add rocks on slopes
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * this.width * 0.8;
      const z = (Math.random() - 0.5) * this.depth * 0.8;
      const slope = this.getSlope(x, z);

      // Rocks appear more on slopes
      if (slope > 20 && slope < 60) {
        const height = this.getTerrainHeight(x, z);
        const normal = this.getTerrainNormal(x, z);

        const rockSize = 0.3 + Math.random() * 0.8;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize);
        const rockMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0, 0, 0.25 + Math.random() * 0.2),
          roughness: 0.95,
        });

        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, height + rockSize * 0.5, z);

        // Align with terrain normal
        rock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        rock.castShadow = true;
        rock.receiveShadow = true;

        this.scene.add(rock);
      }
    }

    console.log('✓ Terrain details added');
  }

  /**
   * Update terrain (for dynamic deformation if needed)
   */
  update(_deltaTime: number) {
    // Placeholder for potential terrain deformation or erosion simulation
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainGeometry?.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }
  }
}
