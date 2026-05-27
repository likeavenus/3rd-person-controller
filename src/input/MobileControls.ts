export class MobileControls {
  joystickContainer;
  joystickKnob;
  buttonsContainer;
  joystickActive = false;
  joystickStartPos = {
    x: 0,
    y: 0
  };
  joystickCurrentPos = {
    x: 0,
    y: 0
  };
  keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    e: false
  };
  constructor() {
    this.createJoystick();
    this.createButtons();
    this.setupTouchListeners();
  }
  createJoystick() {
    this.joystickContainer = document.createElement("div");
    this.joystickContainer.id = "joystick-container";
    this.joystickContainer.innerHTML = `
      <style>
        #joystick-container {
          position: fixed;
          bottom: 80px;
          left: 80px;
          width: 120px;
          height: 120px;
          background: rgba(255, 255, 255, 0.1);
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          touch-action: none;
        }

        #joystick-knob {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          position: absolute;
          transition: none;
          pointer-events: none;
        }

        @media (min-width: 768px) {
          #joystick-container,
          #buttons-container {
            display: none !important;
          }
        }
      </style>
    `;
    this.joystickKnob = document.createElement("div");
    this.joystickKnob.id = "joystick-knob";
    this.joystickContainer.appendChild(this.joystickKnob);
    document.body.appendChild(this.joystickContainer);
  }
  createButtons() {
    this.buttonsContainer = document.createElement("div");
    this.buttonsContainer.id = "buttons-container";
    this.buttonsContainer.innerHTML = `
      <style>
        #buttons-container {
          position: fixed;
          bottom: 80px;
          right: 80px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          z-index: 1000;
        }

        .mobile-button {
          width: 70px;
          height: 70px;
          background: rgba(255, 255, 255, 0.2);
          border: 3px solid rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          font-weight: bold;
          touch-action: none;
          user-select: none;
        }

        .mobile-button:active {
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0.95);
        }

        .mobile-button.pressed {
          background: rgba(255, 102, 0, 0.6);
          border-color: rgba(255, 102, 0, 0.8);
        }
      </style>
      <div class="mobile-button" id="btn-jump">⬆</div>
      <div class="mobile-button" id="btn-run">⚡</div>
      <div class="mobile-button" id="btn-interact">E</div>
    `;
    document.body.appendChild(this.buttonsContainer);
    this.setupButton("btn-jump", "space");
    this.setupButton("btn-run", "shift");
    this.setupButton("btn-interact", "e");
  }
  setupButton(e, t) {
    const n = document.getElementById(e);
    if (n) {
      n.addEventListener("touchstart", i => {
        i.preventDefault();
        this.keys[t] = true;
        n.classList.add("pressed");
      });
      n.addEventListener("touchend", i => {
        i.preventDefault();
        this.keys[t] = false;
        n.classList.remove("pressed");
      });
    }
  }
  setupTouchListeners() {
    this.joystickContainer.addEventListener("touchstart", e => {
      e.preventDefault();
      this.joystickActive = true;
      const t = this.joystickContainer.getBoundingClientRect();
      const n = e.touches[0];
      this.joystickStartPos = {
        x: t.left + t.width / 2,
        y: t.top + t.height / 2
      };
      this.updateJoystick(n.clientX, n.clientY);
    });
    window.addEventListener("touchmove", e => {
      if (!this.joystickActive) {
        return;
      }
      const t = e.touches[0];
      this.updateJoystick(t.clientX, t.clientY);
    });
    window.addEventListener("touchend", () => {
      if (this.joystickActive) {
        this.joystickActive = false;
        this.keys.w = false;
        this.keys.a = false;
        this.keys.s = false;
        this.keys.d = false;
        this.joystickKnob.style.transform = "translate(0, 0)";
      }
    });
  }
  updateJoystick(e, t) {
    const n = e - this.joystickStartPos.x;
    const i = t - this.joystickStartPos.y;
    const r = Math.sqrt(n * n + i * i);
    const a = 35;
    let o = n;
    let c = i;
    if (r > a) {
      o = n / r * a;
      c = i / r * a;
    }
    this.joystickKnob.style.transform = `translate(${o}px, ${c}px)`;
    const l = Math.atan2(i, n);
    const h = Math.min(r / a, 1);
    const u = 0.3;
    this.keys.w = false;
    this.keys.s = false;
    this.keys.a = false;
    this.keys.d = false;
    if (h > u) {
      this.keys.w = l < -Math.PI / 4 && l > Math.PI * -3 / 4;
      this.keys.s = l > Math.PI / 4 && l < Math.PI * 3 / 4;
      this.keys.a = l > Math.PI * 3 / 4 || l < Math.PI * -3 / 4;
      this.keys.d = l < Math.PI / 4 && l > -Math.PI / 4;
    }
  }
  getKeys() {
    return this.keys;
  }
  destroy() {
    this.joystickContainer.remove();
    this.buttonsContainer.remove();
  }
}
