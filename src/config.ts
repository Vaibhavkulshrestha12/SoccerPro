export const MATCH_DURATION_SECONDS = 180;

export const PITCH = {
  length: 110,
  width: 68,
  halfLength: 55,
  halfWidth: 34,
  penaltyDepth: 16.5,
  penaltyWidth: 40,
  goalWidth: 14,
  goalDepth: 4.5,
  goalHeight: 2.8,
  grassBands: 12,
  playerRadius: 1.05,
  ballRadius: 0.38
} as const;

export const COLORS = {
  home: "#2f7df6",
  away: "#f04c45",
  goalkeeper: "#f3c944",
  accent: "#f3c944",
  line: "#f6f3e8",
  grassA: "#2f8b45",
  grassB: "#267a3d",
  brick: "#a84c3b",
  brickDark: "#643227",
  sakura: "#f5a9bc",
  sakuraLight: "#ffd1db",
  water: "#4fa9b3",
  night: "#17191c"
} as const;

export type TeamSide = "home" | "away";

export const TEAM_ATTACK_DIRECTION: Record<TeamSide, 1 | -1> = {
  home: 1,
  away: -1
};

export const PLAYER_SPEED = {
  walk: 8.2,
  sprint: 13.2,
  ai: 7.3,
  aiSprint: 10.6,
  goalkeeper: 8.8
} as const;
