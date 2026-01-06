import * as THREE from 'three';

/**
 * Comprehensive 3D Fluid Dynamics Model
 *
 * Implements advanced computational fluid dynamics for tide pool simulation:
 * - 3D diffusion (Fick's laws)
 * - Advection-diffusion coupling
 * - Turbulent mixing
 * - Density-driven currents
 * - Boundary layer effects
 * - Reynolds number calculations
 * - Navier-Stokes approximations
 */

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

export const FLUID_CONSTANTS = {
  // Water properties at 15°C
  KINEMATIC_VISCOSITY: 1.14e-6,  // m²/s (ν - nu)
  DYNAMIC_VISCOSITY: 1.14e-3,     // Pa·s (μ - mu)
  DENSITY: 1025,                  // kg/m³ (seawater)
  THERMAL_DIFFUSIVITY: 1.4e-7,    // m²/s (κ - kappa)

  // Diffusion coefficients (m²/s)
  OXYGEN_DIFFUSIVITY: 2.1e-9,     // O₂ in water
  SALT_DIFFUSIVITY: 1.5e-9,       // NaCl in water
  NUTRIENT_DIFFUSIVITY: 1.0e-9,   // Generic nutrients
  HEAT_DIFFUSIVITY: 1.4e-7,       // Thermal diffusion

  // Turbulence parameters
  VON_KARMAN_CONSTANT: 0.41,      // κ for turbulent flow
  KOLMOGOROV_SCALE: 1e-3,         // m (smallest eddy scale)

  // Physical limits
  GRAVITY: 9.81,                  // m/s²
  MOLECULAR_DIFFUSION_MIN: 1e-10, // m²/s
  TURBULENT_DIFFUSION_MAX: 1e-2,  // m²/s
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * 3D scalar field for concentration/density
 */
export interface ScalarField3D {
  data: Float32Array;           // Flattened 3D array [x][y][z]
  resolution: THREE.Vector3;    // Grid dimensions (nx, ny, nz)
  bounds: THREE.Box3;           // Physical space bounds
  cellSize: THREE.Vector3;      // Δx, Δy, Δz
}

/**
 * 3D vector field for velocity
 */
export interface VectorField3D {
  u: Float32Array;  // x-component velocity
  v: Float32Array;  // y-component velocity
  w: Float32Array;  // z-component velocity
  resolution: THREE.Vector3;
  bounds: THREE.Box3;
  cellSize: THREE.Vector3;
}

/**
 * Diffusion state for a chemical species
 */
export interface DiffusionSpecies {
  concentration: ScalarField3D;  // mol/m³ or kg/m³
  diffusivity: number;           // m²/s (D)
  decayRate: number;             // 1/s (λ - lambda)
  sourceRate: ScalarField3D;     // mol/m³/s (production/consumption)
}

// ============================================================================
// MATHEMATICAL MODELS
// ============================================================================

/**
 * 3D Diffusion Equation (Fick's Second Law)
 *
 * ∂C/∂t = D∇²C - λC + S
 *
 * Where:
 * - C = concentration (mol/m³)
 * - D = diffusion coefficient (m²/s)
 * - λ = decay/consumption rate (1/s)
 * - S = source term (mol/m³/s)
 * - ∇² = Laplacian operator
 *
 * Laplacian in 3D (centered finite difference):
 * ∇²C ≈ (C[i+1] - 2C[i] + C[i-1])/Δx² + (C[j+1] - 2C[j] + C[j-1])/Δy² + (C[k+1] - 2C[k] + C[k-1])/Δz²
 */
export class DiffusionSolver3D {
  private tempField: Float32Array;

  constructor(protected field: ScalarField3D) {
    this.tempField = new Float32Array(field.data.length);
  }

  /**
   * Solve diffusion for one timestep using explicit Euler method
   *
   * Stability criterion (CFL condition):
   * Δt ≤ (Δx² Δy² Δz²) / (2D(Δy²Δz² + Δx²Δz² + Δx²Δy²))
   */
  step(
    diffusivity: number,
    decayRate: number,
    sourceField: ScalarField3D | null,
    deltaTime: number
  ): void {
    const { data, resolution, cellSize } = this.field;
    const [nx, ny, nz] = [resolution.x, resolution.y, resolution.z];
    const [dx, dy, dz] = [cellSize.x, cellSize.y, cellSize.z];

    // Diffusion coefficients for each direction
    const Dx = diffusivity / (dx * dx);
    const Dy = diffusivity / (dy * dy);
    const Dz = diffusivity / (dz * dz);

    // Iterate through interior points
    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.getIndex(i, j, k, nx, ny);

          // Laplacian (second derivatives)
          const laplacian =
            Dx * (data[this.getIndex(i + 1, j, k, nx, ny)] - 2 * data[idx] + data[this.getIndex(i - 1, j, k, nx, ny)]) +
            Dy * (data[this.getIndex(i, j + 1, k, nx, ny)] - 2 * data[idx] + data[this.getIndex(i, j - 1, k, nx, ny)]) +
            Dz * (data[this.getIndex(i, j, k + 1, nx, ny)] - 2 * data[idx] + data[this.getIndex(i, j, k - 1, nx, ny)]);

          // Decay term
          const decay = -decayRate * data[idx];

          // Source term
          const source = sourceField ? sourceField.data[idx] : 0;

          // Forward Euler: C_new = C_old + Δt * (D∇²C - λC + S)
          this.tempField[idx] = data[idx] + deltaTime * (laplacian + decay + source);

          // Clamp to non-negative (concentrations can't be negative)
          this.tempField[idx] = Math.max(0, this.tempField[idx]);
        }
      }
    }

    // Copy back (skip boundaries)
    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.getIndex(i, j, k, nx, ny);
          data[idx] = this.tempField[idx];
        }
      }
    }
  }

  private getIndex(i: number, j: number, k: number, nx: number, ny: number): number {
    return i + j * nx + k * nx * ny;
  }
}

/**
 * Advection-Diffusion Equation
 *
 * ∂C/∂t + u·∇C = D∇²C - λC + S
 *
 * Where:
 * - u = velocity vector field (m/s)
 * - u·∇C = advection term (transport by flow)
 *
 * Semi-Lagrangian method for stability with large velocities
 */
export class AdvectionDiffusionSolver3D extends DiffusionSolver3D {
  constructor(
    field: ScalarField3D,
    private velocityField: VectorField3D
  ) {
    super(field);
  }

  /**
   * Advection using semi-Lagrangian (backward particle tracing)
   * More stable than upwind schemes for large velocities
   */
  advect(deltaTime: number): void {
    const { data, resolution, cellSize, bounds } = this.field;
    const [nx, ny, nz] = [resolution.x, resolution.y, resolution.z];
    const tempField = new Float32Array(data.length);

    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const idx = i + j * nx + k * nx * ny;

          // Current position
          const x = bounds.min.x + i * cellSize.x;
          const y = bounds.min.y + j * cellSize.y;
          const z = bounds.min.z + k * cellSize.z;

          // Velocity at current position
          const u = this.velocityField.u[idx];
          const v = this.velocityField.v[idx];
          const w = this.velocityField.w[idx];

          // Backward trace: where did this particle come from?
          const x0 = x - u * deltaTime;
          const y0 = y - v * deltaTime;
          const z0 = z - w * deltaTime;

          // Interpolate concentration from departure point
          tempField[idx] = this.interpolate(x0, y0, z0);
        }
      }
    }

    // Copy back
    data.set(tempField);
  }

  /**
   * Trilinear interpolation for concentration at arbitrary position
   */
  private interpolate(x: number, y: number, z: number): number {
    const { data, resolution, cellSize, bounds } = this.field;
    const [nx, ny, nz] = [resolution.x, resolution.y, resolution.z];

    // Clamp to domain
    x = Math.max(bounds.min.x, Math.min(bounds.max.x, x));
    y = Math.max(bounds.min.y, Math.min(bounds.max.y, y));
    z = Math.max(bounds.min.z, Math.min(bounds.max.z, z));

    // Grid coordinates
    const gx = (x - bounds.min.x) / cellSize.x;
    const gy = (y - bounds.min.y) / cellSize.y;
    const gz = (z - bounds.min.z) / cellSize.z;

    // Integer and fractional parts
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    const k = Math.floor(gz);
    const fx = gx - i;
    const fy = gy - j;
    const fz = gz - k;

    // Bounds check
    const i0 = Math.max(0, Math.min(nx - 1, i));
    const i1 = Math.max(0, Math.min(nx - 1, i + 1));
    const j0 = Math.max(0, Math.min(ny - 1, j));
    const j1 = Math.max(0, Math.min(ny - 1, j + 1));
    const k0 = Math.max(0, Math.min(nz - 1, k));
    const k1 = Math.max(0, Math.min(nz - 1, k + 1));

    // Trilinear interpolation
    const c000 = data[i0 + j0 * nx + k0 * nx * ny];
    const c100 = data[i1 + j0 * nx + k0 * nx * ny];
    const c010 = data[i0 + j1 * nx + k0 * nx * ny];
    const c110 = data[i1 + j1 * nx + k0 * nx * ny];
    const c001 = data[i0 + j0 * nx + k1 * nx * ny];
    const c101 = data[i1 + j0 * nx + k1 * nx * ny];
    const c011 = data[i0 + j1 * nx + k1 * nx * ny];
    const c111 = data[i1 + j1 * nx + k1 * nx * ny];

    const c00 = c000 * (1 - fx) + c100 * fx;
    const c01 = c001 * (1 - fx) + c101 * fx;
    const c10 = c010 * (1 - fx) + c110 * fx;
    const c11 = c011 * (1 - fx) + c111 * fx;

    const c0 = c00 * (1 - fy) + c10 * fy;
    const c1 = c01 * (1 - fy) + c11 * fy;

    return c0 * (1 - fz) + c1 * fz;
  }
}

/**
 * Turbulent Diffusion Model
 *
 * Effective diffusivity in turbulent flow:
 * D_eff = D_molecular + D_turbulent
 *
 * D_turbulent = ε * l²
 *
 * Where:
 * - ε = turbulent dissipation rate (m²/s³)
 * - l = mixing length scale (m)
 */
export function calculateTurbulentDiffusivity(
  velocity: number,           // m/s
  lengthScale: number,        // m
  molecularDiffusivity: number // m/s
): number {
  // Reynolds number: Re = UL/ν
  const Re = (velocity * lengthScale) / FLUID_CONSTANTS.KINEMATIC_VISCOSITY;

  if (Re < 2000) {
    // Laminar flow - only molecular diffusion
    return molecularDiffusivity;
  } else {
    // Turbulent flow
    // Prandtl mixing length theory
    const mixingLength = FLUID_CONSTANTS.VON_KARMAN_CONSTANT * lengthScale;
    const turbulentDiffusivity = mixingLength * mixingLength * velocity / lengthScale;

    return molecularDiffusivity + Math.min(
      turbulentDiffusivity,
      FLUID_CONSTANTS.TURBULENT_DIFFUSION_MAX
    );
  }
}

/**
 * Density-Driven Currents (Thermohaline Circulation)
 *
 * Density variation drives convection:
 * ρ = ρ₀[1 - α(T - T₀) + β(S - S₀)]
 *
 * Where:
 * - α = thermal expansion coefficient ≈ 2×10⁻⁴ K⁻¹
 * - β = haline contraction coefficient ≈ 7.6×10⁻⁴ ppt⁻¹
 * - T = temperature (°C)
 * - S = salinity (ppt)
 */
export function calculateDensity(
  temperature: number, // °C
  salinity: number     // ppt
): number {
  const T0 = 15;  // Reference temperature
  const S0 = 35;  // Reference salinity
  const rho0 = 1025; // Reference density (kg/m³)

  const alpha = 2e-4;  // Thermal expansion
  const beta = 7.6e-4; // Haline contraction

  return rho0 * (1 - alpha * (temperature - T0) + beta * (salinity - S0));
}

/**
 * Buoyancy force from density gradient
 *
 * F = -g(ρ - ρ₀)/ρ₀ ẑ
 */
export function calculateBuoyancyForce(
  density: number,
  referenceDensity: number = FLUID_CONSTANTS.DENSITY
): THREE.Vector3 {
  const densityDiff = density - referenceDensity;
  const normalizedDiff = densityDiff / referenceDensity;

  return new THREE.Vector3(
    0,
    -FLUID_CONSTANTS.GRAVITY * normalizedDiff,
    0
  );
}

/**
 * Boundary Layer Thickness
 *
 * For laminar flow over flat plate:
 * δ ≈ 5x/√Re_x
 *
 * For turbulent flow:
 * δ ≈ 0.37x/Re_x^(1/5)
 */
export function calculateBoundaryLayerThickness(
  distance: number,  // m from leading edge
  velocity: number   // m/s
): number {
  const Re_x = (velocity * distance) / FLUID_CONSTANTS.KINEMATIC_VISCOSITY;

  if (Re_x < 5e5) {
    // Laminar boundary layer
    return 5 * distance / Math.sqrt(Re_x);
  } else {
    // Turbulent boundary layer
    return 0.37 * distance / Math.pow(Re_x, 0.2);
  }
}

/**
 * Schmidt Number (ratio of momentum to mass diffusion)
 *
 * Sc = ν/D
 *
 * Indicates relative importance of viscous vs diffusive transport
 * - Sc << 1: Diffusion dominates
 * - Sc >> 1: Momentum diffusion dominates
 */
export function calculateSchmidtNumber(diffusivity: number): number {
  return FLUID_CONSTANTS.KINEMATIC_VISCOSITY / diffusivity;
}

/**
 * Sherwood Number (dimensionless mass transfer coefficient)
 *
 * Sh = kL/D
 *
 * For turbulent flow over rough surface:
 * Sh = 0.023 Re^0.8 Sc^0.33
 */
export function calculateSherwoodNumber(
  reynoldsNumber: number,
  schmidtNumber: number
): number {
  if (reynoldsNumber < 2000) {
    // Laminar flow - correlation depends on geometry
    return 2.0; // Flat plate approximation
  } else {
    // Turbulent flow - Dittus-Boelter equation
    return 0.023 * Math.pow(reynoldsNumber, 0.8) * Math.pow(schmidtNumber, 0.33);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create empty scalar field
 */
export function createScalarField3D(
  bounds: THREE.Box3,
  resolution: THREE.Vector3
): ScalarField3D {
  const size = resolution.x * resolution.y * resolution.z;
  const cellSize = new THREE.Vector3(
    (bounds.max.x - bounds.min.x) / resolution.x,
    (bounds.max.y - bounds.min.y) / resolution.y,
    (bounds.max.z - bounds.min.z) / resolution.z
  );

  return {
    data: new Float32Array(size),
    resolution: resolution.clone(),
    bounds: bounds.clone(),
    cellSize,
  };
}

/**
 * Create empty vector field
 */
export function createVectorField3D(
  bounds: THREE.Box3,
  resolution: THREE.Vector3
): VectorField3D {
  const size = resolution.x * resolution.y * resolution.z;
  const cellSize = new THREE.Vector3(
    (bounds.max.x - bounds.min.x) / resolution.x,
    (bounds.max.y - bounds.min.y) / resolution.y,
    (bounds.max.z - bounds.min.z) / resolution.z
  );

  return {
    u: new Float32Array(size),
    v: new Float32Array(size),
    w: new Float32Array(size),
    resolution: resolution.clone(),
    bounds: bounds.clone(),
    cellSize,
  };
}

/**
 * Calculate optimal timestep for diffusion stability
 *
 * CFL condition for 3D diffusion
 */
export function calculateDiffusionTimestep(
  cellSize: THREE.Vector3,
  diffusivity: number,
  safetyFactor: number = 0.4
): number {
  const dx2 = cellSize.x * cellSize.x;
  const dy2 = cellSize.y * cellSize.y;
  const dz2 = cellSize.z * cellSize.z;

  const stability = (dx2 * dy2 * dz2) / (2 * diffusivity * (dy2 * dz2 + dx2 * dz2 + dx2 * dy2));

  return safetyFactor * stability;
}
