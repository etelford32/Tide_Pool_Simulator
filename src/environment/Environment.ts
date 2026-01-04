import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SimulationMode } from '../TidePoolSimulation';

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
  private mode: SimulationMode;
  private poolMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private oceanMesh: THREE.Mesh | null = null;
  private waveMesh: THREE.Mesh | null = null;

  // Tidal parameters
  private tidalPeriod = 0.5; // days (12 hours for semi-diurnal tide)
  private tidalAmplitude = 0.5; // meters

  // Real-time wave animation
  private waveTimer = 0; // seconds
  private waveCycleDuration = 360; // 6 minutes total (3 min high, 3 min low)
  private waveBasePosition = 10; // Base Z position
  private waveAmplitude = 8; // How far waves move in/out

  constructor(mode: SimulationMode) {
    this.mode = mode;
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
    // Create ocean at the bottom of the screen
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

  private createCliffBeach(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
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

  update(simulationTime: number, deltaTime: number, realDeltaTime?: number) {
    // Use real deltaTime for wave animation if provided, otherwise use simulation deltaTime
    const waveDeltaTime = realDeltaTime !== undefined ? realDeltaTime : deltaTime;

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

    // Update tidal cycle (for tide pool water level)
    const tidalPhase = (simulationTime % this.tidalPeriod) / this.tidalPeriod;
    this.params.tideLevel = 0.5 + 0.5 * Math.sin(tidalPhase * Math.PI * 2);

    // Update water level visually in tide pool
    if (this.waterMesh) {
      this.waterMesh.position.y = 0.2 + this.params.tideLevel * 0.6;
    }

    // Temperature varies with time of day (simplified)
    const dailyCycle = (simulationTime % 1); // 0-1 for one day
    const basTemp = 15;
    const tempVariation = 5 * Math.sin(dailyCycle * Math.PI * 2 - Math.PI / 2);
    this.params.temperature = basTemp + tempVariation;

    // Dissolved oxygen inversely related to temperature
    this.params.dissolvedOxygen = 10 - (this.params.temperature - 10) * 0.2;

    // Turbulence relates to tide change rate (now also considers real wave movement)
    const tideChangeRate = Math.abs(Math.cos(tidalPhase * Math.PI * 2));
    const waveChangeRate = Math.abs(Math.cos(wavePhase * Math.PI * 2));
    this.params.turbulence = 0.2 + Math.max(tideChangeRate, waveChangeRate) * 0.5;
  }

  getTideLevel(): number {
    return this.params.tideLevel;
  }

  getTemperature(): number {
    return this.params.temperature;
  }

  getParameters(): EnvironmentParameters {
    return { ...this.params };
  }

  isSubmerged(position: THREE.Vector3): boolean {
    const waterLevel = 0.2 + this.params.tideLevel * 0.6;
    return position.y < waterLevel;
  }

  setMode(mode: SimulationMode) {
    this.mode = mode;
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
