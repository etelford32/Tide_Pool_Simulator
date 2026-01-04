import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

export class AcornBarnacle extends Organism {
  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('acorn_barnacle', 'Acorn Barnacle', position, physicsWorld, 0.5);

    this.maxAge = 365;
    this.maxSize = 2;
    this.growthRate = 0.01;
    this.metabolismRate = 0.3;
    this.reproductionInterval = 60;
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    // Barnacles are sessile (fixed in place)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.cone(0.1, 0.05)
      .setDensity(1.5)
      .setFriction(1.0);

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Cone shape for barnacle
    const geometry = new THREE.ConeGeometry(0.08, 0.12, 6);
    const material = new THREE.MeshStandardMaterial({
      color: 0xE8E8E8, // Off-white
      roughness: 0.9,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  protected metabolize(deltaTime: number, env: EnvironmentParameters) {
    // Filter feeding - gains energy when submerged with water flow
    if (env.tideLevel > 0.3) {
      const feedingRate = env.turbulence * 1.5; // More flow = more food
      this.energy += (feedingRate * deltaTime) / 86400;
    } else {
      // Exposed to air - no feeding
      this.energy -= (this.metabolismRate * 2 * deltaTime) / 86400;
    }

    // Clamp energy
    this.energy = Math.max(0, Math.min(100, this.energy));

    // Basic metabolism
    this.energy -= (this.metabolismRate * deltaTime) / 86400;
  }

  protected applyEnvironmentalStress(env: EnvironmentParameters) {
    super.applyEnvironmentalStress(env);

    // Desiccation stress when exposed at low tide
    if (env.tideLevel < 0.2) {
      this.health -= 0.05;
    }
  }

  checkReproduction(currentTime: number): Organism | null {
    if (
      this.energy > 80 &&
      this.age > 30 &&
      currentTime - this.lastReproductionTime > this.reproductionInterval
    ) {
      this.energy -= this.reproductionCost;
      this.lastReproductionTime = currentTime;

      // Barnacle larvae settle nearby
      const pos = this.getPosition();
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      );

      return new AcornBarnacle(
        {
          x: pos.x + offset.x,
          y: 0.05,
          z: pos.z + offset.z,
        },
        this.physicsWorld
      );
    }

    return null;
  }
}
