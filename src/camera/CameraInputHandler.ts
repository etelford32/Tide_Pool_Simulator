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

    // Space to reset camera
    if (event.key === ' ') {
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
    this.cameraController.onMouseMove(event);
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
    const fastMode = this.isKeyPressed('shift');
    const speed = fastMode ? this.fastModifier : 1.0;

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
