import { ScalarField3D } from '../physics/FluidDynamicsModel';

/**
 * Comprehensive Microbiology Model
 *
 * Simulates microbiological dynamics in tide pools:
 * - Bacterial populations (heterotrophs, autotrophs)
 * - Algae and phytoplankton
 * - Biofilms and slime layers
 * - Microbial mats
 * - Population dynamics (Lotka-Volterra, Monod)
 * - Quorum sensing
 * - Nutrient uptake kinetics
 */

// ============================================================================
// BIOLOGICAL CONSTANTS
// ============================================================================

export const MICROBIOLOGY_CONSTANTS = {
  // Bacterial growth
  BACTERIA_MAX_GROWTH_RATE: 0.5,      // 1/hour (μ_max)
  BACTERIA_HALF_SAT_NUTRIENT: 1e-3,   // mol/m³ (K_s for Monod)
  BACTERIA_YIELD_COEFFICIENT: 0.5,     // dimensionless (Y)
  BACTERIA_DEATH_RATE: 0.01,          // 1/hour
  BACTERIA_CARRYING_CAPACITY: 1e9,    // cells/m³

  // Algae growth
  ALGAE_MAX_GROWTH_RATE: 0.3,         // 1/hour
  ALGAE_LIGHT_SATURATION: 100,        // μmol photons/m²/s (I_k)
  ALGAE_LIGHT_INHIBITION: 1000,       // μmol photons/m²/s (I_i)
  ALGAE_HALF_SAT_NITROGEN: 2e-3,      // mol/m³
  ALGAE_HALF_SAT_PHOSPHORUS: 1e-4,    // mol/m³

  // Biofilm properties
  BIOFILM_THICKNESS_MAX: 5e-3,        // m (5mm)
  BIOFILM_DENSITY: 1050,              // kg/m³
  BIOFILM_DIFFUSION_REDUCTION: 0.1,   // Relative to bulk water
  BIOFILM_ATTACHMENT_RATE: 1e-5,      // 1/s
  BIOFILM_DETACHMENT_RATE: 1e-6,      // 1/s

  // Quorum sensing
  QUORUM_THRESHOLD: 1e7,              // cells/m³
  SIGNAL_MOLECULE_DIFFUSIVITY: 5e-10, // m²/s
  SIGNAL_DEGRADATION_RATE: 1e-4,      // 1/s

  // Nutrient uptake
  MAX_UPTAKE_RATE: 1e-8,              // mol/cell/hour
  NUTRIENT_AFFINITY: 1e-3,            // mol/m³ (K_m)

  // Size ranges
  BACTERIA_DIAMETER: 1e-6,            // m (1 μm)
  ALGAE_DIAMETER: 10e-6,              // m (10 μm)
  BIOFILM_PORE_SIZE: 1e-7,            // m (100 nm)
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Microbial population state
 */
export interface MicrobialPopulation {
  density: ScalarField3D;           // cells/m³
  biomass: ScalarField3D;           // kg/m³
  growthRate: number;               // 1/hour (μ)
  deathRate: number;                // 1/hour
  species: MicrobialSpecies;
}

/**
 * Microbial species types
 */
export enum MicrobialSpecies {
  HETEROTROPHIC_BACTERIA,   // Decomposers, consume organic carbon
  NITRIFYING_BACTERIA,      // Oxidize ammonia to nitrite/nitrate
  DENITRIFYING_BACTERIA,    // Reduce nitrate to nitrogen gas
  SULFATE_REDUCING_BACTERIA,// Reduce sulfate to sulfide
  CYANOBACTERIA,            // Photosynthetic bacteria
  GREEN_ALGAE,              // Eukaryotic photosynthetic
  DIATOMS,                  // Silica-shelled algae
  DINOFLAGELLATES,          // Flagellated algae
}

/**
 * Biofilm layer structure
 */
export interface BiofilmLayer {
  thickness: ScalarField3D;         // m
  density: ScalarField3D;           // kg/m³
  porosity: ScalarField3D;          // 0-1 (void fraction)
  cellDensity: ScalarField3D;       // cells/m³
  eps: ScalarField3D;               // kg/m³ (extracellular polymeric substances)
  age: ScalarField3D;               // hours
}

/**
 * Quorum sensing state
 */
export interface QuorumSensingState {
  signalMolecule: ScalarField3D;    // mol/m³ (e.g., AHL)
  activated: ScalarField3D;         // 0-1 (activation level)
  threshold: number;                // mol/m³
}

// ============================================================================
// POPULATION DYNAMICS
// ============================================================================

/**
 * Monod Growth Kinetics (substrate-limited growth)
 *
 * μ = μ_max * S/(K_s + S)
 *
 * Where:
 * - μ = specific growth rate (1/hour)
 * - μ_max = maximum growth rate
 * - S = substrate concentration (mol/m³)
 * - K_s = half-saturation constant (Monod constant)
 */
export function calculateMonodGrowth(
  substrateConcentration: number,
  maxGrowthRate: number,
  halfSatConstant: number
): number {
  return maxGrowthRate * substrateConcentration / (halfSatConstant + substrateConcentration);
}

/**
 * Multi-substrate Monod with limiting nutrient
 *
 * μ = μ_max * min(S₁/(K₁ + S₁), S₂/(K₂ + S₂), ...)
 *
 * Liebig's law of the minimum
 */
export function calculateMultiSubstrateGrowth(
  substrates: number[],
  halfSatConstants: number[],
  maxGrowthRate: number
): number {
  let minLimitation = 1.0;

  for (let i = 0; i < substrates.length; i++) {
    const limitation = substrates[i] / (halfSatConstants[i] + substrates[i]);
    minLimitation = Math.min(minLimitation, limitation);
  }

  return maxGrowthRate * minLimitation;
}

/**
 * Haldane Kinetics (substrate inhibition)
 *
 * μ = μ_max * S/(K_s + S + S²/K_i)
 *
 * For growth inhibited at high substrate concentrations
 */
export function calculateHaldaneGrowth(
  substrateConcentration: number,
  maxGrowthRate: number,
  halfSatConstant: number,
  inhibitionConstant: number
): number {
  const S = substrateConcentration;
  const Ks = halfSatConstant;
  const Ki = inhibitionConstant;

  return maxGrowthRate * S / (Ks + S + S * S / Ki);
}

/**
 * Logistic Growth with Carrying Capacity
 *
 * dN/dt = μN(1 - N/K)
 *
 * Where:
 * - N = population density
 * - K = carrying capacity
 * - μ = intrinsic growth rate
 */
export function calculateLogisticGrowth(
  population: number,
  growthRate: number,
  carryingCapacity: number,
  deltaTime: number
): number {
  const dN = growthRate * population * (1 - population / carryingCapacity) * deltaTime;
  return Math.max(0, population + dN);
}

/**
 * Lotka-Volterra Predator-Prey
 *
 * Prey: dN/dt = αN - βNP
 * Predator: dP/dt = δβNP - γP
 *
 * Where:
 * - α = prey growth rate
 * - β = predation rate coefficient
 * - δ = predator efficiency
 * - γ = predator death rate
 */
export function calculateLotkaVolterra(
  prey: number,
  predator: number,
  preyGrowth: number,
  predationRate: number,
  predatorEfficiency: number,
  predatorDeath: number,
  deltaTime: number
): { prey: number; predator: number } {
  const dPrey = (preyGrowth * prey - predationRate * prey * predator) * deltaTime;
  const dPredator = (predatorEfficiency * predationRate * prey * predator - predatorDeath * predator) * deltaTime;

  return {
    prey: Math.max(0, prey + dPrey),
    predator: Math.max(0, predator + dPredator),
  };
}

// ============================================================================
// PHOTOSYNTHESIS MODELS
// ============================================================================

/**
 * Photosynthesis-Irradiance (P-I) Curve
 *
 * Steele Model (with photoinhibition):
 * P = P_max * (I/I_k) * exp(1 - I/I_k)
 *
 * Where:
 * - P = photosynthesis rate
 * - I = light intensity (μmol photons/m²/s)
 * - I_k = saturation irradiance
 * - P_max = maximum photosynthesis rate
 */
export function calculatePhotosynthesisRate(
  lightIntensity: number,
  maxRate: number,
  saturationIntensity: number
): number {
  const ratio = lightIntensity / saturationIntensity;
  return maxRate * ratio * Math.exp(1 - ratio);
}

/**
 * Webb Model (hyperbolic tangent, no inhibition)
 *
 * P = P_max * tanh(αI/P_max)
 *
 * Where α = initial slope
 */
export function calculatePhotosynthesisRateWebb(
  lightIntensity: number,
  maxRate: number,
  initialSlope: number
): number {
  return maxRate * Math.tanh((initialSlope * lightIntensity) / maxRate);
}

/**
 * Light attenuation through water column (Beer-Lambert Law)
 *
 * I(z) = I₀ * exp(-k*z)
 *
 * Where:
 * - I₀ = surface light intensity
 * - k = attenuation coefficient (1/m)
 * - z = depth (m, positive downward)
 */
export function calculateLightAtDepth(
  surfaceLight: number,
  depth: number,
  attenuationCoefficient: number
): number {
  return surfaceLight * Math.exp(-attenuationCoefficient * depth);
}

/**
 * Attenuation coefficient from water properties
 *
 * k = k_water + k_phyto * [Chl] + k_CDOM * [CDOM]
 *
 * Where:
 * - k_water ≈ 0.03 1/m (pure water)
 * - k_phyto ≈ 0.016 m²/mg (chlorophyll)
 * - k_CDOM varies with dissolved organics
 */
export function calculateAttenuationCoefficient(
  chlorophyllConcentration: number, // mg/m³
  cdomAbsorption: number = 0.1      // 1/m
): number {
  const kWater = 0.03;
  const kPhyto = 0.016;

  return kWater + kPhyto * chlorophyllConcentration + cdomAbsorption;
}

// ============================================================================
// BIOFILM DYNAMICS
// ============================================================================

/**
 * Biofilm Growth Model
 *
 * dL/dt = μ_bio * L * (1 - L/L_max) - k_det * τ * L
 *
 * Where:
 * - L = biofilm thickness
 * - μ_bio = biofilm growth rate
 * - L_max = maximum thickness
 * - k_det = detachment coefficient
 * - τ = shear stress
 */
export function calculateBiofilmGrowth(
  thickness: number,
  growthRate: number,
  maxThickness: number,
  shearStress: number,
  detachmentCoeff: number,
  deltaTime: number
): number {
  const growth = growthRate * thickness * (1 - thickness / maxThickness);
  const detachment = detachmentCoeff * shearStress * thickness;

  const dL = (growth - detachment) * deltaTime;
  return Math.max(0, Math.min(maxThickness, thickness + dL));
}

/**
 * EPS (Extracellular Polymeric Substances) Production
 *
 * dEPS/dt = Y_EPS * μ * X - k_deg * EPS
 *
 * Where:
 * - Y_EPS = EPS yield coefficient
 * - X = cell density
 * - k_deg = degradation rate
 */
export function calculateEPSProduction(
  cellDensity: number,
  growthRate: number,
  yieldCoefficient: number,
  epsConcentration: number,
  degradationRate: number,
  deltaTime: number
): number {
  const production = yieldCoefficient * growthRate * cellDensity;
  const degradation = degradationRate * epsConcentration;

  const dEPS = (production - degradation) * deltaTime;
  return Math.max(0, epsConcentration + dEPS);
}

/**
 * Biofilm Porosity
 *
 * ε = 1 - (ρ_bio/ρ_cell)
 *
 * Where:
 * - ε = porosity (void fraction)
 * - ρ_bio = biofilm density
 * - ρ_cell = cell material density ≈ 1100 kg/m³
 */
export function calculateBiofilmPorosity(
  biofilmDensity: number,
  cellDensity: number = 1100
): number {
  return Math.max(0, Math.min(1, 1 - biofilmDensity / cellDensity));
}

/**
 * Effective Diffusivity in Biofilm
 *
 * D_eff = D_water * ε^n / τ²
 *
 * Where:
 * - ε = porosity
 * - n ≈ 1.5-2 (tortuosity exponent)
 * - τ = tortuosity factor ≈ 1/ε^0.5
 */
export function calculateBiofilmDiffusivity(
  waterDiffusivity: number,
  porosity: number,
  tortuosityExponent: number = 1.5
): number {
  const tortuosity = 1 / Math.sqrt(porosity);
  return waterDiffusivity * Math.pow(porosity, tortuosityExponent) / (tortuosity * tortuosity);
}

// ============================================================================
// QUORUM SENSING
// ============================================================================

/**
 * Signal Molecule Production
 *
 * dS/dt = k_s * N - k_deg * S + D∇²S
 *
 * Where:
 * - S = signal molecule concentration
 * - k_s = production rate per cell
 * - N = cell density
 * - k_deg = degradation rate
 * - D = diffusivity
 */
export function calculateSignalProduction(
  cellDensity: number,
  productionRate: number,
  signalConcentration: number,
  degradationRate: number,
  deltaTime: number
): number {
  const production = productionRate * cellDensity;
  const degradation = degradationRate * signalConcentration;

  const dS = (production - degradation) * deltaTime;
  return Math.max(0, signalConcentration + dS);
}

/**
 * Quorum Sensing Activation (Hill Function)
 *
 * A = S^n / (K^n + S^n)
 *
 * Where:
 * - A = activation level (0-1)
 * - S = signal concentration
 * - K = activation threshold
 * - n = Hill coefficient (cooperativity)
 */
export function calculateQuorumActivation(
  signalConcentration: number,
  threshold: number,
  hillCoefficient: number = 2
): number {
  const Sn = Math.pow(signalConcentration, hillCoefficient);
  const Kn = Math.pow(threshold, hillCoefficient);

  return Sn / (Kn + Sn);
}

// ============================================================================
// NUTRIENT UPTAKE
// ============================================================================

/**
 * Michaelis-Menten Uptake Kinetics
 *
 * V = V_max * S / (K_m + S)
 *
 * Where:
 * - V = uptake rate (mol/cell/hour)
 * - V_max = maximum uptake rate
 * - K_m = half-saturation constant
 * - S = substrate concentration
 */
export function calculateNutrientUptake(
  nutrientConcentration: number,
  maxUptakeRate: number,
  affinityConstant: number
): number {
  return maxUptakeRate * nutrientConcentration / (affinityConstant + nutrientConcentration);
}

/**
 * Multiple Transporter Systems (competitive inhibition)
 *
 * V = Σ V_max,i * S / (K_m,i * (1 + Σ S_j/K_i,j) + S)
 */
export function calculateCompetitiveUptake(
  nutrientConcentration: number,
  competitorConcentrations: number[],
  maxUptakeRate: number,
  affinityConstant: number,
  inhibitionConstants: number[]
): number {
  let inhibition = 1.0;
  for (let i = 0; i < competitorConcentrations.length; i++) {
    inhibition += competitorConcentrations[i] / inhibitionConstants[i];
  }

  const Km_apparent = affinityConstant * inhibition;
  return maxUptakeRate * nutrientConcentration / (Km_apparent + nutrientConcentration);
}

// ============================================================================
// MICROBIAL MAT STRUCTURE
// ============================================================================

/**
 * Vertical Stratification in Microbial Mats
 *
 * Different layers based on oxygen/light gradients:
 * - Surface: Oxygenic phototrophs (cyanobacteria)
 * - Middle: Anoxygenic phototrophs (purple/green bacteria)
 * - Deep: Sulfate reducers, methanogens
 */
export interface MicrobialMatLayers {
  oxicLayer: { thickness: number; species: MicrobialSpecies[] };
  anoxicPhotoLayer: { thickness: number; species: MicrobialSpecies[] };
  anoxicDarkLayer: { thickness: number; species: MicrobialSpecies[] };
}

/**
 * Calculate oxygen penetration depth in mat
 *
 * Fick's first law with consumption:
 * J = -D * dC/dz
 * dJ/dz = -R
 *
 * For steady-state: D * d²C/dz² = R
 * Penetration depth: δ_O2 = √(2DC_surface/R)
 */
export function calculateOxygenPenetration(
  diffusivity: number,
  surfaceConcentration: number,
  consumptionRate: number
): number {
  return Math.sqrt(2 * diffusivity * surfaceConcentration / consumptionRate);
}

/**
 * Critical Light Intensity at Depth
 *
 * Compensation point where photosynthesis = respiration
 */
export function calculateCompensationDepth(
  surfaceLight: number,
  compensationIntensity: number,
  attenuationCoefficient: number
): number {
  return Math.log(surfaceLight / compensationIntensity) / attenuationCoefficient;
}

// ============================================================================
// SLIME AND MUCILAGE
// ============================================================================

/**
 * Slime Rheology (Non-Newtonian Fluid)
 *
 * Power-law viscosity:
 * η = K * γ̇^(n-1)
 *
 * Where:
 * - η = apparent viscosity
 * - K = consistency index
 * - γ̇ = shear rate
 * - n = flow behavior index (n<1: shear-thinning, n>1: shear-thickening)
 */
export function calculateSlimeViscosity(
  shearRate: number,
  consistencyIndex: number,
  flowIndex: number
): number {
  return consistencyIndex * Math.pow(shearRate, flowIndex - 1);
}

/**
 * Mucilage Hydration
 *
 * Water content in polysaccharide matrix
 * W = W_max * (RH^n) / (K + RH^n)
 *
 * Where RH = relative humidity
 */
export function calculateMucilageHydration(
  relativeHumidity: number,
  maxWaterContent: number,
  bindingConstant: number,
  hillCoefficient: number = 3
): number {
  const RHn = Math.pow(relativeHumidity, hillCoefficient);
  const Kn = Math.pow(bindingConstant, hillCoefficient);

  return maxWaterContent * RHn / (Kn + RHn);
}
