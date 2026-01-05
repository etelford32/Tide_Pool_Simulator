import * as THREE from 'three';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { Renderer } from './rendering/Renderer';
import { Environment } from './environment/Environment';
import { OrganismManager } from './organisms/OrganismManager';
import { UIManager } from './ui/UIManager';
import { InputHandler } from './input/InputHandler';
import { CameraController } from './camera/CameraController';
import { CameraInputHandler } from './camera/CameraInputHandler';

export type SimulationMode = 'game' | 'scientific';

export class TidePoolSimulation {
  private physicsWorld: PhysicsWorld;
  private renderer: Renderer;
  private environment: Environment;
  private organismManager: OrganismManager;
  private uiManager: UIManager;
  private inputHandler: InputHandler;
  private cameraController: CameraController | null = null;
  private cameraInputHandler: CameraInputHandler | null = null;

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
    this.inputHandler = new InputHandler();
  }

  async initialize() {
    // Initialize renderer
    await this.renderer.initialize();

    // Initialize physics world
    this.physicsWorld.initialize();

    // Initialize camera controller
    this.cameraController = new CameraController(this.renderer.camera);
    const canvas = this.renderer.renderer.domElement;
    this.cameraInputHandler = new CameraInputHandler(this.cameraController, canvas);

    // Set up camera UI controls
    this.setupCameraControls();

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
      }, this.renderer.scene);
    }

    // Add barnacles (filter feeders)
    for (let i = 0; i < 15; i++) {
      this.organismManager.spawn('acorn_barnacle', {
        x: Math.random() * 8 - 4,
        y: 0.1,
        z: Math.random() * 8 - 4,
      }, this.renderer.scene);
    }

    // Add limpets (herbivores)
    for (let i = 0; i < 8; i++) {
      this.organismManager.spawn('limpet', {
        x: Math.random() * 8 - 4,
        y: 0.2,
        z: Math.random() * 8 - 4,
      }, this.renderer.scene);
    }

    // Add sea stars (predators)
    for (let i = 0; i < 3; i++) {
      this.organismManager.spawn('ochre_sea_star', {
        x: Math.random() * 6 - 3,
        y: 0.3,
        z: Math.random() * 6 - 3,
      }, this.renderer.scene);
    }

    // Add hermit crabs (smart scavengers)
    for (let i = 0; i < 5; i++) {
      this.organismManager.spawn('pacific_hermit_crab', {
        x: Math.random() * 6 - 3,
        y: 0.15,
        z: Math.random() * 6 - 3,
      }, this.renderer.scene);
    }

    // Add Sea Anemone Home (player's home base)
    this.organismManager.spawn('sea_anemone_home', {
      x: 0,
      y: 0.1,
      z: 0,
    }, this.renderer.scene);

    // Add Player-Controlled Clownfish (our hero!)
    this.organismManager.spawn('clownfish', {
      x: 0.5,
      y: 0.5,
      z: 0.5,
    }, this.renderer.scene);

    console.log(`✓ Spawned initial ecosystem with clownfish player and anemone home`);
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

    // Handle player input for clownfish
    const playerFish = this.organismManager.getPlayerClownfish();
    if (playerFish) {
      const moveDir = this.inputHandler.getMovementDirection();
      playerFish.setMoveDirection(moveDir.x, moveDir.z);
    }

    // Update camera
    if (this.cameraController && this.cameraInputHandler) {
      this.cameraInputHandler.update(deltaTime);
      this.cameraController.update(deltaTime);
    }

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

  private setupCameraControls() {
    if (!this.cameraController) return;

    // Zoom controls
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;

    if (zoomIn) {
      zoomIn.addEventListener('click', () => this.cameraController!.zoom(-200));
    }
    if (zoomOut) {
      zoomOut.addEventListener('click', () => this.cameraController!.zoom(200));
    }
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.cameraController!.setZoom(value);
      });
    }

    // Pan controls
    const panUp = document.getElementById('pan-up');
    const panDown = document.getElementById('pan-down');
    const panLeft = document.getElementById('pan-left');
    const panRight = document.getElementById('pan-right');
    const panReset = document.getElementById('pan-reset');

    if (panUp) panUp.addEventListener('click', () => this.cameraController!.pan(0, 3));
    if (panDown) panDown.addEventListener('click', () => this.cameraController!.pan(0, -3));
    if (panLeft) panLeft.addEventListener('click', () => this.cameraController!.pan(-3, 0));
    if (panRight) panRight.addEventListener('click', () => this.cameraController!.pan(3, 0));
    if (panReset) panReset.addEventListener('click', () => {
      this.cameraController!.setTarget(new THREE.Vector3(0, 2, 0));
    });

    // Rotate controls
    const rotateUp = document.getElementById('rotate-up');
    const rotateDown = document.getElementById('rotate-down');
    const rotateLeft = document.getElementById('rotate-left');
    const rotateRight = document.getElementById('rotate-right');
    const rotateReset = document.getElementById('rotate-reset');

    if (rotateUp) rotateUp.addEventListener('click', () => this.cameraController!.orbit(0, 10));
    if (rotateDown) rotateDown.addEventListener('click', () => this.cameraController!.orbit(0, -10));
    if (rotateLeft) rotateLeft.addEventListener('click', () => this.cameraController!.orbit(-10, 0));
    if (rotateRight) rotateRight.addEventListener('click', () => this.cameraController!.orbit(10, 0));
    if (rotateReset) rotateReset.addEventListener('click', () => {
      this.cameraController!.applyPreset('default');
    });

    // Preset controls
    const presetDefault = document.getElementById('preset-default');
    const presetTop = document.getElementById('preset-top');
    const presetSide = document.getElementById('preset-side');
    const presetFront = document.getElementById('preset-front');
    const presetIsometric = document.getElementById('preset-isometric');
    const presetFollow = document.getElementById('preset-follow');

    if (presetDefault) {
      presetDefault.addEventListener('click', () => {
        this.cameraController!.applyPreset('default');
      });
    }
    if (presetTop) {
      presetTop.addEventListener('click', () => {
        this.cameraController!.applyPreset('top');
      });
    }
    if (presetSide) {
      presetSide.addEventListener('click', () => {
        this.cameraController!.applyPreset('side');
      });
    }
    if (presetFront) {
      presetFront.addEventListener('click', () => {
        this.cameraController!.applyPreset('front');
      });
    }
    if (presetIsometric) {
      presetIsometric.addEventListener('click', () => {
        this.cameraController!.applyPreset('isometric');
      });
    }
    if (presetFollow) {
      presetFollow.addEventListener('click', () => {
        const playerFish = this.organismManager.getPlayerClownfish();
        if (playerFish) {
          this.cameraController!.applyPreset('follow', playerFish.getPosition());
        }
      });
    }
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
