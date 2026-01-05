import { CameraController } from './CameraController';

export class CameraInputHandler {
  private cameraController: CameraController;
  private keys: Map<string, boolean> = new Map();
  private canvas: HTMLElement;

  // Settings
  private keyPanSpeed: number = 0.3;
  private keyRotateSpeed: number = 2.0;
  private fastModifier: number = 2.5;

  constructor(cameraController: CameraController, canvas: HTMLElement) {
    this.cameraController = cameraController;
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });

    // Context menu (disable right-click menu for pan control)
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onKeyDown(event: KeyboardEvent) {
    // Don't capture keys if user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    this.keys.set(event.key.toLowerCase(), true);

    // Toggle camera mode with C key
    if (event.key.toLowerCase() === 'c') {
      event.preventDefault();
      const currentMode = this.cameraController.getMode();
      if (currentMode === 'orbit') {
        this.cameraController.setMode('freefly');
        console.log('📷 Switched to FREE-FLY mode (FPS controls)');
      } else {
        this.cameraController.setMode('orbit');
        console.log('📷 Switched to ORBIT mode');
      }
    }

    // Space to reset camera (orbit mode only)
    if (event.key === ' ' && this.cameraController.getMode() === 'orbit') {
      event.preventDefault();
      this.cameraController.applyPreset('default');
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys.set(event.key.toLowerCase(), false);
  }

  private onMouseDown(event: MouseEvent) {
    event.preventDefault();

    if (event.button === 0) {
      // Left click - orbit
      this.cameraController.onMouseDown(event, 'left');
    } else if (event.button === 1) {
      // Middle click - pan
      this.cameraController.onMouseDown(event, 'middle');
    } else if (event.button === 2) {
      // Right click - pan
      this.cameraController.onMouseDown(event, 'right');
    }
  }

  private onMouseMove(event: MouseEvent) {
    // In free-fly mode, use mouse movement for camera rotation
    if (this.cameraController.getMode() === 'freefly' && this.isKeyPressed('shift')) {
      const deltaX = event.movementX || 0;
      const deltaY = event.movementY || 0;
      this.cameraController.rotateFreefly(deltaX, deltaY);
    } else {
      // Orbit mode - use existing drag behavior
      this.cameraController.onMouseMove(event);
    }
  }

  private onMouseUp(_event: MouseEvent) {
    this.cameraController.onMouseUp();
  }

  private onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    this.cameraController.onMouseWheel(event);
  }

  private isKeyPressed(key: string): boolean {
    return this.keys.get(key) === true;
  }

  /**
   * Update camera based on keyboard input (call every frame)
   */
  update(_deltaTime: number) {
    const mode = this.cameraController.getMode();
    const fastMode = this.isKeyPressed('shift');
    const speed = fastMode ? this.fastModifier : 1.0;

    if (mode === 'freefly') {
      // Free-fly mode - FPS controls
      let forward = 0;
      let right = 0;
      let up = 0;

      // WASD movement
      if (this.isKeyPressed('w') || this.isKeyPressed('arrowup')) forward += 1;
      if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) forward -= 1;
      if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft')) right -= 1;
      if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) right += 1;

      // Vertical movement (Space = up, Ctrl = down)
      if (this.isKeyPressed(' ')) up += 1;
      if (this.isKeyPressed('control')) up -= 1;

      // Apply movement
      if (forward !== 0 || right !== 0 || up !== 0) {
        this.cameraController.moveFreefly(forward * speed, right * speed, up * speed);
      }
    } else {
      // Orbit mode - existing controls
      // Pan controls (WASD or Arrow keys)
      if (this.isKeyPressed('w') || this.isKeyPressed('arrowup')) {
        this.cameraController.pan(0, this.keyPanSpeed * speed);
      }
      if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) {
        this.cameraController.pan(0, -this.keyPanSpeed * speed);
      }
      if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft')) {
        this.cameraController.pan(-this.keyPanSpeed * speed, 0);
      }
      if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) {
        this.cameraController.pan(this.keyPanSpeed * speed, 0);
      }

      // Orbit controls (Q/E for horizontal rotation)
      if (this.isKeyPressed('q')) {
        this.cameraController.orbit(-this.keyRotateSpeed * speed, 0);
      }
      if (this.isKeyPressed('e')) {
        this.cameraController.orbit(this.keyRotateSpeed * speed, 0);
      }

      // Vertical orbit (R/F)
      if (this.isKeyPressed('r')) {
        this.cameraController.orbit(0, this.keyRotateSpeed * speed);
      }
      if (this.isKeyPressed('f')) {
        this.cameraController.orbit(0, -this.keyRotateSpeed * speed);
      }

      // Zoom (Z/X)
      if (this.isKeyPressed('z')) {
        this.cameraController.zoom(-50 * speed);
      }
      if (this.isKeyPressed('x')) {
        this.cameraController.zoom(50 * speed);
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.onMouseWheel.bind(this));
  }
}
