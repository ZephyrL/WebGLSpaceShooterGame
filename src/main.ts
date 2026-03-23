import { Renderer } from './engine/renderer';
import { SceneManager } from './engine/sceneManager';
import { GameLoop } from './engine/gameLoop';
import { CameraSystem } from './engine/cameraSystem';
import { InputSystem } from './engine/input';
import { StartScene } from './gameplay/startScene';
import { LoadingScene } from './gameplay/loadingScene';
import { BattleScene } from './gameplay/battleScene';

/**
 * Entry point — bootstraps the game engine and registers all scenes.
 */
function main(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Missing #app element');
    return;
  }

  // Engine systems
  const renderer = new Renderer(app);
  const cameraSystem = new CameraSystem();
  const input = new InputSystem();
  const sceneManager = new SceneManager();
  const gameLoop = new GameLoop(sceneManager);

  // Create battle scene (prepare is called during loading)
  const battleScene = new BattleScene(renderer, cameraSystem, input, sceneManager);

  // --- Register scenes ---

  // Start screen
  const startScene = new StartScene(() => {
    sceneManager.switchTo('loading');
  });
  sceneManager.register('start', startScene);

  // Loading screen — prepares battle scene resources, then transitions
  const loadingScene = new LoadingScene(
    () => battleScene.prepare(),
    () => sceneManager.switchTo('battle'),
  );
  sceneManager.register('loading', loadingScene);

  // Battle scene
  sceneManager.register('battle', battleScene);

  // --- Start the game ---
  sceneManager.switchTo('start');
  gameLoop.start();
}

main();
