import {
  Scene,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  PointLight,
  Vector2,
  PerspectiveCamera,
} from "three";
import { blackHoleVertexShader, blackHoleFragmentShader } from "./blackHoleShaders";

const PLANE_HALF = 30;

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
        uBackgroundTexture: { value: null },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    // Квадратная плоскость -> круг в шейдере остаётся кругом и не обрезается.
    const geometry = new PlaneGeometry(PLANE_HALF * 2, PLANE_HALF * 2);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.position.set(0, 7, -32);
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.pointLight = new PointLight(0xff6600, 25, 250, 2);
    this.pointLight.position.copy(this.mesh.position);
    scene.add(this.pointLight);

    console.log("🌑 Черная дыра с ИСКАЖЕНИЕМ создана!");
  }

  update(delta: number, camera: PerspectiveCamera) {
    // Билборд: всегда смотрит на камеру -> круг не вытягивается в эллипс.
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
