# 5-Mile Shoreline Expansion Plan

## Vision Statement
Transform the tide pool simulation from a single 100m pool into a vast 5-mile (8km) coastal ecosystem with realistic horizon, multiple tide pools, and dynamic camera systems.

---

## Scale Comparison

### Current State
- **Area**: 100m × 100m (0.01 km²)
- **Shoreline**: ~30m beach gradient
- **Tide Pools**: 1 central pool
- **View Distance**: ~50m
- **Camera**: Close-up, single pool focus

### Target State
- **Area**: 8000m × 2000m (16 km²) - **1600× larger**
- **Shoreline**: 8km continuous beach with horizon line
- **Tide Pools**: 50-100 pools distributed along coast
- **View Distance**: 5000m to horizon
- **Camera**: Bird's eye view, zoom from satellite to close-up

---

## Technical Architecture

### Phase 1: Terrain System Redesign

#### 1.1 Chunked Terrain (LOD System)

**Chunk Structure**:
```
World divided into 500m × 500m chunks
- 16 chunks along shoreline (8000m / 500m)
- 4 chunks inland (2000m / 500m)
- Total: 64 chunks
```

**LOD Levels**:
```
LOD 0 (Near):   128×128 vertices (0-1000m from camera)
LOD 1 (Mid):     64×64 vertices  (1000-2500m)
LOD 2 (Far):     32×32 vertices  (2500-5000m)
LOD 3 (Horizon): 16×16 vertices  (5000m+)
```

**Performance**:
- Only load chunks in view frustum
- Maximum 9-12 chunks visible at once
- Vertices rendered: ~300k at peak (acceptable)

#### 1.2 Shoreline Definition

**Mathematical Horizon Line**:
```typescript
// Horizon at 5km with curvature simulation
horizonDistance = 5000; // meters
horizonHeight = -50 * (distance / 5000)^2; // Earth curvature approximation
```

**Beach Profile** (cross-section):
```
Ocean Floor: -10m to -5m   (200m wide)
Beach Zone:  -2m to +1m    (100m wide)  ← Intertidal zone
Dunes:       +1m to +3m    (50m wide)
Inland:      +2m to +5m    (1650m wide)
```

**Continuous Shoreline**:
- Parametric curve with gentle variations
- No sharp angles (realistic coastal shape)
- Depth varies: -15m offshore to +5m inland

---

### Phase 2: Water System Expansion

#### 2.1 Ocean Rendering

**Near Water** (0-500m):
- Full Gerstner wave simulation
- Caustics, foam, reflections
- 128×128 resolution mesh

**Mid Water** (500-2000m):
- Simplified waves (3 layers instead of 6)
- No caustics
- 64×64 resolution mesh

**Far Water** (2000-5000m):
- Static normal map waves
- Simple specular highlights
- 32×32 resolution mesh

**Horizon Water** (5000m+):
- Flat plane with fog
- Sky reflection only
- Single quad

#### 2.2 Atmospheric Perspective

```glsl
// Distance fog for depth perception
float fogStart = 1000.0;
float fogEnd = 5000.0;
float fogDensity = (distance - fogStart) / (fogEnd - fogStart);
vec3 fogColor = vec3(0.7, 0.8, 0.9); // Sky blue-gray

finalColor = mix(objectColor, fogColor, clamp(fogDensity, 0.0, 0.85));
```

**Aerial Perspective**:
- Objects fade to sky color with distance
- Contrast reduces
- Saturation decreases
- Creates depth illusion

---

### Phase 3: Camera System Overhaul

#### 3.1 Zoom Levels

**Satellite View** (5000m altitude):
- See entire 8km shoreline
- Strategic view
- Simplified rendering

**Regional View** (1000m altitude):
- See ~2km of coastline
- Multiple tide pools visible
- Medium detail

**Local View** (100m altitude):
- See 500m area
- Individual pools and organisms
- High detail

**Close-Up View** (10m altitude):
- Current camera distance
- Maximum detail
- Individual organism behavior

#### 3.2 Camera Controls

**New Controls**:
- Mouse wheel: Zoom (10m to 5000m)
- Arrow keys: Pan along shoreline
- PageUp/Down: Change altitude
- Home: Return to origin
- 1-9 keys: Jump to specific pools

**Smooth Transitions**:
- Eased zoom (500ms transition)
- Auto-adjust LOD during zoom
- Frustum culling optimization

---

### Phase 4: Tide Pool Distribution

#### 4.1 Pool Placement Algorithm

```typescript
// Distribute pools along shoreline
const poolCount = 75;
const shorelineLength = 8000;

for (let i = 0; i < poolCount; i++) {
  const progress = i / poolCount;
  const x = progress * shorelineLength - 4000; // Center at 0
  const z = getShorelineZ(x); // Follow beach curve

  // Add random offset (±50m)
  const offset = new Vector2(
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 50
  );

  createTidePool(x + offset.x, z + offset.z);
}
```

**Pool Variety**:
- Small pools: 2-5m diameter (60%)
- Medium pools: 5-10m diameter (30%)
- Large pools: 10-20m diameter (10%)

#### 4.2 Ecosystem Distribution

**Biome Zones** (vary along 8km):
```
Zone 1 (0-2km):   Rocky coast - Mussels, barnacles, anemones
Zone 2 (2-4km):   Sandy beach - Crabs, sand dollars, shrimp
Zone 3 (4-6km):   Mixed zone  - High biodiversity
Zone 4 (6-8km):   Rocky coast - Kelp, urchins, starfish
```

**Organism Density**:
- Total organisms: 2000-5000 (distributed)
- Active simulation: Only in visible chunks (200-500 organisms)
- Hibernated organisms: Stored state, no physics

---

### Phase 5: Performance Optimization

#### 5.1 Frustum Culling

```typescript
// Only render what camera can see
function isChunkVisible(chunk: Chunk, camera: Camera): boolean {
  return camera.frustum.intersectsBox(chunk.boundingBox);
}

// Update each frame
const visibleChunks = allChunks.filter(c => isChunkVisible(c, camera));
renderChunks(visibleChunks);
```

#### 5.2 Level of Detail (LOD)

**Automatic LOD Selection**:
```typescript
function getTerrainLOD(distanceToCamera: number): number {
  if (distanceToCamera < 1000) return 0; // 128×128
  if (distanceToCamera < 2500) return 1; // 64×64
  if (distanceToCamera < 5000) return 2; // 32×32
  return 3; // 16×16
}
```

**Organism LOD**:
```
Near (0-100m):    Full 3D models, physics, AI
Mid (100-500m):   Simplified models, basic movement
Far (500-1000m):  Billboards/sprites
Very Far (1000m+): Not rendered
```

#### 5.3 Chunk Streaming

**Loading Strategy**:
```typescript
// Load chunks ahead of camera movement
const loadRadius = 2; // chunks
const unloadRadius = 4; // chunks

// Predict movement
const predictedPosition = camera.position + camera.velocity * 2.0;

// Load nearby chunks
loadChunksAround(predictedPosition, loadRadius);
unloadChunksOutside(camera.position, unloadRadius);
```

---

### Phase 6: Visual Enhancements

#### 6.1 Horizon Line

**Sky-Ocean Boundary**:
```glsl
// Sharp horizon line
float horizonY = getHorizonHeight(distance);
float isOcean = step(worldPosition.y, horizonY);
vec3 color = mix(skyColor, oceanColor, isOcean);

// Add atmospheric glow
float glowIntensity = exp(-abs(worldPosition.y - horizonY) * 0.1);
color += vec3(1.0, 0.9, 0.7) * glowIntensity * 0.2;
```

#### 6.2 Atmospheric Effects

**Distance Haze**:
```glsl
// Rayleigh scattering approximation
vec3 scatterColor = vec3(0.5, 0.7, 1.0);
float scatterAmount = 1.0 - exp(-distance * 0.0002);
color = mix(color, scatterColor, scatterAmount);
```

**Sun Position**:
- Sun angle affects lighting across entire coast
- Dynamic shadows stretch at sunrise/sunset
- Time of day impacts visibility

---

### Phase 7: Implementation Steps

#### Step 1: Expand Terrain Bounds (Week 1)
- [x] Remove 100m limit
- [ ] Create 8km × 2km world space
- [ ] Implement chunk manager
- [ ] Basic LOD system

#### Step 2: Horizon Rendering (Week 1)
- [ ] Add distance fog shader
- [ ] Create horizon line
- [ ] Atmospheric perspective
- [ ] Sky-ocean blend

#### Step 3: Water Extension (Week 2)
- [ ] Extend water mesh to horizon
- [ ] Water LOD system
- [ ] Far ocean simplified rendering
- [ ] Foam trails along full shore

#### Step 4: Camera Overhaul (Week 2)
- [ ] Zoom levels (10m to 5000m)
- [ ] Smooth transitions
- [ ] Pan controls along coast
- [ ] Minimap for navigation

#### Step 5: Pool Distribution (Week 3)
- [ ] Pool placement algorithm
- [ ] Biome system
- [ ] Organism distribution
- [ ] Hibernation system

#### Step 6: Optimization (Week 3)
- [ ] Frustum culling
- [ ] Chunk streaming
- [ ] Organism pooling
- [ ] GPU instancing

#### Step 7: Polish (Week 4)
- [ ] Lighthouse/landmarks
- [ ] Cliff variations
- [ ] Beach debris (driftwood, rocks)
- [ ] Distant ship silhouettes

---

## Performance Targets

### Memory Budget
```
Terrain chunks:     64 × 500KB = 32 MB
Water meshes:       4 LODs × 2MB = 8 MB
Organisms (active): 500 × 10KB = 5 MB
Textures/shaders:   50 MB
Total:             ~100 MB (acceptable)
```

### Frame Rate Targets
```
Satellite view:  60 FPS (minimal rendering)
Regional view:   60 FPS (moderate detail)
Local view:      60 FPS (high detail)
Close-up view:   55+ FPS (maximum detail)
```

### Render Complexity
```
Vertices per frame:
- Near chunks:     3-4 chunks × 16k verts = 64k
- Mid chunks:      4-6 chunks × 4k verts  = 24k
- Far chunks:      2-3 chunks × 1k verts  = 3k
- Water:           ~50k vertices
- Organisms:       ~10k vertices
Total:            ~150k vertices (well within budget)
```

---

## Visual Impact Goals

### Before (Current)
- Single small pool
- Limited view (50m)
- No horizon
- Claustrophobic feel
- Static environment

### After (5-Mile Shoreline)
- Vast coastal ecosystem
- Endless horizon
- 8km of exploration
- Epic sense of scale
- Dynamic, living world

### Key Visual Features
1. **Horizon Line**: Sharp boundary between ocean and sky
2. **Atmospheric Depth**: Objects fade with distance
3. **Scale Indicators**: Distant cliffs, lighthouses, rock formations
4. **Dynamic Water**: Waves stretch to horizon
5. **Living Coast**: Birds, driftwood, multiple pools
6. **Weather Effects**: Fog banks, clouds, rain (future)

---

## User Experience

### Navigation
- **Click to Focus**: Click any pool to fly camera there
- **Breadcrumb Trail**: Shows visited pools
- **Pool Finder**: List of all pools with health metrics
- **Auto-Follow**: Track specific organism across coast

### Information Display
- **Minimap**: Shows full 8km coast, camera position
- **Pool Health**: Color-coded by biodiversity
- **Population Stats**: Total organisms across all pools
- **Zoom Indicator**: Shows current altitude/detail level

---

## Implementation Priority

### Phase 1 (Now): Foundation
1. Create chunk system
2. Expand world bounds
3. Basic horizon rendering
4. Camera zoom levels

### Phase 2 (Next): Core Features
5. Water LOD system
6. Pool distribution
7. Atmospheric fog
8. Frustum culling

### Phase 3 (Polish): Final Details
9. Landmarks and variety
10. Advanced camera controls
11. Performance optimization
12. Visual polish

---

## Technical Risks & Mitigations

### Risk 1: Performance Degradation
**Mitigation**: Aggressive LOD, frustum culling, chunk streaming

### Risk 2: Visual Pop-In
**Mitigation**: Fade transitions between LODs, pre-load neighboring chunks

### Risk 3: Camera Disorientation
**Mitigation**: Minimap, landmarks, smooth transitions

### Risk 4: Empty-Feeling World
**Mitigation**: Atmospheric effects, distant details, varied terrain

---

## Success Criteria

✅ **Scale**: Feel vast and explorable (5 miles visible)
✅ **Performance**: Maintain 60 FPS at all zoom levels
✅ **Beauty**: Stunning horizon views
✅ **Immersion**: Realistic coastal ecosystem
✅ **Playability**: Easy navigation and exploration

---

## Next Steps

**Immediate** (Today):
1. Create TerrainChunkManager class
2. Expand world bounds to 8km × 2km
3. Implement basic LOD system
4. Add horizon fog shader

**This Week**:
5. Water LOD system
6. Camera zoom controls
7. Pool distribution algorithm
8. Performance testing

**Next Week**:
9. Polish and refinement
10. Add landmarks
11. Optimize rendering
12. User testing
