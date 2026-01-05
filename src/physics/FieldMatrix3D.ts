import * as THREE from 'three';

/**
 * Represents a point in the 3D field with various physical properties
 */
export interface FieldPoint {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  pressure: number;
  temperature: number;
  density: number;
  vorticity: THREE.Vector3; // Curl of velocity field
}

/**
 * 3D Field Matrix for advanced physics simulations
 * Provides a volumetric grid for storing and manipulating field data
 * Can be used for fluid dynamics, electromagnetic fields, etc.
 */
export class FieldMatrix3D {
  private resolution: THREE.Vector3;
  private cellSize: THREE.Vector3;
  private bounds: THREE.Box3;

  // Field data stored as 3D arrays
  private velocityField: THREE.Vector3[][][];
  private pressureField: number[][][];
  private temperatureField: number[][][];
  private densityField: number[][][];

  constructor(
    bounds: THREE.Box3,
    resolution: THREE.Vector3 = new THREE.Vector3(32, 16, 32)
  ) {
    this.bounds = bounds;
    this.resolution = resolution;

    // Calculate grid dimensions
    const size = new THREE.Vector3();
    bounds.getSize(size);

    this.cellSize = new THREE.Vector3(
      size.x / resolution.x,
      size.y / resolution.y,
      size.z / resolution.z
    );

    // Initialize fields
    this.velocityField = this.createVector3Field();
    this.pressureField = this.createScalarField();
    this.temperatureField = this.createScalarField();
    this.densityField = this.createScalarField();

    this.initializeFields();
  }

  private createVector3Field(): THREE.Vector3[][][] {
    const field: THREE.Vector3[][][] = [];
    for (let x = 0; x < this.resolution.x; x++) {
      field[x] = [];
      for (let y = 0; y < this.resolution.y; y++) {
        field[x][y] = [];
        for (let z = 0; z < this.resolution.z; z++) {
          field[x][y][z] = new THREE.Vector3(0, 0, 0);
        }
      }
    }
    return field;
  }

  private createScalarField(): number[][][] {
    const field: number[][][] = [];
    for (let x = 0; x < this.resolution.x; x++) {
      field[x] = [];
      for (let y = 0; y < this.resolution.y; y++) {
        field[x][y] = [];
        for (let z = 0; z < this.resolution.z; z++) {
          field[x][y][z] = 0;
        }
      }
    }
    return field;
  }

  private initializeFields() {
    // Initialize with default values
    for (let x = 0; x < this.resolution.x; x++) {
      for (let y = 0; y < this.resolution.y; y++) {
        for (let z = 0; z < this.resolution.z; z++) {
          this.pressureField[x][y][z] = 101325; // 1 atm in Pascals
          this.temperatureField[x][y][z] = 288; // 15°C in Kelvin
          this.densityField[x][y][z] = 1000; // Water density kg/m³
        }
      }
    }
  }

  /**
   * Convert world position to grid indices
   */
  private worldToGrid(position: THREE.Vector3): THREE.Vector3 {
    const relative = position.clone().sub(this.bounds.min);
    return new THREE.Vector3(
      Math.floor(relative.x / this.cellSize.x),
      Math.floor(relative.y / this.cellSize.y),
      Math.floor(relative.z / this.cellSize.z)
    );
  }

  /**
   * Convert grid indices to world position (cell center)
   */
  private gridToWorld(gridPos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.bounds.min.x + (gridPos.x + 0.5) * this.cellSize.x,
      this.bounds.min.y + (gridPos.y + 0.5) * this.cellSize.y,
      this.bounds.min.z + (gridPos.z + 0.5) * this.cellSize.z
    );
  }

  /**
   * Check if grid indices are valid
   */
  private isValidGrid(gridPos: THREE.Vector3): boolean {
    return (
      gridPos.x >= 0 && gridPos.x < this.resolution.x &&
      gridPos.y >= 0 && gridPos.y < this.resolution.y &&
      gridPos.z >= 0 && gridPos.z < this.resolution.z
    );
  }

  /**
   * Trilinear interpolation for smooth field sampling
   */
  private interpolateScalar(field: number[][][], position: THREE.Vector3): number {
    const gridPos = this.worldToGrid(position);

    const x0 = Math.floor(gridPos.x);
    const y0 = Math.floor(gridPos.y);
    const z0 = Math.floor(gridPos.z);
    const x1 = Math.min(x0 + 1, this.resolution.x - 1);
    const y1 = Math.min(y0 + 1, this.resolution.y - 1);
    const z1 = Math.min(z0 + 1, this.resolution.z - 1);

    if (!this.isValidGrid(new THREE.Vector3(x0, y0, z0))) {
      return 0;
    }

    const fx = gridPos.x - x0;
    const fy = gridPos.y - y0;
    const fz = gridPos.z - z0;

    // Trilinear interpolation
    const c000 = field[x0][y0][z0];
    const c100 = field[x1][y0][z0];
    const c010 = field[x0][y1][z0];
    const c110 = field[x1][y1][z0];
    const c001 = field[x0][y0][z1];
    const c101 = field[x1][y0][z1];
    const c011 = field[x0][y1][z1];
    const c111 = field[x1][y1][z1];

    const c00 = c000 * (1 - fx) + c100 * fx;
    const c10 = c010 * (1 - fx) + c110 * fx;
    const c01 = c001 * (1 - fx) + c101 * fx;
    const c11 = c011 * (1 - fx) + c111 * fx;

    const c0 = c00 * (1 - fy) + c10 * fy;
    const c1 = c01 * (1 - fy) + c11 * fy;

    return c0 * (1 - fz) + c1 * fz;
  }

  /**
   * Sample velocity at a world position with interpolation
   */
  getVelocity(position: THREE.Vector3): THREE.Vector3 {
    const gridPos = this.worldToGrid(position);
    if (!this.isValidGrid(gridPos)) {
      return new THREE.Vector3(0, 0, 0);
    }

    // For simplicity, use nearest neighbor (can upgrade to trilinear)
    const x = Math.floor(gridPos.x);
    const y = Math.floor(gridPos.y);
    const z = Math.floor(gridPos.z);

    return this.velocityField[x][y][z].clone();
  }

  /**
   * Set velocity at grid position
   */
  setVelocity(gridPos: THREE.Vector3, velocity: THREE.Vector3) {
    if (!this.isValidGrid(gridPos)) return;
    this.velocityField[Math.floor(gridPos.x)][Math.floor(gridPos.y)][Math.floor(gridPos.z)].copy(velocity);
  }

  /**
   * Get pressure at world position
   */
  getPressure(position: THREE.Vector3): number {
    return this.interpolateScalar(this.pressureField, position);
  }

  /**
   * Apply Lorentz-like transformation for fluid flow
   * (Adapted from relativity to fluid dynamics - creates interesting wave patterns)
   */
  applyLorentzTransform(flowVelocity: THREE.Vector3, beta: number = 0.1) {
    const gamma = 1 / Math.sqrt(1 - beta * beta);

    for (let x = 0; x < this.resolution.x; x++) {
      for (let y = 0; y < this.resolution.y; y++) {
        for (let z = 0; z < this.resolution.z; z++) {
          const vel = this.velocityField[x][y][z];

          // Lorentz-like transformation for velocity field
          const vParallel = vel.clone().projectOnVector(flowVelocity);
          const vPerp = vel.clone().sub(vParallel);

          // Transform parallel component
          vParallel.multiplyScalar(gamma);

          // Recombine
          this.velocityField[x][y][z] = vParallel.add(vPerp);
        }
      }
    }
  }

  /**
   * Calculate vorticity (curl of velocity field)
   */
  calculateVorticity(gridPos: THREE.Vector3): THREE.Vector3 {
    const x = Math.floor(gridPos.x);
    const y = Math.floor(gridPos.y);
    const z = Math.floor(gridPos.z);

    if (!this.isValidGrid(new THREE.Vector3(x + 1, y + 1, z + 1)) ||
        !this.isValidGrid(new THREE.Vector3(x - 1, y - 1, z - 1))) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Central differences for curl
    const dx = this.cellSize.x;
    const dy = this.cellSize.y;
    const dz = this.cellSize.z;

    // ∂w/∂y - ∂v/∂z
    const curlX = (this.velocityField[x][y + 1][z].z - this.velocityField[x][y - 1][z].z) / (2 * dy) -
                  (this.velocityField[x][y][z + 1].y - this.velocityField[x][y][z - 1].y) / (2 * dz);

    // ∂u/∂z - ∂w/∂x
    const curlY = (this.velocityField[x][y][z + 1].x - this.velocityField[x][y][z - 1].x) / (2 * dz) -
                  (this.velocityField[x + 1][y][z].z - this.velocityField[x - 1][y][z].z) / (2 * dx);

    // ∂v/∂x - ∂u/∂y
    const curlZ = (this.velocityField[x + 1][y][z].y - this.velocityField[x - 1][y][z].y) / (2 * dx) -
                  (this.velocityField[x][y + 1][z].x - this.velocityField[x][y - 1][z].x) / (2 * dy);

    return new THREE.Vector3(curlX, curlY, curlZ);
  }

  /**
   * Add a wave disturbance to the field
   */
  addWave(center: THREE.Vector3, amplitude: number, wavelength: number, time: number) {
    for (let x = 0; x < this.resolution.x; x++) {
      for (let z = 0; z < this.resolution.z; z++) {
        const worldPos = this.gridToWorld(new THREE.Vector3(x, 0, z));
        const distance = worldPos.distanceTo(center);

        // Wave equation: A * sin(k * r - ω * t)
        const k = 2 * Math.PI / wavelength;
        const omega = Math.sqrt(9.81 * k); // Deep water dispersion relation
        const phase = k * distance - omega * time;

        const waveHeight = amplitude * Math.sin(phase) * Math.exp(-distance / (wavelength * 2));

        // Apply to velocity field (vertical component)
        for (let y = 0; y < this.resolution.y; y++) {
          this.velocityField[x][y][z].y = waveHeight * omega * Math.cos(phase);
        }
      }
    }
  }

  /**
   * Update field simulation (advection, diffusion, etc.)
   */
  update(deltaTime: number) {
    // Simple diffusion for now
    const diffusionRate = 0.001;

    // Diffuse velocity field
    for (let x = 1; x < this.resolution.x - 1; x++) {
      for (let y = 1; y < this.resolution.y - 1; y++) {
        for (let z = 1; z < this.resolution.z - 1; z++) {
          const neighbors = [
            this.velocityField[x + 1][y][z],
            this.velocityField[x - 1][y][z],
            this.velocityField[x][y + 1][z],
            this.velocityField[x][y - 1][z],
            this.velocityField[x][y][z + 1],
            this.velocityField[x][y][z - 1]
          ];

          const avg = neighbors.reduce((sum, v) => sum.add(v), new THREE.Vector3(0, 0, 0));
          avg.divideScalar(neighbors.length);

          this.velocityField[x][y][z].lerp(avg, diffusionRate * deltaTime);
        }
      }
    }
  }

  /**
   * Get field data for visualization
   */
  getFieldData(): {
    positions: Float32Array;
    velocities: Float32Array;
    pressures: Float32Array;
  } {
    const count = this.resolution.x * this.resolution.y * this.resolution.z;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const pressures = new Float32Array(count);

    let idx = 0;
    for (let x = 0; x < this.resolution.x; x++) {
      for (let y = 0; y < this.resolution.y; y++) {
        for (let z = 0; z < this.resolution.z; z++) {
          const worldPos = this.gridToWorld(new THREE.Vector3(x, y, z));
          positions[idx * 3] = worldPos.x;
          positions[idx * 3 + 1] = worldPos.y;
          positions[idx * 3 + 2] = worldPos.z;

          const vel = this.velocityField[x][y][z];
          velocities[idx * 3] = vel.x;
          velocities[idx * 3 + 1] = vel.y;
          velocities[idx * 3 + 2] = vel.z;

          pressures[idx] = this.pressureField[x][y][z];

          idx++;
        }
      }
    }

    return { positions, velocities, pressures };
  }

  getResolution(): THREE.Vector3 {
    return this.resolution.clone();
  }

  getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }
}
