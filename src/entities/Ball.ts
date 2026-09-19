import * as THREE from "three";
import { PITCH } from "../config";

export class Ball {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  readonly radius = PITCH.ballRadius;

  private readonly mesh: THREE.Mesh;

  constructor() {
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: "#f8f6ee",
      roughness: 0.5,
      metalness: 0.02
    });

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 28, 18),
      ballMaterial
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const seam = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(this.radius * 1.01, 1)),
      new THREE.LineBasicMaterial({
        color: "#1c1c1c",
        transparent: true,
        opacity: 0.55
      })
    );
    this.group.add(seam);

    this.position.set(0, this.radius, 0);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  update(delta: number): void {
    this.position.addScaledVector(this.velocity, delta);

    if (this.position.y > this.radius || this.velocity.y > 0) {
      this.velocity.y -= 14.2 * delta;
    }

    if (this.position.y < this.radius) {
      this.position.y = this.radius;
      this.velocity.y = Math.abs(this.velocity.y) * 0.28;

      if (Math.abs(this.velocity.y) < 0.8) {
        this.velocity.y = 0;
      }
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);

    if (horizontalSpeed > 0.02) {
      const friction = Math.max(0, 1 - delta * (this.position.y <= this.radius + 0.02 ? 1.28 : 0.18));
      this.velocity.x *= friction;
      this.velocity.z *= friction;

      const rollAxis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x);
      if (rollAxis.lengthSq() > 0.0001) {
        rollAxis.normalize();
        this.mesh.rotateOnWorldAxis(rollAxis, horizontalSpeed * delta / this.radius);
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
  }

  kick(direction: THREE.Vector3, speed: number, lift = 0): void {
    const normalized = direction.clone();

    if (normalized.lengthSq() <= 0.0001) {
      normalized.set(1, 0, 0);
    }

    normalized.normalize();
    this.velocity.set(normalized.x * speed, lift, normalized.z * speed);
  }

  stop(): void {
    this.velocity.set(0, 0, 0);
    this.position.y = this.radius;
  }
}
