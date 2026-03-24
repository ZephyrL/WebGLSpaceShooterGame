import { DevPanel } from './devPanel';
import type { DevContext } from './devPanel';
import type { BattleScene } from '../gameplay/battleScene';
import type { CameraSystem } from '../engine/cameraSystem';

/**
 * Initialise the dev panel and wire it to the game systems.
 * Called once from main.ts, only in dev mode.
 */
export async function initDevPanel(battleScene: BattleScene, cameraSystem: CameraSystem): Promise<DevPanel> {
  await battleScene.whenPrepared;

  const devCtx = battleScene.getDevContext();

  const ctx: DevContext = {
    timeControl: devCtx.timeControl,
    cameraSystem,
    hud: devCtx.hud,
    triggerBomb: () => battleScene.triggerBomb(),
  };

  return new DevPanel(ctx);
}
