# Scientific Basis for Tide Pool Simulation

## Overview
This simulation aims to balance gameplay enjoyment with biological and physical accuracy, creating both an educational tool and an engaging experience.

## Physics Model

### Hydrodynamics
- **Tidal Cycles**: Simulated using sinusoidal wave functions based on lunar cycles
- **Water Flow**: Navier-Stokes approximations for fluid dynamics
- **Wave Action**: Simplified wave particle systems with realistic energy dissipation
- **Substrate Interaction**: Friction coefficients based on material types (rock, sand, shell)

### Environmental Parameters
| Parameter | Range | Real-World Basis |
|-----------|-------|------------------|
| Temperature | 10-25°C | Temperate intertidal zones |
| Salinity | 30-35 ppt | Standard seawater |
| pH | 7.8-8.4 | Ocean acidification range |
| Dissolved O₂ | 6-9 mg/L | Healthy tide pool levels |
| Turbulence | 0-1 (normalized) | Wave exposure index |

## Biological Models

### Organism Categories

#### 1. Primary Producers
**Algae & Seaweed**
- Growth rate: Limited by light, nutrients, and temperature
- Photosynthesis: Simplified model using light intensity and CO₂
- Competition: Space limitation and shading effects

**Scientific Basis**: Based on macroalgae growth studies in intertidal zones (e.g., *Fucus*, *Ulva*)

#### 2. Filter Feeders
**Barnacles & Mussels**
- Feeding rate: Proportional to water flow and plankton density
- Settlement: Larval recruitment based on substrate availability
- Growth: Von Bertalanffy growth function

**Scientific Basis**: Shell growth patterns and filtration rates from marine biology literature

#### 3. Herbivores
**Sea Urchins, Limpets, Chitons**
- Grazing pressure: Functional response curves (Holling Type II)
- Movement: Random walk with chemotaxis toward food
- Predator avoidance: Shelter-seeking behavior

**Scientific Basis**: Herbivore-algae dynamics from kelp forest ecology

#### 4. Predators
**Sea Stars, Crabs, Fish**
- Hunting: Energy-based foraging optimization
- Predation rate: Attack rate and handling time models
- Territorial behavior: Home range establishment

**Scientific Basis**: Predator-prey models from Pisaster and rocky shore ecology

#### 5. Opportunists
**Sea Anemones**
- Feeding: Passive suspension feeding + active predation
- Clonal reproduction: Fission events based on energy reserves
- Symbiosis: Optional zooxanthellae implementation

## Population Dynamics

### Core Equations

**Logistic Growth with Predation**:
```
dN/dt = rN(1 - N/K) - αNP
```
Where:
- r = intrinsic growth rate
- K = carrying capacity (resource-limited)
- α = predation coefficient
- P = predator population

**Energy Budget Model**:
```
dE/dt = Feeding - Metabolism - Reproduction - Movement
```

### Trophic Interactions
- **Competition**: Interference and exploitative competition for space/food
- **Predation**: Size-based preference matrices
- **Mutualism**: Cleaning symbioses (optional advanced feature)
- **Succession**: Pioneer species → climax community dynamics

## Environmental Stressors

### Abiotic Stress
1. **Desiccation**: Exposure time during low tide
2. **Temperature Stress**: Heat shock proteins above 30°C
3. **Salinity Shock**: Freshwater input from rain
4. **Wave Disturbance**: Mechanical damage and dislodgment

### Recovery Mechanisms
- **Behavioral**: Seeking shelter, closing shells
- **Physiological**: Mucus production, metabolic depression
- **Population**: Recruitment from larval pool

## Validation Approach

### Biological Realism Checks
- [ ] Species diversity matches field observations (Shannon-Wiener Index)
- [ ] Trophic pyramid structure (10% energy transfer rule)
- [ ] Size-frequency distributions match natural populations
- [ ] Seasonal patterns align with real tide pool studies

### Physics Validation
- [ ] Tidal amplitudes match regional data
- [ ] Water chemistry stays within realistic bounds
- [ ] Object buoyancy and drag coefficients accurate

### References for Further Development
1. Paine, R.T. (1966). "Food web complexity and species diversity"
2. Connell, J.H. (1961). "Effects of competition, predation by Thais lapillus"
3. Dayton, P.K. (1971). "Competition, disturbance, and community organization"
4. Menge, B.A. (1976). "Organization of the New England rocky intertidal community"

## Simplified vs. Realistic Modes

**Game Mode** (Default):
- Accelerated time scales (1 min = 1 day)
- Exaggerated interactions for visibility
- Simplified resource tracking

**Simulation Mode** (Scientific):
- Real-time or configurable time scales
- Precise parameter values from literature
- Detailed logging for data export
- Stochastic events (storms, pollution, etc.)

## Data Export for Analysis

The simulation will support exporting:
- Population time series (CSV)
- Spatial distribution maps (JSON)
- Event logs (births, deaths, predation events)
- Environmental parameter history

This enables scientific analysis using external tools (R, Python, MATLAB).
