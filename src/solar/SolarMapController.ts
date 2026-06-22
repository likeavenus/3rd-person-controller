import { PerspectiveCamera, Vector3, Vector2, Raycaster } from "three";
import type { SolarSystem, PlanetObject } from "./SolarSystem";

type Mode = "intro" | "map" | "focus";

interface Spherical {
  radius: number;
  theta: number; // азимут
  phi: number; // полярный угол от оси +Y (мал. = сверху)
}

export interface PlanetScreenInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
}

const _v = new Vector3();
const _ndc = new Vector2();

export class SolarMapController {
  private camera: PerspectiveCamera;
  private dom: HTMLElement;
  private solar: SolarSystem;

  mode: Mode = "intro";
  private target = new Vector3(0, 0, 0);
  private desiredTarget = new Vector3(0, 0, 0);
  private cur: Spherical = { radius: 40, theta: Math.PI * 0.5, phi: 1.45 };
  private desired: Spherical = { radius: 250, theta: Math.PI * 0.5, phi: 0.62 };

  private introTime = 0;
  private introDuration = 5.5;

  private raycaster = new Raycaster();
  private hovered: PlanetObject | null = null;
  private focusPlanet: PlanetObject | null = null;
  private focusReported = false;

  private isPointerDown = false;
  private moved = false;
  private lastX = 0;
  private lastY = 0;
  private pinchDist = 0;

  onPlanetFocused: ((p: PlanetObject) => void) | null = null;
  onLabels: ((labels: PlanetScreenInfo[]) => void) | null = null;

  constructor(camera: PerspectiveCamera, dom: HTMLElement, solar: SolarSystem) {
    this.camera = camera;
    this.dom = dom;
    this.solar = solar;
    this.bindEvents();
  }

  /** Старт: камера у плоскости системы, Сатурн на фоне, затем взлёт. */
  startIntro() {
    this.mode = "intro";
    this.introTime = 0;

    const saturn = this.solar.getPlanetById("saturn");
    const startTheta = saturn ? saturn.angle + Math.PI : Math.PI * 0.5;
    this.cur = { radius: 60, theta: startTheta, phi: 1.5 };
    this.desired = { radius: 250, theta: startTheta + 0.6, phi: 0.62 };
    this.target.set(0, 0, 0);
    this.desiredTarget.set(0, 0, 0);
    this.applyCamera(1);
  }

  private bindEvents() {
    this.dom.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.dom.addEventListener("wheel", this.onWheel, { passive: false });
    this.dom.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.dom.addEventListener("touchend", this.onTouchEnd);
  }

  dispose() {
    this.dom.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.dom.removeEventListener("wheel", this.onWheel);
    this.dom.removeEventListener("touchmove", this.onTouchMove);
    this.dom.removeEventListener("touchend", this.onTouchEnd);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode === "intro") return;
    this.isPointerDown = true;
    this.moved = false;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    // ховер-подсветка планет
    if (this.mode !== "intro" && !this.isPointerDown) {
      this.updateHover(e.clientX, e.clientY);
    }
    if (!this.isPointerDown || this.mode === "intro") return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
    this.desired.theta -= dx * 0.005;
    this.desired.phi = clamp(this.desired.phi - dy * 0.005, 0.15, 1.5);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    if (!this.moved && this.mode !== "intro") {
      this.tryPick(e.clientX, e.clientY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode === "intro") return;
    e.preventDefault();
    this.desired.radius = clamp(this.desired.radius + e.deltaY * 0.15, 18, 360);
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.mode === "intro") return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (this.pinchDist > 0) {
        this.desired.radius = clamp(this.desired.radius - (d - this.pinchDist) * 0.5, 18, 360);
      }
      this.pinchDist = d;
    }
  };

  private onTouchEnd = () => {
    this.pinchDist = 0;
  };

  private screenToNdc(x: number, y: number) {
    const rect = this.dom.getBoundingClientRect();
    _ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    return _ndc;
  }

  private updateHover(x: number, y: number) {
    this.raycaster.setFromCamera(this.screenToNdc(x, y), this.camera);
    const hits = this.raycaster.intersectObjects(this.solar.getPickMeshes(), false);
    const planet = hits.length
      ? this.solar.getPlanetById(hits[0].object.userData.planetId)
      : null;
    if (planet !== this.hovered) {
      if (this.hovered) this.solar.setHalo(this.hovered, 0);
      this.hovered = planet ?? null;
      this.dom.style.cursor = planet ? "pointer" : "default";
    }
  }

  private tryPick(x: number, y: number) {
    this.raycaster.setFromCamera(this.screenToNdc(x, y), this.camera);
    const hits = this.raycaster.intersectObjects(this.solar.getPickMeshes(), false);
    if (!hits.length) return;
    const planet = this.solar.getPlanetById(hits[0].object.userData.planetId);
    if (planet) this.flyTo(planet);
  }

  flyTo(planet: PlanetObject) {
    this.mode = "focus";
    this.focusPlanet = planet;
    this.focusReported = false;
    this.desired.radius = planet.info.radius * 5 + 14;
    this.desired.phi = clamp(this.desired.phi, 0.5, 1.1);
  }

  /** Вернуться к обзору всей карты. */
  flyToOverview() {
    this.mode = "map";
    this.focusPlanet = null;
    this.desiredTarget.set(0, 0, 0);
    this.desired.radius = 250;
    this.desired.phi = 0.62;
  }

  private applyCamera(lerpFactor: number) {
    this.cur.radius += (this.desired.radius - this.cur.radius) * lerpFactor;
    this.cur.theta += (this.desired.theta - this.cur.theta) * lerpFactor;
    this.cur.phi += (this.desired.phi - this.cur.phi) * lerpFactor;
    this.target.lerp(this.desiredTarget, lerpFactor);

    const sp = Math.sin(this.cur.phi);
    _v.set(
      this.cur.radius * sp * Math.cos(this.cur.theta),
      this.cur.radius * Math.cos(this.cur.phi),
      this.cur.radius * sp * Math.sin(this.cur.theta)
    );
    this.camera.position.copy(this.target).add(_v);
    this.camera.lookAt(this.target);
  }

  update(dt: number) {
    if (this.mode === "intro") {
      this.introTime += dt;
      this.applyCamera(Math.min(dt * 0.9, 0.05));
      if (this.introTime >= this.introDuration) {
        this.mode = "map";
      }
    } else if (this.mode === "focus" && this.focusPlanet) {
      this.solar.getPlanetWorldPosition(this.focusPlanet, this.desiredTarget);
      this.applyCamera(Math.min(dt * 2.5, 0.08));
      // приблизились — отметить посещение
      if (!this.focusReported) {
        const d = this.camera.position.distanceTo(this.desiredTarget);
        if (d < this.desired.radius * 1.25) {
          this.focusReported = true;
          this.onPlanetFocused?.(this.focusPlanet);
        }
      }
    } else {
      // авто-вращение карты для жизни + плавный ввод
      this.desired.theta += dt * 0.02;
      this.applyCamera(Math.min(dt * 3, 0.12));
    }

    this.emitLabels();
  }

  private emitLabels() {
    if (!this.onLabels) return;
    const rect = this.dom.getBoundingClientRect();
    const labels: PlanetScreenInfo[] = [];
    for (const p of this.solar.planets) {
      this.solar.getPlanetWorldPosition(p, _v);
      _v.project(this.camera);
      const visible = _v.z < 1;
      labels.push({
        id: p.info.id,
        name: p.info.name,
        x: rect.left + (_v.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-_v.y * 0.5 + 0.5) * rect.height,
        visible,
      });
    }
    this.onLabels(labels);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
