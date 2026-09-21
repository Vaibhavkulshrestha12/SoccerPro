export type GameMode = "ai" | "1v1";

export interface MainMenuCallbacks {
  onStartAI: () => void;
  onStart1v1: (sessionId: string, isHost: boolean) => void;
}

const ICONS = {
  ai: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
  multiplayer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  create: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  join: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
  help: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  exit: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export class MainMenu {
  private readonly root = document.createElement("div");
  private callbacks: MainMenuCallbacks | null = null;
  private sessionStatus: HTMLElement | null = null;
  private sessionIdDisplay: HTMLElement | null = null;
  private joinInput: HTMLInputElement | null = null;
  private _visible = false;

  constructor() {
    this.root.className = "aaa-menu";
    this.root.innerHTML = /* html */ `
      <div class="aaa-bg">
        <div class="aaa-bg-gradient"></div>
        <div class="aaa-bg-pattern"></div>
        <div class="aaa-bg-vignette"></div>
      </div>

      <div class="aaa-content">
        <header class="aaa-header">
          <div class="aaa-logo">
            <span class="aaa-logo-text">KICKOFF</span>
            <span class="aaa-logo-year">PRO</span>
          </div>
          <div class="aaa-header-actions">
            <button class="aaa-icon-btn" id="btnHelp" aria-label="Help">
              ${ICONS.help}
              <div class="aaa-tooltip" id="helpTooltip">KNOW CONTROLS</div>
            </button>
            <button class="aaa-icon-btn" id="btnExit" aria-label="Exit">
              ${ICONS.exit}
            </button>
          </div>
        </header>

        <main class="aaa-main" id="menuMain">
          <div class="aaa-title-group">
            <h2>SELECT MODE</h2>
            <p>CHOOSE YOUR MATCH EXPERIENCE</p>
          </div>
          
          <div class="aaa-tiles">
            <button class="aaa-tile aaa-tile-primary" id="btnStartAI">
              <div class="aaa-tile-bg"></div>
              <div class="aaa-tile-content">
                <div class="aaa-tile-icon">${ICONS.ai}</div>
                <div class="aaa-tile-text">
                  <h3>KICK OFF</h3>
                  <span>LOCAL MATCH VS AI</span>
                </div>
              </div>
            </button>

            <button class="aaa-tile aaa-tile-secondary" id="btnStart1v1">
              <div class="aaa-tile-bg"></div>
              <div class="aaa-tile-content">
                <div class="aaa-tile-icon">${ICONS.multiplayer}</div>
                <div class="aaa-tile-text">
                  <h3>ONLINE SEASONS</h3>
                  <span>PLAY AGAINST A FRIEND</span>
                </div>
              </div>
            </button>
          </div>
        </main>

        <main class="aaa-main hidden" id="sessionPanel">
          <button class="aaa-back-btn" id="btnBack">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            BACK
          </button>
          
          <div class="aaa-title-group">
            <h2>ONLINE MATCH</h2>
            <p>HOST OR JOIN A SESSION</p>
          </div>

          <div class="aaa-session-grid">
            <div class="aaa-session-card">
              <div class="aaa-session-icon">${ICONS.create}</div>
              <h3>HOST MATCH</h3>
              <p>Generate a room code for your friend</p>
              <button class="aaa-btn aaa-btn-host" id="btnCreate">CREATE SESSION</button>
            </div>

            <div class="aaa-session-divider">
              <div class="line"></div>
              <span>OR</span>
              <div class="line"></div>
            </div>

            <div class="aaa-session-card">
              <div class="aaa-session-icon">${ICONS.join}</div>
              <h3>JOIN MATCH</h3>
              <p>Enter your friend's room code</p>
              <div class="aaa-input-group">
                <input type="text" id="joinInput" placeholder="ENTER CODE" maxlength="5" autocomplete="off" spellcheck="false" />
                <button class="aaa-btn aaa-btn-join" id="btnJoin">CONNECT</button>
              </div>
            </div>
            <div class="aaa-status-box hidden" id="sessionIdDisplay">
              <h4>YOUR ROOM CODE</h4>
              <div class="aaa-code" id="sessionCode"></div>
              <p>Waiting for opponent to connect...</p>
            </div>
          </div>

          <div class="aaa-status-message hidden" id="sessionStatus">
            <div class="aaa-spinner"></div>
            <span id="sessionStatusText">Connecting...</span>
          </div>
        </main>
      </div>

      <!-- Help Modal -->
      <div class="aaa-help-modal" id="helpModal">
        <div class="aaa-help-content">
          <div class="aaa-help-header">
            <h2>CONTROLS</h2>
            <button class="aaa-help-close" id="btnHelpClose">${ICONS.x}</button>
          </div>
          <div class="aaa-help-grid">
            <div class="aaa-help-item"><kbd>WASD</kbd> MOVE</div>
            <div class="aaa-help-item"><kbd>SHIFT</kbd> SPRINT</div>
            <div class="aaa-help-item"><kbd>J</kbd> PASS</div>
            <div class="aaa-help-item"><kbd>K</kbd> THROUGH BALL</div>
            <div class="aaa-help-item"><kbd>SPACE</kbd> SHOOT (HOLD)</div>
            <div class="aaa-help-item"><kbd>I</kbd> TACKLE</div>
            <div class="aaa-help-item"><kbd>Q</kbd> SWITCH PLAYER</div>
            <div class="aaa-help-item"><kbd>ESC</kbd> PAUSE MENU</div>
          </div>
        </div>
      </div>

      <div class="aaa-info-modal" id="infoModal" role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">
        <div class="aaa-info-content">
          <div class="aaa-info-accent"></div>
          <div class="aaa-info-copy">
            <p class="aaa-info-kicker">SESSION UPDATE</p>
            <h2 id="infoModalTitle">SESSION UNAVAILABLE</h2>
            <p id="infoModalMessage"></p>
            <button class="aaa-btn aaa-info-close" id="btnInfoClose">BACK TO SESSIONS</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);
    this.bindEvents();
  }

  bind(callbacks: MainMenuCallbacks): void {
    this.callbacks = callbacks;
  }

  show(): void {
    this._visible = true;
    this.root.classList.add("visible");
    
    // Hide game canvas while menu is open
    const appCanvas = document.querySelector("#app") as HTMLElement;
    if (appCanvas) appCanvas.style.visibility = "hidden";

    const main = this.root.querySelector("#menuMain") as HTMLElement;
    const panel = this.root.querySelector("#sessionPanel") as HTMLElement;
    if (main) main.classList.remove("hidden");
    if (panel) panel.classList.add("hidden");
    this.hideSessionStatus();
    this.hideSessionId();

    // Show tooltip animation
    const tooltip = this.root.querySelector("#helpTooltip");
    if (tooltip) {
      tooltip.classList.add("visible");
      setTimeout(() => {
        tooltip.classList.remove("visible");
      }, 4000); // hide after 4s
    }
  }

  hide(): void {
    this._visible = false;
    this.root.classList.remove("visible");
    
    // Show game canvas
    const appCanvas = document.querySelector("#app") as HTMLElement;
    if (appCanvas) appCanvas.style.visibility = "visible";
  }

  get visible(): boolean {
    return this._visible;
  }

  showSessionStatus(message: string): void {
    this.sessionStatus = this.root.querySelector("#sessionStatus");
    if (this.sessionStatus) {
      this.sessionStatus.classList.remove("hidden");
      const textEl = this.sessionStatus.querySelector("#sessionStatusText");
      if (textEl) textEl.textContent = message;
    }
  }

  hideSessionStatus(): void {
    this.sessionStatus = this.root.querySelector("#sessionStatus");
    if (this.sessionStatus) {
      this.sessionStatus.classList.add("hidden");
    }
  }

  showSessionId(id: string): void {
    this.sessionIdDisplay = this.root.querySelector("#sessionIdDisplay");
    if (this.sessionIdDisplay) {
      this.sessionIdDisplay.classList.remove("hidden");
      const code = this.sessionIdDisplay.querySelector("#sessionCode");
      if (code) code.textContent = id;
    }
  }

  hideSessionId(): void {
    this.sessionIdDisplay = this.root.querySelector("#sessionIdDisplay");
    if (this.sessionIdDisplay) {
      this.sessionIdDisplay.classList.add("hidden");
    }
  }

  showInfo(title: string, message: string): void {
    const modal = this.root.querySelector("#infoModal") as HTMLElement;
    const titleElement = this.root.querySelector("#infoModalTitle");
    const messageElement = this.root.querySelector("#infoModalMessage");
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    modal.classList.add("visible");
  }

  dispose(): void {
    this.root.remove();
  }

  private bindEvents(): void {
    const btnAI = this.root.querySelector("#btnStartAI")!;
    const btn1v1 = this.root.querySelector("#btnStart1v1")!;
    const btnBack = this.root.querySelector("#btnBack")!;
    const btnCreate = this.root.querySelector("#btnCreate")!;
    const btnJoin = this.root.querySelector("#btnJoin")!;
    const btnHelp = this.root.querySelector("#btnHelp")!;
    const btnExit = this.root.querySelector("#btnExit")!;
    const helpModal = this.root.querySelector("#helpModal")!;
    const btnHelpClose = this.root.querySelector("#btnHelpClose")!;
    const helpTooltip = this.root.querySelector("#helpTooltip")!;
    const infoModal = this.root.querySelector("#infoModal")!;
    const btnInfoClose = this.root.querySelector("#btnInfoClose")!;

    btnAI.addEventListener("click", () => {
      this.callbacks?.onStartAI();
    });

    btn1v1.addEventListener("click", () => {
      const main = this.root.querySelector("#menuMain") as HTMLElement;
      const panel = this.root.querySelector("#sessionPanel") as HTMLElement;
      main.classList.add("hidden");
      panel.classList.remove("hidden");
    });

    btnBack.addEventListener("click", () => {
      const main = this.root.querySelector("#menuMain") as HTMLElement;
      const panel = this.root.querySelector("#sessionPanel") as HTMLElement;
      main.classList.remove("hidden");
      panel.classList.add("hidden");
      this.hideSessionStatus();
      this.hideSessionId();
    });

    btnCreate.addEventListener("click", () => {
      this.showSessionStatus("Creating session...");
      this.callbacks?.onStart1v1("", true);
    });

    btnJoin.addEventListener("click", () => {
      this.joinInput = this.root.querySelector("#joinInput") as HTMLInputElement;
      const code = this.joinInput?.value.trim().toUpperCase() ?? "";
      if (code.length < 3) {
        this.showSessionStatus("INVALID CODE");
        return;
      }
      this.showSessionStatus("CONNECTING...");
      this.callbacks?.onStart1v1(code, false);
    });

    btnHelp.addEventListener("click", () => {
      helpTooltip.classList.remove("visible");
      helpModal.classList.add("visible");
    });

    btnHelpClose.addEventListener("click", () => {
      helpModal.classList.remove("visible");
    });
    btnInfoClose.addEventListener("click", () => {
      infoModal.classList.remove("visible");
    });

    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) {
        helpModal.classList.remove("visible");
      }
    });

    btnExit.addEventListener("click", () => {
      if (confirm("Are you sure you want to exit the game?")) {
        window.close();
      }
    });
  }
}
