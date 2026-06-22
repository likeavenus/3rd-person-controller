import {
  Scene,
  Group,
  Mesh,
  SphereGeometry,
  RingGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  ShaderMaterial,
  PointLight,
  AmbientLight,
  DoubleSide,
  BackSide,
  AdditiveBlending,
  Sprite,
  SpriteMaterial,
  Vector3,
  Vector2,
  Color,
} from "three";
import { PLANETS } from "./planetData";
import type { PlanetInfo } from "./planetData";
import { loadColorTexture, loadNormalFromColor, makeGlowTexture, makeRingTexture } from "./textures";

export interface PlanetObject {
  info: PlanetInfo;
  group: Group;
  mesh: Mesh;
  angle: number;
}

export class SolarSystem {
  group: Group;
  sun!: Mesh;
  planets: PlanetObject[] = [];
  private pickMeshes: Mesh[] = [];
  private sunCorona!: Sprite;

  constructor(scene: Scene) {
    this.group = new Group();

    this.buildSun();

    // Свет от Солнца. decay=0 -> свет без затухания достаёт до дальних планет
    // (физический inverse-square потребовал бы огромной интенсивности).
    const sunLight = new PointLight(0xfff4e0, 3.2, 0, 0);
    this.group.add(sunLight);
    // Мягкая заливка, чтобы ночная сторона не была абсолютно чёрной
    this.group.add(new AmbientLight(0x6a78b0, 0.65));

    for (const info of PLANETS) {
      this.createOrbitLine(info.orbitRadius);
      this.createPlanet(info);
    }

    scene.add(this.group);
    console.log("🪐 Солнечная система создана:", this.planets.length, "планет");
  }

  private buildSun() {
    // Поверхность Солнца — настоящая текстура с лёгким движением и тёплым тоном.
    const sunMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: loadColorTexture("sun.jpg") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uMap;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          uv.x += uTime * 0.008;
          vec3 base = texture2D(uMap, uv).rgb;
          // мягкая пульсация яркости плазмы
          float pulse = 0.92 + 0.08 * sin(uTime * 1.2 + vUv.y * 8.0 + vUv.x * 6.0);
          vec3 color = base * vec3(1.25, 1.0, 0.72) * 1.35 * pulse;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.sun = new Mesh(new SphereGeometry(9, 64, 64), sunMat);
    this.group.add(this.sun);

    // Тонкая additive-оболочка для атмосферного ободка (не перекрывает текстуру)
    const glowMat = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float i = pow(1.0 - abs(dot(vNormal, vView)), 2.5);
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.25) * i, i * 0.9);
        }
      `,
    });
    this.sun.add(new Mesh(new SphereGeometry(9.6, 48, 48), glowMat));

    // Корона — мягкий ореол вокруг, заметно меньше, чтобы был виден диск Солнца
    const corona = new Sprite(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(255,238,190,0.55)", "rgba(255,150,50,0.18)"),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    corona.scale.set(30, 30, 1);
    this.sunCorona = corona;
    this.sun.add(corona);
  }

  private createPlanet(info: PlanetInfo) {
    const planetGroup = new Group();

    const colorTex = loadColorTexture(info.texture);
    const mat = new MeshStandardMaterial({
      color: new Color(0xffffff),
      map: colorTex,
      normalMap: loadNormalFromColor(info.texture, info.id === "earth" || info.id === "mars" ? 3.0 : 1.8),
      normalScale: new Vector2(1.0, 1.0),
      roughness: 0.88,
      metalness: 0.0,
      // текстура слабо «светится» сама, чтобы не было полностью чёрной стороны
      emissive: new Color(0xffffff),
      emissiveMap: colorTex,
      emissiveIntensity: 0.18,
    });
    const mesh = new Mesh(new SphereGeometry(info.radius, 48, 48), mat);
    mesh.rotation.z = info.tilt ?? 0;
    mesh.userData.planetId = info.id;
    planetGroup.add(mesh);

    if (info.hasRings) {
      planetGroup.add(this.createRing(info));
    }

    // Невидимый ореол выбора/наведения
    const halo = new Mesh(
      new SphereGeometry(info.radius * 1.3, 24, 24),
      new MeshBasicMaterial({
        color: 0x7fd0ff,
        transparent: true,
        opacity: 0,
        side: BackSide,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.name = "halo";
    planetGroup.add(halo);

    this.group.add(planetGroup);

    const planet: PlanetObject = { info, group: planetGroup, mesh, angle: info.startAngle };
    this.planets.push(planet);
    this.pickMeshes.push(mesh);
    this.positionPlanet(planet);
  }

  private createRing(info: PlanetInfo) {
    const inner = info.radius * 1.4;
    const outer = info.radius * 2.5;
    const geo = new RingGeometry(inner, outer, 96, 1);

    // Перекладываем UV так, чтобы текстура-полоска шла вдоль радиуса
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const r = v3.length();
      const u = (r - inner) / (outer - inner);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;

    const ringTex =
      info.id === "uranus" ? makeRingTexture("150,200,215") : makeRingTexture("220,198,150");
    const mat = new MeshStandardMaterial({
      map: ringTex,
      color: new Color(0xffffff),
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      roughness: 1.0,
      metalness: 0.0,
      emissive: new Color(0xffffff),
      emissiveMap: ringTex,
      emissiveIntensity: 0.25,
      opacity: info.id === "uranus" ? 0.7 : 1.0,
    });
    const ring = new Mesh(geo, mat);
    // Почти плоско в плоскости системы -> хорошо виден сверху как эллипс
    ring.rotation.x = -Math.PI / 2 + 0.18;
    ring.rotation.y = 0.1;
    return ring;
  }

  private createOrbitLine(radius: number) {
    const geo = new RingGeometry(radius - 0.1, radius + 0.1, 160);
    const mat = new MeshBasicMaterial({
      color: 0x2c3a66,
      side: DoubleSide,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const ring = new Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    this.group.add(ring);
  }

  private positionPlanet(p: PlanetObject) {
    p.group.position.set(
      Math.cos(p.angle) * p.info.orbitRadius,
      0,
      Math.sin(p.angle) * p.info.orbitRadius
    );
  }

  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  getPickMeshes() {
    return this.pickMeshes;
  }

  getPlanetById(id: string) {
    return this.planets.find((p) => p.info.id === id);
  }

  getPlanetWorldPosition(p: PlanetObject, target: Vector3) {
    return p.group.getWorldPosition(target);
  }

  setHalo(p: PlanetObject, opacity: number) {
    const halo = p.group.getObjectByName("halo") as Mesh | undefined;
    if (halo) {
      (halo.material as MeshBasicMaterial).opacity = opacity;
    }
  }

  update(delta: number, slow = false) {
    const sunMat = this.sun.material as ShaderMaterial;
    if (sunMat.uniforms && sunMat.uniforms.uTime) sunMat.uniforms.uTime.value += delta;
    this.sun.rotation.y += delta * 0.03;

    for (const p of this.planets) {
      p.angle += delta * p.info.orbitSpeed * (slow ? 0.25 : 1);
      this.positionPlanet(p);
      p.mesh.rotation.y += delta * 0.25;
    }
  }
}
