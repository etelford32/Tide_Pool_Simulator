import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SimulationMode } from '../TidePoolSimulation';
import { WaterSystem } from '../rendering/WaterSystem';
import { TerrainSystem } from './TerrainSystem';
import { MoonSystem } from './MoonSystem';
import { MoistureSystem } from './MoistureSystem';

interface EnvironmentParameters {
  temperature: number; // °C
  salinity: number; // ppt
  pH: number;
  dissolvedOxygen: number; // mg/L
  tideLevel: number; // 0-1 (low to high)
  turbulence: number; // 0-1
}

export class Environment {
  private params: EnvironmentParameters;
  private _mode: SimulationMode;
  private poolMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private oceanMesh: THREE.Mesh | null = null;
  private waveMesh: THREE.Mesh | null = null;
  private foamParticles: THREE.Points | null = null;

  // Advanced water system
  private waterSystem: WaterSystem | null = null;
  private terrainSystem: TerrainSystem | null = null;
  private moonSystem: MoonSystem | null = null;
  private moistureSystem: MoistureSystem | null = null;

  // Tidal parameters
  private tidalPeriod = 0.5; // days (12 hours for semi-diurnal tide)
  private _tidalAmplitude = 0.5; // meters (reserved for future use)

  // Real-time wave animation
  private waveTimer = 0; // seconds
  private waveCycleDuration = 360; // 6 minutes total (3 min high, 3 min low)
  private waveBasePosition = 10; // Base Z position
  private waveAmplitude = 8; // How far waves move in/out

  constructor(mode: SimulationMode) {
    this._mode = mode;
    this.params = {
      temperature: 15, // °C
      salinity: 33, // ppt
      pH: 8.1,
      dissolvedOxygen: 7.5, // mg/L
      tideLevel: 0.7, // Starting at high tide
      turbulence: 0.3,
    };
  }

  createTidePool(physicsWorld: PhysicsWorld, scene: THREE.Scene) {
    // Create moon system for tidal effects
    this.moonSystem = new MoonSystem(scene);

    // Create terrain with realistic grade and slope variations
    this.terrainSystem = new TerrainSystem(scene, physicsWorld);
    this.terrainSystem.createTerrain();
    this.terrainSystem.addTerrainDetails();

    // Initialize moisture system
    const moistureBounds = new THREE.Box3(
      new THREE.Vector3(-50, -5, -50),
      new THREE.Vector3(50, 5, 50)
    );
    this.moistureSystem = new MoistureSystem(moistureBounds, new THREE.Vector2(64, 64));

    // Initialize advanced water system with realistic waves
    const waterBounds = new THREE.Box3(
      new THREE.Vector3(-50, -5, -25),
      new THREE.Vector3(50, 5, 25)
    );
    this.waterSystem = new WaterSystem(scene, waterBounds);

    // Create ocean at the bottom of the screen (kept for distant water)
    const oceanGeometry = new THREE.PlaneGeometry(100, 50);
    const oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x006994,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(0, -5, this.waveBasePosition);
    this.oceanMesh.receiveShadow = true;
    scene.add(this.oceanMesh);

    // Add animated wave texture (simplified)
    const waveGeometry = new THREE.PlaneGeometry(100, 50);
    const waveMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e90ff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    this.waveMesh.rotation.x = -Math.PI / 2;
    this.waveMesh.position.set(0, -4.8, this.waveBasePosition);
    scene.add(this.waveMesh);

    // Create foam particles at wave edge
    this.createFoam(scene);

    // Create rocky cliff beach on the left side
    this.createCliffBeach(scene, physicsWorld);

    // Create pool substrate (rock basin) - tide pool in center
    const poolGeometry = new THREE.CylinderGeometry(5, 5, 0.5, 32);
    const poolMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a4a3a,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.poolMesh = new THREE.Mesh(poolGeometry, poolMaterial);
    this.poolMesh.position.y = -0.25;
    this.poolMesh.receiveShadow = true;
    scene.add(this.poolMesh);

    // Add texture variation (algae spots, barnacle clusters)
    this.addSubstrateDetails(scene);

    // Create physics body for pool bottom
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundBody = physicsWorld.createRigidBody(groundBodyDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cylinder(0.25, 5);
    physicsWorld.createCollider(groundColliderDesc, groundBody);

    // Create water surface in tide pool
    const waterGeometry = new THREE.CylinderGeometry(4.9, 4.9, 0.1, 32);
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e90ff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
    });
    this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    this.waterMesh.position.y = 0.5;
    scene.add(this.waterMesh);

    console.log('✓ Tide pool created');
  }

  private createCliffBeach(scene: THREE.Scene, _physicsWorld: PhysicsWorld) {
    // Create main cliff wall on the left
    const cliffGeometry = new THREE.BoxGeometry(4, 15, 30);
    const cliffMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const cliffMesh = new THREE.Mesh(cliffGeometry, cliffMaterial);
    cliffMesh.position.set(-10, 5, 0);
    cliffMesh.castShadow = true;
    cliffMesh.receiveShadow = true;
    scene.add(cliffMesh);

    // Add large boulders at the base of the cliff
    const boulderPositions = [
      { x: -8, y: 0.8, z: -3, size: 1.5 },
      { x: -7.5, y: 1.2, z: 2, size: 2 },
      { x: -9, y: 0.6, z: 5, size: 1.2 },
      { x: -7, y: 1, z: -6, size: 1.8 },
      { x: -8.5, y: 0.5, z: -1, size: 1 },
    ];

    for (const pos of boulderPositions) {
      const boulderGeometry = new THREE.DodecahedronGeometry(pos.size);
      const boulderMaterial = new THREE.MeshStandardMaterial({
        color: 0x5a5a5a,
        roughness: 0.9,
      });
      const boulder = new THREE.Mesh(boulderGeometry, boulderMaterial);
      boulder.position.set(pos.x, pos.y, pos.z);
      boulder.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      scene.add(boulder);
    }

    // Add rocky beach terrain transitioning from cliff to tide pool
    const beachGeometry = new THREE.PlaneGeometry(8, 20);
    const beachMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b5a4a,
      roughness: 0.95,
    });
    const beachMesh = new THREE.Mesh(beachGeometry, beachMaterial);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.rotation.z = Math.PI / 12; // Slight angle
    beachMesh.position.set(-6, -0.3, 0);
    beachMesh.receiveShadow = true;
    scene.add(beachMesh);

    // Add scattered small rocks on the beach
    for (let i = 0; i < 15; i++) {
      const rockSize = 0.2 + Math.random() * 0.4;
      const rockGeometry = new THREE.DodecahedronGeometry(rockSize);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.95,
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.x = -6 + (Math.random() - 0.5) * 6;
      rock.position.y = 0.1;
      rock.position.z = (Math.random() - 0.5) * 15;
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    console.log('✓ Cliff beach created');
  }

  private createFoam(scene: THREE.Scene) {
    // Create foam particles along wave edge
    const foamCount = 200;
    const foamGeometry = new THREE.BufferGeometry();
    const foamPositions = new Float32Array(foamCount * 3);

    // Distribute foam particles along the wave front (horizontal line)
    for (let i = 0; i < foamCount; i++) {
      foamPositions[i * 3] = (Math.random() - 0.5) * 100; // X: spread across width
      foamPositions[i * 3 + 1] = -4.5 + Math.random() * 0.5; // Y: near water surface
      foamPositions[i * 3 + 2] = (Math.random() - 0.5) * 5; // Z: clustered at wave edge
    }

    foamGeometry.setAttribute('position', new THREE.BufferAttribute(foamPositions, 3));

    // Create foam material
    const foamMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    this.foamParticles = new THREE.Points(foamGeometry, foamMaterial);
    this.foamParticles.position.z = this.waveBasePosition;
    scene.add(this.foamParticles);

    console.log('✓ Foam particles created');
  }

  private addSubstrateDetails(scene: THREE.Scene) {
    // Add some rocks
    for (let i = 0; i < 8; i++) {
      const rockGeometry = new THREE.DodecahedronGeometry(
        0.2 + Math.random() * 0.3
      );
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.95,
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.x = (Math.random() - 0.5) * 8;
      rock.position.y = 0.1;
      rock.position.z = (Math.random() - 0.5) * 8;
      rock.rotation.x = Math.random() * Math.PI;
      rock.rotation.y = Math.random() * Math.PI;
      rock.rotation.z = Math.random() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }
  }

  update(simulationTime: number, deltaTime: number, realDeltaTime?: number, camera?: THREE.Camera) {
    // Use real deltaTime for wave animation if provided, otherwise use simulation deltaTime
    const waveDeltaTime = realDeltaTime !== undefined ? realDeltaTime : deltaTime;

    // Update moon system
    if (this.moonSystem) {
      this.moonSystem.update(simulationTime);
    }

    // Update advanced water system if available
    if (this.waterSystem && camera) {
      this.waterSystem.update(waveDeltaTime, camera);
    }

    // Update real-time wave animation (waveDeltaTime is in seconds)
    this.waveTimer += waveDeltaTime;
    const wavePhase = (this.waveTimer % this.waveCycleDuration) / this.waveCycleDuration;

    // Sine wave: 0 to 1 to 0 over the cycle (high tide for first half, low tide for second half)
    const waveOffset = Math.sin(wavePhase * Math.PI * 2) * this.waveAmplitude;

    // Update ocean and wave mesh positions
    if (this.oceanMesh) {
      this.oceanMesh.position.z = this.waveBasePosition - waveOffset;
    }
    if (this.waveMesh) {
      this.waveMesh.position.z = this.waveBasePosition - waveOffset;
    }

    // Calculate wave change rate for turbulence and foam
    const waveChangeRate = Math.abs(Math.cos(wavePhase * Math.PI * 2));

    // Update foam particles to follow wave
    if (this.foamParticles) {
      this.foamParticles.position.z = this.waveBasePosition - waveOffset;
      // Increase foam opacity during high turbulence
      const foamMaterial = this.foamParticles.material as THREE.PointsMaterial;
      foamMaterial.opacity = 0.6 + waveChangeRate * 0.4;
    }

    // Update tidal cycle using moon system (for tide pool water level)
    let currentWaterLevel = 0;
    if (this.moonSystem) {
      this.params.tideLevel = this.moonSystem.calculateTidalForce(simulationTime);

      // Update water level in water system based on tide
      // Range from -1.0 (low tide) to +1.5 (high tide) so water flows over beach
      currentWaterLevel = -1.0 + this.params.tideLevel * 2.5;
      if (this.waterSystem) {
        this.waterSystem.setWaterLevel(currentWaterLevel);
      }
    } else {
      // Fallback to simple tidal calculation if no moon
      const tidalPhase = (simulationTime % this.tidalPeriod) / this.tidalPeriod;
      this.params.tideLevel = 0.5 + 0.5 * Math.sin(tidalPhase * Math.PI * 2);
      currentWaterLevel = -1.0 + this.params.tideLevel * 2.5;
    }

    // Update moisture system
    if (this.moistureSystem) {
      // Apply water coverage where terrain is underwater
      this.moistureSystem.applyWaterCoverage(currentWaterLevel);

      // Update moisture (evaporation, drainage)
      this.moistureSystem.update(deltaTime, this.params.temperature);
    }

    // Temperature varies with time of day (simplified)
    const dailyCycle = (simulationTime % 1); // 0-1 for one day
    const basTemp = 15;
    const tempVariation = 5 * Math.sin(dailyCycle * Math.PI * 2 - Math.PI / 2);
    this.params.temperature = basTemp + tempVariation;

    // Dissolved oxygen inversely related to temperature
    this.params.dissolvedOxygen = 10 - (this.params.temperature - 10) * 0.2;

    // Update chemical properties visualization in tide pool water
    if (this.waterMesh) {
      // Update water level
      this.waterMesh.position.y = 0.2 + this.params.tideLevel * 0.6;

      // Update water color based on temperature and oxygen
      const waterMaterial = this.waterMesh.material as THREE.MeshPhysicalMaterial;

      // Temperature affects color: warmer = more green, colder = more blue
      const tempNormalized = (this.params.temperature - 10) / 10; // 0-1 range
      const waterColor = new THREE.Color();
      waterColor.setHSL(0.55 - tempNormalized * 0.1, 0.7, 0.5); // Shift from blue to cyan
      waterMaterial.color = waterColor;

      // Dissolved oxygen affects clarity/opacity
      const oxygenNormalized = (this.params.dissolvedOxygen - 4) / 6; // 0-1 range
      waterMaterial.opacity = 0.5 + oxygenNormalized * 0.2; // More oxygen = clearer
    }

    // Update ocean water based on salinity and pH
    if (this.waveMesh) {
      const waveMaterial = this.waveMesh.material as THREE.MeshPhysicalMaterial;
      // pH affects wave color slightly (more acidic = slightly greenish)
      const pHNormalized = (this.params.pH - 7.8) / 0.6; // 0-1 range
      const waveColor = new THREE.Color();
      waveColor.setHSL(0.55 + (1 - pHNormalized) * 0.05, 0.8, 0.55);
      waveMaterial.color = waveColor;
    }

    // Turbulence relates to tide change rate (now also considers real wave movement)
    // Derive tide change rate from tideLevel (rate is highest when tide is at 0.5)
    const tideChangeRate = 1 - Math.abs(this.params.tideLevel - 0.5) * 2;
    this.params.turbulence = 0.2 + Math.max(tideChangeRate, waveChangeRate) * 0.5;
  }

  getTideLevel(): number {
    return this.params.tideLevel;
  }

  getWaterLevel(): number {
    if (this.waterSystem) {
      return this.waterSystem.getWaterLevel();
    }
    return -1.0 + this.params.tideLevel * 2.5;
  }

  getMoonPhaseName(): string {
    if (this.moonSystem) {
      return this.moonSystem.getMoonPhaseName();
    }
    return 'Unknown';
  }

  getShoreMoisture(): number {
    if (this.moistureSystem) {
      return this.moistureSystem.getAverageShoreMoisture();
    }
    return 0;
  }

  getTemperature(): number {
    return this.params.temperature;
  }

  getParameters(): EnvironmentParameters {
    return { ...this.params };
  }

  getMode(): SimulationMode {
    return this._mode;
  }

  getTidalAmplitude(): number {
    return this._tidalAmplitude;
  }

  isSubmerged(position: THREE.Vector3): boolean {
    const waterLevel = 0.2 + this.params.tideLevel * 0.6;
    return position.y < waterLevel;
  }

  setMode(mode: SimulationMode) {
    this._mode = mode;
  }

  reset() {
    this.params = {
      temperature: 15,
      salinity: 33,
      pH: 8.1,
      dissolvedOxygen: 7.5,
      tideLevel: 0.7,
      turbulence: 0.3,
    };
    this.waveTimer = 0;
  }
}
