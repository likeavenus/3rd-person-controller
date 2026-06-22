import {
  Scene,
  Group,
  Mesh,
  CylinderGeometry,
  RingGeometry,
  OctahedronGeometry,
  MeshBasicMaterial,
  PointLight,
  DoubleSide,
  AdditiveBlending,
  Color,
} from "three";
import type { Vector3 } from "three";
import { POINTS } from "./pointsData";
import type { PoiInfo } from "./pointsData";

interface Marker {
  info: PoiInfo;
  group: Group;
  beam: Mesh;
  ring: Mesh;
  icon: Mesh;
  light: PointLight;
  glow: number; // 0..1 текущая подсветка
}

export class PointsOfInterest {
  group: Group;
  private markers: Marker[] = [];
  private active: PoiInfo | null = null;

  constructor(scene: Scene) {
    this.group = new Group();

    for (const info of POINTS) {
      const g = new Group();
      g.position.set(info.x, 0, info.z);
      const color = new Color(info.color);

      // Светящийся столб
      const beam = new Mesh(
        new CylinderGeometry(0.18, 0.35, 9, 16, 1, true),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.32,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
        })
      );
      beam.position.y = 4.5;
      g.add(beam);

      // Кольцо на полу
      const ring = new Mesh(
        new RingGeometry(1.6, 2.0, 48),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);

      // Парящий значок
      const icon = new Mesh(
        new OctahedronGeometry(0.6),
        new MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      );
      icon.position.y = 2.4;
      g.add(icon);

      const light = new PointLight(info.color, 6, 16, 2);
      light.position.y = 2.4;
      g.add(light);

      this.group.add(g);
      this.markers.push({ info, group: g, beam, ring, icon, light, glow: 0 });
    }

    scene.add(this.group);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  /** @returns активная точка (в радиусе) или null */
  update(delta: number, charPos: Vector3): PoiInfo | null {
    let nearest: Marker | null = null;
    let nearestDist = Infinity;

    for (const m of this.markers) {
      const dx = charPos.x - m.info.x;
      const dz = charPos.z - m.info.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < m.info.radius && dist < nearestDist) {
        nearest = m;
        nearestDist = dist;
      }
    }

    this.active = nearest ? nearest.info : null;

    for (const m of this.markers) {
      const isActive = nearest === m;
      const target = isActive ? 1 : 0;
      m.glow += (target - m.glow) * Math.min(delta * 6, 1);

      m.icon.rotation.y += delta * 1.2;
      m.icon.position.y = 2.4 + Math.sin(performance.now() * 0.002 + m.info.x) * 0.18;
      m.ring.rotation.z += delta * 0.6;

      const pulse = 0.6 + Math.sin(performance.now() * 0.004) * 0.15;
      (m.beam.material as MeshBasicMaterial).opacity = 0.22 + m.glow * 0.4 * pulse;
      (m.ring.material as MeshBasicMaterial).opacity = 0.5 + m.glow * 0.5;
      m.light.intensity = 5 + m.glow * 12;
      const scale = 1 + m.glow * 0.25;
      m.icon.scale.setScalar(scale);
    }

    return this.active;
  }
}
