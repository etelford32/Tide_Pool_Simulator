import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Position } from './OrganismManager';

export interface EnvironmentParameters {
  temperature: number;
  salinity: number;
  pH: number;
  dissolvedOxygen: number;
  tideLevel: number;
  turbulence: number;
}

export abstract class Organism {
  protected speciesId: string;
  protected commonName: string;
  protected age: number = 0; // days
  protected size: number; // cm
  protected energy: number = 100; // 0-100
  protected health: number = 100; // 0-100

  protected rigidBody: RAPIER.RigidBody;
  protected mesh: THREE.Mesh;
  protected physicsWorld: PhysicsWorld;

  protected lastReproductionTime: number = 0;

  // Species-specific parameters (to be set by subclasses)
  protected maxAge: number = 365;
  protected maxSize: number = 10;
  protected growthRate: number = 0.1; // cm/day
  protected metabolismRate: number = 1; // energy/day
  protected reproductionCost: number = 30; // energy cost
  protected reproductionInterval: number = 30; // days

  constructor(
    speciesId: string,
    commonName: string,
    position: Position,
    physicsWorld: PhysicsWorld,
    initialSize: number
  ) {
    this.speciesId = speciesId;
    this.commonName = commonName;
    this.size = initialSize;
    this.physicsWorld = physicsWorld;

    // Create physics body
    this.rigidBody = this.createPhysicsBody(position);

    // Create visual mesh
    this.mesh = this.createMesh();
  }

  protected abstract createPhysicsBody(position: Position): RAPIER.RigidBody;
  protected abstract createMesh(): THREE.Mesh;
  protected abstract metabolize(
    deltaTime: number,
    env: EnvironmentParameters
  ): void;

  update(deltaTime: number, env: EnvironmentParameters) {
    this.age += deltaTime / 86400; // Convert seconds to days

    // Grow
    if (this.size < this.maxSize) {
      this.size = Math.min(
        this.maxSize,
        this.size + (this.growthRate * deltaTime) / 86400
      );
    }

    // Metabolize (species-specific)
    this.metabolize(deltaTime, env);

    // Apply stress from environment
    this.applyEnvironmentalStress(env);

    // Age-related decline
    if (this.age > this.maxAge * 0.8) {
      const ageFactor = (this.age - this.maxAge * 0.8) / (this.maxAge * 0.2);
      this.health -= ageFactor * 0.1 * deltaTime;
    }

    // Energy depletion leads to health loss
    if (this.energy < 20) {
      this.health -= (20 - this.energy) * 0.01 * deltaTime;
    }

    // Death from old age
    if (this.age > this.maxAge) {
      this.health = 0;
    }
  }

  protected applyEnvironmentalStress(env: EnvironmentParameters) {
    // Temperature stress (species-specific tolerances should override this)
    if (env.temperature < 5 || env.temperature > 30) {
      this.health -= 0.1;
    }

    // Low oxygen stress
    if (env.dissolvedOxygen < 4) {
      this.health -= (4 - env.dissolvedOxygen) * 0.05;
    }
  }

  syncVisual() {
    // Update mesh position to match physics body
    const position = this.rigidBody.translation();
    this.mesh.position.set(position.x, position.y, position.z);

    // Update mesh rotation
    const rotation = this.rigidBody.rotation();
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Update scale based on size
    const scale = this.size / 10; // Normalize to initial size
    this.mesh.scale.set(scale, scale, scale);
  }

  getPosition(): THREE.Vector3 {
    const pos = this.rigidBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  getSpeciesId(): string {
    return this.speciesId;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  // Predation methods (override in predator species)
  canPredate(): boolean {
    return false;
  }

  isPrey(speciesId: string): boolean {
    return false;
  }

  attemptPredation(prey: Organism, deltaTime: number): boolean {
    return false;
  }

  takeDamage(amount: number) {
    this.health -= amount;
  }

  // Reproduction
  checkReproduction(currentTime: number): Organism | null {
    // Override in subclasses
    return null;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  destroy() {
    // Remove from physics world
    this.physicsWorld.removeRigidBody(this.rigidBody);

    // Remove mesh from scene
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }

    // Dispose geometry and material
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
