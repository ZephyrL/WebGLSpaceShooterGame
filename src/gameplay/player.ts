import * as THREE from 'three';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { POWERUP_CONFIG, PowerupType } from '../config/powerupConfig';
import { GAME_CONFIG } from '../config/gameConfig';
import { InputSystem } from '../engine/input';
import { PlayerBulletSystem } from './playerBullets';
import { createPlayerMesh } from '../engine/placeholderFactory';

/**
 * Player ship entity — handles movement, firing, health, and power-up effects.
 */
export class Player {
  public mesh: THREE.Mesh;
  public health: number;
  public maxHealth: number;

  // Position (mesh.position.x/y used directly)

  // Invincibility
  private invincible = false;
  private invincibilityTimer = 0;
  private flashTimer = 0;

  // Firing
  private fireCooldown = 0;

  // Power-up effects
  private activePowerup: PowerupType | null = null;
  private powerupTimer = 0;

  // Cached config
  private fireInterval: number;

  constructor() {
    this.mesh = createPlayerMesh();
    this.maxHealth = PLAYER_CONFIG.startingHealth;
    this.health = this.maxHealth;
    this.fireInterval = 1 / PLAYER_CONFIG.fireRate;

    this.mesh.position.set(
      PLAYER_CONFIG.initialPosition.x,
      PLAYER_CONFIG.initialPosition.y,
      0,
    );
  }

  /** Reset player to starting state. */
  reset(): void {
    this.health = this.maxHealth;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.fireCooldown = 0;
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.mesh.visible = true;
    this.mesh.position.set(
      PLAYER_CONFIG.initialPosition.x,
      PLAYER_CONFIG.initialPosition.y,
      0,
    );
  }

  /** Update player each tick: movement, firing, power-up timers. */
  update(dt: number, input: InputSystem, bulletSystem: PlayerBulletSystem): void {
    this.handleMovement(dt, input);
    this.handleFiring(dt, bulletSystem);
    this.handleInvincibility(dt);
    this.handlePowerupTimer(dt, bulletSystem);
  }

  private handleMovement(dt: number, input: InputSystem): void {
    const speed = PLAYER_CONFIG.moveSpeed;
    const halfW = GAME_CONFIG.playArea.width / 2;
    const halfH = GAME_CONFIG.playArea.height / 2;

    // Pointer/touch drag takes priority
    const pointer = input.getPointerWorldPosition();
    if (input.isDragging && pointer) {
      // Lerp toward pointer for smoother feel
      const lerpSpeed = 15;
      this.mesh.position.x += (pointer.x - this.mesh.position.x) * Math.min(1, lerpSpeed * dt);
      this.mesh.position.y += (pointer.y - this.mesh.position.y) * Math.min(1, lerpSpeed * dt);
    } else {
      // Keyboard
      let dx = 0;
      let dy = 0;
      if (input.isKeyDown('arrowleft') || input.isKeyDown('a')) dx -= 1;
      if (input.isKeyDown('arrowright') || input.isKeyDown('d')) dx += 1;
      if (input.isKeyDown('arrowup') || input.isKeyDown('w')) dy += 1;
      if (input.isKeyDown('arrowdown') || input.isKeyDown('s')) dy -= 1;

      // Normalise diagonal
      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.SQRT2;
        dx *= inv;
        dy *= inv;
      }

      this.mesh.position.x += dx * speed * dt;
      this.mesh.position.y += dy * speed * dt;
    }

    // Clamp to play area
    this.mesh.position.x = Math.max(-halfW + 0.5, Math.min(halfW - 0.5, this.mesh.position.x));
    this.mesh.position.y = Math.max(-halfH + 0.5, Math.min(halfH - 0.5, this.mesh.position.y));
  }

  private handleFiring(dt: number, bulletSystem: PlayerBulletSystem): void {
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = this.fireInterval;

      const x = this.mesh.position.x;
      const y = this.mesh.position.y + 0.8; // fire from nose

      const damage = this.activePowerup === 'damage_boost'
        ? PLAYER_CONFIG.bulletDamage * POWERUP_CONFIG.damageBoostMultiplier
        : PLAYER_CONFIG.bulletDamage;

      if (this.activePowerup === 'multishot') {
        bulletSystem.fireMulti(x, y, damage, POWERUP_CONFIG.multishotBulletCount, PLAYER_CONFIG.multiShotOffset);
      } else {
        bulletSystem.fire(x, y, damage);
      }
    }
  }

  private handleInvincibility(dt: number): void {
    if (!this.invincible) return;

    this.invincibilityTimer -= dt;
    this.flashTimer -= dt;

    // Flash effect: toggle visibility every 0.1s
    if (this.flashTimer <= 0) {
      this.flashTimer = 0.1;
      this.mesh.visible = !this.mesh.visible;
    }

    if (this.invincibilityTimer <= 0) {
      this.invincible = false;
      this.mesh.visible = true;
    }
  }

  private handlePowerupTimer(dt: number, bulletSystem: PlayerBulletSystem): void {
    if (this.activePowerup === null) return;

    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      // Power-up expired
      if (this.activePowerup === 'damage_boost') {
        bulletSystem.setDamageBoost(false);
      }
      this.activePowerup = null;
      this.powerupTimer = 0;
    }
  }

  /** Apply damage. Returns true if player died. */
  takeDamage(): boolean {
    if (this.invincible) return false;

    this.health -= 1;
    if (this.health <= 0) {
      this.health = 0;
      return true;
    }

    // Start invincibility
    this.invincible = true;
    this.invincibilityTimer = PLAYER_CONFIG.invincibilityDuration;
    this.flashTimer = 0.1;
    return false;
  }

  isInvincible(): boolean {
    return this.invincible;
  }

  /** Apply a power-up effect. */
  applyPowerup(type: PowerupType, bulletSystem: PlayerBulletSystem): void {
    if (type === 'bomb') {
      // Bomb is instant — handled externally
      return;
    }

    const stats = POWERUP_CONFIG.types[type];
    this.activePowerup = type;
    this.powerupTimer = stats.duration;

    if (type === 'damage_boost') {
      bulletSystem.setDamageBoost(true);
    }
  }

  /** Get current active power-up info for HUD. */
  getActivePowerup(): { type: PowerupType; remaining: number } | null {
    if (this.activePowerup === null) return null;
    return { type: this.activePowerup, remaining: this.powerupTimer };
  }

  /** Clear all active effects (for reset). */
  clearEffects(bulletSystem: PlayerBulletSystem): void {
    if (this.activePowerup === 'damage_boost') {
      bulletSystem.setDamageBoost(false);
    }
    this.activePowerup = null;
    this.powerupTimer = 0;
  }
}
