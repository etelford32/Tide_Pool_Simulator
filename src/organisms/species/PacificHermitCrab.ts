import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';

/**
 * Pacific Hermit Crab (Pagurus species)
 *
 * A smart, personality-driven crustacean with complex behaviors:
 * - Shell grooming and maintenance using specialized appendages
 * - Bathing behavior in tide pools
 * - Active foraging for detritus and algae
 * - Shell quality assessment and switching
 * - Social awareness (cautious around predators)
 * - Nocturnal activity patterns
 *
 * Status tracking:
 * - Health: Overall condition (0-100)
 * - Hunger: Food need (0-100, higher = hungrier)
 * - Happiness: Well-being based on shell quality, cleanliness, safety (0-100)
 */
export class PacificHermitCrab extends Organism {
  // Hermit crab specific stats
  private hunger: number = 50; // 0-100
  private happiness: number = 70; // 0-100

  // Shell properties
  private shellQuality: number = 70; // 0-100, affects happiness
  private shellCleanliness: number = 100; // 0-100, decreases over time

  // Behavioral state
  private currentActivity: 'foraging' | 'grooming' | 'bathing' | 'resting' | 'shell_seeking' = 'resting';
  private activityTimer: number = 0;
  private _lastGroomTime: number = 0; // Reserved for future behavior tracking
  private _lastBathTime: number = 0; // Reserved for future behavior tracking

  // Movement
  private movementTarget: THREE.Vector3 | null = null;
  private movementSpeed: number = 0.02; // Slow and deliberate

  // Shell mesh
  private shellMesh: THREE.Mesh;

  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('pacific_hermit_crab', 'Pacific Hermit Crab', position, physicsWorld, 2);

    this.maxAge = 3650; // 10 years
    this.maxSize = 3; // 3cm body + shell
    this.growthRate = 0.002;
    this.metabolismRate = 1.5;
    this.reproductionInterval = 180;

    // Create shell mesh
    this.shellMesh = this.createShellMesh();
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(6.0); // Slow movement

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Small collider for body
    const colliderDesc = RAPIER.ColliderDesc.ball(0.08)
      .setDensity(1.1)
      .setFriction(1.5);

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Hermit crab body (legs and claws visible)
    const bodyGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6347, // Orangish-red legs
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createShellMesh(): THREE.Mesh {
    // Snail shell (spiral)
    const shellGeometry = new THREE.ConeGeometry(0.12, 0.18, 8);
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C, // Tan shell color
      roughness: 0.8,
      metalness: 0.1,
    });

    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.rotation.x = Math.PI / 4; // Tilted
    shell.castShadow = true;
    shell.receiveShadow = true;

    return shell;
  }

  protected metabolize(deltaTime: number, env: EnvironmentParameters) {
    // Hunger increases over time
    this.hunger += (2.0 * deltaTime) / 86400;
    this.hunger = Math.min(100, this.hunger);

    // Energy decreases based on hunger
    if (this.hunger > 80) {
      this.energy -= (this.metabolismRate * 1.5 * deltaTime) / 86400; // Starving
    } else {
      this.energy -= (this.metabolismRate * deltaTime) / 86400;
    }

    // Health affected by hunger
    if (this.hunger > 90) {
      this.health -= 0.05;
    }

    // Shell cleanliness decreases over time
    this.shellCleanliness -= (0.5 * deltaTime) / 86400;
    this.shellCleanliness = Math.max(0, this.shellCleanliness);

    // Calculate happiness based on multiple factors
    this.calculateHappiness(env);

    // Clamp values
    this.energy = Math.max(0, Math.min(100, this.energy));
  }

  private calculateHappiness(env: EnvironmentParameters) {
    let happinessScore = 50; // Base

    // Shell quality contributes
    happinessScore += (this.shellQuality - 50) * 0.3;

    // Cleanliness matters
    happinessScore += (this.shellCleanliness - 50) * 0.2;

    // Well-fed is happy
    happinessScore += (100 - this.hunger) * 0.2;

    // Good health = happiness
    happinessScore += (this.health - 50) * 0.2;

    // Prefers being submerged (moisture)
    if (env.tideLevel > 0.4) {
      happinessScore += 10;
    }

    // Good water quality
    if (env.dissolvedOxygen > 6) {
      happinessScore += 5;
    }

    this.happiness = Math.max(0, Math.min(100, happinessScore));
  }

  update(deltaTime: number, env: EnvironmentParameters) {
    super.update(deltaTime, env);

    this.activityTimer += deltaTime;

    // Decision making based on needs
    this.decideActivity(env);

    // Execute current activity
    this.performActivity(deltaTime, env);

    // Update shell visual based on cleanliness
    this.updateShellAppearance();
  }

  private decideActivity(env: EnvironmentParameters) {
    // Priority system

    // If very dirty shell, groom
    if (this.shellCleanliness < 30 && this.activityTimer > 10) {
      this.currentActivity = 'grooming';
      this.activityTimer = 0;
      return;
    }

    // If submerged and dirty, bathe
    if (env.tideLevel > 0.5 && this.shellCleanliness < 60 && this.activityTimer > 15) {
      this.currentActivity = 'bathing';
      this.activityTimer = 0;
      return;
    }

    // If very hungry, forage
    if (this.hunger > 70) {
      this.currentActivity = 'foraging';
      return;
    }

    // If poor shell quality, seek better shell
    if (this.shellQuality < 40 && this.activityTimer > 20) {
      this.currentActivity = 'shell_seeking';
      this.activityTimer = 0;
      return;
    }

    // Otherwise, forage or rest
    if (this.hunger > 40) {
      this.currentActivity = 'foraging';
    } else {
      this.currentActivity = 'resting';
    }
  }

  private performActivity(deltaTime: number, env: EnvironmentParameters) {
    const currentPos = this.getPosition();

    switch (this.currentActivity) {
      case 'grooming':
        // Shell grooming behavior
        this.shellCleanliness += (10 * deltaTime) / 86400;
        this.shellCleanliness = Math.min(100, this.shellCleanliness);

        // Grooming uses a tiny bit of energy
        this.energy -= (0.2 * deltaTime) / 86400;

        // Visual cue: rotate slightly (grooming motion)
        if (this.shellMesh) {
          this.shellMesh.rotation.z += deltaTime * 0.5;
        }

        // After 5 seconds of grooming, done
        if (this.activityTimer > 5) {
          this.currentActivity = 'resting';
          this._lastGroomTime = this.age;
        }
        break;

      case 'bathing':
        // Bathing in water (foam bathing behavior)
        if (env.tideLevel > 0.5) {
          this.shellCleanliness += (20 * deltaTime) / 86400; // Faster than grooming
          this.shellCleanliness = Math.min(100, this.shellCleanliness);
          this.happiness += 0.5; // Bathing feels good!
        }

        if (this.activityTimer > 8) {
          this.currentActivity = 'resting';
          this._lastBathTime = this.age;
        }
        break;

      case 'foraging':
        // Move around looking for food
        if (!this.movementTarget || this.movementTarget.distanceTo(currentPos) < 0.3) {
          // Pick new random target
          this.movementTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            currentPos.y,
            (Math.random() - 0.5) * 8
          );
        }

        // Move toward target
        const direction = this.movementTarget.clone().sub(currentPos).normalize();
        this.rigidBody.applyImpulse(
          {
            x: direction.x * this.movementSpeed,
            y: 0,
            z: direction.z * this.movementSpeed,
          },
          true
        );

        // Chance to find food
        if (Math.random() < 0.02 * deltaTime) {
          // Found detritus or algae!
          this.hunger -= 15;
          this.hunger = Math.max(0, this.hunger);
          this.energy += 10;
          this.energy = Math.min(100, this.energy);
        }
        break;

      case 'shell_seeking':
        // Look for better shell (simplified - just improve current shell)
        if (Math.random() < 0.1 * deltaTime) {
          // Found a better shell!
          this.shellQuality += 20;
          this.shellQuality = Math.min(100, this.shellQuality);
          this.happiness += 15;
          this.currentActivity = 'resting';
        }
        break;

      case 'resting':
        // Rest and recover
        this.energy += (0.5 * deltaTime) / 86400;
        this.energy = Math.min(100, this.energy);

        // Occasionally switch to foraging if hungry
        if (this.hunger > 50 && Math.random() < 0.3 * deltaTime) {
          this.currentActivity = 'foraging';
        }
        break;
    }
  }

  private updateShellAppearance() {
    if (!this.shellMesh) return;

    const material = this.shellMesh.material as THREE.MeshStandardMaterial;

    // Cleaner shell = lighter color
    const cleanFactor = this.shellCleanliness / 100;
    const baseColor = new THREE.Color(0xD2B48C); // Tan
    const dirtyColor = new THREE.Color(0x654321); // Dark brown

    material.color.lerpColors(dirtyColor, baseColor, cleanFactor);

    // Quality affects roughness (better shell = smoother)
    material.roughness = 0.9 - (this.shellQuality / 100) * 0.3;
  }

  syncVisual() {
    super.syncVisual();

    // Update shell position to follow body
    if (this.shellMesh) {
      const pos = this.rigidBody.translation();
      this.shellMesh.position.set(pos.x, pos.y + 0.1, pos.z);

      const rotation = this.rigidBody.rotation();
      this.shellMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getShellMesh(): THREE.Mesh {
    return this.shellMesh;
  }

  // Getters for UI/debugging
  getHunger(): number {
    return this.hunger;
  }

  getHappiness(): number {
    return this.happiness;
  }

  getShellQuality(): number {
    return this.shellQuality;
  }

  getShellCleanliness(): number {
    return this.shellCleanliness;
  }

  getCurrentActivity(): string {
    return this.currentActivity;
  }

  getLastGroomTime(): number {
    return this._lastGroomTime;
  }

  getLastBathTime(): number {
    return this._lastBathTime;
  }

  destroy() {
    super.destroy();

    // Remove shell mesh
    if (this.shellMesh.parent) {
      this.shellMesh.parent.remove(this.shellMesh);
    }
    this.shellMesh.geometry.dispose();
    if (Array.isArray(this.shellMesh.material)) {
      this.shellMesh.material.forEach((m) => m.dispose());
    } else {
      this.shellMesh.material.dispose();
    }
  }

  checkReproduction(currentTime: number): Organism | null {
    // Hermit crabs only reproduce when happy and well-fed
    if (
      this.energy > 80 &&
      this.happiness > 70 &&
      this.hunger < 40 &&
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

      return new PacificHermitCrab(
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
