import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

export class OchreSeaStar extends Organism {
  private movementTimer: number = 0;
  private movementDirection: THREE.Vector3;
  private preySpecies = ['limpet', 'acorn_barnacle']; // What this star eats

  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('ochre_sea_star', 'Ochre Sea Star', position, physicsWorld, 12);

    this.maxAge = 7300; // 20 years
    this.maxSize = 25;
    this.growthRate = 0.01;
    this.metabolismRate = 2.0;
    this.reproductionInterval = 365;

    this.movementDirection = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize();
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(6.0);

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Create collider - star shape approximated as circle
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.1, 0.4)
      .setDensity(1.0)
      .setFriction(1.5);

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Create star shape using cylinder with textured appearance
    const geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF4500, // Orange-red (ochre)
      roughness: 0.8,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  protected metabolize(deltaTime: number, _env: EnvironmentParameters) {
    // Sea stars have higher metabolism
    this.energy -= (this.metabolismRate * deltaTime) / 86400;

    // Clamp energy
    this.energy = Math.max(0, Math.min(100, this.energy));
  }

  update(deltaTime: number, env: EnvironmentParameters) {
    super.update(deltaTime, env);

    // Slow crawling movement
    this.movementTimer += deltaTime;

    if (this.movementTimer > 8) {
      // Change direction every 8 seconds
      this.movementDirection = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize();
      this.movementTimer = 0;
    }

    // Apply movement force
    const movementSpeed = 0.01;
    this.rigidBody.applyImpulse(
      {
        x: this.movementDirection.x * movementSpeed,
        y: 0,
        z: this.movementDirection.z * movementSpeed,
      },
      true
    );
  }

  canPredate(): boolean {
    return this.energy < 90; // Hunt when hungry
  }

  isPrey(speciesId: string): boolean {
    return this.preySpecies.includes(speciesId);
  }

  attemptPredation(prey: Organism, deltaTime: number): boolean {
    // Predation takes time - simplified as probability
    const predationChance = 0.1 * deltaTime; // 10% per second when in range

    if (Math.random() < predationChance) {
      // Successful predation
      prey.takeDamage(100); // Kill prey
      this.energy = Math.min(100, this.energy + 40); // Gain energy
      console.log(`Sea star consumed ${prey.getSpeciesId()}`);
      return true;
    }

    return false;
  }

  protected applyEnvironmentalStress(env: EnvironmentParameters) {
    super.applyEnvironmentalStress(env);

    // Sea stars are sensitive to desiccation
    if (env.tideLevel < 0.3) {
      this.health -= 0.2;
    }
  }

  checkReproduction(currentTime: number): Organism | null {
    if (
      this.energy > 85 &&
      this.age > 730 &&
      currentTime - this.lastReproductionTime > this.reproductionInterval
    ) {
      this.energy -= this.reproductionCost * 2; // Reproduction is costly
      this.lastReproductionTime = currentTime;

      const pos = this.getPosition();
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        0,
        (Math.random() - 0.5) * 3
      );

      return new OchreSeaStar(
        {
          x: pos.x + offset.x,
          y: 0.2,
          z: pos.z + offset.z,
        },
        this.physicsWorld
      );
    }

    return null;
  }
}
