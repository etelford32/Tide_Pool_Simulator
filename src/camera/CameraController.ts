import * as THREE from 'three';

export type CameraMode = 'orbit' | 'freefly';
export type CameraPreset = 'default' | 'top' | 'side' | 'front' | 'isometric' | 'follow';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  distance: number;
  azimuth: number; // Horizontal rotation (degrees)
  elevation: number; // Vertical rotation (degrees)
  roll: number; // Camera roll (degrees)
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private mode: CameraMode = 'orbit';

  // Current state
  private distance: number = 15;
  private azimuth: number = 45; // degrees
  private elevation: number = 30; // degrees
  private roll: number = 0;

  // Free-fly mode state
  private yaw: number = 0; // degrees (horizontal rotation)
  private pitch: number = 0; // degrees (vertical rotation)
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed: number = 10; // units per second
  private lookSpeed: number = 0.2; // degrees per pixel

  // Transition interpolation
  private targetState: CameraState | null = null;
  private transitionProgress: number = 1.0;
  private transitionDuration: number = 1.0; // seconds

  // Mouse state
  private isDragging: boolean = false;
  private dragMode: 'orbit' | 'pan' | null = null;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Settings
  private minDistance: number = 3;
  private maxDistance: number = 50;
  private orbitSpeed: number = 0.3;
  private panSpeed: number = 0.01;
  private zoomSpeed: number = 0.002;

  // Damping for smooth movement
  private dampingFactor: number = 0.1;
  private targetDistance: number = 15;
  private targetAzimuth: number = 45;
  private targetElevation: number = 30;
  private targetTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0);

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 2, 0);
    this.targetTarget.copy(this.target);
    this.targetDistance = this.distance;
    this.targetAzimuth = this.azimuth;
    this.targetElevation = this.elevation;
    this.updateCameraPosition();
  }

  /**
   * Update camera position based on spherical coordinates
   */
  private updateCameraPosition() {
    const azimuthRad = THREE.MathUtils.degToRad(this.azimuth);
    const elevationRad = THREE.MathUtils.degToRad(this.elevation);

    // Spherical to Cartesian coordinates
    const x = this.target.x + this.distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = this.target.y + this.distance * Math.sin(elevationRad);
    const z = this.target.z + this.distance * Math.cos(elevationRad) * Math.sin(azimuthRad);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);

    // Apply roll
    if (this.roll !== 0) {
      const rollRad = THREE.MathUtils.degToRad(this.roll);
      this.camera.rotation.z = rollRad;
    }
  }

  /**
   * Set camera mode
   */
  setMode(mode: CameraMode) {
    this.mode = mode;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Orbit camera (rotate around target)
   */
  orbit(deltaAzimuth: number, deltaElevation: number) {
    this.targetAzimuth += deltaAzimuth * this.orbitSpeed;
    this.targetElevation += deltaElevation * this.orbitSpeed;

    // Clamp elevation to prevent gimbal lock
    this.targetElevation = Math.max(-89, Math.min(89, this.targetElevation));
  }

  /**
   * Pan camera (move target)
   */
  pan(deltaX: number, deltaY: number) {
    const azimuthRad = THREE.MathUtils.degToRad(this.azimuth);

    // Calculate right and up vectors
    const right = new THREE.Vector3(
      -Math.sin(azimuthRad),
      0,
      Math.cos(azimuthRad)
    );
    const up = new THREE.Vector3(0, 1, 0);

    // Move target
    this.targetTarget.addScaledVector(right, -deltaX * this.panSpeed * this.distance);
    this.targetTarget.addScaledVector(up, deltaY * this.panSpeed * this.distance);
  }

  /**
   * Move camera in free-fly mode (FPS style)
   * @param direction - normalized direction vector in camera space
   */
  moveFreefly(forward: number, right: number, up: number) {
    if (this.mode !== 'freefly') return;

    // Calculate camera's forward and right vectors
    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    const forwardVec = new THREE.Vector3(
      Math.sin(yawRad),
      0,
      Math.cos(yawRad)
    );
    const rightVec = new THREE.Vector3(
      Math.cos(yawRad),
      0,
      -Math.sin(yawRad)
    );
    const upVec = new THREE.Vector3(0, 1, 0);

    // Apply movement to velocity
    this.velocity.add(forwardVec.multiplyScalar(forward * this.moveSpeed));
    this.velocity.add(rightVec.multiplyScalar(right * this.moveSpeed));
    this.velocity.add(upVec.multiplyScalar(up * this.moveSpeed));
  }

  /**
   * Rotate camera in free-fly mode (mouse look)
   */
  rotateFreefly(deltaX: number, deltaY: number) {
    if (this.mode !== 'freefly') return;

    this.yaw += deltaX * this.lookSpeed;
    this.pitch -= deltaY * this.lookSpeed;

    // Clamp pitch to prevent gimbal lock
    this.pitch = Math.max(-89, Math.min(89, this.pitch));
  }

  /**
   * Update camera position/rotation for free-fly mode
   */
  private updateFreeflyPosition(deltaTime: number) {
    // Apply velocity to position
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    this.camera.position.add(movement);

    // Apply damping to velocity
    this.velocity.multiplyScalar(0.85);

    // Update camera rotation based on yaw and pitch
    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    const pitchRad = THREE.MathUtils.degToRad(this.pitch);

    // Calculate look direction
    const lookDir = new THREE.Vector3(
      Math.sin(yawRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      Math.cos(yawRad) * Math.cos(pitchRad)
    );

    // Update camera rotation to look in that direction
    const lookAt = this.camera.position.clone().add(lookDir);
    this.camera.lookAt(lookAt);
  }

  /**
   * Zoom camera (change distance)
   */
  zoom(delta: number) {
    this.targetDistance += delta * this.zoomSpeed * this.distance;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  /**
   * Set zoom level directly
   */
  setZoom(distance: number) {
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }

  /**
   * Roll camera
   */
  setRoll(roll: number) {
    this.roll = roll;
  }

  /**
   * Apply camera preset
   */
  applyPreset(preset: CameraPreset, followTarget?: THREE.Vector3) {
    const duration = 1.0; // seconds

    switch (preset) {
      case 'top':
        this.transitionTo({
          position: new THREE.Vector3(this.target.x, this.target.y + 20, this.target.z),
          target: this.target.clone(),
          distance: 20,
          azimuth: 0,
          elevation: 89,
          roll: 0,
        }, duration);
        break;

      case 'side':
        this.transitionTo({
          position: new THREE.Vector3(this.target.x + 15, this.target.y + 5, this.target.z),
          target: this.target.clone(),
          distance: 15,
          azimuth: 0,
          elevation: 20,
          roll: 0,
        }, duration);
        break;

      case 'front':
        this.transitionTo({
          position: new THREE.Vector3(this.target.x, this.target.y + 5, this.target.z + 15),
          target: this.target.clone(),
          distance: 15,
          azimuth: 90,
          elevation: 20,
          roll: 0,
        }, duration);
        break;

      case 'isometric':
        this.transitionTo({
          position: new THREE.Vector3(this.target.x + 10, this.target.y + 10, this.target.z + 10),
          target: this.target.clone(),
          distance: 17.3,
          azimuth: 45,
          elevation: 35.26,
          roll: 0,
        }, duration);
        break;

      case 'follow':
        if (followTarget) {
          this.targetTarget.copy(followTarget);
          this.targetDistance = 5;
          this.targetAzimuth = 45;
          this.targetElevation = 30;
        }
        break;

      case 'default':
        this.transitionTo({
          position: new THREE.Vector3(-6, 10, 15),
          target: new THREE.Vector3(0, 2, 0),
          distance: 18.4,
          azimuth: 336,
          elevation: 33,
          roll: 0,
        }, duration);
        break;
    }
  }

  /**
   * Smooth transition to a camera state
   */
  private transitionTo(state: CameraState, duration: number) {
    this.targetState = state;
    this.transitionProgress = 0;
    this.transitionDuration = duration;
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: MouseEvent, button: 'left' | 'right' | 'middle') {
    this.isDragging = true;
    this.dragMode = button === 'left' ? 'orbit' : 'pan';
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging || !this.dragMode) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    if (this.dragMode === 'orbit') {
      this.orbit(deltaX, -deltaY);
    } else if (this.dragMode === 'pan') {
      this.pan(deltaX, deltaY);
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Handle mouse up event
   */
  onMouseUp() {
    this.isDragging = false;
    this.dragMode = null;
  }

  /**
   * Handle mouse wheel event
   */
  onMouseWheel(event: WheelEvent) {
    this.zoom(event.deltaY);
  }

  /**
   * Get current target position
   */
  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * Set target position
   */
  setTarget(target: THREE.Vector3) {
    this.targetTarget.copy(target);
  }

  /**
   * Update camera (called every frame)
   */
  update(deltaTime: number) {
    // Handle transitions
    if (this.targetState && this.transitionProgress < 1.0) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      this.transitionProgress = Math.min(1.0, this.transitionProgress);

      // Ease-in-out interpolation
      const t = this.transitionProgress;
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Interpolate target
      this.target.lerpVectors(this.target, this.targetState.target, eased);
      this.distance = THREE.MathUtils.lerp(this.distance, this.targetState.distance, eased);
      this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.targetState.azimuth, eased);
      this.elevation = THREE.MathUtils.lerp(this.elevation, this.targetState.elevation, eased);
      this.roll = THREE.MathUtils.lerp(this.roll, this.targetState.roll, eased);

      this.updateCameraPosition();

      if (this.transitionProgress >= 1.0) {
        this.targetState = null;
      }

      return;
    }

    // Handle different camera modes
    if (this.mode === 'freefly') {
      this.updateFreeflyPosition(deltaTime);
    } else {
      // Orbit mode - smooth damping
      this.distance = THREE.MathUtils.lerp(this.distance, this.targetDistance, this.dampingFactor);
      this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.targetAzimuth, this.dampingFactor);
      this.elevation = THREE.MathUtils.lerp(this.elevation, this.targetElevation, this.dampingFactor);
      this.target.lerp(this.targetTarget, this.dampingFactor);

      this.updateCameraPosition();
    }
  }

  /**
   * Get camera state for saving
   */
  getState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.target.clone(),
      distance: this.distance,
      azimuth: this.azimuth,
      elevation: this.elevation,
      roll: this.roll,
    };
  }

  /**
   * Restore camera state
   */
  setState(state: CameraState) {
    this.target.copy(state.target);
    this.targetTarget.copy(state.target);
    this.distance = state.distance;
    this.targetDistance = state.distance;
    this.azimuth = state.azimuth;
    this.targetAzimuth = state.azimuth;
    this.elevation = state.elevation;
    this.targetElevation = state.elevation;
    this.roll = state.roll;
    this.updateCameraPosition();
  }
}
