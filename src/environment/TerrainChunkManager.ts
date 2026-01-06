import * as THREE from 'three';
import { TerrainChunk } from './TerrainChunk';

/**
 * Manages terrain chunks with LOD and streaming
 * Handles 5-mile (8km) shoreline with 64 chunks
 */
export class TerrainChunkManager {
  private scene: THREE.Scene;
  private chunks: Map<string, TerrainChunk> = new Map();
  private activeChunks: Set<string> = new Set();

  // World configuration
  private readonly CHUNK_SIZE = 500; // 500m × 500m chunks
  private readonly WORLD_WIDTH = 8000; // 8km along shoreline (x-axis)
  private readonly WORLD_DEPTH = 2000; // 2km inland/ocean (z-axis)
  private readonly CHUNKS_X = Math.ceil(this.WORLD_WIDTH / this.CHUNK_SIZE); // 16
  private readonly CHUNKS_Z = Math.ceil(this.WORLD_DEPTH / this.CHUNK_SIZE); // 4

  // Loading configuration
  private readonly LOAD_RADIUS = 2; // Load chunks within 2 chunks of camera
  private readonly UNLOAD_RADIUS = 4; // Unload chunks beyond 4 chunks

  // World offset (center at 0,0)
  private readonly WORLD_OFFSET_X = -this.WORLD_WIDTH / 2; // -4000
  private readonly WORLD_OFFSET_Z = -1000; // Ocean starts at -1000, ends at +1000

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    console.log(`🌍 Terrain Manager: ${this.CHUNKS_X}×${this.CHUNKS_Z} chunks (${this.CHUNKS_X * this.CHUNKS_Z} total)`);
    console.log(`📏 World size: ${this.WORLD_WIDTH}m × ${this.WORLD_DEPTH}m`);
  }

  /**
   * Get chunk key from chunk coordinates
   */
  private getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  /**
   * Get chunk coordinates from world position
   */
  private worldToChunk(worldPos: THREE.Vector3): { x: number; z: number } {
    const relativeX = worldPos.x - this.WORLD_OFFSET_X;
    const relativeZ = worldPos.z - this.WORLD_OFFSET_Z;

    return {
      x: Math.floor(relativeX / this.CHUNK_SIZE),
      z: Math.floor(relativeZ / this.CHUNK_SIZE),
    };
  }

  /**
   * Get world position from chunk coordinates
   */
  private chunkToWorld(chunkX: number, chunkZ: number): THREE.Vector2 {
    return new THREE.Vector2(
      this.WORLD_OFFSET_X + chunkX * this.CHUNK_SIZE,
      this.WORLD_OFFSET_Z + chunkZ * this.CHUNK_SIZE
    );
  }

  /**
   * Check if chunk coordinates are valid
   */
  private isValidChunk(chunkX: number, chunkZ: number): boolean {
    return (
      chunkX >= 0 &&
      chunkX < this.CHUNKS_X &&
      chunkZ >= 0 &&
      chunkZ < this.CHUNKS_Z
    );
  }

  /**
   * Get or create chunk at coordinates
   */
  private getOrCreateChunk(chunkX: number, chunkZ: number): TerrainChunk {
    const key = this.getChunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      const position = this.chunkToWorld(chunkX, chunkZ);
      chunk = new TerrainChunk(position, this.CHUNK_SIZE);
      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  /**
   * Update chunks based on camera position
   */
  update(camera: THREE.Camera) {
    const cameraChunk = this.worldToChunk(camera.position);

    // Determine which chunks should be loaded
    const chunksToLoad: Set<string> = new Set();

    for (
      let x = cameraChunk.x - this.LOAD_RADIUS;
      x <= cameraChunk.x + this.LOAD_RADIUS;
      x++
    ) {
      for (
        let z = cameraChunk.z - this.LOAD_RADIUS;
        z <= cameraChunk.z + this.LOAD_RADIUS;
        z++
      ) {
        if (this.isValidChunk(x, z)) {
          const key = this.getChunkKey(x, z);
          chunksToLoad.add(key);
        }
      }
    }

    // Load new chunks
    for (const key of chunksToLoad) {
      if (!this.activeChunks.has(key)) {
        const [x, z] = key.split(',').map(Number);
        const chunk = this.getOrCreateChunk(x, z);

        // Create mesh if not already created
        if (!chunk.getMesh()) {
          chunk.createMesh(this.scene);
        }

        this.activeChunks.add(key);
      }
    }

    // Unload far chunks
    const chunksToUnload: string[] = [];
    for (const key of this.activeChunks) {
      if (!chunksToLoad.has(key)) {
        const [x, z] = key.split(',').map(Number);
        const chunkDist = Math.max(
          Math.abs(x - cameraChunk.x),
          Math.abs(z - cameraChunk.z)
        );

        if (chunkDist > this.UNLOAD_RADIUS) {
          chunksToUnload.push(key);
        }
      }
    }

    for (const key of chunksToUnload) {
      this.activeChunks.delete(key);
      // Note: We don't dispose chunks, just remove from active set
      // Chunks stay in memory for fast re-activation
    }

    // Update LOD for all active chunks
    for (const key of this.activeChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        chunk.updateLOD(camera.position);
      }
    }
  }

  /**
   * Get all active chunks
   */
  getActiveChunks(): TerrainChunk[] {
    const chunks: TerrainChunk[] = [];
    for (const key of this.activeChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  /**
   * Get chunk count
   */
  getChunkCount(): { total: number; active: number; loaded: number } {
    return {
      total: this.CHUNKS_X * this.CHUNKS_Z,
      active: this.activeChunks.size,
      loaded: this.chunks.size,
    };
  }

  /**
   * Get world bounds
   */
  getWorldBounds(): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(this.WORLD_OFFSET_X, -10, this.WORLD_OFFSET_Z),
      new THREE.Vector3(
        this.WORLD_OFFSET_X + this.WORLD_WIDTH,
        10,
        this.WORLD_OFFSET_Z + this.WORLD_DEPTH
      )
    );
  }

  /**
   * Dispose all chunks
   */
  dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose(this.scene);
    }
    this.chunks.clear();
    this.activeChunks.clear();
  }
}
