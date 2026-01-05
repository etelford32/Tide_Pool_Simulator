import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Organism, EnvironmentParameters } from '../Organism';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Position } from '../OrganismManager';
import { Clownfish } from './Clownfish';

/**
 * Sea Anemone - Protective home for the clownfish
 *
 * A living, defensive structure that provides shelter for the clownfish.
 * Has shocking tentacles that damage other organisms on contact.
 */
export class SeaAnemoneHome extends Organism {
  private maxHealth: number = 150;
  private shockDamage: number = 5; // Damage per second
  private shockRadius: number = 0.5; // Detection radius
  private tentacleAnimation: number = 0;

  // Track what entities are in contact (reserved for future use)
  private _entitiesInContact: Set<string> = new Set();

  constructor(position: Position, physicsWorld: PhysicsWorld) {
    super('sea_anemone_home', 'Sea Anemone Home', position, physicsWorld, 15);

    this.maxAge = 18250; // 50 years
    this.maxSize = 25; // 25cm wide
    this.growthRate = 0.005;
    this.metabolismRate = 0.8;
    this.health = 150;
  }

  protected createPhysicsBody(position: Position): RAPIER.RigidBody {
    // Anemone is fixed in place (sessile)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Circular base with collision detection
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.2, 0.4)
      .setDensity(1.0)
      .setFriction(0.8)
      .setSensor(true); // Sensor for detecting overlaps without physical collision

    this.physicsWorld.createCollider(colliderDesc, body);

    return body;
  }

  protected createMesh(): THREE.Mesh {
    // Create anemone body (column)
    const group = new THREE.Group();

    // Base/column
    const columnGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.4, 16);
    const columnMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4789, // Purple
      roughness: 0.7,
      metalness: 0.1,
    });
    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.y = 0;
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);

    // Tentacles (multiple cylinders radiating out)
    const tentacleCount = 12;
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const tentacleGeometry = new THREE.CylinderGeometry(0.02, 0.04, 0.3, 8);
      const tentacleMaterial = new THREE.MeshStandardMaterial({
        color: 0xDA70D6, // Orchid pink
        roughness: 0.6,
      });
      const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);

      // Position and angle tentacles
      tentacle.position.x = Math.cos(angle) * 0.25;
      tentacle.position.y = 0.3;
      tentacle.position.z = Math.sin(angle) * 0.25;

      tentacle.rotation.x = Math.PI / 6; // Tilt outward
      tentacle.rotation.y = angle;

      tentacle.castShadow = true;
      group.add(tentacle);
    }

    // Use group as mesh
    const mesh = new THREE.Mesh();
    mesh.add(group);

    return mesh;
  }

  protected metabolize(_deltaTime: number, env: EnvironmentParameters) {
    // Anemones gain energy from photosynthesis (zooxanthellae)
    if (env.tideLevel > 0.3) {
      this.energy += (0.5 * _deltaTime) / 86400;
    }

    // Slow metabolism
    this.energy -= (this.metabolismRate * _deltaTime) / 86400;
    this.energy = Math.max(0, Math.min(100, this.energy));
  }

  update(deltaTime: number, env: EnvironmentParameters) {
    super.update(deltaTime, env);

    // Animate tentacles (gentle wave motion)
    this.tentacleAnimation += deltaTime;
    if (this.mesh.children.length > 0) {
      const group = this.mesh.children[0];
      group.children.forEach((child, index) => {
        if (index > 0) { // Skip the column
          const wave = Math.sin(this.tentacleAnimation * 2 + index * 0.5) * 0.1;
          child.rotation.x = Math.PI / 6 + wave;
        }
      });
    }
  }

  /**
   * Check for organisms in shock radius and damage them
   */
  checkShockDamage(organisms: Organism[], deltaTime: number) {
    const anemonePos = this.getPosition();

    for (const organism of organisms) {
      if (organism === this) continue;

      // Clownfish are immune!
      if (organism instanceof Clownfish && organism.isImmuneToAnemone()) {
        continue;
      }

      const distance = organism.getPosition().distanceTo(anemonePos);

      if (distance < this.shockRadius) {
        // Entity is within shock radius - apply damage
        const damage = this.shockDamage * deltaTime;
        organism.takeDamage(damage);

        // Visual feedback could be added here (electric particles, etc.)
      }
    }
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
      console.log('💀 Sea Anemone has died!');
    }
  }

  heal(amount: number) {
    this.health += amount;
    this.health = Math.min(this.maxHealth, this.health);
  }

  getShockRadius(): number {
    return this.shockRadius;
  }

  getEntitiesInContact(): Set<string> {
    return this._entitiesInContact;
  }

  // No reproduction for anemone home
  checkReproduction(_currentTime: number): Organism | null {
    return null;
  }
}
