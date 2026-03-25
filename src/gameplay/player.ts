import * as THREE from 'three';
import { getPlayerConfig, getPowerupConfig, getGameConfig } from '../dev/configBridge';
import type { PowerupType } from '../dev/configBridge';
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

  // Shield state (independent of activePowerup)
  private shieldActive = false;
  private shieldTimer = 0;
  private shieldEffect: THREE.Mesh | null = null;
  private shieldPulsePhase = 0;
  public devImmuneOverride = false;

  // Cached config
  private fireInterval: number;

  constructor() {
    this.mesh = createPlayerMesh();
    this.maxHealth = getPlayerConfig().startingHealth;
    this.health = this.maxHealth;
    this.fireInterval = 1 / getPlayerConfig().fireRate;

    this.mesh.position.set(
      getPlayerConfig().initialPosition.x,
      getPlayerConfig().initialPosition.y,
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
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldPulsePhase = 0;
    this.removeShieldEffect();
    this.mesh.visible = true;
    this.mesh.position.set(
      getPlayerConfig().initialPosition.x,
      getPlayerConfig().initialPosition.y,
      0,
    );
  }

  /** Update player each tick: movement, firing, power-up timers. */
  update(dt: number, input: InputSystem, bulletSystem: PlayerBulletSystem): void {
    this.handleMovement(dt, input);
    this.handleFiring(dt, bulletSystem);
    this.handleInvincibility(dt);
    this.handlePowerupTimer(dt, bulletSystem);
    this.handleShield(dt);
  }

  private handleMovement(dt: number, input: InputSystem): void {
    const speed = getPlayerConfig().moveSpeed;
    const halfW = getGameConfig().playArea.width / 2;
    const halfH = getGameConfig().playArea.height / 2;

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
        ? getPlayerConfig().bulletDamage * getPowerupConfig().damageBoostMultiplier
        : getPlayerConfig().bulletDamage;

      if (this.activePowerup === 'multishot') {
        bulletSystem.fireMulti(x, y, damage, getPowerupConfig().multishotBulletCount, getPlayerConfig().multiShotOffset);
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

  private handleShield(dt: number): void {
    if (this.shieldActive && !this.devImmuneOverride) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.removeShieldEffect();
        return;
      }
    }

    // Pulse the shield visual
    if (this.shieldActive || this.devImmuneOverride) {
      this.shieldPulsePhase += dt * 4;
      if (this.shieldEffect) {
        const scale = 1.0 + 0.15 * Math.sin(this.shieldPulsePhase);
        this.shieldEffect.scale.setScalar(scale);
        (this.shieldEffect.material as THREE.MeshStandardMaterial).opacity =
          0.25 + 0.15 * Math.sin(this.shieldPulsePhase);
      } else {
        this.addShieldEffect();
      }
    }
  }

  private addShieldEffect(): void {
    const geometry = new THREE.SphereGeometry(1.2, 16, 12);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.shieldEffect = new THREE.Mesh(geometry, material);
    this.mesh.add(this.shieldEffect);
  }

  private removeShieldEffect(): void {
    if (this.shieldEffect) {
      this.mesh.remove(this.shieldEffect);
      this.shieldEffect.geometry.dispose();
      (this.shieldEffect.material as THREE.MeshStandardMaterial).dispose();
      this.shieldEffect = null;
    }
  }

  /** Apply damage. Returns true if player died. */
  takeDamage(): boolean {
    if (this.invincible || this.shieldActive || this.devImmuneOverride) return false;

    this.health -= 1;
    if (this.health <= 0) {
      this.health = 0;
      return true;
    }

    // Start invincibility
    this.invincible = true;
    this.invincibilityTimer = getPlayerConfig().invincibilityDuration;
    this.flashTimer = 0.1;
    return false;
  }

  isInvincible(): boolean {
    return this.invincible || this.shieldActive || this.devImmuneOverride;
  }

  /** Apply a power-up effect. */
  applyPowerup(type: PowerupType, bulletSystem: PlayerBulletSystem): void {
    if (type === 'bomb') {
      // Bomb is instant — handled externally
      return;
    }

    if (type === 'shield') {
      const stats = getPowerupConfig().types.shield;
      this.shieldActive = true;
      this.shieldTimer = stats.duration;
      this.shieldPulsePhase = 0;
      return;
    }

    const stats = getPowerupConfig().types[type];
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

  /** Get shield status for HUD. */
  getShieldStatus(): { remaining: number; isDev: boolean } | null {
    if (this.devImmuneOverride) return { remaining: 0, isDev: true };
    if (this.shieldActive) return { remaining: this.shieldTimer, isDev: false };
    return null;
  }

  /** Clear all active effects (for reset). */
  clearEffects(bulletSystem: PlayerBulletSystem): void {
    if (this.activePowerup === 'damage_boost') {
      bulletSystem.setDamageBoost(false);
    }
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.removeShieldEffect();
  }
}
