import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

/**
 * Clownfish - Player-controlled main character
 *
 * The hero of our tide pool story! A small, agile clownfish that
 * the player controls with arrow keys. Protected by its anemone home.
 */
export class Clownfish extends Organism {
  // Player controls
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private swimSpeed: number = 0.15; // Fast and responsive
  private maxHealth: number = 100;

  // Home relationship
  private anemoneHomeId: string | null = null;

  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('clownfish', 'Clownfish (Player)', position, physicsWorld, 4);

    this.maxAge = 3650; // 10 years
    this.maxSize = 8; // 8cm
    this.growthRate = 0.01;
    this.metabolismRate = 2.0;
    this.health = 100;
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(4.0) // Smooth water resistance
      .setAngularDamping(2.0);

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Fish-shaped collider
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.15, 0.08)
      .setDensity(0.9) // Slightly buoyant
      .setFriction(0.3);

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Clownfish body - orange with white stripes
    const geometry = new THREE.CapsuleGeometry(0.08, 0.3, 8, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF6B35, // Bright orange
      roughness: 0.4,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add white stripes
    const stripeGeometry = new THREE.RingGeometry(0.07, 0.09, 16);
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.5,
    });

    const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe1.position.z = 0.1;
    stripe1.rotation.x = Math.PI / 2;
    mesh.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe2.position.z = -0.05;
    stripe2.rotation.x = Math.PI / 2;
    mesh.add(stripe2);

    return mesh;
  }

  protected metabolize(_deltaTime: number, _env: EnvironmentParameters) {
    // Clownfish metabolism is handled separately
    // Energy decreases slowly
    this.energy -= (this.metabolismRate * _deltaTime) / 86400;
    this.energy = Math.max(0, Math.min(100, this.energy));
  }

  /**
   * Set movement direction from player input
   */
  setMoveDirection(x: number, z: number) {
    this.moveDirection.set(x, 0, z);
    if (this.moveDirection.length() > 0) {
      this.moveDirection.normalize();
    }
  }

  update(deltaTime: number, env: EnvironmentParameters) {
    super.update(deltaTime, env);

    // Apply player movement
    if (this.moveDirection.length() > 0) {
      this.rigidBody.applyImpulse(
        {
          x: this.moveDirection.x * this.swimSpeed * deltaTime,
          y: 0,
          z: this.moveDirection.z * this.swimSpeed * deltaTime,
        },
        true
      );

      // Rotate to face movement direction
      const angle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      const targetQuat = { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) };

      // Smooth rotation
      this.rigidBody.setRotation(targetQuat, true);
    }

    // Stay within bounds (tide pool)
    const pos = this.rigidBody.translation();
    const maxDist = 4.5;
    if (Math.sqrt(pos.x * pos.x + pos.z * pos.z) > maxDist) {
      // Push back toward center
      const pushDir = new THREE.Vector3(-pos.x, 0, -pos.z).normalize();
      this.rigidBody.applyImpulse(
        {
          x: pushDir.x * 0.5,
          y: 0,
          z: pushDir.z * 0.5,
        },
        true
      );
    }

    // Keep at swimming height
    if (pos.y < 0.3) {
      this.rigidBody.setTranslation({ x: pos.x, y: 0.3, z: pos.z }, true);
    } else if (pos.y > 1.5) {
      this.rigidBody.setTranslation({ x: pos.x, y: 1.5, z: pos.z }, true);
    }
  }

  setAnemoneHome(anemoneId: string) {
    this.anemoneHomeId = anemoneId;
  }

  getAnemoneHomeId(): string | null {
    return this.anemoneHomeId;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    this.health = Math.max(0, this.health);

    if (this.health <= 0) {
      console.log('💀 Clownfish has died!');
    }
  }

  heal(amount: number) {
    this.health += amount;
    this.health = Math.min(this.maxHealth, this.health);
  }

  // Clownfish is immune to anemone shock
  isImmuneToAnemone(): boolean {
    return true;
  }

  // No reproduction for player character
  checkReproduction(_currentTime: number): Organism | null {
    return null;
  }
}
