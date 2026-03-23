/** Core game configuration constants */

export const GAME_CONFIG = {
  /** Play area dimensions in world units */
  playArea: {
    width: 20,
    height: 30,
  },

  /** Fixed timestep for game logic (seconds per tick) */
  fixedTimestep: 1 / 60,

  /** Object pool pre-allocation sizes */
  poolSizes: {
    playerBullets: 100,
    enemyBullets: 200,
    enemies: 40,
    powerups: 10,
  },

  /** Starfield configuration */
  starfield: {
    count: 150,
    speed: 8,
    minSize: 0.05,
    maxSize: 0.15,
  },

  /** Debug options */
  debug: {
    showLabels: false,
  },

  /** Time control defaults */
  timeControl: {
    defaultTimeScale: 1.0,
  },

  /** Z-index layering for HTML overlays */
  zIndex: {
    hud: 10,
    flashEffect: 50,
    pauseMenu: 100,
    gameOver: 200,
  },
} as const;
