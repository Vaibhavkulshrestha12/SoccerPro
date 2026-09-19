import * as THREE from "three";
import { Ball } from "../entities/Ball";
import { Player } from "../entities/Player";

export class CameraRig {
  private readonly lookAtTarget = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  update(delta: number, selected: Player, ball: Ball): void {
    const selectedPosition = selected.position;
    const ballPosition = ball.position;
    const focus = this.lookAtTarget.set(
      THREE.MathUtils.lerp(selectedPosition.x, ballPosition.x, 0.32),
      1.2,
      THREE.MathUtils.lerp(selectedPosition.z, ballPosition.z, 0.32)
    );

    this.desiredPosition.set(
      focus.x - 25,
      31,
      THREE.MathUtils.clamp(focus.z + 27, -42, 42)
    );

    const alpha = 1 - Math.exp(-delta * 3.8);
    this.camera.position.lerp(this.desiredPosition, alpha);
    this.camera.lookAt(focus);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }
}
