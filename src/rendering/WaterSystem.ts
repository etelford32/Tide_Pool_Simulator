import * as THREE from 'three';
import { FieldMatrix3D } from '../physics/FieldMatrix3D';

/**
 * Advanced water rendering system with realistic waves, physics, and shore interactions
 * Features: Gerstner waves, caustics, refraction, shallow water behavior, shore foam
 */
export class WaterSystem {
  private scene: THREE.Scene;
  private waterMesh: THREE.Mesh | null = null;
  private fieldMatrix: FieldMatrix3D;
  private waterMaterial: THREE.ShaderMaterial;

  // Water properties
  private waterLevel: number = 0.5; // Raised to flow over beach
  private waveAmplitude: number = 0.4;
  private waveFrequency: number = 0.5;
  private waveSpeed: number = 1.2;

  // Mesh resolution
  private resolution: number = 128;

  // Time for animation
  private time: number = 0;

  // Wave generation throttle
  private lastWaveTime: number = 0;
  private waveInterval: number = 5.0; // seconds between random waves

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
   * Create custom shader material for realistic water with advanced effects
   */
  private createWaterMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        waterColor: { value: new THREE.Color(0x0088cc) },
        foamColor: { value: new THREE.Color(0xffffff) },
        deepWaterColor: { value: new THREE.Color(0x001a33) },
        shallowWaterColor: { value: new THREE.Color(0x33ccff) },
        lightDirection: { value: new THREE.Vector3(1, 1, 0).normalize() },
        cameraPosition: { value: new THREE.Vector3() },
        waveAmplitude: { value: this.waveAmplitude },
        waveFrequency: { value: this.waveFrequency },
        waveSpeed: { value: this.waveSpeed },
        waterLevel: { value: this.waterLevel },
      },
      vertexShader: `
        uniform float time;
        uniform float waveAmplitude;
        uniform float waveFrequency;
        uniform float waveSpeed;
        uniform float waterLevel;

        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;
        varying vec2 vUv;
        varying float vDepth;

        // Improved Gerstner wave with steepness parameter
        vec3 gerstnerWave(vec3 pos, vec2 direction, float amplitude, float wavelength, float speed, float steepness) {
          float k = 2.0 * 3.14159 / wavelength;
          float c = speed;
          float a = amplitude;
          float q = steepness / (k * a * 4.0); // Limit steepness to prevent loops

          vec2 d = normalize(direction);
          float f = k * (dot(d, pos.xz) - c * time);

          float height = a * sin(f);
          vec2 horizontal = q * a * d * cos(f);

          return vec3(horizontal.x, height, horizontal.y);
        }

        // Calculate all Gerstner wave components at once (optimization)
        // Primary waves biased toward shore (positive Z direction)
        vec3 calculateAllWaves(vec3 pos, float amplitude) {
          // Main waves approaching shore (south direction)
          vec3 wave1 = gerstnerWave(pos, vec2(0.0, 1.0), amplitude * 0.8, 4.0, waveSpeed, 1.0);
          vec3 wave2 = gerstnerWave(pos, vec2(0.3, 0.9), amplitude * 0.5, 3.0, waveSpeed * 0.9, 0.8);
          vec3 wave3 = gerstnerWave(pos, vec2(-0.3, 0.9), amplitude * 0.3, 2.5, waveSpeed * 1.1, 0.6);

          // Cross waves for realism
          vec3 wave4 = gerstnerWave(pos, vec2(0.8, 0.3), amplitude * 0.2, 1.5, waveSpeed * 1.3, 0.5);

          // Small ripples
          vec3 wave5 = gerstnerWave(pos, vec2(0.5, 0.7), amplitude * 0.15, 0.8, waveSpeed * 1.8, 0.4);
          vec3 wave6 = gerstnerWave(pos, vec2(-0.4, 0.6), amplitude * 0.1, 0.5, waveSpeed * 2.2, 0.3);

          return wave1 + wave2 + wave3 + wave4 + wave5 + wave6;
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Shallow water dampening (waves get smaller near shore)
          // Use depth relative to current water level, not static position
          float localDepth = position.y - waterLevel;
          float depthFactor = smoothstep(-2.0, 0.5, localDepth);
          float waveDamping = 0.3 + 0.7 * depthFactor;

          // Wave amplitude scaling to prevent waves exceeding water depth
          float effectiveAmplitude = waveAmplitude;
          if (localDepth > -2.0 && localDepth < 2.0) {
            // In shallow water, limit wave height to 40% of depth
            float maxSafeAmplitude = max(0.05, (waterLevel - position.y) * 0.4);
            effectiveAmplitude = min(waveAmplitude, maxSafeAmplitude);
          }

          // Calculate wave displacement with scaled amplitude
          vec3 displacement = calculateAllWaves(pos, effectiveAmplitude) * waveDamping;
          pos += displacement;

          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          vWaveHeight = displacement.y;
          vDepth = position.y - waterLevel;

          // Optimized normal calculation using finite differences
          float delta = 0.15;
          vec3 posRight = position + vec3(delta, 0.0, 0.0);
          vec3 posForward = position + vec3(0.0, 0.0, delta);

          vec3 displacementRight = calculateAllWaves(posRight, effectiveAmplitude) * waveDamping;
          vec3 displacementForward = calculateAllWaves(posForward, effectiveAmplitude) * waveDamping;

          posRight += displacementRight;
          posForward += displacementForward;

          vec3 tangent = normalize(posRight - pos);
          vec3 bitangent = normalize(posForward - pos);
          vNormal = normalize(cross(bitangent, tangent)); // Flip for correct facing

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform vec3 deepWaterColor;
        uniform vec3 shallowWaterColor;
        uniform vec3 lightDirection;
        uniform vec3 cameraPosition;
        uniform float time;

        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;
        varying vec2 vUv;
        varying float vDepth;

        // Improved noise function for caustics
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // Caustics pattern
        float caustics(vec2 uv, float time) {
          vec2 p = uv * 4.0;
          float c = 0.0;

          // Multiple octaves for detail
          c += noise(p + time * 0.2) * 0.5;
          c += noise(p * 2.0 - time * 0.3) * 0.25;
          c += noise(p * 4.0 + time * 0.15) * 0.125;

          return pow(c, 2.0) * 2.0;
        }

        // Subsurface scattering approximation
        float subsurfaceScattering(vec3 viewDir, vec3 lightDir, vec3 normal) {
          vec3 H = normalize(lightDir + normal * 0.3);
          float sss = pow(clamp(dot(viewDir, -H), 0.0, 1.0), 3.0);
          return sss;
        }

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          vec3 normal = normalize(vNormal);

          // Fresnel effect (Schlick approximation)
          float F0 = 0.02; // Water's reflectance at normal incidence
          float fresnel = F0 + (1.0 - F0) * pow(1.0 - max(dot(viewDirection, normal), 0.0), 5.0);

          // Depth-based color (use actual depth below water surface)
          float actualDepth = max(0.0, -vDepth); // Depth below water level
          float depthNormalized = clamp(actualDepth / 5.0, 0.0, 1.0); // Normalize to 5m max depth
          vec3 baseColor = mix(shallowWaterColor, deepWaterColor, depthNormalized);
          baseColor = mix(baseColor, waterColor, 0.5);

          // Physically-based lighting (Blinn-Phong)
          vec3 halfVector = normalize(lightDirection + viewDirection);
          float diffuse = max(dot(normal, lightDirection), 0.0);
          float specular = pow(max(dot(normal, halfVector), 0.0), 128.0);

          // Sun reflection on water (sharper, more intense)
          vec3 reflectDir = reflect(-lightDirection, normal);
          float sunReflection = pow(max(dot(viewDirection, reflectDir), 0.0), 256.0);

          // Caustics effect (only in shallow water < 2m deep)
          float causticsStrength = smoothstep(2.0, 0.0, actualDepth) * 0.6;
          float causticsPattern = caustics(vWorldPosition.xz, time);
          vec3 causticsColor = vec3(causticsPattern) * causticsStrength;

          // Shore foam (based on actual depth and wave height)
          // Foam appears in very shallow water (0-0.5m deep) and on breaking waves
          float shoreDistance = smoothstep(0.5, 0.0, actualDepth);
          float waveBreaking = smoothstep(0.15, 0.35, vWaveHeight);
          float foamFactor = max(shoreDistance * 0.8, waveBreaking * 0.6);

          // Animated foam texture
          float foamNoise = noise(vWorldPosition.xz * 8.0 + time * 0.5);
          foamNoise = pow(foamNoise, 2.0);
          foamFactor *= foamNoise;

          // Subsurface scattering
          float sss = subsurfaceScattering(viewDirection, lightDirection, normal);
          vec3 scatterColor = vec3(0.2, 0.6, 0.8) * sss * 0.4;

          // Combine all effects
          vec3 color = baseColor;
          color = color * (0.5 + 0.5 * diffuse); // Ambient + diffuse
          color += causticsColor; // Add caustics
          color += scatterColor; // Add subsurface scattering
          color += vec3(specular * 0.3); // Add specular highlights
          color += vec3(sunReflection * 1.5); // Add sun reflection

          // Mix in foam
          color = mix(color, foamColor, foamFactor);

          // Fresnel blending for sky reflection
          vec3 skyColor = vec3(0.5, 0.7, 0.9);
          color = mix(color, skyColor, fresnel * 0.4);

          // Transparency based on depth and fresnel
          float alpha = 0.80 + depthNormalized * 0.15 + fresnel * 0.05;
          alpha = clamp(alpha, 0.7, 0.98);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Improved transparency sorting
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

    // Render order for proper transparency
    this.waterMesh.renderOrder = 100;

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
    this.waterMaterial.uniforms.waterLevel.value = level;
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
   * Update water simulation (optimized)
   */
  update(deltaTime: number, camera: THREE.Camera) {
    this.time += deltaTime;

    // Update shader uniforms
    this.waterMaterial.uniforms.time.value = this.time;
    this.waterMaterial.uniforms.cameraPosition.value.copy(camera.position);

    // Update field matrix physics
    this.fieldMatrix.update(deltaTime);

    // Throttled random wave generation (optimization)
    if (this.time - this.lastWaveTime > this.waveInterval) {
      const bounds = this.fieldMatrix.getBounds();
      const randomPos = new THREE.Vector3(
        bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        0,
        bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
      );
      this.addWaveDisturbance(randomPos, 0.2 + Math.random() * 0.3, 2.0 + Math.random() * 2.0);
      this.lastWaveTime = this.time;
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
