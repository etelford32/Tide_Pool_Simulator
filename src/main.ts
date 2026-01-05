import { TidePoolSimulation } from './TidePoolSimulation';

async function init() {
  try {
    console.log('[INIT] Starting tide pool simulator v0.1.1');

    // Dynamically import Rapier to ensure WASM loads asynchronously
    console.log('[RAPIER] Dynamically importing Rapier module...');
    const RAPIER = await import('@dimforge/rapier3d');
    console.log('[RAPIER] Module imported');
    console.log('[RAPIER] World constructor:', typeof RAPIER.World);

    // Wait for WASM to actually be ready by polling
    let attempts = 0;
    const maxAttempts = 50;
    while (attempts < maxAttempts) {
      try {
        console.log(`[RAPIER] WASM initialization test ${attempts + 1}/${maxAttempts}...`);
        const testWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
        testWorld.free();
        console.log('[RAPIER] ✓ WASM fully initialized and working!');
        break;
      } catch (e) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error('[RAPIER] ✗ WASM failed to initialize after', maxAttempts, 'attempts');
          throw new Error('Rapier WASM module failed to initialize after 5 seconds. This may be a browser compatibility issue or network problem.');
        }
        // Wait 100ms before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('[INIT] ✓ Rapier physics engine ready');

    // Hide loading screen
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }

    // Create and start simulation
    const simulation = new TidePoolSimulation();
    await simulation.initialize();

    // Set up controls
    setupControls(simulation);

    // Start animation loop
    simulation.start();

    console.log('✓ Tide Pool Simulation started');
  } catch (error) {
    console.error('Failed to initialize simulation:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <h2 style="color: #e74c3c;">Error Loading Simulation</h2>
        <p>${error}</p>
      `;
    }
  }
}

function setupControls(simulation: TidePoolSimulation) {
  const playPauseBtn = document.getElementById('play-pause');
  const speedUpBtn = document.getElementById('speed-up');
  const slowDownBtn = document.getElementById('slow-down');
  const resetBtn = document.getElementById('reset');
  const gameModeBtn = document.getElementById('game-mode');
  const simModeBtn = document.getElementById('sim-mode');

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      const isPaused = simulation.togglePause();
      playPauseBtn.textContent = isPaused ? '▶ Play' : '⏸ Pause';
    });
  }

  if (speedUpBtn) {
    speedUpBtn.addEventListener('click', () => {
      simulation.adjustTimeScale(1.5);
    });
  }

  if (slowDownBtn) {
    slowDownBtn.addEventListener('click', () => {
      simulation.adjustTimeScale(0.67);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the simulation? All progress will be lost.')) {
        simulation.reset();
      }
    });
  }

  if (gameModeBtn && simModeBtn) {
    gameModeBtn.addEventListener('click', () => {
      simulation.setMode('game');
      gameModeBtn.classList.add('active');
      simModeBtn.classList.remove('active');
    });

    simModeBtn.addEventListener('click', () => {
      simulation.setMode('scientific');
      simModeBtn.classList.add('active');
      gameModeBtn.classList.remove('active');
    });
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        simulation.togglePause();
        break;
      case '+':
      case '=':
        simulation.adjustTimeScale(1.5);
        break;
      case '-':
        simulation.adjustTimeScale(0.67);
        break;
      case 'r':
      case 'R':
        if (confirm('Reset simulation?')) {
          simulation.reset();
        }
        break;
    }
  });
}

// Start the application
init();
