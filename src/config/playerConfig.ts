/** Player ship configuration */

export const PLAYER_CONFIG = {
  /** Movement speed in world units per second */
  moveSpeed: 12,

  /** Shots per second */
  fireRate: 5,

  /** Starting health points */
  startingHealth: 3,

  /** Invincibility duration after taking damage (seconds) */
  invincibilityDuration: 1.5,

  /** Initial position (world coords) */
  initialPosition: { x: 0, y: -12 },

  /** Ship collision half-extents for AABB */
  halfExtents: { x: 0.6, y: 0.8 },

  /** Bullet speed (world units per second) */
  bulletSpeed: 25,

  /** Bullet damage (base value) */
  bulletDamage: 1,

  /** Multi-shot horizontal offset */
  multiShotOffset: 0.8,
} as const;
