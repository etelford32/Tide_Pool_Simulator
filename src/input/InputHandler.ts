/**
 * InputHandler - Manages keyboard input for player control
 *
 * Handles arrow key input for controlling the clownfish
 */
export class InputHandler {
  private keys: Map<string, boolean> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys.set(event.key, true);

    // Prevent arrow keys from scrolling the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys.set(event.key, false);
  }

  isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }

  /**
   * Get movement direction from arrow keys
   * Returns normalized direction vector {x, z}
   */
  getMovementDirection(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.isKeyPressed('ArrowLeft')) {
      x -= 1;
    }
    if (this.isKeyPressed('ArrowRight')) {
      x += 1;
    }
    if (this.isKeyPressed('ArrowUp')) {
      z -= 1;
    }
    if (this.isKeyPressed('ArrowDown')) {
      z += 1;
    }

    return { x, z };
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
