import { TeamSide } from "../config";

export interface HudUpdate {
  homeScore: number;
  awayScore: number;
  remainingSeconds: number;
  selectedLabel: string;
  possessionLabel: string;
  charge: number;
  matchOver: boolean;
  gameMode?: string;
}

export class Hud {
  private readonly root = document.createElement("div");
  private readonly homeScore = document.createElement("div");
  private readonly awayScore = document.createElement("div");
  private readonly clock = document.createElement("div");
  private readonly selectedValue = document.createElement("strong");
  private readonly possessionValue = document.createElement("strong");
  private readonly chargeValue = document.createElement("strong");
  private readonly chargeFill = document.createElement("div");
  private readonly toast = document.createElement("div");
  private readonly pauseBtn = document.createElement("button");
  private readonly modeBadge = document.createElement("div");
  private readonly matchLabel = document.createElement("div");
  private toastTimer = 0;

  onPauseClick: (() => void) | null = null;

  constructor() {
    this.root.className = "hud";
    this.root.append(
      this.createScoreboard(),
      this.createStatusPanel(),
      this.createPauseButton(),
      this.modeBadge,
      this.toast
    );

    this.toast.className = "toast";
    this.modeBadge.className = "mode-badge";
    this.modeBadge.textContent = "1 vs AI";

    document.body.append(this.root);
  }

  update(state: HudUpdate): void {
    this.homeScore.textContent = String(state.homeScore);
    this.awayScore.textContent = String(state.awayScore);
    this.clock.textContent = state.matchOver ? "FT" : formatClock(state.remainingSeconds);
    this.selectedValue.textContent = state.selectedLabel;
    this.possessionValue.textContent = state.possessionLabel;
    this.chargeValue.textContent = `${Math.round(state.charge * 100)}%`;
    this.chargeFill.style.width = `${Math.round(state.charge * 100)}%`;

    if (state.gameMode) {
      this.modeBadge.textContent = state.gameMode === "1v1" ? "1 vs 1" : "1 vs AI";
      this.matchLabel.textContent = state.gameMode === "1v1" ? "Online Match" : "Quick Match";
    }
  }

  showGoal(team: TeamSide): void {
    this.showToast(`${team === "home" ? "Home" : "Away"} Goal`);
  }

  showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.remove("visible");
    void this.toast.offsetWidth;
    this.toast.classList.add("visible");
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove("visible");
    }, 1550);
  }

  show(): void {
    this.root.style.display = "";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  dispose(): void {
    window.clearTimeout(this.toastTimer);
    this.root.remove();
  }

  private createPauseButton(): HTMLElement {
    this.pauseBtn.className = "hud-pause-btn";
    this.pauseBtn.textContent = "⏸";
    this.pauseBtn.title = "Pause (Esc)";
    this.pauseBtn.addEventListener("click", () => {
      this.onPauseClick?.();
    });
    return this.pauseBtn;
  }

  private createScoreboard(): HTMLElement {
    const board = document.createElement("div");
    board.className = "scoreboard";

    const home = document.createElement("div");
    home.className = "team-panel home";
    const homeName = createTeamName("Home Blue", "home");
    this.homeScore.className = "score";
    home.append(homeName, this.homeScore);

    const center = document.createElement("div");
    center.className = "clock-block";
    const theme = document.createElement("div");
    theme.className = "theme-badge";
    theme.textContent = "⚽ Live";
    this.clock.className = "clock";
    this.matchLabel.className = "match-label";
    this.matchLabel.textContent = "Quick Match";
    center.append(theme, this.clock, this.matchLabel);

    const away = document.createElement("div");
    away.className = "team-panel away";
    const awayName = createTeamName("Away Red", "away");
    this.awayScore.className = "score";
    away.append(awayName, this.awayScore);

    board.append(home, center, away);
    return board;
  }

  private createStatusPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "status-panel";

    const title = document.createElement("div");
    title.className = "status-title";
    title.textContent = "Match Stats";

    const selectedRow = document.createElement("div");
    selectedRow.className = "status-row";
    const selectedLabel = document.createElement("span");
    selectedLabel.textContent = "Selected";
    selectedRow.append(selectedLabel, this.selectedValue);

    const possessionRow = document.createElement("div");
    possessionRow.className = "status-row";
    const possessionLabel = document.createElement("span");
    possessionLabel.textContent = "Possession";
    possessionRow.append(possessionLabel, this.possessionValue);

    const chargeRow = document.createElement("div");
    chargeRow.className = "status-row";
    const chargeLabel = document.createElement("span");
    chargeLabel.textContent = "Shot";
    chargeRow.append(chargeLabel, this.chargeValue);

    const chargeMeter = document.createElement("div");
    chargeMeter.className = "charge-meter";
    this.chargeFill.className = "charge-fill";
    chargeMeter.append(this.chargeFill);

    panel.append(title, selectedRow, possessionRow, chargeRow, chargeMeter);
    return panel;
  }
}

function createTeamName(label: string, side: "home" | "away"): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "team-name";

  const dot = document.createElement("span");
  dot.className = `team-dot ${side}`;

  const text = document.createElement("span");
  text.textContent = label;

  wrapper.append(dot, text);
  return wrapper;
}

function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
