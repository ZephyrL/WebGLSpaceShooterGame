/** Power-up type identifiers */
export type PowerupType = 'multishot' | 'damage_boost' | 'bomb' | 'shield';

/** Per-power-up-type configuration */
export interface PowerupStats {
  /** Duration of the effect in seconds (0 = instant) */
  duration: number;
  /** Colour for the pickup mesh */
  color: number;
  /** Display name for HUD */
  displayName: string;
}

export const POWERUP_CONFIG = {
  /** Chance (0-1) that a defeated enemy drops a power-up */
  dropChance: 0.2,

  /** Pickup drift speed downward (world units per second) */
  driftSpeed: 3,

  /** Pickup collision half-extents */
  halfExtents: { x: 0.5, y: 0.5 },

  /** Per-type configuration */
  types: {
    multishot: {
      duration: 8,
      color: 0x00ccff,
      displayName: 'Multi-Shot',
    },
    damage_boost: {
      duration: 8,
      color: 0xffcc00,
      displayName: 'Damage Boost',
    },
    bomb: {
      duration: 0,
      color: 0xff0044,
      displayName: 'BOMB',
    },
    shield: {
      duration: 8,
      color: 0x00ffff,
      displayName: 'Shield',
    },
  } satisfies Record<PowerupType, PowerupStats>,

  /** Multi-shot: number of parallel bullets */
  multishotBulletCount: 3,

  /** Damage boost: multiplier */
  damageBoostMultiplier: 2,
} as const;
