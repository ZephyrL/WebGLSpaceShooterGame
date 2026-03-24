import GUI from 'lil-gui';
import { runtimeConfig } from './runtimeConfig';
import type { EnemyType } from '../config/enemyConfig';
import type { TimeControl } from '../engine/timeControl';
import type { CameraSystem } from '../engine/cameraSystem';
import type { HUD } from '../gameplay/hud';

// ── Dev context: references wired in from battleScene ─────────────────

export interface DevContext {
  timeControl: TimeControl;
  cameraSystem: CameraSystem;
  hud: HUD;
  triggerBomb: () => void;
}

// ── DevPanel ──────────────────────────────────────────────────────────

export class DevPanel {
  private gui: GUI;
  private ctx: DevContext;

  // Proxy objects for lil-gui bindings
  private cameraProxy = { x: 0, y: -20, z: 8, lx: 0, ly: 0, lz: 0 };
  private speedProxy = { timeScale: 1.0 };

  constructor(ctx: DevContext) {
    this.ctx = ctx;

    this.gui = new GUI({ title: 'Dev Panel', width: 300 });
    this.gui.domElement.style.zIndex = '9999';

    this.buildUIControls();
    this.buildDebugActions();
    this.buildTimeControl();
    this.buildPlayerStats();
    this.buildEnemyStats();
    this.buildWaveEditor();
    this.buildSaveLoad();

    // Top-level save button (always visible)
    this.gui.add({ save: () => {
      runtimeConfig.save();
      this.refreshArchiveList();
    } }, 'save').name('💾 SAVE CONFIG');
  }

  // ── UI Controls ───────────────────────────────────────────────────

  private buildUIControls(): void {
    const folder = this.gui.addFolder('UI Controls');
    const proxy = { showHUD: true, showDebugLabels: runtimeConfig.game.debug.showLabels };

    folder.add(proxy, 'showHUD').name('Show HUD').onChange((v: boolean) => {
      if (v) this.ctx.hud.show();
      else this.ctx.hud.hide();
    });

    folder.add(proxy, 'showDebugLabels').name('Debug Labels').onChange((v: boolean) => {
      runtimeConfig.game.debug.showLabels = v;
    });

    folder.close();
  }

  // ── Debug Actions ─────────────────────────────────────────────────

  private buildDebugActions(): void {
    const folder = this.gui.addFolder('Debug Actions');

    folder.add({ triggerBomb: () => this.ctx.triggerBomb() }, 'triggerBomb').name('💣 Trigger Bomb');

    // Camera mode toggle (above position controls so user switches first)
    const camModeProxy = { cinematic: false };
    folder.add(camModeProxy, 'cinematic').name('Cinematic Camera').onChange((v: boolean) => {
      if (v) this.ctx.cameraSystem.transitionToCinematic(0.5);
      else this.ctx.cameraSystem.transitionToGameplay(0.5);
    });

    // Cinematic camera position — init from current cinematic camera
    const cineCam = this.ctx.cameraSystem.cinematicCamera;
    this.cameraProxy.x = cineCam.position.x;
    this.cameraProxy.y = cineCam.position.y;
    this.cameraProxy.z = cineCam.position.z;

    const camFolder = folder.addFolder('Cinematic Position');
    const updateCamPos = () => {
      this.ctx.cameraSystem.setCinematicPosition(
        this.cameraProxy.x, this.cameraProxy.y, this.cameraProxy.z,
      );
    };
    camFolder.add(this.cameraProxy, 'x', -50, 50, 0.5).name('Pos X').onChange(updateCamPos);
    camFolder.add(this.cameraProxy, 'y', -50, 50, 0.5).name('Pos Y').onChange(updateCamPos);
    camFolder.add(this.cameraProxy, 'z', 0.5, 100, 0.5).name('Pos Z').onChange(updateCamPos);

    const lookFolder = folder.addFolder('Cinematic LookAt');
    const updateCamLook = () => {
      this.ctx.cameraSystem.setCinematicLookAt(
        this.cameraProxy.lx, this.cameraProxy.ly, this.cameraProxy.lz,
      );
    };
    lookFolder.add(this.cameraProxy, 'lx', -30, 30, 0.5).name('Look X').onChange(updateCamLook);
    lookFolder.add(this.cameraProxy, 'ly', -30, 30, 0.5).name('Look Y').onChange(updateCamLook);
    lookFolder.add(this.cameraProxy, 'lz', -30, 30, 0.5).name('Look Z').onChange(updateCamLook);

    folder.close();
  }

  // ── Time Control ──────────────────────────────────────────────────

  private buildTimeControl(): void {
    const folder = this.gui.addFolder('Time Control');
    this.speedProxy.timeScale = this.ctx.timeControl.timeScale;

    const speedOptions: Record<string, number> = {
      '⏸ Paused (0x)': 0,
      '0.25x': 0.25,
      '0.33x': 0.33,
      '0.5x': 0.5,
      '1x (Normal)': 1,
      '1.5x': 1.5,
      '2x': 2,
      '3x': 3,
    };

    folder.add(this.speedProxy, 'timeScale', speedOptions)
      .name('Game Speed')
      .onChange((v: number) => {
        this.ctx.timeControl.timeScale = v;
      });

    folder.close();
  }

  // ── Player Stats ──────────────────────────────────────────────────

  private buildPlayerStats(): void {
    const folder = this.gui.addFolder('Player Stats');
    const p = runtimeConfig.player;

    folder.add(p, 'moveSpeed', 1, 30, 0.5).name('Move Speed');
    folder.add(p, 'fireRate', 1, 20, 0.5).name('Fire Rate');
    folder.add(p, 'startingHealth', 1, 20, 1).name('Starting Health');
    folder.add(p, 'invincibilityDuration', 0.1, 5, 0.1).name('Invincibility (s)');
    folder.add(p, 'bulletSpeed', 5, 50, 1).name('Bullet Speed');
    folder.add(p, 'bulletDamage', 1, 20, 1).name('Bullet Damage');
    folder.add(p, 'multiShotOffset', 0.1, 3, 0.1).name('Multi-Shot Offset');

    folder.close();
  }

  // ── Enemy Stats ───────────────────────────────────────────────────

  private buildEnemyStats(): void {
    const folder = this.gui.addFolder('Enemy Stats');
    const types: EnemyType[] = ['drone', 'fighter', 'bomber'];

    for (const type of types) {
      const sub = folder.addFolder(type);
      const stats = runtimeConfig.enemy[type];

      sub.add(stats, 'health', 1, 20, 1).name('Health');
      sub.add(stats, 'moveSpeed', 0.5, 15, 0.5).name('Move Speed');
      sub.add(stats, 'pointValue', 10, 500, 10).name('Point Value');

      if (stats.fireRate !== undefined) {
        sub.add(stats, 'fireRate', 0, 5, 0.1).name('Fire Rate');
      }
      if ('sineAmplitude' in stats && stats.sineAmplitude !== undefined) {
        sub.add(stats, 'sineAmplitude', 0, 10, 0.5).name('Sine Amplitude');
      }
      if ('sineFrequency' in stats && stats.sineFrequency !== undefined) {
        sub.add(stats, 'sineFrequency', 0, 5, 0.1).name('Sine Frequency');
      }
      if ('spreadAngle' in stats && stats.spreadAngle !== undefined) {
        sub.add(stats, 'spreadAngle', 5, 90, 5).name('Spread Angle');
      }

      sub.close();
    }

    // Enemy bullet speed
    const bulletProxy = { speed: runtimeConfig.enemyBulletSpeed };
    folder.add(bulletProxy, 'speed', 1, 30, 0.5)
      .name('Enemy Bullet Speed')
      .onChange((v: number) => { runtimeConfig.enemyBulletSpeed = v; });

    folder.close();
  }

  // ── Wave Editor ───────────────────────────────────────────────────

  private waveFolder!: GUI;

  private buildWaveEditor(): void {
    this.waveFolder = this.gui.addFolder('Wave Editor');
    this.rebuildWaveEntries();
    this.waveFolder.close();
  }

  private rebuildWaveEntries(): void {
    // Clear all existing controllers and sub-folders
    while (this.waveFolder.children.length > 0) {
      this.waveFolder.children[this.waveFolder.children.length - 1]!.destroy();
    }

    const waves = runtimeConfig.waves;
    const enemyTypes: EnemyType[] = ['drone', 'fighter', 'bomber'];

    for (let wi = 0; wi < waves.length; wi++) {
      const wave = waves[wi]!;
      const wf = this.waveFolder.addFolder(`Wave ${wi + 1}`);

      wf.add(wave, 'postWaveDelay', 0, 10, 0.5).name('Post-Wave Delay');

      for (let ei = 0; ei < wave.entries.length; ei++) {
        const entry = wave.entries[ei]!;
        const ef = wf.addFolder(`Entry ${ei + 1}`);

        ef.add(entry, 'type', enemyTypes).name('Enemy Type');
        ef.add(entry, 'count', 1, 50, 1).name('Count');
        ef.add(entry, 'spawnInterval', 0.1, 5, 0.1).name('Spawn Interval');

        // Remove entry button
        const capturedWi = wi;
        const capturedEi = ei;
        ef.add({ remove: () => {
          waves[capturedWi]!.entries.splice(capturedEi, 1);
          this.rebuildWaveEntries();
        } }, 'remove').name('🗑 Remove Entry');

        ef.close();
      }

      // Add entry button
      const capturedIdx = wi;
      wf.add({ add: () => {
        waves[capturedIdx]!.entries.push({ type: 'drone', count: 5, spawnInterval: 0.8 });
        this.rebuildWaveEntries();
      } }, 'add').name('+ Add Entry');

      wf.close();
    }

    // Add wave button
    this.waveFolder.add({ add: () => {
      waves.push({ entries: [{ type: 'drone', count: 5, spawnInterval: 0.8 }], postWaveDelay: 2 });
      this.rebuildWaveEntries();
    } }, 'add').name('+ Add Wave');
  }

  // ── Save / Load ───────────────────────────────────────────────────

  private buildSaveLoad(): void {
    const folder = this.gui.addFolder('Save / Load');

    folder.add({ save: () => {
      runtimeConfig.save();
      this.refreshArchiveList();
    } }, 'save').name('💾 Save Config');

    folder.add({ reset: () => {
      runtimeConfig.reset();
      this.gui.destroy();
      this.gui = new GUI({ title: 'Dev Panel', width: 300 });
      this.gui.domElement.style.zIndex = '9999';
      this.buildUIControls();
      this.buildDebugActions();
      this.buildTimeControl();
      this.buildPlayerStats();
      this.buildEnemyStats();
      this.buildWaveEditor();
      this.buildSaveLoad();
    } }, 'reset').name('🔄 Reset to Defaults');

    // Archive dropdown
    this.archiveProxy = { index: 0 };
    this.archiveController = folder.add(this.archiveProxy, 'index', this.getArchiveOptions())
      .name('Archive');

    folder.add({ restore: () => {
      runtimeConfig.restoreArchive(this.archiveProxy.index);
      this.gui.destroy();
      this.gui = new GUI({ title: 'Dev Panel', width: 300 });
      this.gui.domElement.style.zIndex = '9999';
      this.buildUIControls();
      this.buildDebugActions();
      this.buildTimeControl();
      this.buildPlayerStats();
      this.buildEnemyStats();
      this.buildWaveEditor();
      this.buildSaveLoad();
    } }, 'restore').name('📂 Restore Archive');

    // Export / Import
    folder.add({ exportJSON: () => {
      const json = runtimeConfig.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spaceshooter-config-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } }, 'exportJSON').name('📤 Export JSON');

    folder.add({ importJSON: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            runtimeConfig.importJSON(reader.result as string);
            // Rebuild panel to reflect new values
            this.gui.destroy();
            this.gui = new GUI({ title: 'Dev Panel', width: 300 });
            this.gui.domElement.style.zIndex = '9999';
            this.buildUIControls();
            this.buildDebugActions();
            this.buildTimeControl();
            this.buildPlayerStats();
            this.buildEnemyStats();
            this.buildWaveEditor();
            this.buildSaveLoad();
          } catch (e) {
            console.error('[DevPanel] Failed to import JSON:', e);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } }, 'importJSON').name('📥 Import JSON');

    folder.open();
  }

  private archiveProxy = { index: 0 };
  private archiveController: ReturnType<GUI['add']> | null = null;

  private getArchiveOptions(): Record<string, number> {
    const archives = runtimeConfig.listArchives();
    if (archives.length === 0) return { '(none)': 0 };
    const opts: Record<string, number> = {};
    for (let i = 0; i < archives.length; i++) {
      const a = archives[i]!;
      opts[`${a.label} — ${a.timestamp.slice(0, 19)}`] = i;
    }
    return opts;
  }

  private refreshArchiveList(): void {
    if (this.archiveController) {
      this.archiveController.options(this.getArchiveOptions());
    }
  }

  destroy(): void {
    this.gui.destroy();
  }
}
