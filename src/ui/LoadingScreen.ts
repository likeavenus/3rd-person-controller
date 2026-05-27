export class LoadingScreen {
  container;
  progressBar;
  progressText;
  blackHoleCanvas;
  ctx;
  animationId = 0;
  constructor() {
    this.container = this.createLoaderHTML();
    this.blackHoleCanvas = this.container.querySelector("#loader-canvas");
    this.progressBar = this.container.querySelector(".progress-fill");
    this.progressText = this.container.querySelector(".progress-text");
    this.ctx = this.blackHoleCanvas.getContext("2d");
    this.blackHoleCanvas.width = 200;
    this.blackHoleCanvas.height = 200;
    document.body.appendChild(this.container);
    this.animate();
  }
  createLoaderHTML() {
    const e = document.createElement("div");
    e.id = "loader-container";
    e.innerHTML = `
      <style>
        #loader-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, #0a0a1e 0%, #000000 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.5s ease-out;
        }

        #loader-container.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .loader-canvas-wrapper {
          position: relative;
          margin-bottom: 40px;
        }

        #loader-canvas {
          display: block;
          filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.5));
        }

        .loader-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 180px;
          height: 180px;
          border: 2px solid transparent;
          border-top: 2px solid rgba(255, 100, 0, 0.8);
          border-right: 2px solid rgba(0, 136, 255, 0.6);
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .loader-content {
          text-align: center;
          max-width: 400px;
        }

        .loader-title {
          font-family: 'Arial', sans-serif;
          font-size: 32px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 10px;
          text-shadow: 0 0 20px rgba(255, 100, 0, 0.5);
          letter-spacing: 3px;
        }

        .loader-subtitle {
          font-family: 'Arial', sans-serif;
          font-size: 14px;
          color: #888;
          margin-bottom: 30px;
          letter-spacing: 2px;
        }

        .progress-container {
          width: 300px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
          margin-bottom: 15px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6600, #0088ff);
          border-radius: 2px;
          transition: width 0.3s ease;
          box-shadow: 0 0 10px rgba(255, 100, 0, 0.8);
        }

        .progress-text {
          font-family: 'Courier New', monospace;
          font-size: 16px;
          color: #ffffff;
          letter-spacing: 1px;
        }

        .loader-stars {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          animation: twinkle 3s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      </style>

      <div class="loader-stars" id="loader-stars"></div>

      <div class="loader-canvas-wrapper">
        <canvas id="loader-canvas"></canvas>
        <div class="loader-ring"></div>
      </div>

      <div class="loader-content">
        <div class="loader-title">LOADING</div>
        <div class="loader-subtitle">Initializing Space...</div>
        <div class="progress-container">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">0%</div>
      </div>
    `;
    const t = e.querySelector("#loader-stars");
    for (let n = 0; n < 100; n++) {
      const i = document.createElement("div");
      i.className = "star";
      i.style.left = `${Math.random() * 100}%`;
      i.style.top = `${Math.random() * 100}%`;
      i.style.animationDelay = `${Math.random() * 3}s`;
      t.appendChild(i);
    }
    return e;
  }
  animate = () => {
    const e = Date.now() * 0.001;
    this.drawBlackHole(e);
    this.animationId = requestAnimationFrame(this.animate);
  };
  drawBlackHole(e) {
    const t = this.blackHoleCanvas.width / 2;
    const n = this.blackHoleCanvas.height / 2;
    this.ctx.clearRect(0, 0, this.blackHoleCanvas.width, this.blackHoleCanvas.height);
    const i = this.ctx.createRadialGradient(t, n, 0, t, n, 40);
    i.addColorStop(0, "rgba(0, 0, 0, 1)");
    i.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.ctx.fillStyle = i;
    this.ctx.beginPath();
    this.ctx.arc(t, n, 40, 0, Math.PI * 2);
    this.ctx.fill();
    for (let r = 0; r < 3; r++) {
      const a = 50 + r * 15;
      const o = 50;
      for (let c = 0; c < o; c++) {
        const l = c / o * Math.PI * 2 + e * (1 + r * 0.5);
        const h = (c + 1) / o * Math.PI * 2 + e * (1 + r * 0.5);
        const u = (Math.sin(l * 3 + e * 2) + 1) / 2;
        const d = Math.floor(u * 255 + (1 - u) * 0);
        const p = Math.floor(u * 100 + (1 - u) * 136);
        const x = Math.floor(u * 0 + (1 - u) * 255);
        const g = 0.6 - r * 0.15;
        this.ctx.strokeStyle = `rgba(${d}, ${p}, ${x}, ${g})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(t, n, a, l, h);
        this.ctx.stroke();
      }
    }
    for (let r = 0; r < 20; r++) {
      const a = r / 20 * Math.PI * 2 + e * 2;
      const o = 70 + Math.sin(e * 3 + r) * 10;
      const c = t + Math.cos(a) * o;
      const l = n + Math.sin(a) * o;
      const h = 2 + Math.sin(e * 4 + r) * 1;
      this.ctx.fillStyle = "rgba(255, 200, 100, 0.8)";
      this.ctx.beginPath();
      this.ctx.arc(c, l, h, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  updateProgress(e) {
    const t = Math.round(e * 100);
    this.progressBar.style.width = `${t}%`;
    this.progressText.textContent = `${t}%`;
    const n = this.container.querySelector(".loader-subtitle");
    if (t < 30) {
      n.textContent = "Loading shaders...";
    } else if (t < 60) {
      n.textContent = "Creating universe...";
    } else if (t < 90) {
      n.textContent = "Loading character...";
    } else {
      n.textContent = "Almost ready...";
    }
  }
  hide() {
    this.container.classList.add("fade-out");
    setTimeout(() => {
      cancelAnimationFrame(this.animationId);
      this.container.remove();
    }, 500);
  }
}
