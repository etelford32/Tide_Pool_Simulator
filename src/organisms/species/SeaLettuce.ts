import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

export class SeaLettuce extends Organism {
  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('sea_lettuce', 'Sea Lettuce', position, physicsWorld, 5);

    this.maxAge = 180;
    this.maxSize = 30;
    this.growthRate = 0.5;
    this.metabolismRate = 0.5;
    this.reproductionInterval = 30;
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(5.0); // High damping for plant-like movement

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.05, 0.2)
      .setDensity(0.5)
      .setFriction(0.8);

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Create leaf-like geometry
    const geometry = new THREE.PlaneGeometry(0.3, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7CFC00, // Bright green
      side: THREE.DoubleSide,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  protected metabolize(deltaTime: number, env: EnvironmentParameters) {
    // Photosynthesis - gains energy from light (simplified)
    // Assume light is available during high tide and warm temperatures
    const lightIntensity = env.tideLevel * (1 - (Math.abs(env.temperature - 15) / 20));
    const photosynthesisRate = Math.max(0, lightIntensity * 2); // energy per day

    this.energy += (photosynthesisRate * deltaTime) / 86400;
    this.energy = Math.min(100, this.energy);

    // Basic metabolism
    this.energy -= (this.metabolismRate * deltaTime) / 86400;
    this.energy = Math.max(0, this.energy);
  }

  checkReproduction(currentTime: number): Organism | null {
    if (
      this.energy > 70 &&
      this.age > 10 &&
      currentTime - this.lastReproductionTime > this.reproductionInterval
    ) {
      this.energy -= this.reproductionCost;
      this.lastReproductionTime = currentTime;

      // Spawn nearby
      const pos = this.getPosition();
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        0,
        (Math.random() - 0.5) * 1
      );

      return new SeaLettuce(
        {
          x: pos.x + offset.x,
          y: pos.y + offset.y,
          z: pos.z + offset.z,
        },
        this.physicsWorld
      );
    }

    return null;
  }
}
