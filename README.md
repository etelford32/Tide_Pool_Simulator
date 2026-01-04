# 🌊 Tide Pool Simulator

A realistic, physics-based tide pool ecosystem simulation that combines cutting-edge web technology with scientific accuracy. Experience marine ecology through interactive gameplay while exploring genuine biological principles.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Physics](https://img.shields.io/badge/physics-Rapier%203D-orange)
![Rendering](https://img.shields.io/badge/rendering-Three.js-purple)

## 🎮 Play Now

[Live Demo](#) *(Coming soon - deploy to Vercel)*

## ✨ Features

### Bleeding-Edge Technology Stack
- **⚡ Rapier Physics Engine** - Rust-powered WebAssembly physics for realistic interactions
- **🎨 Three.js Rendering** - Beautiful 3D graphics with dynamic lighting and shadows
- **📦 Vite Build System** - Lightning-fast development and optimized production builds
- **🚀 Vercel Deployment** - Automatic deployments with global CDN
- **💪 TypeScript** - Type-safe code for complex biological simulations

### Realistic Ecosystem Simulation
- **🦀 Multiple Species** - Sea stars, limpets, barnacles, sea lettuce, and more
- **🌊 Dynamic Tidal Cycles** - Accurate semi-diurnal tides affecting organism behavior
- **🔬 Scientific Accuracy** - Based on real marine biology research
- **📊 Ecosystem Metrics** - Track biodiversity, population dynamics, and trophic interactions
- **🎲 Emergent Behavior** - Complex interactions arise from simple rules

### Dual Modes
- **Game Mode** - Accelerated time (1 minute = 1 day) for engaging gameplay
- **Scientific Mode** - Real-time simulation for educational research and analysis

## 🎯 Gameplay

Create and manage your own tide pool ecosystem! Watch as:
- **Primary producers** (algae) photosynthesize and grow
- **Filter feeders** (barnacles) extract nutrients from flowing water
- **Herbivores** (limpets) graze on algae films
- **Predators** (sea stars) hunt prey and regulate populations
- **Tidal cycles** submerge and expose organisms to stress

### Controls

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume |
| `+` / `=` | Speed up time |
| `-` | Slow down time |
| `R` | Reset simulation |

**Mouse**: Click and drag to rotate camera (coming soon)

## 🔬 Scientific Basis

This simulation is grounded in real marine ecology:

- **Trophic Dynamics** - Energy transfer through food webs
- **Keystone Species** - Sea stars as keystone predators (Paine 1966)
- **Environmental Stress** - Desiccation, temperature, and oxygen tolerance
- **Population Regulation** - Predation, competition, and resource limitation
- **Succession** - Ecosystem development over time

See [docs/SCIENTIFIC_BASIS.md](docs/SCIENTIFIC_BASIS.md) for detailed methodology.

## 📚 Educational Use

Perfect for:
- **Biology Classrooms** - Demonstrate ecological concepts interactively
- **Marine Science Labs** - Virtual field work and species identification
- **Research** - Hypothesis testing and ecosystem modeling
- **Citizen Science** - Community engagement with marine biology

See [docs/RESEARCH_APPLICATIONS.md](docs/RESEARCH_APPLICATIONS.md) for curriculum ideas and research applications.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Tide_Pool_Simulator.git
cd Tide_Pool_Simulator

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 to view the simulation.

### Building for Production

```bash
npm run build
npm run preview
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Push this repository to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Vercel auto-detects Vite - just click "Deploy"
5. Your simulation is live!

Every git push automatically deploys updates.

### Alternative: GitHub Pages

```bash
npm run build
# Deploy the 'dist' folder to GitHub Pages
```

## 🧬 Species Database

### Phase 1 (Current - MVP)
- ✅ Sea Lettuce (*Ulva lactuca*) - Fast-growing algae
- ✅ Acorn Barnacle (*Balanus glandula*) - Sessile filter feeder
- ✅ Limpet (*Lottia gigantea*) - Grazing herbivore
- ✅ Ochre Sea Star (*Pisaster ochraceus*) - Keystone predator

### Phase 2 (Planned)
- 🔲 California Mussel - Ecosystem engineer
- 🔲 Purple Sea Urchin - Voracious herbivore
- 🔲 Shore Crab - Omnivorous scavenger
- 🔲 Rockweed - Structural habitat provider

### Phase 3 (Future)
- 🔲 Aggregating Anemone - Clonal predator
- 🔲 Sculpin Fish - Mobile predator
- 🔲 Coralline Algae - Substrate builder
- 🔲 Detritivores - Nutrient recyclers

See [docs/SPECIES_DATABASE.md](docs/SPECIES_DATABASE.md) for complete species parameters.

## 📊 Data Export

Scientific mode supports exporting:
- Population time series (CSV)
- Spatial distribution data (JSON)
- Event logs (predation, reproduction, deaths)
- Environmental parameters

Perfect for analysis in R, Python, or Excel.

## 🏗️ Architecture

```
src/
├── main.ts                    # Application entry point
├── TidePoolSimulation.ts      # Main simulation controller
├── physics/
│   └── PhysicsWorld.ts        # Rapier physics wrapper
├── rendering/
│   └── Renderer.ts            # Three.js rendering
├── environment/
│   └── Environment.ts         # Tides, temperature, chemistry
├── organisms/
│   ├── Organism.ts            # Base organism class
│   ├── OrganismManager.ts     # Population management
│   └── species/
│       ├── SeaLettuce.ts
│       ├── AcornBarnacle.ts
│       ├── Limpet.ts
│       └── OchreSeaStar.ts
└── ui/
    └── UIManager.ts           # HUD and controls
```

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Additional species implementations
- Improved physics behaviors
- UI/UX enhancements
- Scientific accuracy improvements
- Performance optimizations

Please see [CONTRIBUTING.md](#) for guidelines.

## 📖 Documentation

- [Scientific Basis](docs/SCIENTIFIC_BASIS.md) - Physics and biology models
- [Species Database](docs/SPECIES_DATABASE.md) - Complete organism parameters
- [Research Applications](docs/RESEARCH_APPLICATIONS.md) - Educational use cases

## 🎓 References

This simulation is based on foundational ecology research:

1. Paine, R.T. (1966). "Food web complexity and species diversity." *American Naturalist*, 100(910), 65-75.
2. Connell, J.H. (1961). "Effects of competition, predation by Thais lapillus, and other factors on natural populations of the barnacle Balanus balanoides." *Ecological Monographs*, 31(1), 61-104.
3. Menge, B.A., & Sutherland, J.P. (1987). "Community regulation: Variation in disturbance, competition, and predation in relation to environmental stress and recruitment." *The American Naturalist*, 130(5), 730-757.

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Rapier Physics by Dimforge
- Three.js by Mr.doob and contributors
- Marine biology research from the rocky intertidal community
- Inspired by real tide pools of the Pacific Northwest

## 🐛 Known Issues

- [ ] Camera controls not yet implemented (fixed viewpoint)
- [ ] Organism spawning limited to initial setup
- [ ] Water rendering could be more realistic
- [ ] Performance optimization needed for 100+ organisms

## 🗺️ Roadmap

**v0.2** - Enhanced Interactions
- Advanced predator behaviors
- Resource competition
- Mutualistic relationships

**v0.3** - Visual Polish
- Improved water shader
- Particle effects (bubbles, detritus)
- Camera controls and zoom

**v0.4** - User Interaction
- Click to add organisms
- Environmental controls (temperature, storm events)
- Scenario challenges

**v1.0** - Full Ecosystem
- 15+ species
- Seasonal cycles
- Data visualization dashboard
- Multiplayer (shared tide pools)

---

**Built with ❤️ for marine biology education and interactive science**

*Star this repo if you find it useful!*
