import * as THREE from "three";
import { COLORS, PITCH } from "../config";

const lineMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.line,
  roughness: 0.72,
  metalness: 0.02
});

export function createPitch(): THREE.Group {
  const group = new THREE.Group();
  addGrass(group);
  addFieldLines(group);
  addGoals(group);
  return group;
}

function addGrass(group: THREE.Group): void {
  const bandLength = PITCH.length / PITCH.grassBands;

  for (let i = 0; i < PITCH.grassBands; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? COLORS.grassA : COLORS.grassB,
      roughness: 0.92,
      metalness: 0.01
    });

    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(bandLength, PITCH.width),
      material
    );
    band.rotation.x = -Math.PI / 2;
    band.position.set(-PITCH.halfLength + bandLength * (i + 0.5), 0, 0);
    band.receiveShadow = true;
    group.add(band);
  }

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.length + 28, PITCH.width + 24),
    new THREE.MeshStandardMaterial({
      color: "#36543d",
      roughness: 0.95,
      metalness: 0.01
    })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.025;
  apron.receiveShadow = true;
  group.add(apron);
}

function addFieldLines(group: THREE.Group): void {
  addRectangle(group, -PITCH.halfLength, PITCH.halfLength, -PITCH.halfWidth, PITCH.halfWidth);
  addLine(group, 0, -PITCH.halfWidth, 0, PITCH.halfWidth);

  const penaltyHalfWidth = PITCH.penaltyWidth / 2;
  addRectangle(
    group,
    -PITCH.halfLength,
    -PITCH.halfLength + PITCH.penaltyDepth,
    -penaltyHalfWidth,
    penaltyHalfWidth
  );
  addRectangle(
    group,
    PITCH.halfLength - PITCH.penaltyDepth,
    PITCH.halfLength,
    -penaltyHalfWidth,
    penaltyHalfWidth
  );

  addCircle(group, 0, 0, 9.15, 0.1);
  addSpot(group, 0, 0, 0.28);
  addSpot(group, -PITCH.halfLength + 11, 0, 0.24);
  addSpot(group, PITCH.halfLength - 11, 0, 0.24);

  addGoalArea(group, -1);
  addGoalArea(group, 1);
}

function addGoalArea(group: THREE.Group, side: 1 | -1): void {
  const xLine = side * PITCH.halfLength;
  const xInner = side * (PITCH.halfLength - 5.5);
  const zHalf = 18.32 / 2;
  addRectangle(group, Math.min(xLine, xInner), Math.max(xLine, xInner), -zHalf, zHalf, 0.095);
}

function addRectangle(
  group: THREE.Group,
  xMin: number,
  xMax: number,
  zMin: number,
  zMax: number,
  thickness = 0.12
): void {
  addLine(group, xMin, zMin, xMax, zMin, thickness);
  addLine(group, xMin, zMax, xMax, zMax, thickness);
  addLine(group, xMin, zMin, xMin, zMax, thickness);
  addLine(group, xMax, zMin, xMax, zMax, thickness);
}

function addLine(
  group: THREE.Group,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  thickness = 0.12
): void {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const line = new THREE.Mesh(new THREE.BoxGeometry(length, 0.025, thickness), lineMaterial);
  line.position.set((x1 + x2) / 2, 0.025, (z1 + z2) / 2);
  line.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  line.receiveShadow = true;
  group.add(line);
}

function addCircle(
  group: THREE.Group,
  x: number,
  z: number,
  radius: number,
  thickness: number
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - thickness, radius + thickness, 96),
    lineMaterial
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.03, z);
  ring.receiveShadow = true;
  group.add(ring);
}

function addSpot(group: THREE.Group, x: number, z: number, radius: number): void {
  const spot = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), lineMaterial);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(x, 0.035, z);
  group.add(spot);
}

function addGoals(group: THREE.Group): void {
  createGoal(group, -1);
  createGoal(group, 1);
}

function createGoal(group: THREE.Group, side: 1 | -1): void {
  const goal = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({
    color: "#f9f4e7",
    roughness: 0.42,
    metalness: 0.08
  });
  const netMaterial = new THREE.MeshStandardMaterial({
    color: "#fff7ef",
    roughness: 0.38,
    metalness: 0.02,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide
  });

  const x = side * PITCH.halfLength;
  const backX = x + side * PITCH.goalDepth;
  const postDepth = 0.24;
  const postHeight = PITCH.goalHeight;
  const zHalf = PITCH.goalWidth / 2;

  const leftPost = new THREE.Mesh(
    new THREE.BoxGeometry(postDepth, postHeight, postDepth),
    postMaterial
  );
  leftPost.position.set(x, postHeight / 2, -zHalf);
  leftPost.castShadow = true;
  goal.add(leftPost);

  const rightPost = leftPost.clone();
  rightPost.position.z = zHalf;
  goal.add(rightPost);

  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(postDepth, postDepth, PITCH.goalWidth + postDepth),
    postMaterial
  );
  crossbar.position.set(x, postHeight, 0);
  crossbar.castShadow = true;
  goal.add(crossbar);

  const backBar = new THREE.Mesh(
    new THREE.BoxGeometry(postDepth, postDepth, PITCH.goalWidth + postDepth),
    postMaterial
  );
  backBar.position.set(backX, postHeight, 0);
  backBar.castShadow = true;
  goal.add(backBar);

  const backNet = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.goalWidth, postHeight),
    netMaterial
  );
  backNet.rotation.y = Math.PI / 2;
  backNet.position.set(backX, postHeight / 2, 0);
  goal.add(backNet);

  const sideNetGeometry = new THREE.PlaneGeometry(PITCH.goalDepth, postHeight);
  const nearNet = new THREE.Mesh(sideNetGeometry, netMaterial);
  nearNet.rotation.y = side === 1 ? 0 : Math.PI;
  nearNet.position.set(x + side * (PITCH.goalDepth / 2), postHeight / 2, -zHalf);
  goal.add(nearNet);

  const farNet = nearNet.clone();
  farNet.position.z = zHalf;
  goal.add(farNet);

  group.add(goal);
}
