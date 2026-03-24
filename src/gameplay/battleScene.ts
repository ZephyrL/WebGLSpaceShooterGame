import * as THREE from 'three';
import { GameScene } from '../engine/sceneManager';
import { SceneManager } from '../engine/sceneManager';
import { Renderer } from '../engine/renderer';
import { CameraSystem } from '../engine/cameraSystem';
import { InputSystem } from '../engine/input';
import { TimeControl } from '../engine/timeControl';
import { getGameConfig, getPlayerConfig } from '../dev/configBridge';
import { Player } from './player';
import { PlayerBulletSystem } from './playerBullets';
import { EnemyBulletSystem } from './enemyBullets';
import { EnemySystem } from './enemies';
import { WaveManager } from './waveManager';
import { PowerupSystem } from './powerups';
import { CollisionManager } from './collisionManager';
import { HUD } from './hud';
import { PauseMenu } from './pauseMenu';
import { DebugLabelSystem } from '../engine/placeholderFactory';

/**
 * BattleScene — the main 3D gameplay scene.
 *
 * Implements the GameScene interface. Owns the Three.js scene, all gameplay
 * systems, and orchestrates the update/render loop.
 */
export class BattleScene implements GameScene {
  private renderer: Renderer;
  private cameraSystem: CameraSystem;
  private input: InputSystem;
  private sceneManager: SceneManager;

  private scene!: THREE.Scene;
  private player!: Player;
  private playerBullets!: PlayerBulletSystem;
  private enemyBullets!: EnemyBulletSystem;
  private enemies!: EnemySystem;
  private waveManager!: WaveManager;
  private powerups!: PowerupSystem;
  private collisionManager!: CollisionManager;
  private hud!: HUD;
  private debugLabels!: DebugLabelSystem;
  private timeControl!: TimeControl;
  private pauseMenu!: PauseMenu;

  // Starfield
  private starPoints!: THREE.Points;
  private starPositions!: Float32Array;

  // Game state
  private gameOver = false;
  private gameOverOverlay: HTMLDivElement | null = null;

  // Bomb flash effect
  private flashOverlay: HTMLDivElement | null = null;
  private flashTimer = 0;

  private prepared = false;
  private _resolvePrepared!: () => void;
  /** Resolves when prepare() has completed. Safe to await multiple times. */
  public readonly whenPrepared = new Promise<void>((r) => { this._resolvePrepared = r; });

  constructor(renderer: Renderer, cameraSystem: CameraSystem, input: InputSystem, sceneManager: SceneManager) {
    this.renderer = renderer;
    this.cameraSystem = cameraSystem;
    this.input = input;
    this.sceneManager = sceneManager;
  }

  /** Prepare all 3D resources (called from loading scene). */
  async prepare(): Promise<void> {
    if (this.prepared) return;

    this.scene = new THREE.Scene();

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 15);
    this.scene.add(directional);

    // Starfield
    this.createStarfield();

    // Systems
    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.playerBullets = new PlayerBulletSystem();
    this.playerBullets.attachToScene(this.scene);

    this.enemyBullets = new EnemyBulletSystem();
    this.enemyBullets.attachToScene(this.scene);

    this.enemies = new EnemySystem();
    this.enemies.attachToScene(this.scene);

    this.powerups = new PowerupSystem();
    this.powerups.attachToScene(this.scene);

    this.waveManager = new WaveManager();
    this.collisionManager = new CollisionManager();
    this.hud = new HUD();
    this.debugLabels = new DebugLabelSystem();
    this.timeControl = new TimeControl();

    // Pause menu
    this.pauseMenu = new PauseMenu({
      onResume: () => this.togglePause(),
      onRestart: () => {
        if (this.timeControl.paused) this.togglePause();
        this.restart();
      },
      onQuit: () => {
        if (this.timeControl.paused) this.togglePause();
        this.sceneManager.switchTo('start');
      },
    });

    // Wire HUD pause button
    this.hud.onPauseClick = () => this.togglePause();

    // Wire collision callbacks
    this.collisionManager.onEnemyDestroyed = (enemy) => {
      this.hud.addScore(enemy.stats.pointValue);
      this.powerups.tryDrop(enemy.mesh.position.x, enemy.mesh.position.y);
    };

    this.collisionManager.onPlayerDied = () => {
      this.showGameOver();
    };

    this.collisionManager.onBombTriggered = () => {
      this.showFlash();
    };

    // Wave start callback
    this.waveManager.onWaveStart = (waveNum) => {
      this.hud.showWave(waveNum);
    };

    // Bind input to canvas + camera
    this.input.bind(this.renderer.domElement, this.cameraSystem.gameplayCamera);

    // Debug labels
    this.debugLabels.setCamera(this.cameraSystem.gameplayCamera);
    this.debugLabels.addLabel(this.player.mesh, '[PLAYER SHIP]');

    this.prepared = true;
    this._resolvePrepared();
  }

  enter(): void {
    // Reset game state
    this.gameOver = false;
    this.player.reset();
    this.playerBullets.releaseAll();
    this.enemyBullets.releaseAll();
    this.enemies.releaseAll();
    this.powerups.releaseAll();
    this.player.clearEffects(this.playerBullets);
    this.timeControl.reset();

    // HUD
    this.hud.attach();
    this.hud.reset(getPlayerConfig().startingHealth);
    this.hud.show();

    // Start waves
    this.waveManager.start();

    // Create flash overlay
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: #fff; opacity: 0; pointer-events: none; z-index: 50;
      transition: opacity 0.15s;
    `;
    document.getElementById('app')?.appendChild(this.flashOverlay);
  }

  update(dt: number): void {
    // ESC key toggles pause (edge-triggered, blocked during game-over)
    if (!this.gameOver && this.input.wasKeyPressed('escape')) {
      this.togglePause();
    }

    // Always update camera transitions even when paused
    this.cameraSystem.update(dt);

    // If paused or game-over, skip gameplay updates
    if (this.timeControl.paused || this.gameOver) {
      // Still update HUD timer display (frozen value) and end frame
      this.hud.setSessionTime(this.timeControl.sessionElapsed);
      this.input.endFrame();
      return;
    }

    // Get effective dt from time control (also accumulates session time)
    const effectiveDt = this.timeControl.update(dt);

    // Player
    this.player.update(effectiveDt, this.input, this.playerBullets);

    // Set player position for enemy aimed shots
    this.enemies.setPlayerPosition(this.player.mesh.position.x, this.player.mesh.position.y);

    // Bullets
    this.playerBullets.update(effectiveDt);
    this.enemyBullets.update(effectiveDt);

    // Enemies
    this.enemies.update(effectiveDt, this.enemyBullets);

    // Waves
    this.waveManager.update(effectiveDt, this.enemies);

    // Power-ups
    this.powerups.update(effectiveDt);

    // Collisions
    this.collisionManager.update(
      this.player, this.playerBullets, this.enemyBullets,
      this.enemies, this.powerups, this.cameraSystem,
    );

    // HUD updates
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setPowerup(this.player.getActivePowerup());
    this.hud.setSessionTime(this.timeControl.sessionElapsed);
    this.hud.update(effectiveDt);

    // Starfield scroll
    this.updateStarfield(effectiveDt);

    // Flash effect timer
    if (this.flashTimer > 0) {
      this.flashTimer -= effectiveDt;
      if (this.flashTimer <= 0 && this.flashOverlay) {
        this.flashOverlay.style.opacity = '0';
      }
    }

    // Debug labels
    this.debugLabels.update();

    // Check if all waves done and no enemies left
    if (this.waveManager.isComplete() && this.enemies.activeCount() === 0) {
      this.showGameOver(true);
    }

    // Snapshot key state for edge detection
    this.input.endFrame();
  }

  render(): void {
    const camera = this.cameraSystem.getActiveCamera();
    this.renderer.render(this.scene, camera);
  }

  exit(): void {
    this.collisionManager.clearPendingTimers();
    this.input.unbindCanvas();
    this.hud.detach();
    this.gameOverOverlay?.remove();
    this.gameOverOverlay = null;
    this.flashOverlay?.remove();
    this.flashOverlay = null;
    this.pauseMenu.hide();
    if (this.timeControl.paused) {
      this.timeControl.paused = false;
    }
  }

  // --- Starfield ---

  private createStarfield(): void {
    const { count } = getGameConfig().starfield;
    const { width, height } = getGameConfig().playArea;

    const geometry = new THREE.BufferGeometry();
    this.starPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.starPositions[i * 3] = (Math.random() - 0.5) * width * 1.5;     // x
      this.starPositions[i * 3 + 1] = (Math.random() - 0.5) * height * 1.5; // y
      this.starPositions[i * 3 + 2] = -1 + Math.random() * -5;              // z (behind entities)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      sizeAttenuation: true,
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
  }

  private updateStarfield(dt: number): void {
    const speed = getGameConfig().starfield.speed;
    const halfH = getGameConfig().playArea.height * 0.75;

    for (let i = 0; i < this.starPositions.length / 3; i++) {
      const idx = i * 3 + 1;
      this.starPositions[idx]! -= speed * dt;
      if (this.starPositions[idx]! < -halfH) {
        this.starPositions[idx] = halfH;
      }
    }
    this.starPoints.geometry.attributes['position']!.needsUpdate = true;
  }

  // --- Game Over ---

  private showGameOver(victory = false): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.hud.hidePauseButton();

    this.gameOverOverlay = document.createElement('div');
    this.gameOverOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.7); z-index: 200;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    const title = document.createElement('h1');
    title.textContent = victory ? 'VICTORY!' : 'GAME OVER';
    title.style.cssText = `
      font-size: 52px; color: ${victory ? '#4f4' : '#f44'};
      text-shadow: 0 0 20px ${victory ? 'rgba(68,255,68,0.6)' : 'rgba(255,68,68,0.6)'};
      margin-bottom: 20px;
    `;
    this.gameOverOverlay.appendChild(title);

    const scoreText = document.createElement('p');
    scoreText.textContent = `Final Score: ${this.hud.getScore()}`;
    scoreText.style.cssText = `
      font-size: 28px; color: #fff; margin-bottom: 40px;
    `;
    this.gameOverOverlay.appendChild(scoreText);

    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'PLAY AGAIN';
    restartBtn.style.cssText = `
      padding: 14px 40px; font-size: 20px; font-weight: bold;
      color: #fff; background: linear-gradient(135deg, #0066cc, #0044aa);
      border: 2px solid #4af; border-radius: 8px; cursor: pointer;
      text-shadow: 0 0 8px rgba(68,170,255,0.6);
      box-shadow: 0 0 20px rgba(68,170,255,0.3);
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    restartBtn.addEventListener('click', () => {
      this.restart();
    });
    this.gameOverOverlay.appendChild(restartBtn);

    // Keyboard shortcut
    this.gameOverKeyHandler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.restart();
      }
    };
    window.addEventListener('keydown', this.gameOverKeyHandler);

    document.getElementById('app')?.appendChild(this.gameOverOverlay);
  }

  private gameOverKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  private restart(): void {
    // Clean up overlay
    if (this.gameOverKeyHandler) {
      window.removeEventListener('keydown', this.gameOverKeyHandler);
      this.gameOverKeyHandler = null;
    }
    this.gameOverOverlay?.remove();
    this.gameOverOverlay = null;

    // Reset all systems
    this.gameOver = false;
    this.player.reset();
    this.player.clearEffects(this.playerBullets);
    this.playerBullets.releaseAll();
    this.enemyBullets.releaseAll();
    this.enemies.releaseAll();
    this.powerups.releaseAll();

    this.hud.reset(getPlayerConfig().startingHealth);
    this.waveManager.start();
    this.timeControl.reset();
    this.hud.showPauseButton();
  }

  // --- Pause ---

  private togglePause(): void {
    if (this.gameOver) return;

    const nowPaused = this.timeControl.togglePause();
    if (nowPaused) {
      this.pauseMenu.show();
    } else {
      this.pauseMenu.hide();
    }
  }

  // --- Bomb Flash ---

  private showFlash(): void {
    if (!this.flashOverlay) return;
    this.flashOverlay.style.opacity = '0.8';
    this.flashTimer = 0.3;
  }

  // --- Dev Mode Hooks ---

  /** Expose system references for the dev panel (dev mode only). */
  getDevContext() {
    return {
      timeControl: this.timeControl,
      hud: this.hud,
      player: this.player,
      enemies: this.enemies,
      playerBullets: this.playerBullets,
      enemyBullets: this.enemyBullets,
      powerups: this.powerups,
      waveManager: this.waveManager,
    };
  }

  /** Trigger a bomb effect: flash + clear all enemies and enemy bullets. */
  triggerBomb(): void {
    this.enemies.pool.forEachActive((enemy) => {
      this.enemies.pool.release(enemy);
    });
    this.enemyBullets.releaseAll();
    this.cameraSystem.transitionToCinematic(0.7);
    setTimeout(() => {
      this.cameraSystem.transitionToGameplay(0.7);
    }, 1500);
    this.showFlash();
  }
}
