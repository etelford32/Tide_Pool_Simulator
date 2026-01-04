import * as THREE from 'three';

export class Renderer {
  public scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private sunLight: THREE.DirectionalLight;

  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

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
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.scene.add(this.sunLight);

    // Add hemisphere light for better ambient lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1e3a5f, 0.3);
    this.scene.add(hemiLight);
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
