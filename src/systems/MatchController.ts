import * as THREE from "three";
import {
  MATCH_DURATION_SECONDS,
  PITCH,
  PLAYER_SPEED,
  TEAM_ATTACK_DIRECTION,
  TeamSide
} from "../config";
import { InputFrame } from "../core/InputController";
import { Ball } from "../entities/Ball";
import { Player } from "../entities/Player";
import { Hud } from "../ui/Hud";

export type MatchMode = "ai" | "1v1";

export class MatchController {
  private selectedIndex = 9;
  private awaySelectedIndex = 9;
  private carrier: Player | null = null;
  private homeScore = 0;
  private awayScore = 0;
  private remainingSeconds = MATCH_DURATION_SECONDS;
  private matchOver = false;
  private kickoffPause = 0;
  private actionCooldown = 0;
  private tackleCooldown = 0;
  private manualTackleCooldown = 0;
  private aiKickCooldown = 1.2;
  private shotCharge = 0;
  private awayShotCharge = 0;
  private _paused = false;
  private _mode: MatchMode = "ai";

  /* Acceleration-based movement state for controlled player */
  private readonly playerVelocity = new THREE.Vector3();
  private readonly awayPlayerVelocity = new THREE.Vector3();

  private readonly temp = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly moveDelta = new THREE.Vector3();
  private readonly allPlayers: Player[];

  constructor(
    private readonly home: Player[],
    private readonly away: Player[],
    private readonly ball: Ball,
    private readonly hud: Hud
  ) {
    this.allPlayers = [...home, ...away];
    this.selectPlayer(this.selectedIndex);
    this.restartKickoff(true, true);
  }

  get selectedPlayer(): Player {
    return this.home[this.selectedIndex];
  }

  get paused(): boolean {
    return this._paused;
  }

  set mode(m: MatchMode) {
    this._mode = m;
  }

  get mode(): MatchMode {
    return this._mode;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  update(delta: number, input: InputFrame, awayInput?: InputFrame): void {
    if (this._paused) {
      return;
    }

    this.actionCooldown = Math.max(0, this.actionCooldown - delta);
    this.tackleCooldown = Math.max(0, this.tackleCooldown - delta);
    this.manualTackleCooldown = Math.max(0, this.manualTackleCooldown - delta);
    this.aiKickCooldown = Math.max(0, this.aiKickCooldown - delta);

    if (input.restartPressed) {
      this.restartKickoff(this.matchOver);
    }

    if (input.switchPressed) {
      this.switchPlayer();
    }

    this.updateShotCharge(delta, input);

    // 1v1: handle away player switching and shot charge
    if (this._mode === "1v1" && awayInput) {
      if (awayInput.switchPressed) {
        this.switchAwayPlayer();
      }
      this.updateAwayShotCharge(delta, awayInput);
    }

    if (!this.matchOver) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - delta);
      if (this.remainingSeconds <= 0) {
        this.matchOver = true;
        this.carrier = null;
        this.ball.stop();
        this.hud.showToast("Full Time");
      }
    }

    if (this.matchOver) {
      this.updateVisuals(delta);
      this.updateHud();
      return;
    }

    if (this.kickoffPause > 0) {
      this.kickoffPause = Math.max(0, this.kickoffPause - delta);
      if (this.kickoffPause === 0 && !this.carrier) {
        this.setCarrier(this.selectedPlayer);
      }
      this.attachBallToCarrier();
      this.updateVisuals(delta);
      this.updateHud();
      return;
    }

    this.updateControlledPlayer(delta, input);
    this.updateHomeTeammates(delta);

    if (this._mode === "1v1" && awayInput) {
      this.updateAwayControlledPlayer(delta, awayInput);
      this.updateAwayTeammates(delta);
      this.handleAwayPlayerActions(awayInput);
      if (awayInput.tacklePressed) {
        this.performManualTackleForTeam("away");
      }
    } else {
      this.updateAwayTeamAI(delta);
    }

    this.handlePlayerActions(input);
    if (input.tacklePressed) {
      this.performManualTackle();
    }
    this.resolveTackles();

    if (this.carrier) {
      this.attachBallToCarrier();
      if (this.handleGoalCheck()) {
        return;
      }
    } else {
      this.ball.update(delta);
      if (this.handleGoalCheck()) {
        return;
      }
      this.handleBallBounds();
      this.acquirePossession();
    }

    this.updateVisuals(delta);
    this.updateHud();
  }

  /* ─── Fluid acceleration-based movement for human-controlled player ─── */
  private updateControlledPlayer(delta: number, input: InputFrame): void {
    const player = this.selectedPlayer;
    const maxSpeed = input.sprint ? PLAYER_SPEED.sprint : PLAYER_SPEED.walk;
    const inputDir = this.temp.set(input.move.x, 0, input.move.y);
    const hasInput = inputDir.lengthSq() > 0.001;

    const accel = 38; // units/s² – snappy but not instant
    const decel = 28; // units/s² – smooth stop
    const turnBoost = 1.6; // extra decel when reversing direction

    if (hasInput) {
      inputDir.normalize();

      // Check if turning sharply – apply extra decel to kill old momentum
      const currentDir = this.playerVelocity.lengthSq() > 0.1
        ? this.temp.clone().copy(this.playerVelocity).normalize()
        : inputDir.clone();
      const dot = currentDir.dot(inputDir);
      const effectiveAccel = accel + (dot < 0.2 ? (1 - dot) * turnBoost * decel : 0);

      // Accelerate toward desired direction
      this.playerVelocity.addScaledVector(inputDir, effectiveAccel * delta);

      // Clamp to max speed
      const speed = this.playerVelocity.length();
      if (speed > maxSpeed) {
        this.playerVelocity.multiplyScalar(maxSpeed / speed);
      }
    } else {
      // Decelerate to stop
      const speed = this.playerVelocity.length();
      if (speed > 0.3) {
        const reduction = Math.min(speed, decel * delta);
        this.playerVelocity.multiplyScalar((speed - reduction) / speed);
      } else {
        this.playerVelocity.set(0, 0, 0);
      }
    }

    // Apply velocity
    if (this.playerVelocity.lengthSq() > 0.01) {
      player.position.addScaledVector(this.playerVelocity, delta);
      this.clampPlayerToPitch(player);
      player.velocity.copy(this.playerVelocity);
      player.setFacingFromMovement(this.playerVelocity);
    } else {
      player.velocity.multiplyScalar(0.72);
    }
  }

  /* ─── Away controlled player for 1v1 ─── */
  private updateAwayControlledPlayer(delta: number, input: InputFrame): void {
    const player = this.away[this.awaySelectedIndex];
    const maxSpeed = input.sprint ? PLAYER_SPEED.sprint : PLAYER_SPEED.walk;
    const inputDir = this.temp.set(input.move.x, 0, input.move.y);
    const hasInput = inputDir.lengthSq() > 0.001;

    const accel = 38;
    const decel = 28;
    const turnBoost = 1.6;

    if (hasInput) {
      inputDir.normalize();
      const currentDir = this.awayPlayerVelocity.lengthSq() > 0.1
        ? this.temp.clone().copy(this.awayPlayerVelocity).normalize()
        : inputDir.clone();
      const dot = currentDir.dot(inputDir);
      const effectiveAccel = accel + (dot < 0.2 ? (1 - dot) * turnBoost * decel : 0);

      this.awayPlayerVelocity.addScaledVector(inputDir, effectiveAccel * delta);
      const speed = this.awayPlayerVelocity.length();
      if (speed > maxSpeed) {
        this.awayPlayerVelocity.multiplyScalar(maxSpeed / speed);
      }
    } else {
      const speed = this.awayPlayerVelocity.length();
      if (speed > 0.3) {
        const reduction = Math.min(speed, decel * delta);
        this.awayPlayerVelocity.multiplyScalar((speed - reduction) / speed);
      } else {
        this.awayPlayerVelocity.set(0, 0, 0);
      }
    }

    if (this.awayPlayerVelocity.lengthSq() > 0.01) {
      player.position.addScaledVector(this.awayPlayerVelocity, delta);
      this.clampPlayerToPitch(player);
      player.velocity.copy(this.awayPlayerVelocity);
      player.setFacingFromMovement(this.awayPlayerVelocity);
    } else {
      player.velocity.multiplyScalar(0.72);
    }
  }

  private updateHomeTeammates(delta: number): void {
    const selected = this.selectedPlayer;
    const defending = this.carrier?.team === "away" || !this.carrier;
    const pressers = defending
      ? this.nearestPlayers(this.home, this.ball.position, selected, this.carrier ? 3 : 2)
      : [];

    for (const player of this.home) {
      if (player === selected) {
        continue;
      }

      if (player.isGoalkeeper) {
        this.updateGoalkeeper(player, delta);
        continue;
      }

      if (pressers.includes(player)) {
        const pressurePoint = this.carrier?.team === "away" ? this.carrier.position : this.ball.position;
        this.movePlayerToward(player, pressurePoint, PLAYER_SPEED.aiSprint, delta, 1.05);
        continue;
      }

      const laneOffset = ((player.id % 5) - 2) * 1.9;
      const roleRun = player.role === "FW" ? 16 : player.role === "MF" ? 10 : 2;
      let targetX = player.basePosition.x + this.ball.position.x * 0.12;
      let targetZ = player.basePosition.z + this.ball.position.z * 0.12 + laneOffset;

      if (this.carrier?.team === "home") {
        targetX =
          player.basePosition.x +
          TEAM_ATTACK_DIRECTION.home * roleRun +
          this.ball.position.x * 0.16;
        targetZ = player.basePosition.z * 0.78 + this.ball.position.z * 0.22 + laneOffset;
      } else if (this.carrier?.team === "away") {
        targetX = player.basePosition.x * 0.58 + this.ball.position.x * 0.42;
        targetZ = player.basePosition.z * 0.58 + this.ball.position.z * 0.42;
      } else {
        targetX = player.basePosition.x * 0.7 + this.ball.position.x * 0.3;
        targetZ = player.basePosition.z * 0.7 + this.ball.position.z * 0.3;
      }

      const target = this.target.set(
        THREE.MathUtils.clamp(targetX, -51, 51),
        0,
        THREE.MathUtils.clamp(targetZ, -30, 30)
      );
      this.movePlayerToward(player, target, PLAYER_SPEED.ai, delta, 0.42);
    }
  }

  /* ─── Away AI: enhanced PES-like behaviour ─── */
  private updateAwayTeamAI(delta: number): void {
    const pressureTarget =
      this.carrier?.team === "home" ? this.carrier.position : this.ball.position;

    // More aggressive pressing: 4 pressers when defending, close down tighter
    const pressingCount = this.carrier?.team === "away" ? 0 : 4;
    const pressers =
      pressingCount > 0 ? this.nearestPlayers(this.away, pressureTarget, undefined, pressingCount) : [];

    for (const player of this.away) {
      if (this.carrier === player) {
        this.updateAwayCarrierAI(player, delta);
        continue;
      }

      if (player.isGoalkeeper) {
        this.updateGoalkeeper(player, delta);
        continue;
      }

      if (pressers.includes(player)) {
        const dist = this.distanceXZ(player.position, pressureTarget);
        // Sprint at full speed when far, high speed when close
        const speed = dist > 8 ? PLAYER_SPEED.aiSprint * 1.1 : PLAYER_SPEED.aiSprint;
        // Close down to very tight radius to force tackles
        this.movePlayerToward(player, pressureTarget, speed, delta, 0.6);

        // AI AUTO-TACKLE: if near the carrier (even stationary), attempt a tackle
        if (this.carrier && this.carrier.team === "home" && this.tackleCooldown <= 0) {
          const tackleDist = this.distanceXZ(player.position, this.carrier.position);
          if (tackleDist < 2.0) {
            // Tackle regardless of carrier velocity (fixes stationary carrier issue)
            player.playTackle();
            this.setCarrier(player);
            this.tackleCooldown = 0.7;
            this.hud.showToast("Tackle");
            break; // only one tackle per frame
          } else if (tackleDist < 2.8) {
            // Lunge tackle: press harder toward the carrier
            const toCarrier = this.moveDelta.subVectors(this.carrier.position, player.position);
            toCarrier.y = 0;
            toCarrier.normalize();
            player.position.addScaledVector(toCarrier, PLAYER_SPEED.aiSprint * 1.2 * delta);
            this.clampPlayerToPitch(player);
            player.velocity.copy(toCarrier).multiplyScalar(PLAYER_SPEED.aiSprint);
            player.setFacingFromMovement(toCarrier);
          }
        }
        continue;
      }

      // Intelligent positioning: cover passing lanes, mark runners
      const laneOffset = ((player.id % 5) - 2) * 1.8;
      const roleRun = player.role === "FW" ? 16 : player.role === "MF" ? 10 : 2;
      let targetX = player.basePosition.x + this.ball.position.x * 0.12;
      let targetZ = player.basePosition.z + this.ball.position.z * 0.12 + laneOffset;

      if (this.carrier?.team === "away") {
        // Support the attack: make forward runs
        targetX =
          player.basePosition.x +
          TEAM_ATTACK_DIRECTION.away * roleRun +
          this.ball.position.x * 0.18;
        targetZ = player.basePosition.z * 0.76 + this.ball.position.z * 0.24 + laneOffset;
      } else if (this.carrier?.team === "home") {
        // Defensive shape: compress toward the ball
        targetX = player.basePosition.x * 0.48 + this.ball.position.x * 0.52;
        targetZ = player.basePosition.z * 0.52 + this.ball.position.z * 0.48;

        // Defenders hold a deeper line
        if (player.role === "DF") {
          targetX = Math.max(targetX, player.basePosition.x * 0.7);
        }
      } else {
        // Loose ball: collapse toward it
        targetX = player.basePosition.x * 0.6 + this.ball.position.x * 0.4;
        targetZ = player.basePosition.z * 0.6 + this.ball.position.z * 0.4;
      }

      const target = this.target.set(
        THREE.MathUtils.clamp(targetX, -51, 51),
        0,
        THREE.MathUtils.clamp(targetZ, -30, 30)
      );
      this.movePlayerToward(player, target, PLAYER_SPEED.ai * 1.05, delta, 0.42);
    }
  }

  /* ─── Away AI carrier: smarter decision-making ─── */
  private updateAwayCarrierAI(player: Player, delta: number): void {
    const nearestPressure = this.nearestPlayer(this.home, player.position);
    const pressure = nearestPressure
      ? this.distanceXZ(nearestPressure.position, player.position)
      : Infinity;
    const closeToGoal = player.position.x < -33;
    const inShootingRange = player.position.x < -25 && Math.abs(player.position.z) < 20;

    if (this.aiKickCooldown <= 0) {
      // Shoot when in range
      if (closeToGoal || (inShootingRange && pressure < 5)) {
        this.performShot(player, closeToGoal ? 0.72 : 0.52);
        this.aiKickCooldown = 1.1;
        return;
      }

      // Pass under pressure
      if (pressure < 3.8) {
        this.performPass(player, pressure < 2.5);
        this.aiKickCooldown = 0.9;
        return;
      }

      // Cross from the wing
      if (player.position.x < 8 && Math.abs(player.position.z) > 18) {
        this.performPass(player, true);
        this.aiKickCooldown = 1.0;
        return;
      }
    }

    // Dribble: avoid nearest opponent by angling away
    const goalTarget = this.target.set(
      -PITCH.halfLength + 2.2,
      0,
      THREE.MathUtils.clamp(player.position.z * 0.32, -5.8, 5.8)
    );

    // If an opponent is close, dribble sideways to evade
    if (nearestPressure && pressure < 6) {
      const toOpponent = this.temp.subVectors(nearestPressure.position, player.position);
      toOpponent.y = 0;
      if (toOpponent.lengthSq() > 0.01) {
        toOpponent.normalize();
        // Perpendicular evasion (choose the side away from touchline)
        const perpZ = player.position.z > 0 ? -Math.abs(toOpponent.x) : Math.abs(toOpponent.x);
        goalTarget.z += perpZ * 4;
        goalTarget.z = THREE.MathUtils.clamp(goalTarget.z, -28, 28);
      }
    }

    this.movePlayerToward(player, goalTarget, PLAYER_SPEED.aiSprint, delta, 0.4);
  }

  /* ─── Away teammates for 1v1 mode (AI-driven teammates, not the controlled player) ─── */
  private updateAwayTeammates(delta: number): void {
    const awaySelected = this.away[this.awaySelectedIndex];
    const defending = this.carrier?.team === "home" || !this.carrier;
    const pressers = defending
      ? this.nearestPlayers(this.away, this.ball.position, awaySelected, this.carrier ? 3 : 2)
      : [];

    for (const player of this.away) {
      if (player === awaySelected) {
        continue;
      }

      if (player.isGoalkeeper) {
        this.updateGoalkeeper(player, delta);
        continue;
      }

      if (pressers.includes(player)) {
        const pressurePoint = this.carrier?.team === "home" ? this.carrier.position : this.ball.position;
        this.movePlayerToward(player, pressurePoint, PLAYER_SPEED.aiSprint, delta, 1.05);
        continue;
      }

      const laneOffset = ((player.id % 5) - 2) * 1.8;
      const roleRun = player.role === "FW" ? 16 : player.role === "MF" ? 10 : 2;
      let targetX = player.basePosition.x + this.ball.position.x * 0.12;
      let targetZ = player.basePosition.z + this.ball.position.z * 0.12 + laneOffset;

      if (this.carrier?.team === "away") {
        targetX =
          player.basePosition.x +
          TEAM_ATTACK_DIRECTION.away * roleRun +
          this.ball.position.x * 0.18;
        targetZ = player.basePosition.z * 0.76 + this.ball.position.z * 0.24 + laneOffset;
      } else if (this.carrier?.team === "home") {
        targetX = player.basePosition.x * 0.54 + this.ball.position.x * 0.46;
        targetZ = player.basePosition.z * 0.58 + this.ball.position.z * 0.42;
      } else {
        targetX = player.basePosition.x * 0.7 + this.ball.position.x * 0.3;
        targetZ = player.basePosition.z * 0.7 + this.ball.position.z * 0.3;
      }

      const target = this.target.set(
        THREE.MathUtils.clamp(targetX, -51, 51),
        0,
        THREE.MathUtils.clamp(targetZ, -30, 30)
      );
      this.movePlayerToward(player, target, PLAYER_SPEED.ai, delta, 0.42);
    }
  }

  private updateGoalkeeper(player: Player, delta: number): void {
    const side = player.team === "home" ? -1 : 1;
    const goalX = side * PITCH.halfLength;
    const baseLineX = side * (PITCH.halfLength - 5.2);
    
    // Predict where the ball will cross the goal line if moving fast
    let targetZ = this.ball.position.z * 0.56;
    if (this.ball.velocity.lengthSq() > 15) {
      const distToGoal = Math.abs(goalX - this.ball.position.x);
      const velX = this.ball.velocity.x;
      if (Math.sign(velX) === Math.sign(side) && Math.abs(velX) > 0.1) {
        const timeToGoal = distToGoal / Math.abs(velX);
        if (timeToGoal < 2.5) {
          targetZ = this.ball.position.z + this.ball.velocity.z * timeToGoal;
        }
      }
    }
    
    const z = THREE.MathUtils.clamp(targetZ, -5.7, 5.7);
    this.target.set(baseLineX, 0, z);

    // Dash and dive logic for incoming shots
    const distToBall = this.distanceXZ(player.position, this.ball.position);
    let speed = PLAYER_SPEED.goalkeeper;
    
    if (distToBall < 14 && this.ball.velocity.lengthSq() > 25) {
      speed *= 2.2; // Dash to intercept
      
      // Dive if very close
      if (distToBall < 4.8 && this.ball.position.y < 2.8) {
        player.playTackle(); // Trigger dive animation
        if (!this.carrier) {
          this.setCarrier(player);
        }
      }
    }

    this.movePlayerToward(player, this.target, speed, delta, 0.35);
  }

  private handlePlayerActions(input: InputFrame): void {
    const player = this.selectedPlayer;

    if (input.passPressed) {
      this.kickFromPlayer(player, () => this.performPass(player, false, input.move));
    }

    if (input.throughPressed) {
      this.kickFromPlayer(player, () => this.performPass(player, true, input.move));
    }

    if (input.shootReleased) {
      const charge = Math.max(0.16, this.shotCharge);
      this.kickFromPlayer(player, () => this.performShot(player, charge));
      this.shotCharge = 0;
    }
  }

  /* ─── Away human actions for 1v1 ─── */
  private handleAwayPlayerActions(input: InputFrame): void {
    const player = this.away[this.awaySelectedIndex];

    if (input.passPressed) {
      this.kickFromPlayer(player, () => this.performPass(player, false, input.move));
    }

    if (input.throughPressed) {
      this.kickFromPlayer(player, () => this.performPass(player, true, input.move));
    }

    if (input.shootReleased) {
      const charge = Math.max(0.16, this.awayShotCharge);
      this.kickFromPlayer(player, () => this.performShot(player, charge));
      this.awayShotCharge = 0;
    }
  }

  private performManualTackle(): void {
    this.executeTackle(this.selectedPlayer, "home");
  }

  private performManualTackleForTeam(team: TeamSide): void {
    if (team === "away") {
      this.executeTackle(this.away[this.awaySelectedIndex], "away");
    } else {
      this.executeTackle(this.selectedPlayer, "home");
    }
  }

  private executeTackle(player: Player, team: TeamSide): void {
    if (this.manualTackleCooldown > 0 || this.actionCooldown > 0) {
      return;
    }

    const facing = this.temp.copy(player.facing);
    if (facing.lengthSq() <= 0.0001) {
      facing.set(TEAM_ATTACK_DIRECTION[team], 0, 0);
    }
    facing.y = 0;
    facing.normalize();

    player.playTackle();
    player.position.addScaledVector(facing, 0.54);
    this.clampPlayerToPitch(player);
    player.velocity.copy(facing).multiplyScalar(PLAYER_SPEED.sprint * 0.72);

    this.manualTackleCooldown = 0.72;
    this.tackleCooldown = 0.34;
    this.actionCooldown = 0.12;

    const opponentTeam = team === "home" ? "away" : "home";
    if (this.carrier?.team === opponentTeam) {
      const toCarrier = this.target.subVectors(this.carrier.position, player.position);
      toCarrier.y = 0;
      const distance = toCarrier.length();
      const frontDot = distance > 0 ? toCarrier.normalize().dot(facing) : 1;

      if (distance <= 2.7 && frontDot > -0.28) {
        this.setCarrier(player);
        this.hud.showToast("Tackle");
        return;
      }

      if (distance <= 3.15 && frontDot > -0.45) {
        this.carrier = null;
        this.attachBallNear(player);
        this.ball.kick(facing, 11.5, 0.25);
      }
      return;
    }

    if (!this.carrier && this.distanceXZ(player.position, this.ball.position) <= 2.35) {
      this.setCarrier(player);
      this.hud.showToast("Recovered");
    }
  }

  private updateShotCharge(delta: number, input: InputFrame): void {
    if (input.shootHeld) {
      this.shotCharge = Math.min(1, this.shotCharge + delta * 0.92);
      return;
    }

    if (!input.shootReleased) {
      this.shotCharge = Math.max(0, this.shotCharge - delta * 3);
    }
  }

  private updateAwayShotCharge(delta: number, input: InputFrame): void {
    if (input.shootHeld) {
      this.awayShotCharge = Math.min(1, this.awayShotCharge + delta * 0.92);
      return;
    }
    if (!input.shootReleased) {
      this.awayShotCharge = Math.max(0, this.awayShotCharge - delta * 3);
    }
  }

  private kickFromPlayer(player: Player, action: () => void): void {
    if (this.actionCooldown > 0) {
      return;
    }

    if (this.carrier === player) {
      action();
      return;
    }

    if (!this.carrier && this.distanceXZ(player.position, this.ball.position) < player.radius + this.ball.radius + 1.25) {
      action();
    }
  }

  private performPass(player: Player, through: boolean, requestedMove?: THREE.Vector2): void {
    const targetPlayer = this.findPassTarget(player, through, requestedMove);
    const attack = TEAM_ATTACK_DIRECTION[player.team];
    const targetPosition = targetPlayer
      ? targetPlayer.position.clone()
      : player.position.clone().add(new THREE.Vector3(attack * 20, 0, 0));

    if (through) {
      targetPosition.x += attack * 11;
      targetPosition.z = THREE.MathUtils.clamp(targetPosition.z, -PITCH.halfWidth + 4, PITCH.halfWidth - 4);
    }

    const direction = targetPosition.sub(this.ball.position);
    direction.y = 0;
    const distance = Math.max(8, direction.length());
    const speed = through
      ? THREE.MathUtils.clamp(distance * 1.18, 23, 35)
      : THREE.MathUtils.clamp(distance * 1.05, 15, 28);

    this.releaseBall(player, direction, speed, through ? 0.7 : 0.16);
  }

  private performShot(player: Player, charge: number): void {
    const attack = TEAM_ATTACK_DIRECTION[player.team];
    const targetZ = THREE.MathUtils.clamp(player.position.z * 0.2, -PITCH.goalWidth / 2 + 1.1, PITCH.goalWidth / 2 - 1.1);
    const targetPosition = this.target.set(attack * (PITCH.halfLength + PITCH.goalDepth * 0.78), 1.2, targetZ);
    const direction = targetPosition.sub(this.ball.position);
    const speed = 29 + charge * 26;
    const lift = 2.4 + charge * 6.8;

    this.releaseBall(player, direction, speed, lift);
  }

  private releaseBall(player: Player, direction: THREE.Vector3, speed: number, lift: number): void {
    this.carrier = null;
    this.attachBallNear(player);
    this.ball.kick(direction, speed, lift);
    player.setFacingFromMovement(direction);
    this.actionCooldown = 0.24;
  }

  private findPassTarget(
    player: Player,
    through: boolean,
    requestedMove?: THREE.Vector2
  ): Player | null {
    const teammates = player.team === "home" ? this.home : this.away;
    const attack = TEAM_ATTACK_DIRECTION[player.team];
    const requestedDirection =
      requestedMove && requestedMove.lengthSq() > 0.05
        ? new THREE.Vector3(requestedMove.x, 0, requestedMove.y).normalize()
        : new THREE.Vector3(attack, 0, 0);

    let best: Player | null = null;
    let bestScore = -Infinity;

    for (const teammate of teammates) {
      if (teammate === player) {
        continue;
      }

      const toMate = teammate.position.clone().sub(player.position);
      toMate.y = 0;
      const distance = Math.max(toMate.length(), 0.001);
      const alignment = toMate.clone().normalize().dot(requestedDirection);
      const forwardBonus = (teammate.position.x - player.position.x) * attack;
      const roleBonus = through && teammate.role === "FW" ? 7 : 0;
      const score = alignment * 28 + forwardBonus * 0.24 + roleBonus - distance * 0.16;

      if (score > bestScore) {
        best = teammate;
        bestScore = score;
      }
    }

    return best;
  }

  private acquirePossession(): void {
    if (this.actionCooldown > 0) {
      return;
    }

    let nearest: Player | null = null;
    let nearestDistance = Infinity;

    for (const player of this.allPlayers) {
      const distance = this.distanceXZ(player.position, this.ball.position);
      if (distance < nearestDistance) {
        nearest = player;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance < nearest.radius + this.ball.radius + 0.88 && this.ball.position.y < 1.4) {
      this.setCarrier(nearest);
    }
  }

  private resolveTackles(): void {
    if (!this.carrier || this.tackleCooldown > 0 || this.actionCooldown > 0) {
      return;
    }

    const opponents = this.carrier.team === "home" ? this.away : this.home;
    const tackler = this.nearestPlayer(opponents, this.carrier.position);

    const tackleDistance = tackler
      ? this.distanceXZ(tackler.position, this.carrier.position)
      : Infinity;

    // ENHANCED: tackle even if carrier is stationary (removed velocity check)
    if (tackler && tackleDistance < 1.62) {
      // Only require the tackler to be reasonably moving OR very close
      const tacklerSpeed = tackler.velocity.lengthSq();
      if (tacklerSpeed > 0.8 || tackleDistance < 1.1) {
        tackler.playTackle();
        this.setCarrier(tackler);
        this.tackleCooldown = 0.62;
      }
    }
  }

  private handleGoalCheck(): boolean {
    const inGoalMouth =
      Math.abs(this.ball.position.z) <= PITCH.goalWidth / 2 &&
      this.ball.position.y <= PITCH.goalHeight;

    if (!inGoalMouth) {
      return false;
    }

    if (this.ball.position.x > PITCH.halfLength + this.ball.radius) {
      this.scoreGoal("home");
      return true;
    }

    if (this.ball.position.x < -PITCH.halfLength - this.ball.radius) {
      this.scoreGoal("away");
      return true;
    }

    return false;
  }

  private scoreGoal(team: TeamSide): void {
    if (team === "home") {
      this.homeScore += 1;
    } else {
      this.awayScore += 1;
    }

    this.hud.showGoal(team);
    this.restartKickoff(false);
    this.kickoffPause = 1.8;
    this.carrier = null;
  }

  private handleBallBounds(): void {
    const goalMouth = Math.abs(this.ball.position.z) <= PITCH.goalWidth / 2;
    const sideLimit = PITCH.halfWidth - this.ball.radius;

    if (Math.abs(this.ball.position.z) > sideLimit) {
      this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -sideLimit, sideLimit);
      this.ball.velocity.z *= -0.42;
      this.ball.velocity.x *= 0.82;
    }

    const xLimit = PITCH.halfLength - this.ball.radius;
    if (Math.abs(this.ball.position.x) > xLimit && goalMouth && this.ball.position.y > PITCH.goalHeight) {
      this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, -xLimit, xLimit);
      this.ball.velocity.x *= -0.36;
      this.ball.velocity.y *= 0.72;
      this.ball.velocity.z *= 0.82;
      return;
    }

    if (Math.abs(this.ball.position.x) > xLimit && !goalMouth) {
      this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, -xLimit, xLimit);
      this.ball.velocity.x *= -0.44;
      this.ball.velocity.z *= 0.82;
    }
  }

  restartKickoff(resetMatch: boolean, initial = false): void {
    if (resetMatch || initial) {
      this.homeScore = initial ? this.homeScore : 0;
      this.awayScore = initial ? this.awayScore : 0;
      this.remainingSeconds = MATCH_DURATION_SECONDS;
      this.matchOver = false;
    }

    for (const player of this.allPlayers) {
      player.position.copy(player.basePosition);
      player.velocity.set(0, 0, 0);
    }

    this.playerVelocity.set(0, 0, 0);
    this.awayPlayerVelocity.set(0, 0, 0);
    this.selectPlayer(9);
    this.selectedPlayer.position.set(-1.8, 0, 0);
    this.ball.position.set(0, this.ball.radius, 0);
    this.ball.stop();
    this.actionCooldown = 0.2;
    this.tackleCooldown = 0.5;
    this.kickoffPause = initial ? 0 : 0.75;
    this.carrier = initial ? this.selectedPlayer : null;
    this.attachBallToCarrier();
    this.updateHud();
  }

  private switchPlayer(): void {
    const nearest = this.nearestPlayer(this.home, this.ball.position, this.selectedPlayer);

    if (nearest) {
      this.selectPlayer(this.home.indexOf(nearest));
      return;
    }

    this.selectPlayer((this.selectedIndex + 1) % this.home.length);
  }

  private switchAwayPlayer(): void {
    const current = this.away[this.awaySelectedIndex];
    const nearest = this.nearestPlayer(this.away, this.ball.position, current);

    if (nearest) {
      this.selectAwayPlayer(this.away.indexOf(nearest));
      return;
    }

    this.selectAwayPlayer((this.awaySelectedIndex + 1) % this.away.length);
  }

  private selectPlayer(index: number): void {
    this.home[this.selectedIndex]?.setSelected(false);
    this.selectedIndex = THREE.MathUtils.clamp(index, 0, this.home.length - 1);
    this.home[this.selectedIndex].setSelected(true);
  }

  private selectAwayPlayer(index: number): void {
    this.away[this.awaySelectedIndex]?.setSelected(false);
    this.awaySelectedIndex = THREE.MathUtils.clamp(index, 0, this.away.length - 1);
    this.away[this.awaySelectedIndex].setSelected(true);
  }

  private setCarrier(player: Player): void {
    this.carrier = player;
    this.ball.stop();

    if (player.team === "home") {
      this.selectPlayer(this.home.indexOf(player));
    } else if (this._mode === "1v1") {
      this.selectAwayPlayer(this.away.indexOf(player));
    }

    this.attachBallToCarrier();
  }

  private attachBallToCarrier(): void {
    if (!this.carrier) {
      return;
    }

    this.attachBallNear(this.carrier);
    this.ball.stop();
  }

  private attachBallNear(player: Player): void {
    const facing = player.facing.lengthSq() > 0.001
      ? player.facing
      : this.temp.set(TEAM_ATTACK_DIRECTION[player.team], 0, 0);
    const offset = player.radius + this.ball.radius + 0.16;

    this.ball.position.set(
      player.position.x + facing.x * offset,
      this.ball.radius,
      player.position.z + facing.z * offset
    );
  }

  private movePlayerToward(
    player: Player,
    target: THREE.Vector3,
    speed: number,
    delta: number,
    stopDistance: number
  ): void {
    const direction = this.moveDelta.subVectors(target, player.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance <= stopDistance) {
      player.velocity.multiplyScalar(0.68);
      return;
    }

    direction.normalize();

    // Smooth AI movement: blend toward target direction instead of snapping
    const currentSpeed = player.velocity.length();
    const targetSpeed = Math.min(speed, (distance - stopDistance) / delta);
    const blendedSpeed = currentSpeed + (targetSpeed - currentSpeed) * Math.min(1, delta * 8);
    const step = blendedSpeed * delta;

    player.position.addScaledVector(direction, Math.min(step, distance - stopDistance));
    this.clampPlayerToPitch(player);
    player.velocity.copy(direction).multiplyScalar(blendedSpeed);
    player.setFacingFromMovement(direction);
  }

  private clampPlayerToPitch(player: Player): void {
    player.position.x = THREE.MathUtils.clamp(
      player.position.x,
      -PITCH.halfLength + player.radius,
      PITCH.halfLength - player.radius
    );
    player.position.z = THREE.MathUtils.clamp(
      player.position.z,
      -PITCH.halfWidth + player.radius,
      PITCH.halfWidth - player.radius
    );
  }

  private nearestPlayer(
    players: Player[],
    point: THREE.Vector3,
    exclude?: Player
  ): Player | null {
    let nearest: Player | null = null;
    let nearestDistance = Infinity;

    for (const player of players) {
      if (player === exclude) {
        continue;
      }

      const distance = this.distanceXZ(player.position, point);
      if (distance < nearestDistance) {
        nearest = player;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private nearestPlayers(
    players: Player[],
    point: THREE.Vector3,
    exclude: Player | undefined,
    count: number
  ): Player[] {
    const ranked = players
      .filter((player) => player !== exclude && !player.isGoalkeeper)
      .map((player) => ({
        player,
        distance: this.distanceXZ(player.position, point)
      }))
      .sort((a, b) => a.distance - b.distance);

    return ranked.slice(0, count).map((entry) => entry.player);
  }

  private distanceXZ(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private updateVisuals(delta: number): void {
    for (const player of this.allPlayers) {
      player.updateVisual(delta);
    }
  }

  private updateHud(): void {
    const possessionLabel = this.carrier
      ? this.carrier.team === "home"
        ? "Home"
        : "Away"
      : "Loose";

    this.hud.update({
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      remainingSeconds: this.remainingSeconds,
      selectedLabel: this.selectedPlayer.label,
      possessionLabel,
      charge: this.shotCharge,
      matchOver: this.matchOver,
      gameMode: this._mode === "1v1" ? "1v1" : "ai"
    });
  }
}
