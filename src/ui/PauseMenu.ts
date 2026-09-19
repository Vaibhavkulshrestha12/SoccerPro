export interface PauseMenuCallbacks {
  onResume: () => void;
  onQuit: () => void;
}

export class PauseMenu {
  private readonly root = document.createElement("div");
  private callbacks: PauseMenuCallbacks | null = null;
  private _visible = false;

  constructor() {
    this.root.className = "pause-menu";
    this.root.innerHTML = /* html */ `
      <div class="pause-backdrop"></div>
      <div class="pause-container">
        <div class="pause-header">
          <div class="pause-icon">⏸</div>
          <h2 class="pause-title">MATCH PAUSED</h2>
        </div>
        <div class="pause-buttons">
          <button class="pause-btn pause-btn-resume" id="btnResume">
            <span>▶ Resume</span>
          </button>
          <button class="pause-btn pause-btn-quit" id="btnQuit">
            <span>✕ Quit to Menu</span>
          </button>
        </div>
        <p class="pause-hint">Press <kbd>Esc</kbd> to resume</p>
      </div>
    `;

    document.body.appendChild(this.root);
    this.bindEvents();
  }

  bind(callbacks: PauseMenuCallbacks): void {
    this.callbacks = callbacks;
  }

  show(): void {
    this._visible = true;
    this.root.classList.add("visible");
  }

  hide(): void {
    this._visible = false;
    this.root.classList.remove("visible");
  }

  get visible(): boolean {
    return this._visible;
  }

  dispose(): void {
    this.root.remove();
  }

  private bindEvents(): void {
    this.root.querySelector("#btnResume")!.addEventListener("click", () => {
      this.callbacks?.onResume();
    });

    this.root.querySelector("#btnQuit")!.addEventListener("click", () => {
      this.callbacks?.onQuit();
    });
  }
}
