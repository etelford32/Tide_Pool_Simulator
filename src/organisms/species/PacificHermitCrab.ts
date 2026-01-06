import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
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

  // Articulated body parts for animation
  private bodyGroup: THREE.Group = new THREE.Group();
  private legs: THREE.Group[] = [];
  private claws: THREE.Group[] = [];
  private eyeStalks: THREE.Group[] = [];

  // Animation state
  private walkCycle: number = 0;
  private isMoving: boolean = false;

  // Gender and visual differences
  private gender: 'male' | 'female';
  private eggFlaps: THREE.Group[] = []; // For females

  // Profile/personality data
  public profile: {
    name: string;
    personality: string;
    favoriteFood: string;
    shellPreference: string;
    mood: string;
  };

  constructor(position: Position, physicsWorld: PhysicsWorld, gender?: 'male' | 'female') {
    super('pacific_hermit_crab', 'Pacific Hermit Crab', position, physicsWorld, 2);

    this.maxAge = 3650; // 10 years
    this.maxSize = 3; // 3cm body + shell
    this.growthRate = 0.002;
    this.metabolismRate = 1.5;
    this.reproductionInterval = 180;

    // Assign gender (random if not specified)
    this.gender = gender || (Math.random() > 0.5 ? 'male' : 'female');

    // Set name and personality based on gender
    this.profile = {
      name: this.gender === 'male' ? "Sheldon" : "Shelley",
      personality: this.gender === 'male' ? "Curious and adventurous" : "Graceful and nurturing",
      favoriteFood: this.gender === 'male' ? "Dried kelp bits" : "Fresh algae",
      shellPreference: "Spotted turban shells",
      mood: "Content",
    };

    // Set body group name (already initialized at property level)
    this.bodyGroup.name = 'CrabBodyGroup';

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
    // Create main body sphere
    const bodyGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6347, // Orangish-red body
      roughness: 0.7,
      metalness: 0.1,
    });

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;

    // Add body to group
    this.bodyGroup.add(bodyMesh);

    // Create articulated legs (4 pairs = 8 legs)
    this.createLegs();

    // Create claws (2 claws, right one larger)
    this.createClaws();

    // Create eye stalks (2)
    this.createEyeStalks();

    // Create egg flaps for females (pleopods/swimmerets)
    if (this.gender === 'female') {
      this.createEggFlaps();
    }

    // Return the body mesh (physics will attach to this)
    return bodyMesh;
  }

  private createLegs() {
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF4500, // Orange-red
      roughness: 0.8,
      metalness: 0.05,
    });

    // 4 pairs of legs (8 total)
    const legPositions = [
      { x: 0.06, z: 0.04, angle: Math.PI / 6 },     // Right front
      { x: 0.06, z: 0.02, angle: Math.PI / 4 },     // Right mid-front
      { x: 0.06, z: -0.02, angle: Math.PI / 3 },    // Right mid-back
      { x: 0.06, z: -0.04, angle: Math.PI / 2.5 },  // Right back
      { x: -0.06, z: 0.04, angle: -Math.PI / 6 },   // Left front
      { x: -0.06, z: 0.02, angle: -Math.PI / 4 },   // Left mid-front
      { x: -0.06, z: -0.02, angle: -Math.PI / 3 },  // Left mid-back
      { x: -0.06, z: -0.04, angle: -Math.PI / 2.5 },// Left back
    ];

    legPositions.forEach((pos) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, -0.02, pos.z);

      // Upper leg segment
      const upperLegGeom = new THREE.CylinderGeometry(0.008, 0.01, 0.08, 6);
      const upperLeg = new THREE.Mesh(upperLegGeom, legMaterial);
      upperLeg.rotation.z = pos.angle;
      upperLeg.position.y = -0.02;
      upperLeg.castShadow = true;
      legGroup.add(upperLeg);

      // Lower leg segment (bent joint)
      const lowerLegGeom = new THREE.CylinderGeometry(0.006, 0.008, 0.06, 6);
      const lowerLeg = new THREE.Mesh(lowerLegGeom, legMaterial);
      lowerLeg.rotation.z = pos.angle * 0.7;
      const lowerOffset = Math.sin(pos.angle) * 0.04;
      lowerLeg.position.set(lowerOffset, -0.06, 0);
      lowerLeg.castShadow = true;
      legGroup.add(lowerLeg);

      // Foot (tiny tip)
      const footGeom = new THREE.SphereGeometry(0.005, 4, 4);
      const foot = new THREE.Mesh(footGeom, legMaterial);
      foot.position.set(lowerOffset + Math.sin(pos.angle) * 0.03, -0.09, 0);
      foot.castShadow = true;
      legGroup.add(foot);

      this.legs.push(legGroup);
      this.bodyGroup.add(legGroup);
    });
  }

  private createClaws() {
    const clawMaterial = new THREE.MeshStandardMaterial({
      color: 0xDC143C, // Crimson red
      roughness: 0.7,
      metalness: 0.15,
    });

    // Right claw (larger - dominant)
    const rightClawGroup = this.createSingleClaw(clawMaterial, 1.2, true);
    rightClawGroup.position.set(0.08, 0, 0.05);
    this.claws.push(rightClawGroup);
    this.bodyGroup.add(rightClawGroup);

    // Left claw (smaller)
    const leftClawGroup = this.createSingleClaw(clawMaterial, 0.9, false);
    leftClawGroup.position.set(-0.08, 0, 0.05);
    this.claws.push(leftClawGroup);
    this.bodyGroup.add(leftClawGroup);
  }

  private createSingleClaw(material: THREE.MeshStandardMaterial, scale: number, isRight: boolean): THREE.Group {
    const clawGroup = new THREE.Group();

    // Claw arm
    const armGeom = new THREE.CylinderGeometry(0.012 * scale, 0.015 * scale, 0.06 * scale, 8);
    const arm = new THREE.Mesh(armGeom, material);
    arm.rotation.z = isRight ? Math.PI / 6 : -Math.PI / 6;
    arm.position.y = -0.01;
    arm.castShadow = true;
    clawGroup.add(arm);

    // Claw pincer base
    const pincerBaseGeom = new THREE.SphereGeometry(0.02 * scale, 8, 8);
    const pincerBase = new THREE.Mesh(pincerBaseGeom, material);
    const pincerX = isRight ? 0.02 * scale : -0.02 * scale;
    pincerBase.position.set(pincerX, -0.04, 0.03);
    pincerBase.castShadow = true;
    clawGroup.add(pincerBase);

    // Upper pincer
    const upperPincerGeom = new THREE.BoxGeometry(0.025 * scale, 0.008 * scale, 0.035 * scale);
    const upperPincer = new THREE.Mesh(upperPincerGeom, material);
    upperPincer.position.set(pincerX, -0.03, 0.05);
    upperPincer.rotation.x = -Math.PI / 8;
    upperPincer.castShadow = true;
    clawGroup.add(upperPincer);

    // Lower pincer
    const lowerPincerGeom = new THREE.BoxGeometry(0.025 * scale, 0.008 * scale, 0.035 * scale);
    const lowerPincer = new THREE.Mesh(lowerPincerGeom, material);
    lowerPincer.position.set(pincerX, -0.05, 0.05);
    lowerPincer.rotation.x = Math.PI / 8;
    lowerPincer.castShadow = true;
    clawGroup.add(lowerPincer);

    return clawGroup;
  }

  private createEyeStalks() {
    const eyeStalkMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6347,
      roughness: 0.6,
      metalness: 0.1,
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Right eye stalk
    const rightEyeGroup = new THREE.Group();
    const rightStalk = new THREE.CylinderGeometry(0.004, 0.006, 0.04, 6);
    const rightStalkMesh = new THREE.Mesh(rightStalk, eyeStalkMaterial);
    rightStalkMesh.position.set(0.03, 0.06, 0.04);
    rightStalkMesh.rotation.z = -Math.PI / 8;
    rightStalkMesh.castShadow = true;
    rightEyeGroup.add(rightStalkMesh);

    const rightEye = new THREE.SphereGeometry(0.008, 8, 8);
    const rightEyeMesh = new THREE.Mesh(rightEye, eyeMaterial);
    rightEyeMesh.position.set(0.03, 0.08, 0.04);
    rightEyeMesh.castShadow = true;
    rightEyeGroup.add(rightEyeMesh);

    this.eyeStalks.push(rightEyeGroup);
    this.bodyGroup.add(rightEyeGroup);

    // Left eye stalk
    const leftEyeGroup = new THREE.Group();
    const leftStalk = new THREE.CylinderGeometry(0.004, 0.006, 0.04, 6);
    const leftStalkMesh = new THREE.Mesh(leftStalk, eyeStalkMaterial);
    leftStalkMesh.position.set(-0.03, 0.06, 0.04);
    leftStalkMesh.rotation.z = Math.PI / 8;
    leftStalkMesh.castShadow = true;
    leftEyeGroup.add(leftStalkMesh);

    const leftEye = new THREE.SphereGeometry(0.008, 8, 8);
    const leftEyeMesh = new THREE.Mesh(leftEye, eyeMaterial);
    leftEyeMesh.position.set(-0.03, 0.08, 0.04);
    leftEyeMesh.castShadow = true;
    leftEyeGroup.add(leftEyeMesh);

    this.eyeStalks.push(leftEyeGroup);
    this.bodyGroup.add(leftEyeGroup);
  }

  private createEggFlaps() {
    // Pleopods/swimmerets - small flaps on the underside for carrying eggs
    const flapMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6B9D, // Pinkish for egg flaps
      roughness: 0.6,
      metalness: 0.1,
    });

    // 4 pairs of egg flaps (pleopods)
    const flapPositions = [
      { x: 0.04, z: -0.01, side: 1 },  // Right pair 1
      { x: -0.04, z: -0.01, side: -1 }, // Left pair 1
      { x: 0.04, z: -0.03, side: 1 },  // Right pair 2
      { x: -0.04, z: -0.03, side: -1 }, // Left pair 2
      { x: 0.04, z: -0.05, side: 1 },  // Right pair 3
      { x: -0.04, z: -0.05, side: -1 }, // Left pair 3
      { x: 0.04, z: -0.07, side: 1 },  // Right pair 4
      { x: -0.04, z: -0.07, side: -1 }, // Left pair 4
    ];

    flapPositions.forEach((pos) => {
      const flapGroup = new THREE.Group();
      flapGroup.position.set(pos.x, -0.08, pos.z);

      // Create flap (small oval-ish shape)
      const flapGeom = new THREE.BoxGeometry(0.02, 0.002, 0.03);
      const flap = new THREE.Mesh(flapGeom, flapMaterial);
      flap.rotation.x = Math.PI / 6; // Angle slightly
      flap.rotation.z = pos.side * Math.PI / 8;
      flap.castShadow = true;
      flapGroup.add(flap);

      this.eggFlaps.push(flapGroup);
      this.bodyGroup.add(flapGroup);
    });
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

    // Check velocity to determine if actually moving
    const velocity = this.rigidBody.linvel();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    this.isMoving = speed > 0.01;

    // Update mood based on activity
    switch (this.currentActivity) {
      case 'grooming':
        this.profile.mood = "Grooming happily";
        this.isMoving = false;

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
        this.profile.mood = "Bathing blissfully";
        this.isMoving = false;

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
        this.profile.mood = this.hunger > 70 ? "Searching desperately" : "Foraging curiously";

        // Move around looking for food
        if (!this.movementTarget || this.movementTarget.distanceTo(currentPos) < 0.3) {
          // Pick new random target on the sand (stay grounded)
          this.movementTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            0.1, // Stay on sand level
            (Math.random() - 0.5) * 8
          );
        }

        // Move toward target (scuttling!)
        const direction = this.movementTarget.clone().sub(currentPos).normalize();
        this.rigidBody.applyImpulse(
          {
            x: direction.x * this.movementSpeed * 1.5, // Increased speed for better scuttling
            y: 0,
            z: direction.z * this.movementSpeed * 1.5,
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
          this.profile.mood = "Munching happily";
        }
        break;

      case 'shell_seeking':
        this.profile.mood = "Seeking upgrade";
        this.isMoving = true;

        // Look for better shell (simplified - just improve current shell)
        if (Math.random() < 0.1 * deltaTime) {
          // Found a better shell!
          this.shellQuality += 20;
          this.shellQuality = Math.min(100, this.shellQuality);
          this.happiness += 15;
          this.currentActivity = 'resting';
          this.profile.mood = "Delighted with new shell!";
        }
        break;

      case 'resting':
        this.profile.mood = this.happiness > 70 ? "Content" : "Resting quietly";
        this.isMoving = false;

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

    const pos = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    // Update body group position
    if (this.bodyGroup) {
      this.bodyGroup.position.set(pos.x, pos.y, pos.z);
      this.bodyGroup.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    // Update shell position to follow body
    if (this.shellMesh) {
      this.shellMesh.position.set(pos.x, pos.y + 0.1, pos.z);
      this.shellMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    // Animate legs if moving (scuttling animation!)
    this.animateScuttling();
  }

  private animateScuttling() {
    if (!this.isMoving) {
      // Reset legs to neutral position when not moving
      this.legs.forEach((leg) => {
        leg.rotation.y = 0;
        leg.rotation.x = 0;
      });
      return;
    }

    // Scuttling animation - alternating leg pairs
    this.walkCycle += 0.15;

    this.legs.forEach((leg, index) => {
      // Legs move in pairs, alternating left/right
      const isRightSide = index < 4;
      const pairIndex = index % 4;

      // Create wave motion down the legs
      const phase = this.walkCycle + (pairIndex * Math.PI / 4);

      // Scuttling motion (side-to-side and up-down)
      if (isRightSide) {
        leg.rotation.y = Math.sin(phase) * 0.3;
        leg.rotation.x = Math.cos(phase) * 0.2;
      } else {
        leg.rotation.y = Math.sin(phase + Math.PI) * 0.3;
        leg.rotation.x = Math.cos(phase + Math.PI) * 0.2;
      }
    });

    // Subtle claw movement when walking
    this.claws.forEach((claw, i) => {
      const phase = this.walkCycle + (i * Math.PI);
      claw.rotation.z = Math.sin(phase) * 0.1;
    });

    // Eye stalks bob slightly
    this.eyeStalks.forEach((eye, i) => {
      const phase = this.walkCycle + (i * Math.PI / 2);
      eye.rotation.x = Math.sin(phase) * 0.05;
    });
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getBodyGroup(): THREE.Group {
    return this.bodyGroup;
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

  getGender(): 'male' | 'female' {
    return this.gender;
  }

  getLastGroomTime(): number {
    return this._lastGroomTime;
  }

  getLastBathTime(): number {
    return this._lastBathTime;
  }

  destroy() {
    super.destroy();

    // Remove and dispose body group (includes legs, claws, eyes)
    if (this.bodyGroup && this.bodyGroup.parent) {
      this.bodyGroup.parent.remove(this.bodyGroup);
    }

    // Dispose all body parts
    this.bodyGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

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

      // Offspring gender is random (not specified, will be assigned in constructor)
      return new PacificHermitCrab(
        {
          x: pos.x + offset.x,
          y: 0.5,
          z: pos.z + offset.z,
        },
        this.physicsWorld
        // Gender parameter omitted - will be random
      );
    }

    return null;
  }
}
