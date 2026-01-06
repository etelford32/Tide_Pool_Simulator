import { ScalarField3D } from '../physics/FluidDynamicsModel';

/**
 * Comprehensive Biogeochemistry Model
 *
 * Simulates chemical cycles and reactions in tide pools:
 * - Nitrogen cycle (nitrification, denitrification, fixation)
 * - Carbon cycle (photosynthesis, respiration, calcification)
 * - Phosphorus cycle
 * - Sulfur cycle
 * - Oxygen dynamics
 * - pH and carbonate chemistry
 * - Redox reactions
 * - Nutrient limitation
 */

// ============================================================================
// CHEMICAL CONSTANTS
// ============================================================================

export const BIOGEOCHEMISTRY_CONSTANTS = {
  // Stoichiometric ratios (Redfield ratio)
  REDFIELD_C: 106,
  REDFIELD_N: 16,
  REDFIELD_P: 1,
  REDFIELD_O2: 138,  // For respiration

  // Dissociation constants (pK_a at 25°C)
  PKA_CARBONIC_ACID_1: 6.35,        // H₂CO₃ ⇌ H+ + HCO₃-
  PKA_CARBONIC_ACID_2: 10.33,       // HCO₃- ⇌ H+ + CO₃²-
  PKA_AMMONIA: 9.25,                // NH₄+ ⇌ H+ + NH₃
  PKA_HYDROGEN_SULFIDE: 7.05,       // H₂S ⇌ H+ + HS-
  PKA_PHOSPHORIC_ACID_1: 2.15,      // H₃PO₄ ⇌ H+ + H₂PO₄-
  PKA_PHOSPHORIC_ACID_2: 7.20,      // H₂PO₄- ⇌ H+ + HPO₄²-
  PKA_PHOSPHORIC_ACID_3: 12.35,     // HPO₄²- ⇌ H+ + PO₄³-

  // Henry's Law constants (mol/(L·atm) at 25°C)
  KH_OXYGEN: 1.3e-3,
  KH_CO2: 3.4e-2,
  KH_NITROGEN: 6.1e-4,

  // Standard redox potentials (V, vs SHE)
  E0_O2_H2O: 0.815,                 // O₂ + 4H+ + 4e- → 2H₂O
  E0_NO3_NO2: 0.42,                 // NO₃- + 2H+ + 2e- → NO₂- + H₂O
  E0_NO2_N2: 0.36,                  // 2NO₂- + 8H+ + 6e- → N₂ + 4H₂O
  E0_SO4_H2S: -0.22,                // SO₄²- + 10H+ + 8e- → H₂S + 4H₂O
  E0_CO2_CH4: -0.24,                // CO₂ + 8H+ + 8e- → CH₄ + 2H₂O

  // Reaction rate constants
  NITRIFICATION_RATE: 0.1,          // day⁻¹
  DENITRIFICATION_RATE: 0.5,        // day⁻¹
  MINERALIZATION_RATE: 0.05,        // day⁻¹
  PHOTOSYNTHESIS_RATE_MAX: 2.0,     // gC/m²/day
  RESPIRATION_RATE_Q10: 2.0,        // Q₁₀ temperature coefficient

  // Diffusivities in water (m²/s at 25°C)
  D_OXYGEN: 2.1e-9,
  D_CO2: 1.92e-9,
  D_AMMONIA: 1.98e-9,
  D_NITRATE: 1.9e-9,
  D_PHOSPHATE: 0.88e-9,
  D_SULFATE: 1.06e-9,
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Nutrient pool
 */
export interface NutrientPool {
  concentration: ScalarField3D;  // mol/m³
  flux: ScalarField3D;           // mol/m²/s
  source: ScalarField3D;         // mol/m³/s
  sink: ScalarField3D;           // mol/m³/s
}

/**
 * Carbonate system state
 */
export interface CarbonateSystem {
  pH: number;
  DIC: number;                   // mol/m³ (Dissolved Inorganic Carbon)
  TA: number;                    // mol/m³ (Total Alkalinity)
  CO2: number;                   // mol/m³
  HCO3: number;                  // mol/m³
  CO3: number;                   // mol/m³
  pCO2: number;                  // μatm (partial pressure)
  omega_calcite: number;         // Saturation state
  omega_aragonite: number;       // Saturation state
}

/**
 * Redox tower (electron acceptors in order of preference)
 */
export enum ElectronAcceptor {
  OXYGEN,           // Most favorable
  NITRATE,
  MANGANESE_IV,
  IRON_III,
  SULFATE,
  CARBON_DIOXIDE,   // Least favorable (methanogenesis)
}

// ============================================================================
// NITROGEN CYCLE
// ============================================================================

/**
 * Nitrification (NH₄+ → NO₂- → NO₃-)
 *
 * Step 1 (Ammonia oxidation): NH₄+ + 1.5O₂ → NO₂- + 2H+ + H₂O
 * Step 2 (Nitrite oxidation): NO₂- + 0.5O₂ → NO₃-
 *
 * Rate limited by oxygen and substrate availability
 */
export function calculateNitrificationRate(
  ammoniumConcentration: number,  // mol/m³
  oxygenConcentration: number,    // mol/m³
  maxRate: number,
  km_NH4: number = 1e-3,          // mol/m³
  km_O2: number = 2e-3            // mol/m³
): number {
  const nh4Factor = ammoniumConcentration / (km_NH4 + ammoniumConcentration);
  const o2Factor = oxygenConcentration / (km_O2 + oxygenConcentration);

  return maxRate * nh4Factor * o2Factor;
}

/**
 * Denitrification (NO₃- → NO₂- → NO → N₂O → N₂)
 *
 * Overall: 2NO₃- + 10e- + 12H+ → N₂ + 6H₂O
 *
 * Occurs under anoxic conditions with organic carbon as electron donor
 */
export function calculateDenitrificationRate(
  nitrateConcentration: number,
  organicCarbon: number,
  oxygenConcentration: number,
  maxRate: number,
  km_NO3: number = 5e-3,
  o2_inhibition: number = 1e-3    // Inhibited by O₂
): number {
  const no3Factor = nitrateConcentration / (km_NO3 + nitrateConcentration);
  const carbonFactor = organicCarbon / (1e-2 + organicCarbon);
  const o2Inhibition = o2_inhibition / (o2_inhibition + oxygenConcentration);

  return maxRate * no3Factor * carbonFactor * o2Inhibition;
}

/**
 * Nitrogen Fixation (N₂ → NH₃)
 *
 * N₂ + 8H+ + 8e- + 16ATP → 2NH₃ + H₂ + 16ADP + 16Pi
 *
 * Performed by diazotrophs (e.g., cyanobacteria)
 */
export function calculateNitrogenFixationRate(
  biomass: number,              // kg/m³
  lightIntensity: number,       // μmol photons/m²/s
  temperature: number,          // °C
  specificRate: number = 1e-3   // mol N/kg biomass/hour
): number {
  // Temperature response (Q₁₀ = 2)
  const tempFactor = Math.pow(2, (temperature - 15) / 10);

  // Light dependency for photosynthetic fixation
  const lightFactor = Math.min(1, lightIntensity / 200);

  return specificRate * biomass * tempFactor * lightFactor;
}

/**
 * Ammonification (Organic N → NH₄+)
 *
 * Mineralization of organic nitrogen
 */
export function calculateAmmonificationRate(
  organicNitrogen: number,      // mol/m³
  temperature: number,          // °C
  mineralizationRate: number = 0.05  // day⁻¹
): number {
  const tempFactor = Math.pow(2, (temperature - 15) / 10);
  return mineralizationRate * organicNitrogen * tempFactor / 24; // Convert to hour⁻¹
}

// ============================================================================
// CARBON CYCLE
// ============================================================================

/**
 * Photosynthesis (light-driven CO₂ fixation)
 *
 * 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂
 *
 * In terms of Redfield stoichiometry:
 * 106CO₂ + 16NH₃ + H₃PO₄ + light → C₁₀₆H₁₇₅O₄₂N₁₆P + 106O₂
 */
export function calculatePhotosynthesisRate(
  lightIntensity: number,       // μmol photons/m²/s
  co2Concentration: number,     // mol/m³
  nutrientLimitation: number,   // 0-1 (from N, P availability)
  temperature: number,          // °C
  maxRate: number
): number {
  // Light response (Steele equation)
  const ik = 100; // Saturation intensity
  const lightFactor = (lightIntensity / ik) * Math.exp(1 - lightIntensity / ik);

  // CO₂ limitation (rarely limiting in seawater)
  const co2Factor = co2Concentration / (1e-2 + co2Concentration);

  // Temperature response (Q₁₀ = 2)
  const tempFactor = Math.pow(2, (temperature - 15) / 10);

  return maxRate * lightFactor * co2Factor * nutrientLimitation * tempFactor;
}

/**
 * Aerobic Respiration (reverse of photosynthesis)
 *
 * C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O
 *
 * Rate proportional to biomass and temperature
 */
export function calculateRespirationRate(
  biomass: number,              // kg/m³
  oxygenConcentration: number,  // mol/m³
  temperature: number,          // °C
  basalRate: number = 0.01      // day⁻¹
): number {
  const tempFactor = Math.pow(BIOGEOCHEMISTRY_CONSTANTS.RESPIRATION_RATE_Q10, (temperature - 15) / 10);
  const o2Factor = oxygenConcentration / (1e-3 + oxygenConcentration);

  return basalRate * biomass * tempFactor * o2Factor / 24; // Convert to hour⁻¹
}

/**
 * Calcification (CaCO₃ formation)
 *
 * Ca²+ + CO₃²- → CaCO₃
 *
 * Rate depends on saturation state
 */
export function calculateCalcificationRate(
  saturationState: number,      // Ω (omega)
  biomass: number,              // kg/m³ (calcifying organisms)
  rateConstant: number = 1e-4   // day⁻¹
): number {
  if (saturationState < 1) {
    // Undersaturated - dissolution
    return -rateConstant * (1 - saturationState) * biomass / 24;
  } else {
    // Supersaturated - precipitation
    return rateConstant * (saturationState - 1) * biomass / 24;
  }
}

// ============================================================================
// PHOSPHORUS CYCLE
// ============================================================================

/**
 * Phosphorus Mineralization
 *
 * Organic P → PO₄³-
 */
export function calculatePhosphorusMineralization(
  organicPhosphorus: number,
  temperature: number,
  mineralizationRate: number = 0.03  // day⁻¹
): number {
  const tempFactor = Math.pow(2, (temperature - 15) / 10);
  return mineralizationRate * organicPhosphorus * tempFactor / 24;
}

/**
 * Phosphate Adsorption/Desorption
 *
 * Langmuir isotherm:
 * q = q_max * K_L * C / (1 + K_L * C)
 *
 * Where q = adsorbed amount, C = solution concentration
 */
export function calculatePhosphateAdsorption(
  phosphateConcentration: number,
  maxAdsorption: number = 1e-2,      // mol/kg sediment
  langmuirConstant: number = 100      // m³/mol
): number {
  return (maxAdsorption * langmuirConstant * phosphateConcentration) /
    (1 + langmuirConstant * phosphateConcentration);
}

// ============================================================================
// SULFUR CYCLE
// ============================================================================

/**
 * Sulfate Reduction (dissimilatory)
 *
 * SO₄²- + 2CH₂O → H₂S + 2HCO₃-
 *
 * Occurs in anoxic sediments
 */
export function calculateSulfateReductionRate(
  sulfateConcentration: number,
  organicCarbon: number,
  oxygenConcentration: number,
  maxRate: number,
  km_SO4: number = 1e-2,
  o2_threshold: number = 1e-4   // Only below this O₂ level
): number {
  if (oxygenConcentration > o2_threshold) {
    return 0; // Inhibited by oxygen
  }

  const so4Factor = sulfateConcentration / (km_SO4 + sulfateConcentration);
  const carbonFactor = organicCarbon / (1e-2 + organicCarbon);

  return maxRate * so4Factor * carbonFactor;
}

/**
 * Sulfide Oxidation
 *
 * H₂S + 2O₂ → SO₄²- + 2H+
 *
 * Chemical or biological (sulfur-oxidizing bacteria)
 */
export function calculateSulfideOxidationRate(
  sulfideConcentration: number,
  oxygenConcentration: number,
  rateConstant: number = 0.1    // day⁻¹
): number {
  const o2Factor = oxygenConcentration / (1e-3 + oxygenConcentration);
  return rateConstant * sulfideConcentration * o2Factor / 24;
}

// ============================================================================
// CARBONATE CHEMISTRY
// ============================================================================

/**
 * Calculate pH from DIC and Alkalinity
 *
 * Solves carbonate system using iterative method
 * Based on Zeebe & Wolf-Gladrow (2001)
 */
export function calculateCarbonateSystem(
  DIC: number,          // mol/m³ (Dissolved Inorganic Carbon)
  TA: number,           // mol/m³ (Total Alkalinity)
  salinity: number,     // ppt
  temperature: number   // °C
): CarbonateSystem {
  // Temperature-corrected dissociation constants (Mehrbach et al. 1973)
  const K1 = calculateK1(salinity, temperature);
  const K2 = calculateK2(salinity, temperature);

  // Iterative solution for [H+] from alkalinity equation
  let H = 1e-8; // Initial guess (pH ~ 8)
  for (let i = 0; i < 10; i++) {
    const denominator = H * H + K1 * H + K1 * K2;
    const HCO3 = DIC * K1 * H / denominator;
    const CO3 = DIC * K1 * K2 / denominator;
    const calculatedTA = HCO3 + 2 * CO3; // Simplified alkalinity

    const error = calculatedTA - TA;
    const dTA_dH = -DIC * K1 * (H * H + 4 * K1 * H + K1 * K2) / (denominator * denominator);

    H = H - error / dTA_dH; // Newton-Raphson
    H = Math.max(1e-10, Math.min(1e-6, H)); // Constrain to reasonable range
  }

  const pH = -Math.log10(H);

  // Calculate species concentrations
  const denominator = H * H + K1 * H + K1 * K2;
  const CO2 = DIC * H * H / denominator;
  const HCO3 = DIC * K1 * H / denominator;
  const CO3 = DIC * K1 * K2 / denominator;

  // Saturation states
  const Ksp_calcite = calculateKspCalcite(salinity, temperature);
  const Ksp_aragonite = calculateKspAragonite(salinity, temperature);
  const Ca = 10.3e-3 * salinity / 35; // mol/m³, proportional to salinity

  return {
    pH,
    DIC,
    TA,
    CO2,
    HCO3,
    CO3,
    pCO2: CO2 * 1e6 / BIOGEOCHEMISTRY_CONSTANTS.KH_CO2, // Convert to μatm
    omega_calcite: (Ca * CO3) / Ksp_calcite,
    omega_aragonite: (Ca * CO3) / Ksp_aragonite,
  };
}

/**
 * First dissociation constant of carbonic acid
 * K1 = [H+][HCO₃-]/[CO₂]
 */
function calculateK1(salinity: number, tempC: number): number {
  const T = tempC + 273.15;
  const S = salinity;

  // Mehrbach et al. (1973), refit by Lueker et al. (2000)
  const pK1 =
    3633.86 / T - 61.2172 +
    9.6777 * Math.log(T) -
    0.011555 * S +
    0.0001152 * S * S;

  return Math.pow(10, -pK1);
}

/**
 * Second dissociation constant of carbonic acid
 * K2 = [H+][CO₃²-]/[HCO₃-]
 */
function calculateK2(salinity: number, tempC: number): number {
  const T = tempC + 273.15;
  const S = salinity;

  const pK2 =
    471.78 / T + 25.9290 -
    3.16967 * Math.log(T) -
    0.01781 * S +
    0.0001122 * S * S;

  return Math.pow(10, -pK2);
}

/**
 * Solubility product of calcite
 */
function calculateKspCalcite(salinity: number, tempC: number): number {
  const T = tempC + 273.15;
  const S = salinity;

  const ln_Ksp =
    -171.9065 - 0.077993 * T +
    2839.319 / T + 71.595 * Math.log10(T) +
    (-0.77712 + 0.0028426 * T + 178.34 / T) * Math.sqrt(S) -
    0.07711 * S + 0.0041249 * S * Math.sqrt(S);

  return Math.exp(ln_Ksp);
}

/**
 * Solubility product of aragonite
 */
function calculateKspAragonite(salinity: number, tempC: number): number {
  const T = tempC + 273.15;
  const S = salinity;

  const ln_Ksp =
    -171.945 - 0.077993 * T +
    2903.293 / T + 71.595 * Math.log10(T) +
    (-0.068393 + 0.0017276 * T + 88.135 / T) * Math.sqrt(S) -
    0.10018 * S + 0.0059415 * S * Math.sqrt(S);

  return Math.exp(ln_Ksp);
}

// ============================================================================
// OXYGEN DYNAMICS
// ============================================================================

/**
 * Oxygen Saturation Concentration (Garcia & Gordon 1992)
 *
 * Temperature and salinity dependent
 */
export function calculateO2Saturation(
  temperature: number,  // °C
  salinity: number      // ppt
): number {
  const T = (temperature + 273.15) / 100; // Convert to scaled Kelvin

  const A0 = 2.00907;
  const A1 = 3.22014;
  const A2 = 4.05010;
  const A3 = 4.94457;
  const A4 = -0.256847;
  const A5 = 3.88767;
  const B0 = -0.00624523;
  const B1 = -0.00737614;
  const B2 = -0.0103410;
  const B3 = -0.00817083;
  const C0 = -0.000000488682;

  const ln_C =
    A0 +
    A1 / T +
    A2 * Math.log(T) +
    A3 * T +
    A4 * T * T +
    A5 * T * T * T +
    salinity * (B0 + B1 * T + B2 * T * T + B3 * T * T * T) +
    C0 * salinity * salinity;

  return Math.exp(ln_C); // μmol/kg, convert to mol/m³ if needed
}

/**
 * Air-Sea Gas Exchange (Wanninkhof 1992)
 *
 * F = k * (C_sat - C_water)
 *
 * Where k = gas transfer velocity (m/s)
 */
export function calculateGasExchange(
  concentrationWater: number,
  concentrationSat: number,
  windSpeed: number,        // m/s
  schmidtNumber: number
): number {
  // Wanninkhof (1992) relationship
  const k600 = 0.31 * windSpeed * windSpeed; // cm/hour at Sc=600
  const k = k600 * Math.pow(schmidtNumber / 600, -0.5) / 360000; // Convert to m/s

  return k * (concentrationSat - concentrationWater);
}

// ============================================================================
// REDOX CHEMISTRY
// ============================================================================

/**
 * Nernst Equation for Redox Potential
 *
 * E = E₀ + (RT/nF) * ln([oxidized]/[reduced])
 */
export function calculateRedoxPotential(
  E0: number,               // V (standard potential)
  oxidizedConc: number,
  reducedConc: number,
  electronsTransferred: number,
  temperature: number = 288.15  // K
): number {
  const R = 8.314;
  const F = 96485;

  const RT_nF = (R * temperature) / (electronsTransferred * F);
  return E0 + RT_nF * Math.log(oxidizedConc / reducedConc);
}

/**
 * Sequential Electron Acceptor Utilization
 *
 * Returns dominant respiration pathway based on redox conditions
 */
export function getDominantElectronAcceptor(
  o2: number,
  no3: number,
  so4: number,
  redoxPotential: number  // V
): ElectronAcceptor {
  if (o2 > 1e-4) return ElectronAcceptor.OXYGEN;
  if (no3 > 1e-3 && redoxPotential > 0.3) return ElectronAcceptor.NITRATE;
  if (redoxPotential > 0.1) return ElectronAcceptor.IRON_III;
  if (so4 > 1e-2 && redoxPotential > -0.2) return ElectronAcceptor.SULFATE;
  return ElectronAcceptor.CARBON_DIOXIDE; // Methanogenesis
}
