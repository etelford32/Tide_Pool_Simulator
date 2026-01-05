# Water Level & Wave Dynamics Review

## Executive Summary

**Issues Found**: 4 critical, 3 moderate
**Systems Analyzed**: Water level calculation, wave physics, shore interaction, tidal coupling
**Performance Impact**: Current implementation is efficient but has physical accuracy issues

---

## Critical Issues

### 1. **Shallow Water Dampening Uses Wrong Reference** ⚠️ CRITICAL

**Location**: `WaterSystem.ts:114`

```glsl
// CURRENT (INCORRECT):
float depthFactor = smoothstep(-2.0, 0.5, position.y);
float waveDamping = 0.3 + 0.7 * depthFactor;
```

**Problem**:
- Uses mesh local `position.y` (static, -50 to 50 range)
- Doesn't account for dynamic water level changes
- Water level ranges from -1.0m (low tide) to +1.5m (high tide)
- Dampening stays constant regardless of tide

**Impact**:
- Waves don't get smaller in shallow water during low tide
- Beach doesn't show realistic wave breaking patterns
- Physically inaccurate behavior

**Fix Needed**:
```glsl
// Should use depth relative to current water level
float depth = position.y - waterLevel; // Actual depth below surface
float depthFactor = smoothstep(-2.0, 0.5, depth);
```

---

### 2. **Wave Amplitude Doesn't Scale with Tide** ⚠️ CRITICAL

**Current Behavior**:
- Wave amplitude: Fixed at 0.4m
- Water level: Varies -1.0m to +1.5m (2.5m range)
- Wave height as % of depth: Varies from 40% (deep) to 400% (shallow)

**Problem**:
- At low tide (-1.0m), 0.4m waves are 40% of water depth (unrealistic)
- In shallow shore water (0.2m deep), waves exceed water depth
- Real ocean: Wave height proportional to water depth in shallow areas

**Expected Behavior**:
```
Deep water (>10m): Full amplitude (0.4m)
Shallow (<2m): Amplitude = min(0.4m, depth * 0.3)
Very shallow (<0.5m): Waves break and become foam
```

**Fix Needed**:
- Scale wave amplitude based on local water depth
- Implement wave breaking threshold
- Add surf zone physics

---

### 3. **Depth Calculation in Fragment Shader** ⚠️ MODERATE

**Location**: `WaterSystem.ts:207`

```glsl
// CURRENT:
float depth = clamp(-vDepth / 3.0, 0.0, 1.0);
```

**Problem**:
- `vDepth = position.y - waterLevel` calculated in vertex shader
- Division by 3.0 is hardcoded (assumes max depth of 3m)
- Terrain can be deeper than 3m (beach goes to -2m, water level to -1m = 1m depth)
- Caustics strength uses this incorrect depth

**Impact**:
- Color gradient doesn't match actual water depth
- Caustics appear in wrong locations
- Shallow water color incorrect

---

### 4. **Wave Direction Independence** ⚠️ MODERATE

**Current State**:
```glsl
// Six waves with arbitrary directions
vec3 wave1 = gerstnerWave(pos, vec2(1.0, 0.0), ...);     // East
vec3 wave2 = gerstnerWave(pos, vec2(0.7, 0.7), ...);     // Northeast
vec3 wave3 = gerstnerWave(pos, vec2(-0.5, 0.8), ...);    // Northwest
// etc.
```

**Problem**:
- Wave directions are random/arbitrary
- No dominant wave direction toward shore
- Real ocean: Waves approach shore perpendicular to beach
- Tidal currents should influence wave direction

**Expected**:
- Primary waves travel toward shore (south direction)
- Secondary waves at angles for realism
- Wave direction influenced by tide direction

---

## Moderate Issues

### 5. **Shore Foam Positioning**

**Location**: `WaterSystem.ts:226`

```glsl
float shoreDistance = smoothstep(-0.3, 0.1, -vDepth);
```

**Problem**:
- Hardcoded depth thresholds (-0.3m to 0.1m)
- Beach terrain gradient is -1.5m to 0m
- Foam only appears in 0.4m zone, not full beach
- Should adapt to terrain slope

**Better Approach**:
- Query terrain height at each position
- Foam appears where water depth < 0.5m AND terrain slope > 5°
- Intensity based on wave energy and slope

---

### 6. **Wave Speed Calculation**

**Current**: `waveSpeed: 1.2` (arbitrary units)

**Problem**:
- Doesn't use dispersion relation: `c = sqrt(g * λ / 2π)`
- For wavelength 4m: `c = sqrt(9.81 * 4 / 6.28) = 2.5 m/s`
- Current speed might be too slow/fast

**Fix**:
Calculate from physics:
```glsl
float c = sqrt(9.81 * wavelength / (2.0 * 3.14159));
```

---

### 7. **Tidal Level to Water Level Conversion**

**Location**: `Environment.ts:331`

```typescript
currentWaterLevel = -1.0 + this.params.tideLevel * 2.5;
```

**Analysis**:
- Tide level: 0 (low) to 1 (high)
- Water level: -1.0m to +1.5m
- Range: 2.5 meters (8.2 feet) - **REALISTIC** ✓

**Comparison to Real Tides**:
- San Francisco Bay: 1.8m (6 feet) - Close!
- Bay of Fundy: 16m (52 feet) - Extreme case
- Average ocean: 1-2m (3-6 feet) - **We're in range** ✓

**Verdict**: Current range is physically realistic for moderate tide pools

---

## Performance Analysis

### Current Shader Complexity

**Vertex Shader**:
- 6 Gerstner wave calculations × 3 (pos, posRight, posForward) = **18 calls**
- Each call: ~15 operations
- Total: ~270 operations per vertex
- **Verdict**: Moderate complexity, acceptable for 128×128 mesh

**Fragment Shader**:
- Caustics: 3-octave noise (expensive)
- Fresnel: Schlick approximation (cheap)
- Lighting: Blinn-Phong (cheap)
- **Verdict**: Moderate complexity, 30-60 FPS expected

### Optimization Opportunities

1. **Wave Calculation Cache**: Currently optimized ✓
2. **LOD System**: Not implemented (future enhancement)
3. **Caustics**: Could be pre-baked texture (3x faster)
4. **Shader Uniforms**: All properly updated ✓

---

## System Integration Review

### Water Level Flow

```
MoonSystem.calculateTidalForce(time)
  ↓ returns 0-1
Environment.update()
  ↓ converts to -1.0m to +1.5m
WaterSystem.setWaterLevel(level)
  ↓ updates mesh position AND shader uniform
  ↓
Shader uses waterLevel for depth calculations ✓
```

**Status**: Partially correct
- ✅ Moon → Tide → Water level conversion works
- ✅ Mesh position updates
- ✅ Shader uniform updates
- ❌ Shallow water dampening doesn't use uniform
- ❌ Wave amplitude doesn't scale with level

---

### Moisture System Integration

```
Environment.update()
  ↓ currentWaterLevel = -1.0 + tideLevel * 2.5
MoistureSystem.applyWaterCoverage(currentWaterLevel)
  ↓ sets moisture = 1.0 where terrain.height < waterLevel
MoistureSystem.update(deltaTime, temperature)
  ↓ evaporation and drainage
```

**Status**: ✅ Correctly implemented

---

## Wave Physics Analysis

### Gerstner Wave Implementation

**Current Formula**:
```glsl
float k = 2.0 * 3.14159 / wavelength;
float f = k * (dot(direction, pos.xz) - c * time);
float height = a * sin(f);
vec2 horizontal = q * a * direction * cos(f);
```

**Physics Accuracy**: ✅ Correct
- Uses proper wave vector k = 2π/λ
- Phase calculation correct
- Steepness parameter q prevents loops
- Horizontal displacement creates realistic crests

### Wave Superposition

**Current**: 6 waves with different:
- Amplitudes: 0.8a, 0.5a, 0.3a, 0.2a, 0.15a, 0.1a
- Wavelengths: 4m, 3m, 2.5m, 1.5m, 0.8m, 0.5m
- Speeds: Arbitrary multiples of base speed

**Issue**: Speeds don't match dispersion relation

**Fix Needed**:
Each wavelength should have speed: `c = sqrt(g*λ / 2π)`
- 4m wave: 2.5 m/s
- 3m wave: 2.2 m/s
- 2.5m wave: 2.0 m/s
- etc.

---

## Recommendations

### Immediate Fixes (Critical)

1. **Update Shallow Water Dampening**:
```glsl
uniform float waterLevel;
// In main():
float localDepth = position.y - waterLevel;
float depthFactor = smoothstep(-2.0, 0.5, localDepth);
float waveDamping = 0.3 + 0.7 * depthFactor;
```

2. **Add Wave Amplitude Scaling**:
```glsl
// Scale amplitude based on depth
float maxSafeAmplitude = max(0.0, localDepth * 0.4);
float scaledAmplitude = min(waveAmplitude, maxSafeAmplitude);
```

3. **Fix Depth Calculation**:
```glsl
// Use actual depth from water level
float actualDepth = max(0.0, -vDepth);
float depthNormalized = clamp(actualDepth / 5.0, 0.0, 1.0);
```

### Medium Priority

4. **Wave Direction Bias**:
```glsl
// Primary waves toward shore (south = +Z)
vec3 wave1 = gerstnerWave(pos, vec2(0.0, 1.0), ...);  // Main shore direction
vec3 wave2 = gerstnerWave(pos, vec2(0.3, 0.9), ...);  // Slight angle
vec3 wave3 = gerstnerWave(pos, vec2(-0.3, 0.9), ...); // Slight angle
```

5. **Physics-Based Wave Speed**:
```typescript
// In WaterSystem constructor
const g = 9.81;
const wavelengths = [4.0, 3.0, 2.5, 1.5, 0.8, 0.5];
const speeds = wavelengths.map(λ => Math.sqrt(g * λ / (2 * Math.PI)));
```

### Future Enhancements

6. **Wave Breaking Physics**: Implement surf zone
7. **Tidal Current**: Add water velocity in tide direction
8. **Wind Effect**: Allow wind to influence wave direction/amplitude
9. **Reflection**: Waves bounce off cliff/rocks

---

## Conclusion

The water system has **solid foundations** but **critical physics issues**:

✅ **Good**:
- Tidal range realistic (2.5m)
- Moon → Tide → Water level flow correct
- Moisture integration working
- Gerstner wave math correct
- Performance acceptable

❌ **Needs Fixing**:
- Shallow water dampening uses wrong reference
- Wave amplitude doesn't scale with depth
- Wave speeds not physically based
- Shore foam positioning hardcoded

**Priority**: Fix critical issues 1-3 immediately for physical accuracy.

**Estimated Fix Time**: 30-45 minutes
**Performance Impact**: Negligible (same shader complexity)
**Physical Accuracy Gain**: Significant (realistic beach behavior)
