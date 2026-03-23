/**
 * Scene interface — every game scene implements these lifecycle hooks.
 */
export interface GameScene {
  /** Called when the scene becomes active. */
  enter(): void;
  /** Called once per fixed-timestep update tick. */
  update(dt: number): void;
  /** Called once per animation frame for rendering. */
  render(): void;
  /** Called when leaving this scene. */
  exit(): void;
}

/**
 * SceneManager — owns the lifecycle of registered game scenes.
 * Handles transitions: exit current → enter next.
 */
export class SceneManager {
  private scenes = new Map<string, GameScene>();
  private currentScene: GameScene | null = null;
  private currentName = '';

  /** Register a scene by name. */
  register(name: string, scene: GameScene): void {
    this.scenes.set(name, scene);
  }

  /** Transition to a named scene. */
  switchTo(name: string): void {
    const next = this.scenes.get(name);
    if (!next) {
      console.error(`SceneManager: scene "${name}" not registered`);
      return;
    }
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentName = name;
    this.currentScene = next;
    this.currentScene.enter();
  }

  /** Forward update to the active scene. */
  update(dt: number): void {
    this.currentScene?.update(dt);
  }

  /** Forward render to the active scene. */
  render(): void {
    this.currentScene?.render();
  }

  /** Get the name of the currently active scene. */
  getCurrentName(): string {
    return this.currentName;
  }
}
