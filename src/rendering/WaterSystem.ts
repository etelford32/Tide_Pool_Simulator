import * as THREE from 'three';
import { FieldMatrix3D } from '../physics/FieldMatrix3D';

/**
 * Advanced water rendering system with realistic waves and physics
 */
export class WaterSystem {
  private scene: THREE.Scene;
  private waterMesh: THREE.Mesh | null = null;
  private fieldMatrix: FieldMatrix3D;
  private waterMaterial: THREE.ShaderMaterial;

  // Water properties
  private waterLevel: number = 0;
  private waveAmplitude: number = 0.3;
  private waveFrequency: number = 0.5;
  private waveSpeed: number = 1.0;

  // Mesh resolution
  private resolution: number = 128;

  // Time for animation
  private time: number = 0;

  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.scene = scene;

    // Create field matrix for wave simulation
    const fieldResolution = new THREE.Vector3(64, 16, 64);
    this.fieldMatrix = new FieldMatrix3D(bounds, fieldResolution);

    // Create water material with custom shaders
    this.waterMaterial = this.createWaterMaterial();

    // Create water mesh
    this.createWaterMesh(bounds);

    // Initialize some waves
    this.initializeWaves();
  }

  /**
   * Create custom shader material for realistic water
   */
  private createWaterMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        waterColor: { value: new THREE.Color(0x0077be) },
        foamColor: { value: new THREE.Color(0xffffff) },
        deepWaterColor: { value: new THREE.Color(0x001e3c) },
        lightDirection: { value: new THREE.Vector3(1, 1, 0).normalize() },
        cameraPosition: { value: new THREE.Vector3() },
        waveAmplitude: { value: this.waveAmplitude },
        waveFrequency: { value: this.waveFrequency },
        waveSpeed: { value: this.waveSpeed },
      },
      vertexShader: `
        uniform float time;
        uniform float waveAmplitude;
        uniform float waveFrequency;
        uniform float waveSpeed;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;
        varying vec2 vUv;

        // Gerstner wave function for realistic ocean waves
        vec3 gerstnerWave(vec3 pos, vec2 direction, float amplitude, float wavelength, float speed) {
          float k = 2.0 * 3.14159 / wavelength;
          float c = speed;
          float a = amplitude;
          float f = k * (dot(direction, pos.xz) - c * time);

          float height = a * sin(f);
          vec2 horizontal = a * k * direction * cos(f);

          return vec3(horizontal.x, height, horizontal.y);
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Multiple Gerstner waves for complex surface
          vec3 wave1 = gerstnerWave(pos, vec2(1.0, 0.0), waveAmplitude * 0.8, 4.0, waveSpeed);
          vec3 wave2 = gerstnerWave(pos, vec2(0.7, 0.7), waveAmplitude * 0.5, 3.0, waveSpeed * 0.8);
          vec3 wave3 = gerstnerWave(pos, vec2(-0.5, 0.8), waveAmplitude * 0.3, 2.5, waveSpeed * 1.2);
          vec3 wave4 = gerstnerWave(pos, vec2(0.3, -0.9), waveAmplitude * 0.2, 1.5, waveSpeed * 1.5);

          // Combine waves
          vec3 displacement = wave1 + wave2 + wave3 + wave4;
          pos += displacement;

          vPosition = pos;
          vWaveHeight = displacement.y;

          // Calculate normal by sampling nearby points
          vec3 posRight = position + vec3(0.1, 0.0, 0.0);
          vec3 posForward = position + vec3(0.0, 0.0, 0.1);

          posRight += gerstnerWave(posRight, vec2(1.0, 0.0), waveAmplitude * 0.8, 4.0, waveSpeed);
          posRight += gerstnerWave(posRight, vec2(0.7, 0.7), waveAmplitude * 0.5, 3.0, waveSpeed * 0.8);
          posRight += gerstnerWave(posRight, vec2(-0.5, 0.8), waveAmplitude * 0.3, 2.5, waveSpeed * 1.2);
          posRight += gerstnerWave(posRight, vec2(0.3, -0.9), waveAmplitude * 0.2, 1.5, waveSpeed * 1.5);

          posForward += gerstnerWave(posForward, vec2(1.0, 0.0), waveAmplitude * 0.8, 4.0, waveSpeed);
          posForward += gerstnerWave(posForward, vec2(0.7, 0.7), waveAmplitude * 0.5, 3.0, waveSpeed * 0.8);
          posForward += gerstnerWave(posForward, vec2(-0.5, 0.8), waveAmplitude * 0.3, 2.5, waveSpeed * 1.2);
          posForward += gerstnerWave(posForward, vec2(0.3, -0.9), waveAmplitude * 0.2, 1.5, waveSpeed * 1.5);

          vec3 tangent = posRight - pos;
          vec3 bitangent = posForward - pos;
          vNormal = normalize(cross(tangent, bitangent));

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform vec3 deepWaterColor;
        uniform vec3 lightDirection;
        uniform vec3 cameraPosition;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;
        varying vec2 vUv;

        void main() {
          // Fresnel effect - water is more transparent when viewed from above
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);

          // Depth-based color mixing
          float depth = clamp(-vPosition.y / 5.0, 0.0, 1.0);
          vec3 baseColor = mix(waterColor, deepWaterColor, depth);

          // Lighting
          float diffuse = max(dot(vNormal, lightDirection), 0.0);

          // Specular highlights (sun reflection)
          vec3 reflectDir = reflect(-lightDirection, vNormal);
          float specular = pow(max(dot(viewDirection, reflectDir), 0.0), 64.0);

          // Foam on wave peaks
          float foamFactor = smoothstep(0.2, 0.4, vWaveHeight);
          vec3 color = mix(baseColor, foamColor, foamFactor * 0.5);

          // Combine lighting
          color = color * (0.4 + 0.6 * diffuse);
          color += vec3(specular * 0.5);

          // Fresnel blending for sky reflection
          color = mix(color, vec3(0.5, 0.7, 0.9), fresnel * 0.3);

          // Transparency based on fresnel
          float alpha = 0.85 + fresnel * 0.15;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Create water mesh
   */
  private createWaterMesh(bounds: THREE.Box3) {
    const size = new THREE.Vector3();
    bounds.getSize(size);

    // Create high-resolution plane for smooth waves
    const geometry = new THREE.PlaneGeometry(
      size.x,
      size.z,
      this.resolution,
      this.resolution
    );

    // Rotate to horizontal
    geometry.rotateX(-Math.PI / 2);

    // Position at water level
    this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterMesh.position.set(
      bounds.min.x + size.x / 2,
      this.waterLevel,
      bounds.min.z + size.z / 2
    );

    // Enable shadows
    this.waterMesh.receiveShadow = true;
    this.waterMesh.castShadow = false;

    this.scene.add(this.waterMesh);
  }

  /**
   * Initialize wave patterns in the field matrix
   */
  private initializeWaves() {
    const bounds = this.fieldMatrix.getBounds();
    const center = new THREE.Vector3();
    bounds.getCenter(center);

    // Add multiple wave sources for interesting patterns
    this.fieldMatrix.addWave(
      new THREE.Vector3(center.x - 3, 0, center.z - 3),
      0.5,
      3.0,
      0
    );

    this.fieldMatrix.addWave(
      new THREE.Vector3(center.x + 2, 0, center.z + 2),
      0.3,
      2.5,
      0
    );
  }

  /**
   * Set water level (for tidal simulation)
   */
  setWaterLevel(level: number) {
    this.waterLevel = level;
    if (this.waterMesh) {
      this.waterMesh.position.y = level;
    }
  }

  /**
   * Get current water level
   */
  getWaterLevel(): number {
    return this.waterLevel;
  }

  /**
   * Add a wave disturbance at a world position
   */
  addWaveDisturbance(position: THREE.Vector3, amplitude: number, wavelength: number) {
    this.fieldMatrix.addWave(position, amplitude, wavelength, this.time);
  }

  /**
   * Set wave parameters
   */
  setWaveParameters(amplitude: number, frequency: number, speed: number) {
    this.waveAmplitude = amplitude;
    this.waveFrequency = frequency;
    this.waveSpeed = speed;

    this.waterMaterial.uniforms.waveAmplitude.value = amplitude;
    this.waterMaterial.uniforms.waveFrequency.value = frequency;
    this.waterMaterial.uniforms.waveSpeed.value = speed;
  }

  /**
   * Update water simulation
   */
  update(deltaTime: number, camera: THREE.Camera) {
    this.time += deltaTime;

    // Update shader uniforms
    this.waterMaterial.uniforms.time.value = this.time;
    this.waterMaterial.uniforms.cameraPosition.value.copy(camera.position);

    // Update field matrix physics
    this.fieldMatrix.update(deltaTime);

    // Periodically add new waves for dynamic ocean
    if (Math.random() < 0.01) {
      const bounds = this.fieldMatrix.getBounds();
      const randomPos = new THREE.Vector3(
        bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        0,
        bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
      );
      this.addWaveDisturbance(randomPos, 0.2 + Math.random() * 0.3, 2.0 + Math.random() * 2.0);
    }
  }

  /**
   * Get field matrix for external use
   */
  getFieldMatrix(): FieldMatrix3D {
    return this.fieldMatrix;
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMaterial.dispose();
    }
  }
}
