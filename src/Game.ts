import {
  Clock,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  MeshStandardMaterial,
  DirectionalLight,
  AmbientLight,
  Vector2,
  WebGLRenderTarget,
  Vector3,
  PerspectiveCamera,
  Scene,
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
  fadeOverlay;
  fadeMaterial;
  isIn4DSpace = false;
  timeScale = 1;
  backgroundRenderTarget;
  particleTunnel = null;
  targetFrameTime = 16;
  constructor() {
    this.clock = new Clock();
    this.loader = new LoadingScreen();
    new PointerLockPrompt();
    const e = PerformanceManager.getOptimalSettings();
    this.targetFrameTime = 1000 / e.targetFPS;
    console.log(`🎯 Target FPS: ${e.targetFPS}`);
    this.init();
  }
  createFadeOverlay() {
    const e = new PlaneGeometry(2, 2);
    this.fadeMaterial = new MeshBasicMaterial({
      color: 0,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    });
    this.fadeOverlay = new Mesh(e, this.fadeMaterial);
    this.cameraManager.camera.add(this.fadeOverlay);
    this.fadeOverlay.position.set(0, 0, -0.1);
    this.fadeOverlay.position.z = -1;
  }
  async init() {
    this.loader.updateProgress(0.1);
    this.sceneManager = new SceneManager();
    this.rendererManager = new RendererManager();
    this.cameraManager = new CameraManager();
    const e = new Vector2();
    this.rendererManager.renderer.getSize(e);
    this.backgroundRenderTarget = new WebGLRenderTarget(e.x, e.y);
    this.landingZoneGroup = new Group();
    const t = new PlaneGeometry(100, 100);
    const n = new MeshStandardMaterial({
      color: 3355443,
      roughness: 0.8
    });
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
    console.log("✅ ParticleTunnel создан:", this.particleTunnel !== null);
    this.loader.updateProgress(0.6);
    this.inputManager = new InputManager();
    this.cameraController = new CameraController(this.cameraManager.camera, this.inputManager);
    this.loader.updateProgress(0.7);
    await this.initCharacter();
    try {
      this.rendererManager.renderer.compile(this.landingZoneGroup, this.cameraManager.camera);
      console.log("⚡ Шейдеры LandingZone скомпилированы заранее!");
    } catch (o) {
      console.warn("Pre-compile не поддерживается", o);
    }
    this.createFadeOverlay();
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
  }
  animate = (e = 0) => {
    requestAnimationFrame(this.animate);
    let t = this.clock.getDelta();
    t *= this.timeScale;
    this.clock.getElapsedTime();
    if (this.character && this.isReady) {
      this.character.update(t);
      this.cameraController.update(this.character.getPosition());
    }
    if (!this.isIn4DSpace) {
      this.cosmosBackground.update(t, this.cameraManager.camera);
      this.blackHole.update(t, this.cameraManager.camera);
    }
    if (!this.isIn4DSpace) {
      this.blackHole.setVisible(false);
      this.rendererManager.renderer.setRenderTarget(this.backgroundRenderTarget);
      this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
      this.rendererManager.renderer.setRenderTarget(null);
      this.blackHole.setVisible(true);
      this.blackHole.setDistortionTexture(this.backgroundRenderTarget.texture);
    }
    this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
    if (this.character && !this.isIn4DSpace) {
      const bhPos = this.blackHole.getPosition();
      const charPos = this.character.getPosition();
      const dx = charPos.x - bhPos.x;
      const dz = charPos.z - bhPos.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);

      if (!this.isActive && distXZ < 28) {
        this.isActive = true;
        this.character.setControlLocked(true);
        this.cameraManager.setFOV(120);
        this.character.initFallingToBlackHole(28, distXZ);
      }
      if (this.isActive) {
        this.timeScale = 0.5;
        const pull = new Vector3().subVectors(bhPos, charPos);
        pull.y = 0;
        pull.normalize();
        const pullStrength = 2 + (28 - distXZ) * 2.5;
        charPos.add(pull.multiplyScalar(pullStrength * t));
        this.character.setPosition(charPos);
        this.character.lookAt(bhPos);

        const stretch = 1 + Math.max(0, (28 - distXZ) / 4);
        this.character.applyBlackHoleStretch(stretch, pull);

        const h = Math.max(0, (15 - distXZ) / 10);
        this.cameraManager.setFOV(120 + h * 50);
        if (distXZ < 15) {
          const u = Math.max(0, Math.min(1, (15 - distXZ) / 12));
          if (this.fadeMaterial) {
            this.fadeMaterial.opacity = u;
          }
        }
        if (distXZ < 3) {
          if (this.fadeMaterial) {
            this.fadeMaterial.opacity = 1;
          }
          this.character.setPosition(bhPos.clone().setY(charPos.y));
        }
      }
    }
  };
  onWindowResize() {
    this.cameraManager.onResize();
    this.rendererManager.onResize();
    const size = new Vector2();
    this.rendererManager.renderer.getSize(size);
    this.backgroundRenderTarget?.setSize(size.x, size.y);
    this.blackHole?.onResize(size);
  }
}