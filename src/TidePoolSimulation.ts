import { PhysicsWorld } from './physics/PhysicsWorld';
import { Renderer } from './rendering/Renderer';
import { Environment } from './environment/Environment';
import { OrganismManager } from './organisms/OrganismManager';
import { UIManager } from './ui/UIManager';

export type SimulationMode = 'game' | 'scientific';

export class TidePoolSimulation {
  private physicsWorld: PhysicsWorld;
  private renderer: Renderer;
  private environment: Environment;
  private organismManager: OrganismManager;
  private uiManager: UIManager;

  private mode: SimulationMode = 'game';
  private timeScale: number = 1.0; // 1 minute = 1 day in game mode
  private isPaused: boolean = false;
  private simulationTime: number = 0; // in days
  private lastFrameTime: number = 0;

  private animationFrameId: number | null = null;

  constructor() {
    this.physicsWorld = new PhysicsWorld();
    this.renderer = new Renderer();
    this.environment = new Environment(this.mode);
    this.organismManager = new OrganismManager(this.physicsWorld, this.environment);
    this.uiManager = new UIManager();
  }

  async initialize() {
    // Initialize renderer
    await this.renderer.initialize();

    // Initialize physics world
    this.physicsWorld.initialize();

    // Create initial environment
    this.environment.createTidePool(this.physicsWorld, this.renderer.scene);

    // Add initial organisms
    this.spawnInitialEcosystem();

    console.log('✓ Simulation initialized');
  }

  private spawnInitialEcosystem() {
    // Phase 1 MVP organisms
    // Add some algae (producers)
    for (let i = 0; i < 10; i++) {
      this.organismManager.spawn('sea_lettuce', {
        x: Math.random() * 8 - 4,
        y: 0.1,
        z: Math.random() * 8 - 4,
      });
    }

    // Add barnacles (filter feeders)
    for (let i = 0; i < 15; i++) {
      this.organismManager.spawn('acorn_barnacle', {
        x: Math.random() * 8 - 4,
        y: 0.1,
        z: Math.random() * 8 - 4,
      });
    }

    // Add limpets (herbivores)
    for (let i = 0; i < 8; i++) {
      this.organismManager.spawn('limpet', {
        x: Math.random() * 8 - 4,
        y: 0.2,
        z: Math.random() * 8 - 4,
      });
    }

    // Add sea stars (predators)
    for (let i = 0; i < 3; i++) {
      this.organismManager.spawn('ochre_sea_star', {
        x: Math.random() * 6 - 3,
        y: 0.3,
        z: Math.random() * 6 - 3,
      });
    }

    console.log(`✓ Spawned initial ecosystem`);
  }

  start() {
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // seconds
    this.lastFrameTime = currentTime;

    if (!this.isPaused) {
      this.update(deltaTime);
    }

    this.render();
  };

  private update(deltaTime: number) {
    // Convert real time to simulation time
    const simDeltaTime = this.mode === 'game'
      ? deltaTime * this.timeScale * 1440 // 1 minute = 1 day (1440 minutes/day)
      : deltaTime * this.timeScale; // Real-time for scientific mode

    this.simulationTime += simDeltaTime / 86400; // Convert seconds to days

    // Update environment (tide, temperature, etc.)
    // Pass real deltaTime for wave animation, simDeltaTime for other environmental changes
    this.environment.update(this.simulationTime, simDeltaTime, deltaTime);

    // Update physics
    this.physicsWorld.step(deltaTime);

    // Update organisms (behavior, metabolism, reproduction)
    this.organismManager.update(simDeltaTime, this.simulationTime);

    // Update UI
    this.updateUI();
  }

  private render() {
    // Update visual representations to match physics
    this.organismManager.syncVisuals();

    // Render the scene
    this.renderer.render();
  }

  private updateUI() {
    const stats = this.organismManager.getStatistics();

    this.uiManager.update({
      time: this.simulationTime,
      tideLevel: this.environment.getTideLevel(),
      temperature: this.environment.getTemperature(),
      speciesCount: stats.speciesCount,
      totalOrganisms: stats.totalOrganisms,
      biodiversity: stats.shannonIndex,
    });
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  adjustTimeScale(multiplier: number) {
    this.timeScale *= multiplier;
    this.timeScale = Math.max(0.1, Math.min(100, this.timeScale));
    console.log(`Time scale: ${this.timeScale.toFixed(2)}x`);
  }

  setMode(mode: SimulationMode) {
    this.mode = mode;
    this.environment.setMode(mode);

    if (mode === 'scientific') {
      this.timeScale = 1.0; // Real-time for scientific accuracy
    }

    console.log(`Mode: ${mode}`);
  }

  reset() {
    // Clear existing organisms
    this.organismManager.clear();

    // Reset environment
    this.environment.reset();

    // Reset time
    this.simulationTime = 0;
    this.timeScale = 1.0;

    // Respawn ecosystem
    this.spawnInitialEcosystem();

    console.log('✓ Simulation reset');
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.renderer.destroy();
    this.physicsWorld.destroy();
  }
}
