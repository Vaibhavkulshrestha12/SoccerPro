import * as THREE from "three";

export interface InputFrame {
  move: THREE.Vector2;
  sprint: boolean;
  passPressed: boolean;
  throughPressed: boolean;
  switchPressed: boolean;
  restartPressed: boolean;
  tacklePressed: boolean;
  shootHeld: boolean;
  shootPressed: boolean;
  shootReleased: boolean;
  pausePressed: boolean;
}

type ActionState = {
  pass: boolean;
  through: boolean;
  switchPlayer: boolean;
  restart: boolean;
  tackle: boolean;
  shoot: boolean;
  pause: boolean;
};

const emptyActions: ActionState = {
  pass: false,
  through: false,
  switchPlayer: false,
  restart: false,
  tackle: false,
  shoot: false,
  pause: false
};

export class InputController {
  private readonly keys = new Set<string>();
  private previousActions: ActionState = { ...emptyActions };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);

    if (event.code === "Space") {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);

    if (event.code === "Space") {
      event.preventDefault();
    }
  };

  readonly frame: InputFrame = {
    move: new THREE.Vector2(),
    sprint: false,
    passPressed: false,
    throughPressed: false,
    switchPressed: false,
    restartPressed: false,
    tacklePressed: false,
    shootHeld: false,
    shootPressed: false,
    shootReleased: false,
    pausePressed: false
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
  }

  update(): InputFrame {
    const gamepad = this.readGamepad();
    const move = this.readMove(gamepad);
    const actions = this.readActions(gamepad);

    this.frame.move.copy(move);
    this.frame.sprint =
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || gamepad.sprint;
    this.frame.passPressed = actions.pass && !this.previousActions.pass;
    this.frame.throughPressed = actions.through && !this.previousActions.through;
    this.frame.switchPressed =
      actions.switchPlayer && !this.previousActions.switchPlayer;
    this.frame.restartPressed = actions.restart && !this.previousActions.restart;
    this.frame.tacklePressed = actions.tackle && !this.previousActions.tackle;
    this.frame.shootHeld = actions.shoot;
    this.frame.shootPressed = actions.shoot && !this.previousActions.shoot;
    this.frame.shootReleased = !actions.shoot && this.previousActions.shoot;
    this.frame.pausePressed = actions.pause && !this.previousActions.pause;

    this.previousActions = actions;
    return this.frame;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private readMove(gamepad: { axisX: number; axisY: number }): THREE.Vector2 {
    const move = new THREE.Vector2();

    if (this.keys.has("KeyW")) {
      move.x += 1;
    }

    if (this.keys.has("KeyS")) {
      move.x -= 1;
    }

    if (this.keys.has("KeyD")) {
      move.y += 1;
    }

    if (this.keys.has("KeyA")) {
      move.y -= 1;
    }

    move.x += -gamepad.axisY;
    move.y += gamepad.axisX;

    if (move.lengthSq() > 1) {
      move.normalize();
    }

    return move;
  }

  private readActions(gamepad: ReturnType<InputController["readGamepad"]>): ActionState {
    return {
      pass: this.keys.has("KeyJ") || gamepad.pass,
      through: this.keys.has("KeyK") || gamepad.through,
      switchPlayer: this.keys.has("KeyQ") || gamepad.switchPlayer,
      restart: this.keys.has("KeyR"),
      tackle: this.keys.has("KeyI") || gamepad.tackle,
      shoot: this.keys.has("Space") || gamepad.shoot,
      pause: this.keys.has("Escape")
    };
  }

  private readGamepad() {
    const fallback = {
      axisX: 0,
      axisY: 0,
      sprint: false,
      switchPlayer: false,
      pass: false,
      through: false,
      tackle: false,
      shoot: false
    };

    const pads = navigator.getGamepads?.();
    const pad = pads?.find((candidate): candidate is Gamepad => Boolean(candidate));

    if (!pad) {
      return fallback;
    }

    const deadZone = 0.16;
    const axisX = Math.abs(pad.axes[0] ?? 0) > deadZone ? pad.axes[0] ?? 0 : 0;
    const axisY = Math.abs(pad.axes[1] ?? 0) > deadZone ? pad.axes[1] ?? 0 : 0;

    return {
      axisX,
      axisY,
      sprint: (pad.buttons[7]?.value ?? 0) > 0.35,
      switchPlayer: Boolean(pad.buttons[0]?.pressed),
      pass: Boolean(pad.buttons[3]?.pressed),
      through: Boolean(pad.buttons[1]?.pressed),
      tackle: Boolean(pad.buttons[2]?.pressed),
      shoot: Boolean(pad.buttons[4]?.pressed)
    };
  }
}
