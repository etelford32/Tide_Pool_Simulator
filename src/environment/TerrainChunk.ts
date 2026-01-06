import * as THREE from 'three';

/**
 * Represents a single terrain chunk with LOD support
 */
export class TerrainChunk {
  private mesh: THREE.Mesh | null = null;
  private position: THREE.Vector2;
  private size: number;
  private currentLOD: number = 0;
  private geometries: THREE.BufferGeometry[] = [];

  // Chunk bounds
  private bounds: THREE.Box3;

  constructor(
    position: THREE.Vector2,
    size: number
  ) {
    this.position = position;
    this.size = size;

    this.bounds = new THREE.Box3(
      new THREE.Vector3(position.x, -10, position.y),
      new THREE.Vector3(position.x + size, 10, position.y + size)
    );

    // Pre-generate all LOD levels
    this.generateLODGeometries();
  }

  /**
   * Generate terrain geometries for all LOD levels
   */
  private generateLODGeometries() {
    const lodResolutions = [128, 64, 32, 16]; // LOD 0-3

    for (let lod = 0; lod < lodResolutions.length; lod++) {
      const resolution = lodResolutions[lod];
      const geometry = this.generateTerrainGeometry(resolution);
      this.geometries[lod] = geometry;
    }
  }

  /**
   * Generate terrain geometry at specified resolution
   */
  private generateTerrainGeometry(resolution: number): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      resolution,
      resolution
    );

    // Rotate to horizontal
    geometry.rotateX(-Math.PI / 2);

    // Get position attribute
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array((positions.length / 3) * 3);

    // Apply heightmap and colors
    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i];
      const localZ = positions[i + 2];

      // Convert to world coordinates
      const worldX = this.position.x + localX + this.size / 2;
      const worldZ = this.position.y + localZ + this.size / 2;

      // Calculate height using world coordinates
      const height = this.getTerrainHeight(worldX, worldZ);
      positions[i + 1] = height;

      // Calculate color
      const color = this.getTerrainColor(worldX, worldZ, height);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Calculate terrain height at world position
   * Uses noise and features to create varied coastal terrain
   */
  private getTerrainHeight(worldX: number, worldZ: number): number {
    // Base height based on distance from shore
    // Shore is at z=0, ocean is negative z, inland is positive z
    let height = 0;

    // Ocean floor (-200m to 0m from shore)
    if (worldZ < -200) {
      height = -10;
    } else if (worldZ < 0) {
      // Gentle slope from ocean to shore
      const oceanProgress = (worldZ + 200) / 200;
      height = -10 + oceanProgress * 8; // -10m to -2m
    }
    // Intertidal zone (0m to 100m from shore)
    else if (worldZ < 100) {
      const beachProgress = worldZ / 100;
      height = -2 + beachProgress * 3; // -2m to +1m (beach slope)
    }
    // Dunes (100m to 150m)
    else if (worldZ < 150) {
      const duneProgress = (worldZ - 100) / 50;
      height = 1 + duneProgress * 2; // +1m to +3m
    }
    // Inland (150m+)
    else {
      const inlandProgress = Math.min((worldZ - 150) / 500, 1);
      height = 3 + inlandProgress * 2; // +3m to +5m
    }

    // Add noise variation
    const noise = this.noise2D(worldX * 0.01, worldZ * 0.01) * 0.5;
    height += noise;

    // Add larger features (cliffs, outcrops) based on shoreline position
    const featureNoise = this.noise2D(worldX * 0.001, worldZ * 0.001);
    if (featureNoise > 0.6 && worldZ > 50 && worldZ < 200) {
      // Rocky outcrop
      height += (featureNoise - 0.6) * 5;
    }

    // Periodic tide pools (every ~100m along shore)
    const poolPhase = Math.sin(worldX * 0.05) * 0.5 + 0.5;
    if (poolPhase > 0.7 && worldZ > 0 && worldZ < 50) {
      // Create pool depression
      const poolDepth = (poolPhase - 0.7) * 1.5;
      const poolDist = Math.abs(worldZ - 25);
      if (poolDist < 10) {
        height -= poolDepth * (1 - poolDist / 10);
      }
    }

    return height;
  }

  /**
   * Simple 2D noise function
   */
  private noise2D(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return n - Math.floor(n);
  }

  /**
   * Get terrain color based on position and height
   */
  private getTerrainColor(_worldX: number, _worldZ: number, height: number): THREE.Color {
    const color = new THREE.Color();

    // Ocean floor
    if (height < -5) {
      color.setHSL(0.55, 0.4, 0.15 + Math.random() * 0.03);
    }
    // Shallow ocean
    else if (height < -1) {
      color.setHSL(0.52, 0.35, 0.2 + Math.random() * 0.05);
    }
    // Wet beach
    else if (height < 0.5) {
      const sandGradient = (height + 1) / 1.5;
      color.setHSL(
        0.12 + Math.random() * 0.02,
        0.3 + sandGradient * 0.15,
        0.35 + sandGradient * 0.2 + Math.random() * 0.05
      );
    }
    // Dry beach
    else if (height < 2) {
      color.setHSL(
        0.13 + Math.random() * 0.02,
        0.4,
        0.55 + Math.random() * 0.08
      );
    }
    // Dunes/vegetation
    else if (height < 4) {
      // Mix sand and grass
      const vegFactor = (height - 2) / 2;
      color.setHSL(
        0.13 + vegFactor * 0.12, // Shift from tan to green
        0.35 + vegFactor * 0.15,
        0.45 + Math.random() * 0.1
      );
    }
    // Inland
    else {
      color.setHSL(0.25, 0.45, 0.35 + Math.random() * 0.1);
    }

    return color;
  }

  /**
   * Create mesh with current LOD
   */
  createMesh(scene: THREE.Scene) {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(this.geometries[this.currentLOD], material);
    this.mesh.position.set(this.position.x, 0, this.position.y);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    scene.add(this.mesh);
  }

  /**
   * Update LOD based on distance to camera
   */
  updateLOD(cameraPosition: THREE.Vector3): boolean {
    const chunkCenter = new THREE.Vector3(
      this.position.x + this.size / 2,
      0,
      this.position.y + this.size / 2
    );
    const distance = cameraPosition.distanceTo(chunkCenter);

    let newLOD: number;
    if (distance < 1000) newLOD = 0;
    else if (distance < 2500) newLOD = 1;
    else if (distance < 5000) newLOD = 2;
    else newLOD = 3;

    if (newLOD !== this.currentLOD) {
      this.currentLOD = newLOD;
      if (this.mesh) {
        this.mesh.geometry = this.geometries[this.currentLOD];
      }
      return true; // LOD changed
    }

    return false; // No change
  }

  /**
   * Check if chunk is visible in camera frustum
   */
  isVisible(camera: THREE.Camera): boolean {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    return frustum.intersectsBox(this.bounds);
  }

  /**
   * Get chunk bounds
   */
  getBounds(): THREE.Box3 {
    return this.bounds;
  }

  /**
   * Dispose of chunk resources
   */
  dispose(scene: THREE.Scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh = null;
    }

    for (const geometry of this.geometries) {
      geometry.dispose();
    }
  }

  /**
   * Get mesh (if created)
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }
}
