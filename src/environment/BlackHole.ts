import {
  Scene,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  PointLight,
  Vector2,
  Vector3,
  PerspectiveCamera,
} from "three";
import type { WebGLRenderer } from "three";
import { blackHoleVertexShader, blackHoleFragmentShader } from "./blackHoleShaders";

const PLANE_HALF = 29;

const _centerW = new Vector3();
const _edgeW = new Vector3();
const _res = new Vector2();

export class BlackHole {
  mesh: Mesh;
  material: ShaderMaterial;
  pointLight: PointLight;

  constructor(scene: Scene, resolution: Vector2) {
    this.material = new ShaderMaterial({
      vertexShader: blackHoleVertexShader,
      fragmentShader: blackHoleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: resolution.clone() },
        uCenterPix: { value: new Vector2() },
        uRadiusPix: { value: 200 },
        uBackgroundTexture: { value: null },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    const geometry = new PlaneGeometry(PLANE_HALF * 2, PLANE_HALF * 2);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.position.set(0, 7, -32);
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;

    this.mesh.onBeforeRender = (renderer, _scene, camera) => {
      this.updateScreenDiscUniforms(renderer as WebGLRenderer, camera as PerspectiveCamera);
    };

    scene.add(this.mesh);

    this.pointLight = new PointLight(0xff6600, 25, 250, 2);
    this.pointLight.position.copy(this.mesh.position);
    scene.add(this.pointLight);

    console.log("🌑 Черная дыра с ИСКАЖЕНИЕМ создана!");
  }

  /** Круг в координатах текущего буфера (основной экран или FBO отражателя). */
  private updateScreenDiscUniforms(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    const target = renderer.getRenderTarget();
    if (target) {
      _res.set(target.width, target.height);
    } else {
      renderer.getDrawingBufferSize(_res);
    }

    const w = _res.x;
    const h = _res.y;
    const uniforms = this.material.uniforms;
    (uniforms.uResolution.value as Vector2).set(w, h);

    this.mesh.getWorldPosition(_centerW);
    _centerW.project(camera);
    const cx = (_centerW.x * 0.5 + 0.5) * w;
    const cy = (_centerW.y * 0.5 + 0.5) * h;

    const toRadius = (lx: number, ly: number) => {
      _edgeW.set(lx, ly, 0);
      this.mesh.localToWorld(_edgeW);
      _edgeW.project(camera);
      const ex = (_edgeW.x * 0.5 + 0.5) * w;
      const ey = (_edgeW.y * 0.5 + 0.5) * h;
      const dx = ex - cx;
      const dy = ey - cy;
      return Math.hypot(dx * (h / w), dy);
    };

    const r0 = toRadius(PLANE_HALF, 0);
    const r1 = toRadius(0, PLANE_HALF);
    const radiusPix = Math.max((r0 + r1) * 0.5, 1);

    (uniforms.uCenterPix.value as Vector2).set(cx, cy);
    uniforms.uRadiusPix.value = Math.max(radiusPix, 1);
  }

  update(delta: number, camera: PerspectiveCamera) {
    this.mesh.lookAt(camera.position);
    this.material.uniforms.uTime.value += delta;
    this.pointLight.intensity =
      25 + Math.sin(this.material.uniforms.uTime.value * 2) * 5;
  }

  onResize(resolution: Vector2) {
    (this.material.uniforms.uResolution.value as Vector2).copy(resolution);
  }

  setVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  setDistortionTexture(texture: unknown) {
    this.material.uniforms.uBackgroundTexture.value = texture;
  }

  getPosition() {
    return this.mesh.position.clone();
  }
}
