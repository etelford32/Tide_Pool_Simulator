import { ScalarField3D } from '../physics/FluidDynamicsModel';

/**
 * Comprehensive Ecological Interactions Model
 *
 * Simulates species interactions and community dynamics:
 * - Competition (resource, interference, apparent)
 * - Predation and herbivory
 * - Symbiosis (mutualism, commensalism)
 * - Parasitism
 * - Facilitation
 * - Food webs and energy transfer
 * - Keystone species effects
 * - Trophic cascades
 */

// ============================================================================
// ECOLOGICAL CONSTANTS
// ============================================================================

export const ECOLOGICAL_CONSTANTS = {
  // Trophic transfer efficiency
  LINDEMAN_EFFICIENCY: 0.10,          // 10% energy transfer between trophic levels
  ASSIMILATION_EFFICIENCY: 0.70,      // Fraction of consumed energy assimilated
  PRODUCTION_EFFICIENCY: 0.40,        // Fraction of assimilated energy converted to biomass

  // Functional response parameters
  HANDLING_TIME: 0.01,                // hours (Type II)
  ATTACK_RATE: 0.1,                   // m³/(predator·hour)
  HALF_SATURATION_PREY: 10,           // prey/m³

  // Competition coefficients
  ALPHA_INTRASPECIFIC: 1.0,           // Self-competition
  ALPHA_INTERSPECIFIC: 0.3,           // Cross-species competition (typical)

  // Symbiosis parameters
  MUTUALISM_BENEFIT: 1.5,             // Growth multiplier
  PARASITE_COST: 0.7,                 // Growth reduction in host

  // Allometric scaling
  KLEIBER_EXPONENT: 0.75,             // Metabolic scaling (mass^0.75)
  PETERS_EXPONENT: -0.25,             // Generation time scaling

  // Diversity indices
  SHANNON_BASE: Math.E,               // Base for Shannon entropy
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Species in the ecosystem
 */
export interface Species {
  id: string;
  name: string;
  trophicLevel: number;               // 1 = primary producer, 2 = herbivore, etc.
  biomass: ScalarField3D;             // kg/m³
  density: ScalarField3D;             // individuals/m³
  bodyMass: number;                   // kg/individual
  metabolicRate: number;              // W/individual
  growthRate: number;                 // 1/hour
  mortalityRate: number;              // 1/hour
  interactionStrengths: Map<string, number>; // To other species
}

/**
 * Types of ecological interactions
 */
export enum InteractionType {
  COMPETITION = 'competition',        // (-/-)
  PREDATION = 'predation',            // (+/-)
  MUTUALISM = 'mutualism',            // (+/+)
  COMMENSALISM = 'commensalism',      // (+/0)
  PARASITISM = 'parasitism',          // (+/-)
  AMENSALISM = 'amensalism',          // (-/0)
  NEUTRALISM = 'neutralism',          // (0/0)
}

/**
 * Food web structure
 */
export interface FoodWeb {
  species: Species[];
  interactions: InteractionMatrix;
  trophicLevels: Map<string, number>;
  connectance: number;                // Fraction of possible links realized
}

/**
 * Interaction strength matrix
 */
export type InteractionMatrix = Map<string, Map<string, number>>;

// ============================================================================
// COMPETITION MODELS
// ============================================================================

/**
 * Lotka-Volterra Competition
 *
 * Species 1: dN₁/dt = r₁N₁(1 - (N₁ + α₁₂N₂)/K₁)
 * Species 2: dN₂/dt = r₂N₂(1 - (N₂ + α₂₁N₁)/K₂)
 *
 * Where α_ij = competition coefficient (effect of j on i)
 */
export function calculateCompetitionEffect(
  population1: number,
  population2: number,
  carryingCapacity1: number,
  competitionCoefficient12: number
): number {
  return (population1 + competitionCoefficient12 * population2) / carryingCapacity1;
}

/**
 * Tilman's Resource Competition Model
 *
 * Species with lowest R* (minimum resource requirement) wins
 * R* = m/(r - m) * K_s
 *
 * Where:
 * - m = mortality rate
 * - r = maximum growth rate
 * - K_s = half-saturation constant
 */
export function calculateRStar(
  maxGrowthRate: number,
  mortalityRate: number,
  halfSaturation: number
): number {
  return (mortalityRate / (maxGrowthRate - mortalityRate)) * halfSaturation;
}

/**
 * Competitive Exclusion Principle
 *
 * Returns true if species 1 competitively excludes species 2
 */
export function willCompetitivelyExclude(
  rStar1: number,
  rStar2: number,
  resourceLevel: number
): boolean {
  // Species with lower R* wins if resource < other species' R*
  return rStar1 < rStar2 && resourceLevel < rStar2;
}

/**
 * Niche Overlap (Pianka Index)
 *
 * O_jk = (Σ p_ij * p_ik) / √(Σ p_ij² * Σ p_ik²)
 *
 * Where p_ij = proportion of resource i used by species j
 * O = 1: complete overlap, O = 0: no overlap
 */
export function calculateNicheOverlap(
  resourceUse1: number[],
  resourceUse2: number[]
): number {
  let sum = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;

  for (let i = 0; i < resourceUse1.length; i++) {
    sum += resourceUse1[i] * resourceUse2[i];
    sum1Sq += resourceUse1[i] * resourceUse1[i];
    sum2Sq += resourceUse2[i] * resourceUse2[i];
  }

  return sum / Math.sqrt(sum1Sq * sum2Sq);
}

// ============================================================================
// PREDATION MODELS
// ============================================================================

/**
 * Holling Type I Functional Response (linear)
 *
 * f(N) = aN
 *
 * Where a = attack rate, N = prey density
 * Valid only at low prey densities
 */
export function hollingType1(
  preyDensity: number,
  attackRate: number
): number {
  return attackRate * preyDensity;
}

/**
 * Holling Type II Functional Response (hyperbolic)
 *
 * f(N) = aN / (1 + ahN)
 *
 * Where:
 * - a = attack rate
 * - h = handling time
 * - N = prey density
 *
 * Saturates at high prey density
 */
export function hollingType2(
  preyDensity: number,
  attackRate: number,
  handlingTime: number
): number {
  return (attackRate * preyDensity) / (1 + attackRate * handlingTime * preyDensity);
}

/**
 * Holling Type III Functional Response (sigmoid)
 *
 * f(N) = aN² / (b² + N²)
 *
 * S-shaped curve with prey-dependent search rate
 * Accounts for predator learning or prey switching
 */
export function hollingType3(
  preyDensity: number,
  attackRate: number,
  halfSaturation: number
): number {
  const N2 = preyDensity * preyDensity;
  const b2 = halfSaturation * halfSaturation;

  return (attackRate * N2) / (b2 + N2);
}

/**
 * Beddington-DeAngelis Functional Response
 *
 * f(N, P) = aN / (1 + ahN + cP)
 *
 * Includes predator interference (c term)
 */
export function beddingtonDeAngelisResponse(
  preyDensity: number,
  predatorDensity: number,
  attackRate: number,
  handlingTime: number,
  interferenceCoeff: number
): number {
  const numerator = attackRate * preyDensity;
  const denominator = 1 + attackRate * handlingTime * preyDensity + interferenceCoeff * predatorDensity;

  return numerator / denominator;
}

/**
 * Rosenzweig-MacArthur Predator-Prey Model
 *
 * Prey: dN/dt = rN(1 - N/K) - aNP/(1 + ahN)
 * Predator: dP/dt = eaNP/(1 + ahN) - mP
 *
 * Where e = conversion efficiency, m = predator mortality
 */
export function rosenzweigMacArthur(
  prey: number,
  predator: number,
  preyGrowth: number,
  carryingCapacity: number,
  attackRate: number,
  handlingTime: number,
  conversionEfficiency: number,
  predatorMortality: number,
  deltaTime: number
): { prey: number; predator: number } {
  const functionalResponse = hollingType2(prey, attackRate, handlingTime);

  const dPrey = (preyGrowth * prey * (1 - prey / carryingCapacity) - functionalResponse * predator) * deltaTime;
  const dPredator = (conversionEfficiency * functionalResponse * predator - predatorMortality * predator) * deltaTime;

  return {
    prey: Math.max(0, prey + dPrey),
    predator: Math.max(0, predator + dPredator),
  };
}

// ============================================================================
// SYMBIOSIS MODELS
// ============================================================================

/**
 * Mutualistic Interaction (Lotka-Volterra variant)
 *
 * Species 1: dN₁/dt = r₁N₁(1 + α₁₂N₂ - N₁/K₁)
 * Species 2: dN₂/dt = r₂N₂(1 + α₂₁N₁ - N₂/K₂)
 *
 * α_ij > 0 for mutualism (each species benefits the other)
 */
export function calculateMutualisticGrowth(
  population1: number,
  population2: number,
  growthRate1: number,
  carryingCapacity1: number,
  mutualismCoefficient12: number,
  deltaTime: number
): number {
  const benefit = mutualismCoefficient12 * population2;
  const densityDependence = population1 / carryingCapacity1;

  const dN = growthRate1 * population1 * (1 + benefit - densityDependence) * deltaTime;
  return Math.max(0, population1 + dN);
}

/**
 * Parasite-Host Dynamics (Anderson-May Model)
 *
 * Host: dH/dt = rH(1 - H/K) - αHP
 * Parasite: dP/dt = λHP - (μ + α)P
 *
 * Where:
 * - α = parasite virulence (host death rate)
 * - λ = parasite transmission rate
 * - μ = parasite mortality rate
 */
export function andersonMayParasite(
  host: number,
  parasite: number,
  hostGrowth: number,
  carryingCapacity: number,
  virulence: number,
  transmission: number,
  parasiteMortality: number,
  deltaTime: number
): { host: number; parasite: number } {
  const dHost = (hostGrowth * host * (1 - host / carryingCapacity) - virulence * host * parasite) * deltaTime;
  const dParasite = (transmission * host * parasite - (parasiteMortality + virulence) * parasite) * deltaTime;

  return {
    host: Math.max(0, host + dHost),
    parasite: Math.max(0, parasite + dParasite),
  };
}

// ============================================================================
// ENERGY FLOW AND TROPHIC DYNAMICS
// ============================================================================

/**
 * Trophic Transfer Efficiency
 *
 * Energy_n+1 = η * Energy_n
 *
 * Where η ≈ 0.1 (Lindeman's 10% rule)
 */
export function calculateTrophicTransfer(
  biomassPrey: number,
  energyContent: number = 20000, // kJ/kg
  efficiency: number = ECOLOGICAL_CONSTANTS.LINDEMAN_EFFICIENCY
): number {
  return biomassPrey * energyContent * efficiency;
}

/**
 * Metabolic Theory of Ecology (Brown et al. 2004)
 *
 * B = B₀ * M^(3/4) * e^(-E/kT)
 *
 * Where:
 * - B = metabolic rate
 * - M = body mass
 * - E = activation energy ≈ 0.65 eV
 * - k = Boltzmann constant
 * - T = temperature (K)
 */
export function calculateMetabolicRate(
  bodyMass: number,         // kg
  temperature: number,      // °C
  normalizationConstant: number = 1
): number {
  const T = temperature + 273.15;
  const E = 0.65 * 1.602e-19; // Activation energy in Joules
  const k = 1.381e-23; // Boltzmann constant

  const massScaling = Math.pow(bodyMass, ECOLOGICAL_CONSTANTS.KLEIBER_EXPONENT);
  const tempScaling = Math.exp(-E / (k * T));

  return normalizationConstant * massScaling * tempScaling;
}

/**
 * Biomass Pyramid
 *
 * Returns biomass at each trophic level
 */
export function calculateBiomassPyramid(
  primaryProducerBiomass: number,
  numLevels: number,
  efficiency: number = ECOLOGICAL_CONSTANTS.LINDEMAN_EFFICIENCY
): number[] {
  const pyramid: number[] = [primaryProducerBiomass];

  for (let i = 1; i < numLevels; i++) {
    pyramid.push(pyramid[i - 1] * efficiency);
  }

  return pyramid;
}

// ============================================================================
// DIVERSITY INDICES
// ============================================================================

/**
 * Shannon Diversity Index (H')
 *
 * H' = -Σ p_i * ln(p_i)
 *
 * Where p_i = proportion of species i
 * Higher values = more diverse
 */
export function calculateShannonIndex(
  speciesAbundances: number[]
): number {
  const total = speciesAbundances.reduce((sum, n) => sum + n, 0);

  if (total === 0) return 0;

  let H = 0;
  for (const abundance of speciesAbundances) {
    if (abundance > 0) {
      const p = abundance / total;
      H -= p * Math.log(p);
    }
  }

  return H;
}

/**
 * Simpson's Diversity Index (1 - D)
 *
 * D = Σ p_i²
 *
 * 1 - D gives probability that two individuals are different species
 */
export function calculateSimpsonIndex(
  speciesAbundances: number[]
): number {
  const total = speciesAbundances.reduce((sum, n) => sum + n, 0);

  if (total === 0) return 0;

  let D = 0;
  for (const abundance of speciesAbundances) {
    const p = abundance / total;
    D += p * p;
  }

  return 1 - D;
}

/**
 * Species Richness (S)
 *
 * Simply the number of species present
 */
export function calculateSpeciesRichness(
  speciesAbundances: number[],
  threshold: number = 0.01
): number {
  return speciesAbundances.filter((n) => n >= threshold).length;
}

/**
 * Species Evenness (J')
 *
 * J' = H' / ln(S)
 *
 * Ranges from 0 (one species dominant) to 1 (perfectly even)
 */
export function calculateEvenness(
  speciesAbundances: number[]
): number {
  const H = calculateShannonIndex(speciesAbundances);
  const S = calculateSpeciesRichness(speciesAbundances);

  if (S <= 1) return 1;

  return H / Math.log(S);
}

// ============================================================================
// FOOD WEB METRICS
// ============================================================================

/**
 * Connectance (C)
 *
 * C = L / S²
 *
 * Where:
 * - L = number of realized trophic links
 * - S = number of species
 */
export function calculateConnectance(
  numSpecies: number,
  numLinks: number
): number {
  if (numSpecies === 0) return 0;
  return numLinks / (numSpecies * numSpecies);
}

/**
 * Link Density
 *
 * L/S = average number of links per species
 */
export function calculateLinkDensity(
  numSpecies: number,
  numLinks: number
): number {
  if (numSpecies === 0) return 0;
  return numLinks / numSpecies;
}

/**
 * Omnivory Index (fraction feeding on multiple trophic levels)
 *
 * OI_i = Σ |TL_i - TL_j| * DC_ij
 *
 * Where TL = trophic level, DC = diet contribution
 */
export function calculateOmnivoryIndex(
  consumerTrophicLevel: number,
  preyTrophicLevels: number[],
  dietContributions: number[]
): number {
  let OI = 0;

  for (let i = 0; i < preyTrophicLevels.length; i++) {
    OI += Math.abs(consumerTrophicLevel - preyTrophicLevels[i] - 1) * dietContributions[i];
  }

  return OI;
}

// ============================================================================
// KEYSTONE SPECIES EFFECTS
// ============================================================================

/**
 * Interaction Strength (Paine's Index)
 *
 * IS = (P₁ - P₂) / P₁
 *
 * Where:
 * - P₁ = community property with species
 * - P₂ = community property after removal
 *
 * Measures per capita effect on community
 */
export function calculateInteractionStrength(
  communityStateWith: number,
  communityStateWithout: number
): number {
  if (communityStateWith === 0) return 0;
  return (communityStateWith - communityStateWithout) / communityStateWith;
}

/**
 * Trophic Cascade Strength
 *
 * Measures indirect effects propagating down food chain
 */
export function calculateCascadeStrength(
  topPredatorEffect: number,
  primaryProducerResponse: number
): number {
  return primaryProducerResponse / topPredatorEffect;
}

// ============================================================================
// SPATIAL ECOLOGY
// ============================================================================

/**
 * Metapopulation Dynamics (Levins Model)
 *
 * dp/dt = cp(1 - p) - ep
 *
 * Where:
 * - p = fraction of patches occupied
 * - c = colonization rate
 * - e = extinction rate
 */
export function levinsMetapopulation(
  occupiedFraction: number,
  colonizationRate: number,
  extinctionRate: number,
  deltaTime: number
): number {
  const colonization = colonizationRate * occupiedFraction * (1 - occupiedFraction);
  const extinction = extinctionRate * occupiedFraction;

  const dp = (colonization - extinction) * deltaTime;
  return Math.max(0, Math.min(1, occupiedFraction + dp));
}

/**
 * Dispersal Kernel (exponential)
 *
 * p(r) = (1/(2πα²)) * e^(-r/α)
 *
 * Where:
 * - r = distance
 * - α = mean dispersal distance
 */
export function exponentialDispersal(
  distance: number,
  meanDispersalDistance: number
): number {
  const normalization = 1 / (2 * Math.PI * meanDispersalDistance * meanDispersalDistance);
  return normalization * Math.exp(-distance / meanDispersalDistance);
}

/**
 * Source-Sink Dynamics
 *
 * Determines if patch is a source (r > 0) or sink (r < 0)
 */
export function calculatePatchQuality(
  birthRate: number,
  deathRate: number,
  immigrationRate: number
): 'source' | 'sink' | 'balanced' {
  const netGrowth = birthRate - deathRate + immigrationRate;

  if (netGrowth > 0.01) return 'source';
  if (netGrowth < -0.01) return 'sink';
  return 'balanced';
}
