import RAPIER from '@dimforge/rapier3d';

export class PhysicsWorld {
  private world: RAPIER.World | null = null;
  private eventQueue: RAPIER.EventQueue | null = null;

  initialize() {
    // Create physics world with gravity
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);

    // Create event queue for collision detection
    this.eventQueue = new RAPIER.EventQueue(true);

    console.log('✓ Physics world created');
  }

  step(deltaTime: number) {
    if (!this.world) return;

    // Limit physics step to prevent instability
    const clampedDelta = Math.min(deltaTime, 0.1);
    this.world.step(this.eventQueue);
  }

  createRigidBody(desc: RAPIER.RigidBodyDesc): RAPIER.RigidBody {
    if (!this.world) throw new Error('Physics world not initialized');
    return this.world.createRigidBody(desc);
  }

  createCollider(
    desc: RAPIER.ColliderDesc,
    body: RAPIER.RigidBody
  ): RAPIER.Collider {
    if (!this.world) throw new Error('Physics world not initialized');
    return this.world.createCollider(desc, body);
  }

  removeRigidBody(body: RAPIER.RigidBody) {
    if (!this.world) return;
    this.world.removeRigidBody(body);
  }

  getWorld(): RAPIER.World {
    if (!this.world) throw new Error('Physics world not initialized');
    return this.world;
  }

  destroy() {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
  }
}
