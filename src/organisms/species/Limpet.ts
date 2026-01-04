import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

export class Limpet extends Organism {
  private movementTimer: number = 0;
  private movementDirection: THREE.Vector3;

  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('limpet', 'Limpet', position, physicsWorld, 3);

    this.maxAge = 5475; // 15 years
    this.maxSize = 6;
    this.growthRate = 0.002;
    this.metabolismRate = 0.8;
    this.reproductionInterval = 90;

    this.movementDirection = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize();
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(8.0); // Slow movement

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.05, 0.1)
      .setDensity(1.2)
      .setFriction(2.0); // High friction to stay in place

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Cone-like shell shape
    const geometry = new THREE.ConeGeometry(0.12, 0.08, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B7355, // Brown
      roughness: 0.9,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI; // Point down
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  protected metabolize(deltaTime: number, env: EnvironmentParameters) {
    // Grazes on algae film (simplified - just gains energy slowly)
    const grazingRate = 1.0;
    this.energy += (grazingRate * deltaTime) / 86400;

    // Basic metabolism
    this.energy -= (this.metabolismRate * deltaTime) / 86400;

    // Clamp energy
    this.energy = Math.max(0, Math.min(100, this.energy));
  }

  update(deltaTime: number, env: EnvironmentParameters) {
    super.update(deltaTime, env);

    // Slow crawling movement
    this.movementTimer += deltaTime;

    if (this.movementTimer > 5) {
      // Change direction every 5 seconds
      this.movementDirection = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize();
      this.movementTimer = 0;
    }

    // Apply small movement force
    const movementSpeed = 0.005; // Very slow
    this.rigidBody.applyImpulse(
      {
        x: this.movementDirection.x * movementSpeed,
        y: 0,
        z: this.movementDirection.z * movementSpeed,
      },
      true
    );
  }

  checkReproduction(currentTime: number): Organism | null {
    if (
      this.energy > 75 &&
      this.age > 365 &&
      currentTime - this.lastReproductionTime > this.reproductionInterval
    ) {
      this.energy -= this.reproductionCost;
      this.lastReproductionTime = currentTime;

      const pos = this.getPosition();
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      );

      return new Limpet(
        {
          x: pos.x + offset.x,
          y: 0.1,
          z: pos.z + offset.z,
        },
        this.physicsWorld
      );
    }

    return null;
  }
}
