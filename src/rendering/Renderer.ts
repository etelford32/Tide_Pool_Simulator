import * as THREE from 'three';

export class Renderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private sunLight: THREE.DirectionalLight;
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;

  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Atmospheric fog for 5-mile shoreline (1000m to 5000m)
    this.scene.fog = new THREE.Fog(0x87ceeb, 1000, 5000);

    // Create camera - extended far plane for horizon view
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000 // Extended to see 8km+ distances
    );
    // Start at beach level to see Sheldon & Shelley!
    // They're at around (-30, 0.5, 25) and (-25, 0.5, 28)
    this.camera.position.set(-30, 15, 0); // 15m up, looking at beach from shore
    this.camera.lookAt(-27, 0, 26); // Look at the crabs' location

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096; // Increased for larger world
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 5000; // Extended for horizon
    this.sunLight.shadow.camera.left = -2000; // Expanded for 8km world
    this.sunLight.shadow.camera.right = 2000;
    this.sunLight.shadow.camera.top = 2000;
    this.sunLight.shadow.camera.bottom = -2000;
    this.scene.add(this.sunLight);

    // Add hemisphere light for better ambient lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1e3a5f, 0.3);
    this.scene.add(hemiLight);

    // Create visual sun at the top of the screen
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.position.set(10, 20, 5);
    this.scene.add(this.sunMesh);

    // Add sun glow effect
    const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
    });
    this.sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sunGlow.position.set(10, 20, 5);
    this.scene.add(this.sunGlow);
  }

  async initialize() {
    // Attach to DOM
    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    console.log('✓ Renderer initialized');
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  updateLighting(timeOfDay: number, weather: 'sunny' | 'cloudy' | 'stormy') {
    // Adjust sun position based on time of day (0-1)
    const angle = timeOfDay * Math.PI * 2;
    this.sunLight.position.x = Math.cos(angle) * 15;
    this.sunLight.position.y = Math.sin(angle) * 10 + 10;

    // Update visual sun position to match light
    this.sunMesh.position.x = this.sunLight.position.x;
    this.sunMesh.position.y = this.sunLight.position.y;
    this.sunGlow.position.x = this.sunLight.position.x;
    this.sunGlow.position.y = this.sunLight.position.y;

    // Adjust intensity based on weather
    switch (weather) {
      case 'sunny':
        this.sunLight.intensity = 0.8;
        this.ambientLight.intensity = 0.5;
        break;
      case 'cloudy':
        this.sunLight.intensity = 0.4;
        this.ambientLight.intensity = 0.6;
        break;
      case 'stormy':
        this.sunLight.intensity = 0.2;
        this.ambientLight.intensity = 0.4;
        break;
    }
  }

  destroy() {
    this.renderer.dispose();
  }
}
