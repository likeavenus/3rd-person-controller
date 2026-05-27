export class PerformanceManager {
  static isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  static isLowEndDevice() {
    const e = navigator.hardwareConcurrency || 2;
    const t = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    return this.isMobile() && (e <= 4 || t <= 3);
  }
  static getPixelRatio() {
    if (this.isMobile()) {
      return Math.min(window.devicePixelRatio, 2);
    } else {
      return window.devicePixelRatio;
    }
  }
  static getOptimalSettings() {
    const e = this.isMobile();
    const t = this.isLowEndDevice();
    return {
      pixelRatio: this.getPixelRatio(),
      shadowMapSize: e ? 512 : 2048,
      enableShadows: !t,
      antialias: !e,
      starDensity: e ? 0.91 : 0.9,
      nebulaQuality: e ? 4 : 6,
      sphereSegments: e ? 32 : 64,
      enableReflections: !e,
      enableBloom: false,
      targetFPS: e ? 45 : 60
    };
  }
}
