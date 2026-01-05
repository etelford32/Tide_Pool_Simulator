import { TidePoolSimulation } from './TidePoolSimulation';

async function waitForRapier() {
  // Dynamically import Rapier
  const RAPIER = await import('@dimforge/rapier3d');

  // Wait for WASM to be fully initialized by testing if we can create objects
  const maxAttempts = 20;
  const delayMs = 100;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Try to create a test world to verify WASM is ready
      const testWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      testWorld.free();
      return RAPIER;
    } catch (e) {
      // WASM not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Failed to initialize Rapier WASM module after multiple attempts');
}

async function init() {
  try {
    // Wait for Rapier WASM to be fully initialized
    console.log('✓ Loading Rapier physics engine...');
    await waitForRapier();
    console.log('✓ Rapier ready');

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
