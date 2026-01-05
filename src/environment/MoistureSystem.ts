import * as THREE from 'three';

/**
 * Moisture saturation system for tracking water absorption in terrain
 * Simulates how shore rocks and sand retain water after tide recedes
 */
export class MoistureSystem {
  // Moisture grid (2D grid storing moisture levels 0-1)
  private moistureGrid: number[][];
  private gridResolution: THREE.Vector2;
  private bounds: THREE.Box3;
  private cellSize: THREE.Vector2;

  // Moisture parameters
  private evaporationRate: number = 0.02; // Per second in direct sun
  private absorptionRate: number = 0.8; // How quickly dry terrain absorbs water
  private drainageRate: number = 0.05; // Lateral drainage into neighboring cells
  private maxSaturation: number = 1.0;

  // Material-specific properties
  private terrainHeights: number[][] = []; // Height at each grid point
  private terrainSlopes: number[][] = []; // Slope at each grid point

  constructor(bounds: THREE.Box3, resolution: THREE.Vector2 = new THREE.Vector2(64, 64)) {
    this.bounds = bounds;
    this.gridResolution = resolution;

    const size = new THREE.Vector3();
    bounds.getSize(size);

    this.cellSize = new THREE.Vector2(
      size.x / resolution.x,
      size.z / resolution.y
    );

    // Initialize grids
    this.moistureGrid = this.createGrid(0.0); // Start dry
    this.terrainHeights = this.createGrid(0.0);
    this.terrainSlopes = this.createGrid(0.0);
  }

  /**
   * Create a 2D grid initialized with a value
   */
  private createGrid(initialValue: number): number[][] {
    const grid: number[][] = [];
    for (let x = 0; x < this.gridResolution.x; x++) {
      grid[x] = [];
      for (let y = 0; y < this.gridResolution.y; y++) {
        grid[x][y] = initialValue;
      }
    }
    return grid;
  }

  /**
   * Convert world position to grid coordinates
   */
  private worldToGrid(worldPos: THREE.Vector3): THREE.Vector2 | null {
    const relativeX = worldPos.x - this.bounds.min.x;
    const relativeZ = worldPos.z - this.bounds.min.z;

    const gridX = Math.floor(relativeX / this.cellSize.x);
    const gridY = Math.floor(relativeZ / this.cellSize.y);

    if (gridX < 0 || gridX >= this.gridResolution.x ||
        gridY < 0 || gridY >= this.gridResolution.y) {
      return null;
    }

    return new THREE.Vector2(gridX, gridY);
  }

  /**
   * Set terrain height at a grid position (from TerrainSystem)
   */
  setTerrainHeight(gridX: number, gridY: number, height: number) {
    if (gridX >= 0 && gridX < this.gridResolution.x &&
        gridY >= 0 && gridY < this.gridResolution.y) {
      this.terrainHeights[gridX][gridY] = height;
    }
  }

  /**
   * Set terrain slope at a grid position (from TerrainSystem)
   */
  setTerrainSlope(gridX: number, gridY: number, slope: number) {
    if (gridX >= 0 && gridX < this.gridResolution.x &&
        gridY >= 0 && gridY < this.gridResolution.y) {
      this.terrainSlopes[gridX][gridY] = slope;
    }
  }

  /**
   * Apply water from tide/waves at a world position
   */
  addWater(worldPos: THREE.Vector3, amount: number) {
    const gridPos = this.worldToGrid(worldPos);
    if (!gridPos) return;

    const x = Math.floor(gridPos.x);
    const y = Math.floor(gridPos.y);

    // Absorb water based on current saturation
    const currentMoisture = this.moistureGrid[x][y];
    const absorption = (1 - currentMoisture) * this.absorptionRate;
    const absorbed = Math.min(amount * absorption, this.maxSaturation - currentMoisture);

    this.moistureGrid[x][y] = Math.min(this.maxSaturation, currentMoisture + absorbed);
  }

  /**
   * Check water coverage (is this location underwater?)
   */
  applyWaterCoverage(waterLevel: number) {
    for (let x = 0; x < this.gridResolution.x; x++) {
      for (let y = 0; y < this.gridResolution.y; y++) {
        const terrainHeight = this.terrainHeights[x][y];

        // If underwater, saturate
        if (terrainHeight < waterLevel) {
          this.moistureGrid[x][y] = this.maxSaturation;
        }
      }
    }
  }

  /**
   * Get moisture level at a world position
   */
  getMoistureAt(worldPos: THREE.Vector3): number {
    const gridPos = this.worldToGrid(worldPos);
    if (!gridPos) return 0;

    const x = Math.floor(gridPos.x);
    const y = Math.floor(gridPos.y);

    return this.moistureGrid[x][y];
  }

  /**
   * Get average shore moisture (for UI display)
   */
  getAverageShoreMoisture(): number {
    let totalMoisture = 0;
    let shoreCount = 0;

    // Sample shore area (area near water line)
    for (let x = 0; x < this.gridResolution.x; x++) {
      for (let y = 0; y < this.gridResolution.y; y++) {
        const height = this.terrainHeights[x][y];
        // Shore is roughly -1 to +1 meter around water level
        if (height > -1 && height < 1) {
          totalMoisture += this.moistureGrid[x][y];
          shoreCount++;
        }
      }
    }

    return shoreCount > 0 ? totalMoisture / shoreCount : 0;
  }

  /**
   * Update moisture system (evaporation, drainage, etc.)
   */
  update(deltaTime: number, temperature: number) {
    // Temperature affects evaporation (higher temp = faster evaporation)
    const tempFactor = 1 + (temperature - 15) / 20; // 1.0 at 15°C, higher at higher temps
    const evapRate = this.evaporationRate * tempFactor * deltaTime;

    // Create temporary grid for drainage calculations
    const moistureDelta: number[][] = this.createGrid(0);

    for (let x = 0; x < this.gridResolution.x; x++) {
      for (let y = 0; y < this.gridResolution.y; y++) {
        let moisture = this.moistureGrid[x][y];

        // Evaporation (exposed surfaces dry out)
        const slope = this.terrainSlopes[x][y];
        const exposureFactor = 1 + (slope / 90) * 0.5; // Sloped surfaces dry faster
        moisture -= evapRate * exposureFactor;

        // Drainage to lower neighboring cells
        const height = this.terrainHeights[x][y];
        const drainAmount = moisture * this.drainageRate * deltaTime;

        // Check all 4 neighbors
        const neighbors = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ];

        for (const { dx, dy } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < this.gridResolution.x &&
              ny >= 0 && ny < this.gridResolution.y) {
            const neighborHeight = this.terrainHeights[nx][ny];

            // Water drains downhill
            if (neighborHeight < height) {
              const drainFraction = 0.25; // Split among lower neighbors
              moistureDelta[x][y] -= drainAmount * drainFraction;
              moistureDelta[nx][ny] += drainAmount * drainFraction;
            }
          }
        }

        this.moistureGrid[x][y] = Math.max(0, Math.min(this.maxSaturation, moisture));
      }
    }

    // Apply drainage delta
    for (let x = 0; x < this.gridResolution.x; x++) {
      for (let y = 0; y < this.gridResolution.y; y++) {
        this.moistureGrid[x][y] = Math.max(0, Math.min(this.maxSaturation,
          this.moistureGrid[x][y] + moistureDelta[x][y]));
      }
    }
  }

  /**
   * Get moisture data for visualization
   */
  getMoistureData(): { positions: Float32Array; moistureValues: Float32Array } {
    const count = this.gridResolution.x * this.gridResolution.y;
    const positions = new Float32Array(count * 3);
    const moistureValues = new Float32Array(count);

    let idx = 0;
    for (let x = 0; x < this.gridResolution.x; x++) {
      for (let y = 0; y < this.gridResolution.y; y++) {
        const worldX = this.bounds.min.x + x * this.cellSize.x;
        const worldZ = this.bounds.min.z + y * this.cellSize.y;
        const worldY = this.terrainHeights[x][y];

        positions[idx * 3] = worldX;
        positions[idx * 3 + 1] = worldY;
        positions[idx * 3 + 2] = worldZ;

        moistureValues[idx] = this.moistureGrid[x][y];
        idx++;
      }
    }

    return { positions, moistureValues };
  }
}
