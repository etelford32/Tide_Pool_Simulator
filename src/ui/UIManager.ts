export interface UIState {
  time: number; // days
  tideLevel: number; // 0-1
  temperature: number; // °C
  speciesCount: number;
  totalOrganisms: number;
  biodiversity: number; // Shannon index
}

export class UIManager {
  private timeEl: HTMLElement | null;
  private tideEl: HTMLElement | null;
  private temperatureEl: HTMLElement | null;
  private speciesEl: HTMLElement | null;
  private organismsEl: HTMLElement | null;
  private biodiversityEl: HTMLElement | null;

  constructor() {
    this.timeEl = document.getElementById('time');
    this.tideEl = document.getElementById('tide');
    this.temperatureEl = document.getElementById('temperature');
    this.speciesEl = document.getElementById('species');
    this.organismsEl = document.getElementById('organisms');
    this.biodiversityEl = document.getElementById('biodiversity');
  }

  update(state: UIState) {
    if (this.timeEl) {
      this.timeEl.textContent = `Day ${state.time.toFixed(1)}`;
    }

    if (this.tideEl) {
      const tideStatus =
        state.tideLevel > 0.7 ? 'High' :
        state.tideLevel > 0.3 ? 'Medium' : 'Low';
      this.tideEl.textContent = `${tideStatus} (${(state.tideLevel * 100).toFixed(0)}%)`;
    }

    if (this.temperatureEl) {
      this.temperatureEl.textContent = `${state.temperature.toFixed(1)}°C`;
    }

    if (this.speciesEl) {
      this.speciesEl.textContent = state.speciesCount.toString();
    }

    if (this.organismsEl) {
      this.organismsEl.textContent = state.totalOrganisms.toString();
    }

    if (this.biodiversityEl) {
      this.biodiversityEl.textContent = state.biodiversity.toFixed(2);
    }
  }
}
