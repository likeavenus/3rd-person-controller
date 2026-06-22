import {
  Clock,
  Group,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  DirectionalLight,
  AmbientLight,
  Vector2,
  WebGLRenderTarget,
  Vector3,
} from "three";
import { PerformanceManager } from "./utils/PerformanceManager";
import { SceneManager } from "./core/SceneManager";
import { CameraManager } from "./core/CameraManager";
import { RendererManager } from "./core/RendererManager";
import { LightingManager } from "./core/LightingManager";
import { Environment } from "./environment/Environment";
import { CosmosBackground } from "./environment/CosmosBackground";
import { BlackHole } from "./environment/BlackHole";
import { InputManager } from "./input/InputManager";
import { CameraController } from "./camera/CameraController";
import { Character } from "./character/Character";
import { LoadingScreen } from "./ui/LoadingScreen";
import { PointerLockPrompt } from "./ui/PointerLockPrompt";
import { ParticleTunnel } from "./effects/ParticleTunnel";
import { ScreenFX } from "./effects/ScreenFX";
import { PointsOfInterest } from "./world/PointsOfInterest";
import { AboutPanel } from "./ui/AboutPanel";

export class Game {
  sceneManager;
  cameraManager;
  rendererManager;
  lightingManager;
  environment;
  cosmosBackground;
  blackHole;
  character = null;
  inputManager;
  cameraController;
  clock;
  loader;
  isReady = false;
  isActive = false;
  landingZoneGroup;
  isIn4DSpace = false;
  timeScale = 1;
  backgroundRenderTarget;
  particleTunnel = null;
  targetFrameTime = 16;

  mode = "world";
  warpStarted = false;
  isRespawning = false;
  screenFX;
  pointsOfInterest = null;
  aboutPanel = null;
  spawnPos = new Vector3(0, 0, 28);

  pointerLockPrompt;
  constructor() {
    this.clock = new Clock();
    this.loader = new LoadingScreen();
    this.pointerLockPrompt = new PointerLockPrompt();
    const e = PerformanceManager.getOptimalSettings();
    this.targetFrameTime = 1000 / e.targetFPS;
    console.log(`🎯 Target FPS: ${e.targetFPS}`);
    this.init();
  }

  async init() {
    this.loader.updateProgress(0.1);
    this.sceneManager = new SceneManager();
    this.rendererManager = new RendererManager();
    this.cameraManager = new CameraManager();
    const e = new Vector2();
    this.rendererManager.renderer.getSize(e);
    this.backgroundRenderTarget = new WebGLRenderTarget(e.x, e.y);
    this.screenFX = new ScreenFX(e);

    this.landingZoneGroup = new Group();
    const t = new PlaneGeometry(100, 100);
    const n = new MeshStandardMaterial({ color: 3355443, roughness: 0.8 });
    const i = new Mesh(t, n);
    i.rotation.x = -Math.PI / 2;
    i.receiveShadow = true;
    this.landingZoneGroup.add(i);
    const r = new DirectionalLight(16777215, 0.8);
    r.position.set(20, 50, 20);
    r.castShadow = true;
    this.landingZoneGroup.add(r);
    const a = new AmbientLight(16777215, 0.3);
    this.landingZoneGroup.add(a);
    this.landingZoneGroup.visible = false;
    this.sceneManager.scene.add(this.landingZoneGroup);

    this.lightingManager = new LightingManager(this.sceneManager.scene);
    this.environment = new Environment(this.sceneManager.scene);
    this.loader.updateProgress(0.4);
    this.cosmosBackground = new CosmosBackground(this.sceneManager.scene);
    this.blackHole = new BlackHole(this.sceneManager.scene, e);
    this.particleTunnel = new ParticleTunnel(this.sceneManager.scene);
    this.loader.updateProgress(0.6);
    this.inputManager = new InputManager();
    this.cameraController = new CameraController(this.cameraManager.camera, this.inputManager);
    this.loader.updateProgress(0.7);
    await this.initCharacter();

    // Точки интереса вдоль пути к чёрной дыре + панель «обо мне»
    this.pointsOfInterest = new PointsOfInterest(this.sceneManager.scene);
    this.aboutPanel = new AboutPanel();
    try {
      this.rendererManager.renderer.compile(this.landingZoneGroup, this.cameraManager.camera);
      console.log("⚡ Шейдеры LandingZone скомпилированы заранее!");
    } catch (o) {
      console.warn("Pre-compile не поддерживается", o);
    }
    this.loader.updateProgress(1);
    setTimeout(() => {
      this.loader.hide();
      this.isReady = true;
      console.log("✅ Игра готова!");
    }, 300);
    this.animate();
    window.addEventListener("resize", () => this.onWindowResize());
  }

  async initCharacter() {
    this.character = new Character(this.sceneManager.scene, this.inputManager, this.cameraManager.camera);
    await this.character.load();
    this.character.setPosition(this.spawnPos.clone());
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const t = this.clock.getDelta() * this.timeScale;

    this.cameraManager.update(t);
    this.updateWorld(t);

    this.screenFX.update(t);
    this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
    this.screenFX.render(this.rendererManager.renderer);
  };

  updateWorld(t) {
    if (this.character && this.isReady) {
      this.character.update(t);
      this.cameraController.update(this.character.getPosition());
    }
    this.cosmosBackground.update(t, this.cameraManager.camera);
    this.blackHole.update(t, this.cameraManager.camera);

    // Пре-пасс фона для линзирования чёрной дыры
    this.blackHole.setVisible(false);
    this.rendererManager.renderer.setRenderTarget(this.backgroundRenderTarget);
    this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
    this.rendererManager.renderer.setRenderTarget(null);
    this.blackHole.setVisible(true);
    this.blackHole.setDistortionTexture(this.backgroundRenderTarget.texture);

    if (!this.character) return;
    const bhPos = this.blackHole.getPosition();
    const charPos = this.character.getPosition();
    const dx = charPos.x - bhPos.x;
    const dz = charPos.z - bhPos.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    // Точки интереса активны, пока игрок свободно бегает
    if (this.pointsOfInterest && !this.isActive && !this.isRespawning) {
      const active = this.pointsOfInterest.update(t, charPos);
      if (active) this.aboutPanel?.show(active);
      else this.aboutPanel?.hide();
    }

    const TRIGGER = 15;
    if (!this.isActive && !this.isRespawning && distXZ < TRIGGER) {
      this.isActive = true;
      this.aboutPanel?.hide();
      this.character.setControlLocked(true);
      this.cameraManager.setFOV(88);
      this.character.initFallingToBlackHole(TRIGGER, distXZ);
    }
    if (this.isActive) {
      this.timeScale = 0.6;
      const pull = new Vector3().subVectors(bhPos, charPos);
      pull.y = 0;
      pull.normalize();
      const pullStrength = 3 + (TRIGGER - distXZ) * 1.6;
      charPos.add(pull.multiplyScalar(pullStrength * t));
      this.character.setPosition(charPos);
      this.character.lookAt(bhPos);

      const near = Math.max(0, Math.min(1, (TRIGGER - distXZ) / TRIGGER));
      const stretch = 1 + near * 1.1;
      const shrink = Math.max(0, Math.min(1, distXZ / 6));
      this.character.applyBlackHoleStretch(stretch, pull, shrink);
      this.cameraManager.setFOV(88 + near * 22);

      // Провалились -> затемнение ~1-1.5с -> возврат на сцену (цикл)
      if (distXZ < 4 && !this.warpStarted) {
        this.warpStarted = true;
        this.isActive = false;
        this.isRespawning = true;
        this.timeScale = 1;
        this.screenFX.fadeToBlack(2.2, () => this.respawnPlayer());
      }
    }
  }

  respawnPlayer() {
    this.character.setPosition(this.spawnPos.clone());
    this.character.resetAfterFall();
    this.cameraController.reset();
    this.cameraManager.setFOV(75);
    this.warpStarted = false;
    this.isRespawning = false;
    this.timeScale = 1;
    // Плавно проявляем сцену из черноты
    this.screenFX.fadeFromBlack(0.9);
  }

  onWindowResize() {
    this.cameraManager.onResize();
    this.rendererManager.onResize();
    const size = new Vector2();
    this.rendererManager.renderer.getSize(size);
    this.backgroundRenderTarget?.setSize(size.x, size.y);
    this.blackHole?.onResize(size);
    this.screenFX?.onResize(size);
  }
}
