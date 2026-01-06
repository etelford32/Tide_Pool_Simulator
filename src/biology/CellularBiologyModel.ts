/**
 * Comprehensive Cellular Biology Model
 *
 * Simulates cellular-level processes:
 * - Membrane transport (passive, active, facilitated)
 * - Osmosis and turgor pressure
 * - Ion channels and pumps
 * - Cellular respiration
 * - Cell volume regulation
 * - Membrane potential
 * - Vesicle transport
 */

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

export const CELLULAR_CONSTANTS = {
  // Universal constants
  GAS_CONSTANT: 8.314,                // J/(mol·K) (R)
  FARADAY_CONSTANT: 96485,            // C/mol (F)
  AVOGADRO_NUMBER: 6.022e23,          // 1/mol (N_A)
  BOLTZMANN_CONSTANT: 1.381e-23,      // J/K (k_B)

  // Temperature
  STANDARD_TEMP: 298.15,              // K (25°C)
  PHYSIOLOGICAL_TEMP: 288.15,         // K (15°C, tide pool average)

  // Membrane properties
  MEMBRANE_THICKNESS: 7e-9,           // m (7 nm for lipid bilayer)
  MEMBRANE_CAPACITANCE: 0.01,         // F/m² (typical biological membrane)
  MEMBRANE_RESISTANCE: 1e6,           // Ω·m²
  LIPID_DIFFUSIVITY: 1e-12,           // m²/s (lateral diffusion in membrane)

  // Permeability coefficients (m/s)
  WATER_PERMEABILITY: 1e-4,           // P_water
  ION_PERMEABILITY_LOW: 1e-12,        // P_ion (lipid bilayer)
  ION_PERMEABILITY_HIGH: 1e-6,        // P_ion (with channels)
  GLUCOSE_PERMEABILITY: 1e-10,        // P_glucose

  // Ion concentrations (typical, mM)
  SEAWATER_NA: 470,                   // Na+ in seawater
  SEAWATER_K: 10,                     // K+ in seawater
  SEAWATER_CA: 10,                    // Ca²+ in seawater
  SEAWATER_CL: 550,                   // Cl- in seawater
  CYTOPLASM_NA: 12,                   // Na+ intracellular
  CYTOPLASM_K: 140,                   // K+ intracellular
  CYTOPLASM_CA: 0.0001,               // Ca²+ intracellular (100 nM)
  CYTOPLASM_CL: 4,                    // Cl- intracellular

  // Cellular dimensions
  BACTERIA_VOLUME: 1e-18,             // m³ (1 μm³)
  ALGAE_VOLUME: 1e-15,                // m³ (1000 μm³)
  CELL_WALL_THICKNESS: 100e-9,        // m (100 nm, for algae/bacteria)

  // Metabolic rates
  BASAL_METABOLISM: 1e-15,            // W/cell (baseline energy use)
  ATP_SYNTHESIS_RATE: 1e4,            // ATP/cell/s
  OXYGEN_CONSUMPTION: 1e-16,          // mol O₂/cell/s
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Cell membrane state
 */
export interface MembraneState {
  potential: number;                  // V (membrane potential, typically -70 mV)
  thickness: number;                  // m
  surfaceArea: number;                // m²
  permeability: Map<string, number>;  // m/s per species
  lipidComposition: LipidComposition;
}

/**
 * Lipid bilayer composition
 */
export interface LipidComposition {
  phosphatidylcholine: number;        // mol fraction
  phosphatidylethanolamine: number;
  phosphatidylserine: number;
  cholesterol: number;
  other: number;
}

/**
 * Ion channel state
 */
export interface IonChannel {
  conductance: number;                // S (siemens)
  selectivity: Map<string, number>;   // relative permeability
  gatingState: number;                // 0-1 (open probability)
  reversal: number;                   // V (reversal potential)
}

/**
 * Active transporter (pump)
 */
export interface ActiveTransporter {
  maxRate: number;                    // mol/s
  affinity: Map<string, number>;      // mol/m³ (K_m for each substrate)
  stoichiometry: Map<string, number>; // ions transported per cycle
  atpCost: number;                    // ATP per cycle
}

/**
 * Cell volume regulation state
 */
export interface VolumeRegulationState {
  volume: number;                     // m³
  osmoticPressure: number;            // Pa
  turgorPressure: number;             // Pa
  targetVolume: number;               // m³
}

// ============================================================================
// MEMBRANE POTENTIAL
// ============================================================================

/**
 * Nernst Equation (equilibrium potential for single ion)
 *
 * E_ion = (RT/zF) * ln([ion]_out / [ion]_in)
 *
 * Where:
 * - R = gas constant (8.314 J/(mol·K))
 * - T = temperature (K)
 * - z = ion valence
 * - F = Faraday constant (96485 C/mol)
 * - [ion]_out, [ion]_in = concentrations
 */
export function calculateNernstPotential(
  ionConcentrationOut: number,  // mol/m³
  ionConcentrationIn: number,   // mol/m³
  valence: number,
  temperature: number = CELLULAR_CONSTANTS.PHYSIOLOGICAL_TEMP
): number {
  const RT_F = (CELLULAR_CONSTANTS.GAS_CONSTANT * temperature) / CELLULAR_CONSTANTS.FARADAY_CONSTANT;
  return (RT_F / valence) * Math.log(ionConcentrationOut / ionConcentrationIn);
}

/**
 * Goldman-Hodgkin-Katz Equation (membrane potential with multiple ions)
 *
 * V_m = (RT/F) * ln((P_K[K+]_out + P_Na[Na+]_out + P_Cl[Cl-]_in) / (P_K[K+]_in + P_Na[Na+]_in + P_Cl[Cl-]_out))
 *
 * Note: Cl- appears inverted due to negative charge
 */
export function calculateGHKPotential(
  ionConcentrations: {
    K_out: number;
    K_in: number;
    Na_out: number;
    Na_in: number;
    Cl_out: number;
    Cl_in: number;
  },
  permeabilities: {
    P_K: number;
    P_Na: number;
    P_Cl: number;
  },
  temperature: number = CELLULAR_CONSTANTS.PHYSIOLOGICAL_TEMP
): number {
  const RT_F = (CELLULAR_CONSTANTS.GAS_CONSTANT * temperature) / CELLULAR_CONSTANTS.FARADAY_CONSTANT;

  const numerator =
    permeabilities.P_K * ionConcentrations.K_out +
    permeabilities.P_Na * ionConcentrations.Na_out +
    permeabilities.P_Cl * ionConcentrations.Cl_in;

  const denominator =
    permeabilities.P_K * ionConcentrations.K_in +
    permeabilities.P_Na * ionConcentrations.Na_in +
    permeabilities.P_Cl * ionConcentrations.Cl_out;

  return RT_F * Math.log(numerator / denominator);
}

// ============================================================================
// OSMOSIS AND WATER TRANSPORT
// ============================================================================

/**
 * van 't Hoff Equation (osmotic pressure)
 *
 * Π = iCRT
 *
 * Where:
 * - i = van 't Hoff factor (dissociation factor)
 * - C = molar concentration (mol/m³)
 * - R = gas constant
 * - T = temperature
 */
export function calculateOsmoticPressure(
  concentration: number,  // mol/m³
  vantHoffFactor: number = 1,
  temperature: number = CELLULAR_CONSTANTS.PHYSIOLOGICAL_TEMP
): number {
  return vantHoffFactor * concentration * CELLULAR_CONSTANTS.GAS_CONSTANT * temperature;
}

/**
 * Water Flux Across Membrane (osmotic + hydrostatic)
 *
 * J_v = L_p * A * (ΔΠ - ΔP)
 *
 * Where:
 * - L_p = hydraulic conductivity (m/(Pa·s))
 * - A = membrane area (m²)
 * - ΔΠ = osmotic pressure difference
 * - ΔP = hydrostatic pressure difference
 */
export function calculateWaterFlux(
  osmoticPressureDiff: number,    // Pa
  hydrostaticPressureDiff: number, // Pa
  hydraulicConductivity: number,   // m/(Pa·s)
  membraneArea: number            // m²
): number {
  const drivingForce = osmoticPressureDiff - hydrostaticPressureDiff;
  return hydraulicConductivity * membraneArea * drivingForce;
}

/**
 * Reflection Coefficient (σ)
 *
 * Correction for semi-permeable membranes (σ = 0: fully permeable, σ = 1: impermeable)
 * Starling equation:
 * J_v = L_p * A * (σΔΠ - ΔP)
 */
export function calculateStarlingFlux(
  osmoticPressureDiff: number,
  hydrostaticPressureDiff: number,
  reflectionCoefficient: number,
  hydraulicConductivity: number,
  membraneArea: number
): number {
  const drivingForce = reflectionCoefficient * osmoticPressureDiff - hydrostaticPressureDiff;
  return hydraulicConductivity * membraneArea * drivingForce;
}

/**
 * Turgor Pressure in Walled Cells
 *
 * P_turgor = Π_in - Π_out - P_wall
 *
 * Where P_wall is elastic restoring force from cell wall
 * Hooke's law: P_wall = E * (V - V₀)/V₀
 */
export function calculateTurgorPressure(
  osmoticPressureIn: number,
  osmoticPressureOut: number,
  cellVolume: number,
  restingVolume: number,
  elasticModulus: number // Pa
): number {
  const osmoticDiff = osmoticPressureIn - osmoticPressureOut;
  const wallPressure = elasticModulus * (cellVolume - restingVolume) / restingVolume;

  return Math.max(0, osmoticDiff - wallPressure);
}

// ============================================================================
// ION TRANSPORT
// ============================================================================

/**
 * Passive Ion Flux (Goldman Flux Equation)
 *
 * J = (P * z² * F² * V_m) / (RT) * ([S]_in - [S]_out * exp(-zFV_m/RT)) / (1 - exp(-zFV_m/RT))
 *
 * For uncharged molecules (z=0), reduces to Fick's law:
 * J = P * ([S]_in - [S]_out)
 */
export function calculateGoldmanFlux(
  permeability: number,       // m/s
  concentration_in: number,   // mol/m³
  concentration_out: number,  // mol/m³
  membranePotential: number,  // V
  valence: number,
  temperature: number = CELLULAR_CONSTANTS.PHYSIOLOGICAL_TEMP
): number {
  if (valence === 0) {
    // Uncharged molecule - simple diffusion
    return permeability * (concentration_in - concentration_out);
  }

  const RT = CELLULAR_CONSTANTS.GAS_CONSTANT * temperature;
  const zF = valence * CELLULAR_CONSTANTS.FARADAY_CONSTANT;
  const zFV_RT = (zF * membranePotential) / RT;

  // Handle numerical instability near V_m = 0
  if (Math.abs(zFV_RT) < 1e-6) {
    return permeability * (concentration_in - concentration_out);
  }

  const numerator = concentration_in - concentration_out * Math.exp(-zFV_RT);
  const denominator = 1 - Math.exp(-zFV_RT);

  return (permeability * zF * zF * membranePotential / RT) * (numerator / denominator);
}

/**
 * Na+/K+-ATPase Pump
 *
 * Exchanges 3 Na+ out for 2 K+ in per ATP
 * Rate determined by:
 * v = V_max * ([Na+]_in / (K_m,Na + [Na+]_in)) * ([K+]_out / (K_m,K + [K+]_out)) * ([ATP] / (K_m,ATP + [ATP]))
 */
export function calculateNaKPumpRate(
  naConcentrationIn: number,
  kConcentrationOut: number,
  atpConcentration: number,
  maxRate: number,
  km_Na: number,
  km_K: number,
  km_ATP: number
): number {
  const naFactor = naConcentrationIn / (km_Na + naConcentrationIn);
  const kFactor = kConcentrationOut / (km_K + kConcentrationOut);
  const atpFactor = atpConcentration / (km_ATP + atpConcentration);

  return maxRate * naFactor * kFactor * atpFactor;
}

/**
 * Voltage-Gated Channel Opening Probability
 *
 * Boltzmann distribution:
 * P_open = 1 / (1 + exp(-(V_m - V_half)/(kT/ze)))
 *
 * Where V_half is the half-activation voltage
 */
export function calculateChannelGating(
  membranePotential: number,
  halfActivationVoltage: number,
  effectiveCharge: number = 1,
  temperature: number = CELLULAR_CONSTANTS.PHYSIOLOGICAL_TEMP
): number {
  const kT_ze = (CELLULAR_CONSTANTS.BOLTZMANN_CONSTANT * temperature) /
    (effectiveCharge * 1.602e-19); // Convert to volts

  const exponent = -(membranePotential - halfActivationVoltage) / kT_ze;
  return 1 / (1 + Math.exp(exponent));
}

// ============================================================================
// MEMBRANE DIFFUSION
// ============================================================================

/**
 * Permeability from Diffusion Coefficient
 *
 * P = D * K / d
 *
 * Where:
 * - D = diffusion coefficient in membrane (m²/s)
 * - K = partition coefficient (lipid/water)
 * - d = membrane thickness (m)
 */
export function calculatePermeability(
  diffusionCoefficient: number,
  partitionCoefficient: number,
  membraneThickness: number = CELLULAR_CONSTANTS.MEMBRANE_THICKNESS
): number {
  return (diffusionCoefficient * partitionCoefficient) / membraneThickness;
}

/**
 * Partition Coefficient from Octanol-Water
 *
 * K = 10^(log P_ow) for neutral molecules
 *
 * Empirical correlation for membrane permeability
 */
export function calculatePartitionCoefficient(
  logP_octanol_water: number
): number {
  return Math.pow(10, logP_octanol_water);
}

/**
 * Overton's Rule (permeability vs lipophilicity)
 *
 * log P_membrane ≈ a * log P_ow + b
 *
 * Where a ≈ 1, b ≈ -4 for many organic molecules
 */
export function calculateOvertonPermeability(
  logP_ow: number,
  slope: number = 1.0,
  intercept: number = -4.0
): number {
  const logP_membrane = slope * logP_ow + intercept;
  return Math.pow(10, logP_membrane);
}

// ============================================================================
// CELLULAR RESPIRATION
// ============================================================================

/**
 * Oxygen Consumption Rate (Michaelis-Menten)
 *
 * V_O2 = V_max * [O₂] / (K_m + [O₂])
 *
 * Typical K_m ≈ 1-10 μM for mitochondria
 */
export function calculateOxygenConsumption(
  oxygenConcentration: number,  // mol/m³
  maxRate: number,              // mol/s
  km: number = 5e-3             // mol/m³ (5 μM)
): number {
  return maxRate * oxygenConcentration / (km + oxygenConcentration);
}

/**
 * ATP Production from Respiration
 *
 * Stoichiometry:
 * C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 ATP
 *
 * P/O ratio ≈ 2.5-3.0 (ATP per O atom)
 */
export function calculateATPProduction(
  oxygenConsumed: number,  // mol O₂
  pORatio: number = 2.5
): number {
  return oxygenConsumed * 2 * pORatio; // 2 O atoms per O₂
}

/**
 * Respiratory Quotient
 *
 * RQ = CO₂ produced / O₂ consumed
 *
 * RQ = 1.0 for carbohydrates
 * RQ = 0.7 for fats
 * RQ = 0.8 for proteins
 */
export function calculateRQ(
  substrateFractions: { carb: number; fat: number; protein: number }
): number {
  return (
    substrateFractions.carb * 1.0 +
    substrateFractions.fat * 0.7 +
    substrateFractions.protein * 0.8
  );
}

// ============================================================================
// CELL VOLUME REGULATION
// ============================================================================

/**
 * Volume Change from Water Flux
 *
 * dV/dt = L_p * A * (σΔΠ - ΔP)
 */
export function updateCellVolume(
  currentVolume: number,
  waterFlux: number,  // m³/s
  deltaTime: number
): number {
  const newVolume = currentVolume + waterFlux * deltaTime;
  return Math.max(0, newVolume); // Volume can't be negative
}

/**
 * Regulatory Volume Decrease (RVD)
 *
 * Cells respond to swelling by activating K+ and Cl- channels
 * Rate proportional to volume deviation
 */
export function calculateRVDResponse(
  currentVolume: number,
  targetVolume: number,
  responseRate: number = 0.1 // 1/s
): number {
  const volumeDeviation = (currentVolume - targetVolume) / targetVolume;

  if (volumeDeviation > 0) {
    // Cell is swollen - activate efflux
    return responseRate * volumeDeviation;
  } else {
    return 0;
  }
}

/**
 * Regulatory Volume Increase (RVI)
 *
 * Cells respond to shrinkage by activating Na+/H+ exchangers
 */
export function calculateRVIResponse(
  currentVolume: number,
  targetVolume: number,
  responseRate: number = 0.1 // 1/s
): number {
  const volumeDeviation = (targetVolume - currentVolume) / targetVolume;

  if (volumeDeviation > 0) {
    // Cell is shrunken - activate influx
    return responseRate * volumeDeviation;
  } else {
    return 0;
  }
}

// ============================================================================
// VESICLE TRANSPORT
// ============================================================================

/**
 * Endocytosis Rate
 *
 * Rate depends on membrane area and receptor concentration
 * v = k_endo * [Receptor] * A
 */
export function calculateEndocytosisRate(
  receptorDensity: number,   // receptors/m²
  membraneArea: number,      // m²
  rateConstant: number = 1e-3 // 1/s
): number {
  return rateConstant * receptorDensity * membraneArea;
}

/**
 * Exocytosis Rate
 *
 * Triggered by Ca²+ influx (Hill function)
 * v = v_max * [Ca²+]^n / (K_d^n + [Ca²+]^n)
 */
export function calculateExocytosisRate(
  calciumConcentration: number,
  maxRate: number,
  dissociationConstant: number = 1e-3, // mol/m³ (1 μM)
  hillCoefficient: number = 4
): number {
  const Can = Math.pow(calciumConcentration, hillCoefficient);
  const Kdn = Math.pow(dissociationConstant, hillCoefficient);

  return maxRate * Can / (Kdn + Can);
}
