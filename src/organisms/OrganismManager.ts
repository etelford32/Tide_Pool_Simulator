import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Environment } from '../environment/Environment';
import { Organism } from './Organism';
import { SeaLettuce } from './species/SeaLettuce';
import { AcornBarnacle } from './species/AcornBarnacle';
import { Limpet } from './species/Limpet';
import { OchreSeaStar } from './species/OchreSeaStar';
import { PacificHermitCrab } from './species/PacificHermitCrab';
import { Clownfish } from './species/Clownfish';
import { SeaAnemoneHome } from './species/SeaAnemoneHome';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface OrganismStatistics {
  speciesCount: number;
  totalOrganisms: number;
  shannonIndex: number;
  populations: Map<string, number>;
}

export class OrganismManager {
  private organisms: Organism[] = [];
  private physicsWorld: PhysicsWorld;
  private environment: Environment;

  constructor(physicsWorld: PhysicsWorld, environment: Environment) {
    this.physicsWorld = physicsWorld;
    this.environment = environment;
  }

  spawn(speciesId: string, position: Position, scene?: THREE.Scene, gender?: 'male' | 'female'): Organism | null {
    let organism: Organism | null = null;

    switch (speciesId) {
      case 'sea_lettuce':
        organism = new SeaLettuce(position, this.physicsWorld);
        break;
      case 'acorn_barnacle':
        organism = new AcornBarnacle(position, this.physicsWorld);
        break;
      case 'limpet':
        organism = new Limpet(position, this.physicsWorld);
        break;
      case 'ochre_sea_star':
        organism = new OchreSeaStar(position, this.physicsWorld);
        break;
      case 'pacific_hermit_crab':
        organism = new PacificHermitCrab(position, this.physicsWorld, gender);
        // Add shell mesh and articulated body group to scene for hermit crabs
        if (scene && organism instanceof PacificHermitCrab) {
          scene.add(organism.getShellMesh());
          scene.add(organism.getBodyGroup());
        }
        break;
      case 'clownfish':
        organism = new Clownfish(position, this.physicsWorld);
        break;
      case 'sea_anemone_home':
        organism = new SeaAnemoneHome(position, this.physicsWorld);
        break;
      default:
        console.warn(`Unknown species: ${speciesId}`);
        return null;
    }

    this.organisms.push(organism);
    return organism;
  }

  update(deltaTime: number, simulationTime: number) {
    const envParams = this.environment.getParameters();

    // Update all organisms
    for (let i = this.organisms.length - 1; i >= 0; i--) {
      const organism = this.organisms[i];

      // Update organism
      organism.update(deltaTime, envParams);

      // Remove dead organisms
      if (organism.isDead()) {
        organism.destroy();
        this.organisms.splice(i, 1);
      }
    }

    // Handle interactions (predation, competition, etc.)
    this.handleInteractions(deltaTime);

    // Handle reproduction
    this.handleReproduction(simulationTime);
  }

  private handleInteractions(deltaTime: number) {
    // Check for predator-prey interactions
    for (const predator of this.organisms) {
      if (!predator.canPredate()) continue;

      for (const prey of this.organisms) {
        if (predator === prey) continue;
        if (!predator.isPrey(prey.getSpeciesId())) continue;

        const distance = predator.getPosition().distanceTo(prey.getPosition());
        if (distance < 0.5) { // Within predation range
          predator.attemptPredation(prey, deltaTime);
        }
      }
    }

    // Check for anemone shock damage
    for (const organism of this.organisms) {
      if (organism instanceof SeaAnemoneHome) {
        organism.checkShockDamage(this.organisms, deltaTime);
      }
    }
  }

  private handleReproduction(simulationTime: number) {
    // Simplified reproduction - check if organisms can reproduce
    const newOrganisms: Organism[] = [];

    for (const organism of this.organisms) {
      const offspring = organism.checkReproduction(simulationTime);
      if (offspring) {
        newOrganisms.push(offspring);
      }
    }

    this.organisms.push(...newOrganisms);
  }

  syncVisuals() {
    for (const organism of this.organisms) {
      organism.syncVisual();
    }
  }

  getStatistics(): OrganismStatistics {
    const populations = new Map<string, number>();

    for (const organism of this.organisms) {
      const species = organism.getSpeciesId();
      populations.set(species, (populations.get(species) || 0) + 1);
    }

    // Calculate Shannon diversity index
    let shannonIndex = 0;
    const total = this.organisms.length;
    if (total > 0) {
      for (const count of populations.values()) {
        const proportion = count / total;
        shannonIndex -= proportion * Math.log(proportion);
      }
    }

    return {
      speciesCount: populations.size,
      totalOrganisms: total,
      shannonIndex,
      populations,
    };
  }

  clear() {
    for (const organism of this.organisms) {
      organism.destroy();
    }
    this.organisms = [];
  }

  /**
   * Get the player-controlled clownfish
   */
  getPlayerClownfish(): Clownfish | null {
    for (const organism of this.organisms) {
      if (organism instanceof Clownfish) {
        return organism;
      }
    }
    return null;
  }

  /**
   * Get all organisms (for selection system)
   */
  getAllOrganisms(): Organism[] {
    return this.organisms;
  }
}
