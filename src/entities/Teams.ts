import { COLORS } from "../config";
import { Player, PlayerRole } from "./Player";

interface FormationSlot {
  role: PlayerRole;
  x: number;
  z: number;
}

const homeFormation: FormationSlot[] = [
  { role: "GK", x: -50, z: 0 },
  { role: "DF", x: -36, z: -24 },
  { role: "DF", x: -37, z: -8 },
  { role: "DF", x: -37, z: 8 },
  { role: "DF", x: -36, z: 24 },
  { role: "MF", x: -20, z: -26 },
  { role: "MF", x: -21, z: -8 },
  { role: "MF", x: -21, z: 8 },
  { role: "MF", x: -20, z: 26 },
  { role: "FW", x: -5, z: -10 },
  { role: "FW", x: -5, z: 10 }
];

export interface Teams {
  home: Player[];
  away: Player[];
  all: Player[];
}

export function createTeams(): Teams {
  const home = homeFormation.map((slot, index) => {
    return new Player({
      id: index + 1,
      label: `${slot.role} ${index + 1}`,
      team: "home",
      role: slot.role,
      baseX: slot.x,
      baseZ: slot.z,
      jerseyColor: slot.role === "GK" ? COLORS.goalkeeper : COLORS.home
    });
  });

  const away = homeFormation.map((slot, index) => {
    return new Player({
      id: index + 12,
      label: `${slot.role} ${index + 1}`,
      team: "away",
      role: slot.role,
      baseX: -slot.x,
      baseZ: slot.z,
      jerseyColor: slot.role === "GK" ? COLORS.goalkeeper : COLORS.away
    });
  });

  return {
    home,
    away,
    all: [...home, ...away]
  };
}
