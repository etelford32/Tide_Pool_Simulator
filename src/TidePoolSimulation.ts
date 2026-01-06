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

  // Selection system
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedOrganism: any | null = null;

  constructor() {
    this.physicsWorld = new PhysicsWorld();
    this.renderer = new Renderer();
    this.environment = new Environment(this.mode);
    this.organismManager = new OrganismManager(this.physicsWorld, this.environment);
    this.uiManager = new UIManager();
    this.inputHandler = new InputHandler();

    // Initialize selection system
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
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

    // Set up matrix visualization toggle
    this.setupMatrixVisualizationToggle();

    // Set up creature selection
    this.setupCreatureSelection();

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
    this.environment.update(this.simulationTime, simDeltaTime, deltaTime, this.renderer.camera);

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

    // Update creature profile if selected
    if (this.selectedOrganism) {
      this.updateCreatureProfile();
    }
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
      waterHeight: this.environment.getWaterLevel(),
      moonPhase: this.environment.getMoonPhaseName(),
      shoreMoisture: this.environment.getShoreMoisture(),
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

    // Camera mode toggle
    const toggleModeBtn = document.getElementById('toggle-camera-mode');
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => {
        const currentMode = this.cameraController!.getMode();
        if (currentMode === 'orbit') {
          this.cameraController!.setMode('freefly');
          toggleModeBtn.textContent = '🔄 Switch to Orbit';
          console.log('📷 FREE-FLY mode: WASD=Move, Shift+Mouse=Look, Space/Ctrl=Up/Down');
        } else {
          this.cameraController!.setMode('orbit');
          toggleModeBtn.textContent = '🔄 Switch to Free-Fly';
          console.log('📷 ORBIT mode: Drag=Rotate, WASD=Pan');
        }
      });
    }
  }

  private setupMatrixVisualizationToggle() {
    const toggleBtn = document.getElementById('toggle-matrix-viz');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isEnabled = this.environment.toggleMatrixVisualization();
        if (isEnabled) {
          toggleBtn.textContent = '✅ Hide 3D Matrix Field';
          toggleBtn.classList.add('active');
        } else {
          toggleBtn.textContent = '🔲 Show 3D Matrix Field';
          toggleBtn.classList.remove('active');
        }
      });
    }
  }

  private setupCreatureSelection() {
    const canvas = this.renderer.renderer.domElement;

    // Handle mouse clicks for selection
    canvas.addEventListener('click', (event) => {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

      // Calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects(this.renderer.scene.children, true);

      if (intersects.length > 0) {
        // Find the first organism in the intersected objects
        for (const intersect of intersects) {
          let object: THREE.Object3D | null = intersect.object;

          // Traverse up to find organism
          while (object) {
            // Check if this object belongs to a hermit crab body group
            if (object.name === 'CrabBodyGroup' && object.parent) {
              this.selectCreature(object);
              return;
            }
            object = object.parent;
          }
        }
      }

      // If no organism was clicked, hide the profile panel
      this.deselectCreature();
    });

    // Close button for profile panel
    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.deselectCreature();
      });
    }
  }

  private selectCreature(bodyGroup: THREE.Object3D) {
    // Find the organism that owns this body group
    const organisms = this.organismManager.getAllOrganisms();
    for (const organism of organisms) {
      if ('getBodyGroup' in organism) {
        const bodyGroupMethod = organism.getBodyGroup as () => THREE.Group;
        if (bodyGroupMethod.call(organism) === bodyGroup) {
          this.selectedOrganism = organism as any;
          this.updateCreatureProfile();
          const profilePanel = document.getElementById('creature-profile');
          if (profilePanel) {
            profilePanel.style.display = 'block';
          }
          console.log(`Selected: ${(organism as any).profile?.name || (organism as any).name}`);
          break;
        }
      }
    }
  }

  private deselectCreature() {
    this.selectedOrganism = null;
    const profilePanel = document.getElementById('creature-profile');
    if (profilePanel) {
      profilePanel.style.display = 'none';
    }
  }

  private updateCreatureProfile() {
    if (!this.selectedOrganism) return;

    const organism = this.selectedOrganism;
    const pos = organism.getPosition();

    // Update profile panel
    const nameEl = document.getElementById('creature-name');
    const speciesEl = document.getElementById('creature-species');
    const positionEl = document.getElementById('creature-position');
    const personalityEl = document.getElementById('creature-personality');
    const moodEl = document.getElementById('creature-mood');
    const activityEl = document.getElementById('creature-activity');
    const healthEl = document.getElementById('creature-health');
    const hungerEl = document.getElementById('creature-hunger');
    const happinessEl = document.getElementById('creature-happiness');
    const shellQualityEl = document.getElementById('creature-shell-quality');
    const foodEl = document.getElementById('creature-food');

    if (nameEl) nameEl.textContent = `🦀 ${organism.profile?.name || organism.name}`;
    if (speciesEl) speciesEl.textContent = organism.name || 'Unknown';
    if (positionEl) positionEl.textContent = `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;

    if (organism.profile) {
      if (personalityEl) personalityEl.textContent = organism.profile.personality || 'Unknown';
      if (moodEl) moodEl.textContent = organism.profile.mood || 'Unknown';
      if (foodEl) foodEl.textContent = organism.profile.favoriteFood || 'Unknown';
    }

    if (activityEl && 'getCurrentActivity' in organism) {
      activityEl.textContent = organism.getCurrentActivity();
    }

    if (healthEl && 'health' in organism) {
      healthEl.textContent = `${Math.round(organism.health)}%`;
    }

    if (hungerEl && 'getHunger' in organism) {
      hungerEl.textContent = `${Math.round(organism.getHunger())}%`;
    }

    if (happinessEl && 'getHappiness' in organism) {
      happinessEl.textContent = `${Math.round(organism.getHappiness())}%`;
    }

    if (shellQualityEl && 'getShellQuality' in organism) {
      shellQualityEl.textContent = `${Math.round(organism.getShellQuality())}%`;
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

  setTimeScale(scale: number) {
    this.timeScale = Math.max(0, Math.min(10, scale));
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
