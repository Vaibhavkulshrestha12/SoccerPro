import * as THREE from "three";
import { COLORS, PITCH, TeamSide } from "../config";

export type PlayerRole = "GK" | "DF" | "MF" | "FW";

export interface PlayerOptions {
  id: number;
  label: string;
  team: TeamSide;
  role: PlayerRole;
  baseX: number;
  baseZ: number;
  jerseyColor: string;
}

const skinMaterial = new THREE.MeshStandardMaterial({
  color: "#d9a26d",
  roughness: 0.78,
  metalness: 0.02
});

const bootMaterial = new THREE.MeshStandardMaterial({
  color: "#111317",
  roughness: 0.68,
  metalness: 0.08
});

const hairMaterials = [
  new THREE.MeshStandardMaterial({ color: "#251912", roughness: 0.7, metalness: 0.02 }),
  new THREE.MeshStandardMaterial({ color: "#5b3725", roughness: 0.68, metalness: 0.02 }),
  new THREE.MeshStandardMaterial({ color: "#c48943", roughness: 0.66, metalness: 0.02 })
];

export class Player {
  readonly group = new THREE.Group();
  readonly basePosition: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  readonly facing = new THREE.Vector3(1, 0, 0);
  readonly radius = PITCH.playerRadius;
  readonly team: TeamSide;
  readonly role: PlayerRole;
  readonly id: number;
  readonly label: string;

  private readonly character = new THREE.Group();
  private readonly torso: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly leftArm: THREE.Group;
  private readonly rightArm: THREE.Group;
  private readonly leftLeg: THREE.Group;
  private readonly rightLeg: THREE.Group;
  private readonly selectionRing: THREE.Mesh;
  private readonly indicator: THREE.Mesh;
  private bobPhase = Math.random() * Math.PI * 2;
  private runBlend = 0;
  private tackleTimer = 0;
  private targetFacingAngle = 0;
  private currentFacingAngle = 0;

  constructor(options: PlayerOptions) {
    this.id = options.id;
    this.label = options.label;
    this.team = options.team;
    this.role = options.role;
    this.basePosition = new THREE.Vector3(options.baseX, 0, options.baseZ);
    this.group.position.copy(this.basePosition);

    const jerseyMaterial = new THREE.MeshStandardMaterial({
      color: options.jerseyColor,
      emissive: options.jerseyColor,
      emissiveIntensity: 0.08,
      roughness: 0.58,
      metalness: 0.05
    });

    const shortsMaterial = new THREE.MeshStandardMaterial({
      color: this.team === "home" ? "#174a9b" : "#8d2823",
      roughness: 0.62,
      metalness: 0.04
    });

    const sockMaterial = new THREE.MeshStandardMaterial({
      color: this.role === "GK" ? "#1e2630" : "#f7f2e7",
      roughness: 0.66,
      metalness: 0.02
    });

    this.character.position.y = 0.02;
    this.character.scale.setScalar(1.16);
    this.group.add(this.character);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.86, 20),
      new THREE.MeshBasicMaterial({
        color: "#0b1510",
        transparent: true,
        opacity: 0.14,
        depthWrite: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.022;
    shadow.scale.set(0.9, 0.68, 1);
    this.group.add(shadow);

    const hips = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 8),
      shortsMaterial
    );
    hips.position.y = 0.78;
    hips.scale.set(1.02, 0.54, 0.76);
    hips.castShadow = true;
    hips.receiveShadow = true;
    this.character.add(hips);

    this.torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.52, 0.88, 4, 12),
      jerseyMaterial
    );
    this.torso.position.y = 1.38;
    this.torso.scale.set(1.16, 1, 0.82);
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.character.add(this.torso);

    const upperBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 12, 8),
      jerseyMaterial
    );
    upperBack.position.y = 1.74;
    upperBack.scale.set(1.34, 0.46, 0.86);
    upperBack.castShadow = true;
    upperBack.receiveShadow = true;
    this.character.add(upperBack);

    const chestBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.13, 0.07),
      new THREE.MeshStandardMaterial({
        color: this.role === "GK" ? "#fff2a7" : "#fff7ef",
        roughness: 0.58,
        metalness: 0.03
      })
    );
    chestBand.position.set(0, 1.54, 0.36);
    this.character.add(chestBand);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 10), skinMaterial);
    neck.position.y = 2.02;
    this.character.add(neck);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), skinMaterial);
    this.head.position.y = 2.36;
    this.head.scale.set(0.95, 1.06, 0.96);
    this.head.castShadow = true;
    this.character.add(this.head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.395, 14, 7, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMaterials[this.id % hairMaterials.length]
    );
    hair.position.set(0, 2.46, -0.015);
    hair.scale.set(0.98, 0.72, 1);
    hair.castShadow = true;
    this.character.add(hair);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 8), skinMaterial);
    nose.position.set(0, 2.34, 0.34);
    nose.rotation.x = Math.PI / 2;
    this.character.add(nose);

    const shoulder = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 1.02, 3, 8),
      jerseyMaterial
    );
    shoulder.position.y = 1.78;
    shoulder.rotation.z = Math.PI / 2;
    shoulder.scale.z = 0.84;
    this.character.add(shoulder);

    this.leftArm = createLimb({
      upperLength: 0.58,
      lowerLength: 0.48,
      radius: 0.12,
      upperMaterial: jerseyMaterial,
      lowerMaterial: skinMaterial,
      endMaterial: skinMaterial,
      endRadius: 0.13
    });
    this.leftArm.position.set(-0.56, 1.76, 0.02);
    this.leftArm.rotation.z = -0.18;
    this.character.add(this.leftArm);

    this.rightArm = createLimb({
      upperLength: 0.58,
      lowerLength: 0.48,
      radius: 0.12,
      upperMaterial: jerseyMaterial,
      lowerMaterial: skinMaterial,
      endMaterial: skinMaterial,
      endRadius: 0.13
    });
    this.rightArm.position.set(0.56, 1.76, 0.02);
    this.rightArm.rotation.z = 0.18;
    this.character.add(this.rightArm);

    this.leftLeg = createLimb({
      upperLength: 0.52,
      lowerLength: 0.56,
      radius: 0.16,
      upperMaterial: shortsMaterial,
      lowerMaterial: sockMaterial,
      endMaterial: bootMaterial,
      endRadius: 0.16,
      boot: true
    });
    this.leftLeg.position.set(-0.25, 0.58, 0.02);
    this.character.add(this.leftLeg);

    this.rightLeg = createLimb({
      upperLength: 0.52,
      lowerLength: 0.56,
      radius: 0.16,
      upperMaterial: shortsMaterial,
      lowerMaterial: sockMaterial,
      endMaterial: bootMaterial,
      endRadius: 0.16,
      boot: true
    });
    this.rightLeg.position.set(0.25, 0.58, 0.02);
    this.character.add(this.rightLeg);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.accent,
      emissive: COLORS.accent,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.08
    });

    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius + 0.24, 0.045, 6, 36),
      ringMaterial
    );
    this.selectionRing.rotation.x = Math.PI / 2;
    this.selectionRing.position.y = 0.06;
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);

    this.indicator = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.55, 4),
      new THREE.MeshStandardMaterial({
        color: COLORS.accent,
        emissive: COLORS.accent,
        emissiveIntensity: 0.42,
        roughness: 0.48
      })
    );
    this.indicator.position.y = 2.75;
    this.indicator.rotation.y = Math.PI / 4;
    this.indicator.visible = false;
    this.group.add(this.indicator);

    this.setSelected(false);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  get isGoalkeeper(): boolean {
    return this.role === "GK";
  }

  setSelected(selected: boolean): void {
    this.selectionRing.visible = selected;
    this.indicator.visible = selected;
  }

  playTackle(): void {
    this.tackleTimer = 0.34;
  }

  setFacingFromMovement(movement: THREE.Vector3): void {
    if (movement.lengthSq() <= 0.0001) {
      return;
    }

    this.facing.set(movement.x, 0, movement.z).normalize();
    this.targetFacingAngle = Math.atan2(this.facing.x, this.facing.z);
  }

  updateVisual(delta: number): void {
    const velocityLength = this.velocity.length();
    const speed = Number.isFinite(velocityLength) ? velocityLength : 0;

    if (!Number.isFinite(velocityLength)) {
      this.velocity.set(0, 0, 0);
    }

    // Smooth facing interpolation for fluid turning
    let angleDiff = this.targetFacingAngle - this.currentFacingAngle;
    // Wrap to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const turnSpeed = speed > 2 ? 14 : 8; // faster turning when running
    this.currentFacingAngle += angleDiff * Math.min(1, delta * turnSpeed);
    this.group.rotation.y = this.currentFacingAngle;

    // Smoother run blend with different attack/decay rates
    const targetRunBlend = THREE.MathUtils.clamp(speed / 11.5, 0, 1);
    const blendRate = targetRunBlend > this.runBlend ? 14 : 8; // faster ramp-up, gradual slowdown
    this.runBlend +=
      (targetRunBlend - this.runBlend) * (1 - Math.exp(-delta * blendRate));

    const sprintAmount = THREE.MathUtils.clamp((speed - 9.2) / 4.5, 0, 1);
    const cadence = 4.4 + this.runBlend * 5.6 + sprintAmount * 2.4;
    this.bobPhase += delta * cadence;

    this.tackleTimer = Math.max(0, this.tackleTimer - delta);

    const stride = Math.sin(this.bobPhase);
    const counterStride = Math.sin(this.bobPhase + Math.PI);
    const lift = Math.abs(Math.sin(this.bobPhase * 2));
    const bob = lift * (0.035 + sprintAmount * 0.05) * this.runBlend;
    const lean = (-0.1 - sprintAmount * 0.22) * this.runBlend;
    const legSwing = (0.42 + sprintAmount * 0.5) * this.runBlend;
    const armSwing = (0.52 + sprintAmount * 0.62) * this.runBlend;

    // Turning lean: slight body tilt when turning sharply
    const turnLean = Math.abs(angleDiff) > 0.2 ? angleDiff * 0.06 * this.runBlend : 0;

    this.character.position.y = 0.02 + bob;
    this.torso.rotation.x = lean;
    this.torso.rotation.z = turnLean;
    this.head.rotation.x = -lean * 0.28;
    this.leftLeg.rotation.x = stride * legSwing;
    this.rightLeg.rotation.x = counterStride * legSwing;
    this.leftLeg.rotation.z = stride > 0 ? -0.08 * sprintAmount : 0.05 * sprintAmount;
    this.rightLeg.rotation.z = counterStride > 0 ? 0.08 * sprintAmount : -0.05 * sprintAmount;
    this.leftArm.rotation.x = counterStride * armSwing;
    this.rightArm.rotation.x = stride * armSwing;
    this.leftArm.rotation.z = -0.26 - sprintAmount * 0.16;
    this.rightArm.rotation.z = 0.26 + sprintAmount * 0.16;

    if (this.tackleTimer > 0) {
      const tackleBlend = Math.sin((this.tackleTimer / 0.34) * Math.PI);
      this.character.position.y = 0.02;
      this.torso.rotation.x = -0.46 * tackleBlend;
      this.torso.rotation.z = 0;
      this.leftLeg.rotation.x = -0.82 * tackleBlend;
      this.rightLeg.rotation.x = 0.34 * tackleBlend;
      this.leftArm.rotation.x = 0.65 * tackleBlend;
      this.rightArm.rotation.x = -0.65 * tackleBlend;
    }

    this.indicator.rotation.y += delta * 3.2;
  }
}

interface LimbOptions {
  upperLength: number;
  lowerLength: number;
  radius: number;
  upperMaterial: THREE.Material;
  lowerMaterial: THREE.Material;
  endMaterial: THREE.Material;
  endRadius: number;
  boot?: boolean;
}

function createLimb(options: LimbOptions): THREE.Group {
  const limb = new THREE.Group();
  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(options.radius, options.upperLength, 3, 8),
    options.upperMaterial
  );
  upper.position.y = -options.upperLength / 2;
  limb.add(upper);

  const lower = new THREE.Mesh(
    new THREE.CapsuleGeometry(options.radius * 0.86, options.lowerLength, 3, 8),
    options.lowerMaterial
  );
  lower.position.y = -options.upperLength - options.lowerLength / 2;
  limb.add(lower);

  const end = options.boot
    ? new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.48), options.endMaterial)
    : new THREE.Mesh(new THREE.SphereGeometry(options.endRadius, 12, 8), options.endMaterial);
  end.position.y = -options.upperLength - options.lowerLength - 0.08;

  if (options.boot) {
    end.position.z = 0.1;
  }

  limb.add(end);

  return limb;
}
