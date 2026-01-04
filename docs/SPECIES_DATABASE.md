# Species Database

This document catalogs all organisms in the simulation with their parameters and behaviors.

## Data Structure

Each species follows this schema:

```typescript
interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  category: 'producer' | 'filter_feeder' | 'herbivore' | 'predator' | 'omnivore';

  // Physical properties
  size: { min: number; max: number }; // cm
  mass: { min: number; max: number }; // grams
  lifespan: number; // days

  // Biological parameters
  metabolism: number; // kcal/day
  reproductionRate: number; // offspring per cycle
  growthRate: number; // cm/day

  // Behavioral parameters
  movementSpeed: number; // cm/s
  aggressionLevel: number; // 0-1
  socialBehavior: 'solitary' | 'gregarious' | 'colonial';

  // Environmental tolerances
  temperatureRange: [number, number]; // °C
  salinityRange: [number, number]; // ppt
  desiccationTolerance: number; // minutes exposed

  // Ecological role
  diet: string[];
  predators: string[];
  habitat: 'substrate' | 'water_column' | 'rock_surface' | 'crevice';
}
```

---

## Primary Producers

### 1. Sea Lettuce (*Ulva lactuca*)
- **Category**: Macroalgae
- **Size**: 10-50 cm
- **Lifespan**: 180 days
- **Growth Rate**: 0.5 cm/day (light-dependent)
- **Metabolism**: Photosynthetic (50 kcal/day produced)
- **Reproduction**: Spore release every 30 days
- **Temperature Range**: 5-25°C
- **Salinity Range**: 20-40 ppt
- **Notes**: Fast-growing pioneer species, indicates nutrient pollution

### 2. Rockweed (*Fucus vesiculosus*)
- **Category**: Brown Algae
- **Size**: 30-100 cm
- **Lifespan**: 730 days (2 years)
- **Growth Rate**: 0.2 cm/day
- **Metabolism**: Photosynthetic (100 kcal/day)
- **Reproduction**: Sexual, gametes released seasonally
- **Temperature Range**: 0-25°C
- **Desiccation Tolerance**: 240 minutes
- **Notes**: Provides structural habitat, air bladders for buoyancy

### 3. Coralline Algae (*Corallina officinalis*)
- **Category**: Calcified Algae
- **Size**: 2-10 cm (encrusting)
- **Lifespan**: 1825 days (5 years)
- **Growth Rate**: 0.05 cm/day
- **Metabolism**: 20 kcal/day
- **Temperature Range**: 10-20°C
- **Notes**: Cements substrate, creates microhabitat

---

## Filter Feeders

### 4. Acorn Barnacle (*Balanus glandula*)
- **Category**: Crustacean (sessile)
- **Size**: 0.5-3 cm diameter
- **Lifespan**: 365 days
- **Metabolism**: 2 kcal/day
- **Reproduction**: Larvae released every 60 days
- **Feeding**: Filters 1L/hour when submerged
- **Temperature Range**: 5-30°C
- **Desiccation Tolerance**: 480 minutes
- **Settlement**: Requires hard substrate, gregarious settlement
- **Notes**: Competitive dominant in high intertidal

### 5. California Mussel (*Mytilus californianus*)
- **Category**: Bivalve
- **Size**: 2-25 cm
- **Lifespan**: 7300 days (20 years)
- **Metabolism**: 5 kcal/day
- **Growth Rate**: Von Bertalanffy: L∞=25cm, K=0.15/year
- **Filtration**: 5L/hour
- **Temperature Range**: 8-20°C
- **Predators**: Sea stars, sea otters, crabs
- **Notes**: Forms dense beds, ecosystem engineer

---

## Herbivores

### 6. Purple Sea Urchin (*Strongylocentrotus purpuratus*)
- **Category**: Echinoderm
- **Size**: 3-10 cm diameter
- **Lifespan**: 25,550 days (70 years)
- **Metabolism**: 8 kcal/day
- **Movement Speed**: 0.02 m/s
- **Growth Rate**: 0.5 cm/year
- **Feeding**: Grazes 2g algae/day
- **Temperature Range**: 6-20°C
- **Predators**: Sea otters, sea stars, wolf eels
- **Behavior**: Aggregates in crevices, excavates depressions
- **Notes**: Can create "urchin barrens" by overgrazing

### 7. Limpet (*Lottia gigantea*)
- **Category**: Gastropod
- **Size**: 3-8 cm
- **Lifespan**: 5,475 days (15 years)
- **Metabolism**: 1 kcal/day
- **Movement Speed**: 0.005 m/s
- **Feeding**: Grazes microalgae film, 0.5g/day
- **Desiccation Tolerance**: 360 minutes
- **Behavior**: Returns to home scar, territorial
- **Notes**: Grazing creates "halos" around territory

### 8. Black Turban Snail (*Tegula funebralis*)
- **Category**: Gastropod
- **Size**: 2-3 cm
- **Lifespan**: 3,650 days (10 years)
- **Metabolism**: 0.8 kcal/day
- **Movement Speed**: 0.01 m/s
- **Feeding**: Grazes diatoms and small algae, 0.3g/day
- **Temperature Range**: 10-25°C
- **Predators**: Sea stars, crabs, octopus
- **Notes**: Most abundant herbivore in many tide pools

---

## Predators

### 9. Ochre Sea Star (*Pisaster ochraceus*)
- **Category**: Echinoderm (keystone predator)
- **Size**: 10-30 cm diameter
- **Lifespan**: 7,300 days (20 years)
- **Metabolism**: 15 kcal/day
- **Movement Speed**: 0.01 m/s
- **Feeding**: 1 mussel every 2-3 days
- **Prey Preference**: Mussels > barnacles > snails > limpets
- **Temperature Range**: 6-20°C
- **Desiccation Tolerance**: 120 minutes
- **Notes**: Controls mussel populations, maintains diversity

### 10. Shore Crab (*Hemigrapsus nudus*)
- **Category**: Crustacean
- **Size**: 3-5 cm carapace width
- **Lifespan**: 730 days (2 years)
- **Metabolism**: 6 kcal/day
- **Movement Speed**: 0.3 m/s (fastest in simulation)
- **Feeding**: Opportunistic - algae, carrion, small invertebrates
- **Reproduction**: 500-1000 eggs per female
- **Temperature Range**: 8-25°C
- **Behavior**: Shelter under rocks, nocturnal foraging
- **Notes**: Omnivore, helps recycle nutrients

### 11. Sculpin Fish (*Oligocottus maculosus*)
- **Category**: Fish (resident)
- **Size**: 5-9 cm
- **Lifespan**: 1,095 days (3 years)
- **Metabolism**: 12 kcal/day
- **Movement Speed**: 0.5 m/s (burst speed)
- **Feeding**: Small crustaceans, worms, fish eggs
- **Temperature Range**: 10-20°C
- **Oxygen Requirement**: >6 mg/L
- **Behavior**: Ambush predator, territorial
- **Notes**: Requires sufficient pool depth and O₂

---

## Sessile Predators

### 12. Aggregating Anemone (*Anthopleura elegantissima*)
- **Category**: Cnidarian
- **Size**: 2-8 cm diameter
- **Lifespan**: 18,250 days (50 years)
- **Metabolism**: 3 kcal/day
- **Reproduction**: Clonal fission when well-fed
- **Feeding**: Passive capture of small invertebrates, detritus
- **Tentacle Reach**: 5 cm
- **Temperature Range**: 8-25°C
- **Desiccation Tolerance**: 600 minutes (retracts)
- **Symbiosis**: Harbors zooxanthellae (photosynthetic algae)
- **Notes**: Forms dense clonal aggregations, clone warfare

---

## Detritivores & Cleanup Crew

### 13. Isopod (*Idotea wosnesenskii*)
- **Category**: Crustacean
- **Size**: 1-3 cm
- **Lifespan**: 365 days
- **Metabolism**: 1 kcal/day
- **Movement Speed**: 0.05 m/s
- **Feeding**: Dead organic matter, detritus
- **Notes**: Important nutrient recyclers

### 14. Amphipod (*Hyale plumulosa*)
- **Category**: Crustacean
- **Size**: 0.5-1.5 cm
- **Lifespan**: 180 days
- **Metabolism**: 0.5 kcal/day
- **Reproduction**: 20-40 young per brood
- **Feeding**: Detritus, algae fragments
- **Notes**: Food for many predators, high reproduction rate

---

## Implementation Priority

**Phase 1 (MVP)**:
1. Sea Lettuce (producer)
2. Acorn Barnacle (filter feeder)
3. Limpet (herbivore)
4. Ochre Sea Star (predator)

**Phase 2**:
5. California Mussel
6. Purple Sea Urchin
7. Shore Crab
8. Rockweed

**Phase 3**:
9. Aggregating Anemone
10. Black Turban Snail
11. Sculpin Fish
12. Coralline Algae

**Phase 4 (Realism)**:
13. Detritivores (isopods, amphipods)
14. Plankton (invisible resource pool)
15. Larval dispersal mechanics

---

## Interaction Matrix

|           | Algae | Barnacle | Mussel | Limpet | Urchin | Star | Crab | Anemone |
|-----------|-------|----------|--------|--------|--------|------|------|---------|
| **Algae**     | -0.2  | 0        | 0      | -0.5   | -0.8   | 0    | -0.1 | 0       |
| **Barnacle**  | 0     | -0.3     | -0.3   | 0      | 0      | -0.7 | 0    | 0       |
| **Mussel**    | 0     | -0.4     | -0.5   | 0      | 0      | -0.9 | 0    | 0       |
| **Limpet**    | +0.6  | 0        | 0      | -0.1   | 0      | -0.3 | -0.2 | -0.1    |
| **Urchin**    | +0.8  | 0        | 0      | 0      | -0.1   | -0.8 | -0.3 | 0       |
| **Star**      | 0     | +0.5     | +0.9   | +0.3   | +0.2   | 0    | 0    | 0       |
| **Crab**      | +0.1  | +0.2     | 0      | +0.3   | 0      | 0    | -0.1 | -0.2    |
| **Anemone**   | 0     | 0        | 0      | +0.1   | 0      | 0    | +0.2 | -0.3    |

**Legend**:
- Positive: Predation/consumption benefit
- Negative: Competition or being consumed
- 0: No direct interaction
- Value magnitude: Interaction strength

---

## Future Species Considerations

- **Chiton** (*Katharina tunicata*): Armored herbivore
- **Nudibranch** (*Hermissenda crassicornis*): Specialized predator
- **Sea Cucumber**: Detritivore
- **Octopus** (*Octopus rubescens*): Intelligent predator (complex behavior)
- **Kelp Crab**: Camouflaged herbivore
- **Various Worms**: Polychaetes, flatworms (substrate fauna)
