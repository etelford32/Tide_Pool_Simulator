import * as THREE from 'three';

/**
 * Moon system for tidal simulation and visual representation
 * Simulates lunar cycle and generates tidal forces
 */
export class MoonSystem {
  private scene: THREE.Scene;
  private moonMesh: THREE.Mesh | null = null;
  private moonLight: THREE.PointLight | null = null;

  // Moon orbital parameters
  private orbitRadius: number = 100; // Distance from scene center
  private orbitHeight: number = 50; // Height above horizon
  private orbitSpeed: number = 1.0; // Degrees per day (full cycle = 360 days)

  // Moon properties
  private moonRadius: number = 3.5;
  private moonPhase: number = 0; // 0-1 (new moon to full moon)

  // Time tracking
  private lunarCycle: number = 29.5; // Days (synodic month)
  private currentPhase: number = 0; // Current position in lunar cycle (0-1)

  // Tidal calculation
  private tidalStrength: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createMoon();
  }

  /**
   * Create moon mesh with realistic appearance
   */
  private createMoon() {
    // Create moon geometry
    const geometry = new THREE.SphereGeometry(this.moonRadius, 32, 32);

    // Create moon material with emission for glow
    const material = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      emissive: 0x444444,
      emissiveIntensity: 0.3,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.moonMesh = new THREE.Mesh(geometry, material);

    // Create moonlight
    this.moonLight = new THREE.PointLight(0xaabbff, 0.5, 200);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;

    // Add moon and light to scene
    this.scene.add(this.moonMesh);
    this.scene.add(this.moonLight);

    // Initial position
    this.updatePosition(0);

    console.log('✓ Moon system created');
  }

  /**
   * Update moon position based on time
   */
  private updatePosition(simulationTime: number) {
    if (!this.moonMesh || !this.moonLight) return;

    // Calculate angle based on simulation time (in days)
    const angle = (simulationTime * this.orbitSpeed * Math.PI * 2) / 360;

    // Position moon in circular orbit
    const x = Math.cos(angle) * this.orbitRadius;
    const y = this.orbitHeight + Math.sin(angle * 0.5) * 10; // Slight vertical oscillation
    const z = Math.sin(angle) * this.orbitRadius;

    this.moonMesh.position.set(x, y, z);
    this.moonLight.position.copy(this.moonMesh.position);

    // Update moon phase (relative to sun position)
    // Simplified: phase changes with orbit
    this.currentPhase = (simulationTime % this.lunarCycle) / this.lunarCycle;
    this.moonPhase = this.currentPhase;

    // Update moon appearance based on phase
    this.updateMoonAppearance();
  }

  /**
   * Update moon appearance based on lunar phase
   */
  private updateMoonAppearance() {
    if (!this.moonMesh) return;

    const material = this.moonMesh.material as THREE.MeshStandardMaterial;

    // Full moon is brightest, new moon is dimmest
    const brightness = 0.5 + 0.5 * Math.sin(this.moonPhase * Math.PI * 2);
    material.emissiveIntensity = 0.2 + brightness * 0.4;

    // Adjust moonlight intensity
    if (this.moonLight) {
      this.moonLight.intensity = 0.3 + brightness * 0.4;
    }
  }

  /**
   * Calculate tidal force at current time
   * Returns a value between 0 (low tide) and 1 (high tide)
   */
  calculateTidalForce(simulationTime: number): number {
    // Tidal force is strongest during new moon and full moon (spring tides)
    // Weakest during quarter moons (neap tides)

    // Two high tides and two low tides per day (semi-diurnal)
    const dailyCycle = (simulationTime % 1) * 2; // 0-2 for two cycles per day
    const dailyTide = Math.sin(dailyCycle * Math.PI);

    // Lunar cycle affects amplitude (spring vs neap tides)
    const lunarPhaseEffect = Math.abs(Math.cos(this.moonPhase * Math.PI * 2));
    const springNeapFactor = 0.7 + 0.3 * lunarPhaseEffect; // 0.7-1.0

    // Combine daily and lunar effects
    const tidalForce = 0.5 + 0.5 * dailyTide * springNeapFactor;

    return tidalForce * this.tidalStrength;
  }

  /**
   * Get current moon phase (0 = new moon, 0.5 = full moon, 1 = new moon)
   */
  getMoonPhase(): number {
    return this.moonPhase;
  }

  /**
   * Get moon phase name
   */
  getMoonPhaseName(): string {
    const phase = this.moonPhase;

    if (phase < 0.0625 || phase >= 0.9375) return 'New Moon';
    if (phase < 0.1875) return 'Waxing Crescent';
    if (phase < 0.3125) return 'First Quarter';
    if (phase < 0.4375) return 'Waxing Gibbous';
    if (phase < 0.5625) return 'Full Moon';
    if (phase < 0.6875) return 'Waning Gibbous';
    if (phase < 0.8125) return 'Last Quarter';
    return 'Waning Crescent';
  }

  /**
   * Get moon position in world space
   */
  getMoonPosition(): THREE.Vector3 {
    return this.moonMesh ? this.moonMesh.position.clone() : new THREE.Vector3();
  }

  /**
   * Set tidal strength (0-2, where 1 is normal)
   */
  setTidalStrength(strength: number) {
    this.tidalStrength = Math.max(0, Math.min(2, strength));
  }

  /**
   * Update moon system
   */
  update(simulationTime: number) {
    this.updatePosition(simulationTime);
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.moonMesh) {
      this.scene.remove(this.moonMesh);
      this.moonMesh.geometry.dispose();
      (this.moonMesh.material as THREE.Material).dispose();
    }
    if (this.moonLight) {
      this.scene.remove(this.moonLight);
    }
  }
}
