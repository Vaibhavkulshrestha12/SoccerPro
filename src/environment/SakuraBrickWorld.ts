import * as THREE from "three";
import { COLORS, PITCH } from "../config";

export function createSakuraBrickWorld(): THREE.Group {
  const world = new THREE.Group();
  addOuterPlaza(world);
  addBrickEdge(world);
  addGrandstands(world);
  addToriiGate(world);
  addPagoda(world);
  addLotusPond(world);
  addLanternRun(world);
  addBambooGroves(world);
  addSakuraGarden(world);
  addCornerFlags(world);
  addPetals(world);
  return world;
}

function addOuterPlaza(world: THREE.Group): void {
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.length + 78, PITCH.width + 62),
    new THREE.MeshStandardMaterial({
      color: "#d3caba",
      roughness: 0.88,
      metalness: 0.01
    })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = -0.06;
  plaza.receiveShadow = true;
  world.add(plaza);

  const pathMaterial = new THREE.MeshStandardMaterial({
    color: "#c7bdae",
    roughness: 0.82,
    metalness: 0.01
  });
  const northPath = new THREE.Mesh(
    new THREE.BoxGeometry(PITCH.length + 34, 0.04, 7.2),
    pathMaterial
  );
  northPath.position.set(0, 0.01, PITCH.halfWidth + 11.2);
  northPath.receiveShadow = true;
  world.add(northPath);

  const southPath = northPath.clone();
  southPath.position.z = -PITCH.halfWidth - 11.2;
  world.add(southPath);
}

function addBrickEdge(world: THREE.Group): void {
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.brick,
    roughness: 0.66,
    metalness: 0.04
  });
  const north = new THREE.Mesh(
    new THREE.BoxGeometry(PITCH.length + 18, 0.42, 1.2),
    material
  );
  north.position.set(0, 0.21, PITCH.halfWidth + 7.2);
  north.castShadow = true;
  north.receiveShadow = true;
  world.add(north);

  const south = north.clone();
  south.position.z = -PITCH.halfWidth - 7.2;
  world.add(south);

  const east = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.42, PITCH.width + 14),
    material
  );
  east.position.set(PITCH.halfLength + 9, 0.21, 0);
  east.castShadow = true;
  east.receiveShadow = true;
  world.add(east);

  const west = east.clone();
  west.position.x = -PITCH.halfLength - 9;
  world.add(west);
}

function addGrandstands(world: THREE.Group): void {
  createSidelineStand(world, 1);
  createSidelineStand(world, -1);
  createEndStand(world, 1);
}

function createSidelineStand(world: THREE.Group, side: 1 | -1): void {
  const stand = new THREE.Group();
  const stepMaterial = new THREE.MeshStandardMaterial({
    color: "#bfb7ab",
    roughness: 0.82,
    metalness: 0.02
  });
  const railMaterial = new THREE.MeshStandardMaterial({
    color: "#cf4f39",
    roughness: 0.52,
    metalness: 0.05
  });

  for (let row = 0; row < 5; row += 1) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH.length + 8, 0.42, 1.26),
      stepMaterial
    );
    step.position.set(0, row * 0.43 + 0.19, side * (PITCH.halfWidth + 11.4 + row * 1.45));
    step.receiveShadow = true;
    stand.add(step);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH.length + 9, 0.2, 0.22),
      railMaterial
    );
    rail.position.set(0, row * 0.43 + 0.62, side * (PITCH.halfWidth + 10.78 + row * 1.45));
    stand.add(rail);

    for (let col = 0; col < 15; col += 1) {
      if ((row + col) % 5 === 0) {
        continue;
      }

      const spectator = createSpectator(row * 19 + col);
      spectator.position.set(
        -51 + col * 7.25,
        row * 0.43 + 0.57,
        side * (PITCH.halfWidth + 11.28 + row * 1.45)
      );
      spectator.rotation.y = side > 0 ? Math.PI : 0;
      stand.add(spectator);
    }
  }

  world.add(stand);
}

function createEndStand(world: THREE.Group, side: 1 | -1): void {
  const stand = new THREE.Group();
  const stepMaterial = new THREE.MeshStandardMaterial({
    color: "#c8beb0",
    roughness: 0.84,
    metalness: 0.01
  });

  for (let row = 0; row < 4; row += 1) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.4, PITCH.width + 8),
      stepMaterial
    );
    step.position.set(side * (PITCH.halfLength + 13 + row * 1.42), row * 0.42 + 0.18, 0);
    step.receiveShadow = true;
    stand.add(step);

    for (let col = 0; col < 10; col += 1) {
      if ((row * 2 + col) % 4 === 0) {
        continue;
      }

      const spectator = createSpectator(120 + row * 17 + col);
      spectator.position.set(
        side * (PITCH.halfLength + 13 + row * 1.42),
        row * 0.42 + 0.55,
        -31 + col * 6.9
      );
      spectator.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      stand.add(spectator);
    }
  }

  world.add(stand);
}

function createSpectator(index: number): THREE.Group {
  const spectator = new THREE.Group();
  const colors = [
    "#2f7df6",
    "#f04c45",
    "#f3c944",
    "#37a866",
    "#f08aa4",
    "#6d4dba",
    "#df7d3f"
  ];
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colors[index % colors.length],
    roughness: 0.62,
    metalness: 0.02
  });
  const skin = new THREE.MeshStandardMaterial({
    color: index % 3 === 0 ? "#8b5b3d" : "#d79a66",
    roughness: 0.7,
    metalness: 0.01
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 2, 8), bodyMaterial);
  body.position.y = 0.33;
  spectator.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
  head.position.y = 0.77;
  spectator.add(head);

  if (index % 11 === 0) {
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.34, 0.44),
      new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? COLORS.home : COLORS.away,
        roughness: 0.52,
        metalness: 0.02
      })
    );
    flag.position.set(0.2, 0.88, 0.03);
    spectator.add(flag);
  }

  return spectator;
}

function addToriiGate(world: THREE.Group): void {
  const red = new THREE.MeshStandardMaterial({
    color: "#c74635",
    roughness: 0.52,
    metalness: 0.06
  });
  const dark = new THREE.MeshStandardMaterial({
    color: COLORS.brickDark,
    roughness: 0.55,
    metalness: 0.08
  });

  const gate = new THREE.Group();
  const pillarGeometry = new THREE.CylinderGeometry(0.42, 0.52, 7.4, 20);

  for (const x of [-4.2, 4.2]) {
    const pillar = new THREE.Mesh(pillarGeometry, red);
    pillar.position.set(x, 3.7, 0);
    pillar.castShadow = true;
    gate.add(pillar);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.35, 20), dark);
    foot.position.set(x, 0.18, 0);
    foot.castShadow = true;
    gate.add(foot);
  }

  const beamTop = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.62, 0.95), dark);
  beamTop.position.set(0, 7.55, 0);
  beamTop.castShadow = true;
  gate.add(beamTop);

  const beamLower = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.52, 0.8), red);
  beamLower.position.set(0, 6.75, 0);
  beamLower.castShadow = true;
  gate.add(beamLower);

  const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.35, 0.72), red);
  centerBlock.position.set(0, 6.1, 0);
  centerBlock.castShadow = true;
  gate.add(centerBlock);

  gate.position.set(0, 0, -PITCH.halfWidth - 15.5);
  world.add(gate);
}

function addPagoda(world: THREE.Group): void {
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.brick,
    roughness: 0.62,
    metalness: 0.03
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: "#24272b",
    roughness: 0.46,
    metalness: 0.06
  });

  const pagoda = new THREE.Group();

  for (let i = 0; i < 5; i += 1) {
    const levelWidth = 7.8 - i * 1.05;
    const levelDepth = 6.8 - i * 0.85;
    const y = i * 1.72;

    const level = new THREE.Mesh(
      new THREE.BoxGeometry(levelWidth, 1.15, levelDepth),
      baseMaterial
    );
    level.position.y = y + 0.58;
    level.castShadow = true;
    level.receiveShadow = true;
    pagoda.add(level);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(levelWidth + 1.45, 0.35, levelDepth + 1.35),
      roofMaterial
    );
    roof.position.y = y + 1.3;
    roof.castShadow = true;
    pagoda.add(roof);
  }

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.2, 5),
    new THREE.MeshStandardMaterial({
      color: COLORS.accent,
      roughness: 0.42,
      metalness: 0.16
    })
  );
  spire.position.y = 10.05;
  spire.castShadow = true;
  pagoda.add(spire);

  pagoda.position.set(-PITCH.halfLength - 21, 0, PITCH.halfWidth + 12);
  pagoda.rotation.y = 0.25;
  world.add(pagoda);
}

function addLotusPond(world: THREE.Group): void {
  const pond = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 56),
    new THREE.MeshStandardMaterial({
      color: COLORS.water,
      roughness: 0.24,
      metalness: 0.02,
      transparent: true,
      opacity: 0.8
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.45, 0.66, 1);
  water.receiveShadow = true;
  pond.add(water);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: "#4c8a46",
    roughness: 0.72,
    metalness: 0.02
  });
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.sakuraLight,
    roughness: 0.54,
    metalness: 0.01
  });

  for (let i = 0; i < 13; i += 1) {
    const angle = (i / 13) * Math.PI * 2;
    const radius = 1.2 + (i % 5) * 1.1;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.52 + (i % 3) * 0.08, 18), leafMaterial);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.set(Math.cos(angle) * radius * 1.2, 0.045, Math.sin(angle) * radius * 0.56);
    leaf.scale.x = 1.3;
    leaf.receiveShadow = true;
    pond.add(leaf);

    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), flowerMaterial);
      flower.position.set(leaf.position.x + 0.08, 0.18, leaf.position.z - 0.04);
      flower.castShadow = true;
      pond.add(flower);
    }
  }

  pond.position.set(PITCH.halfLength + 18, 0.02, PITCH.halfWidth + 10);
  pond.rotation.y = -0.25;
  world.add(pond);
}

function addLanternRun(world: THREE.Group): void {
  const postMaterial = new THREE.MeshStandardMaterial({
    color: "#5f3c2e",
    roughness: 0.7,
    metalness: 0.04
  });
  const lanternColors = ["#f3c944", "#f08aa4", "#f04c45", "#2f7df6"];

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 15; i += 1) {
      const x = -54 + i * 7.7;
      const z = side * (PITCH.halfWidth + 6.1);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 8), postMaterial);
      post.position.set(x, 0.85, z);
      world.add(post);

      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 8),
        new THREE.MeshStandardMaterial({
          color: lanternColors[(i + (side > 0 ? 0 : 2)) % lanternColors.length],
          emissive: lanternColors[(i + (side > 0 ? 0 : 2)) % lanternColors.length],
          emissiveIntensity: 0.28,
          roughness: 0.46,
          metalness: 0.02
        })
      );
      lantern.position.set(x, 1.82, z);
      lantern.scale.set(1, 0.82, 1);
      world.add(lantern);
    }
  }
}

function addBambooGroves(world: THREE.Group): void {
  const clusters = [
    [PITCH.halfLength + 18, -27],
    [PITCH.halfLength + 20, -17],
    [PITCH.halfLength + 19, 20],
    [PITCH.halfLength + 16, 29],
    [-PITCH.halfLength - 16, -28]
  ] as const;

  clusters.forEach(([x, z], index) => {
    const cluster = createBambooCluster(index);
    cluster.position.set(x, 0, z);
    cluster.rotation.y = index * 0.44;
    world.add(cluster);
  });
}

function createBambooCluster(seed: number): THREE.Group {
  const cluster = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: "#4ca85a",
    roughness: 0.66,
    metalness: 0.02
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: "#73c66c",
    roughness: 0.72,
    metalness: 0.01
  });

  for (let i = 0; i < 7; i += 1) {
    const height = 3.8 + random01(seed * 20 + i) * 2.1;
    const x = (random01(seed + i * 7) - 0.5) * 3.2;
    const z = (random01(seed + i * 11) - 0.5) * 3.6;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, height, 8), stemMaterial);
    stem.position.set(x, height / 2, z);
    stem.rotation.z = (random01(seed * 9 + i) - 0.5) * 0.18;
    cluster.add(stem);

    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 4), leafMaterial);
      leaf.position.set(x, height - 0.2 - leafIndex * 0.35, z);
      leaf.rotation.z = Math.PI / 2;
      leaf.rotation.y = leafIndex * 2.1 + seed;
      leaf.scale.x = 0.36;
      cluster.add(leaf);
    }
  }

  return cluster;
}

function addCornerFlags(world: THREE.Group): void {
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: "#f7f2e7",
    roughness: 0.44,
    metalness: 0.1
  });
  const flagMaterials = [
    new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.5, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ color: COLORS.sakura, roughness: 0.5, metalness: 0.02 })
  ];

  const corners = [
    [-PITCH.halfLength, -PITCH.halfWidth],
    [-PITCH.halfLength, PITCH.halfWidth],
    [PITCH.halfLength, -PITCH.halfWidth],
    [PITCH.halfLength, PITCH.halfWidth]
  ] as const;

  corners.forEach(([x, z], index) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.2, 8), poleMaterial);
    pole.position.set(x, 1.1, z);
    world.add(pole);

    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.54, 0.82), flagMaterials[index % 2]);
    flag.position.set(x + (index < 2 ? 0.38 : -0.38), 1.86, z);
    world.add(flag);
  });
}

function addPetals(world: THREE.Group): void {
  const petalMaterials = [
    new THREE.MeshStandardMaterial({ color: COLORS.sakuraLight, roughness: 0.68, metalness: 0.01 }),
    new THREE.MeshStandardMaterial({ color: COLORS.sakura, roughness: 0.7, metalness: 0.01 }),
    new THREE.MeshStandardMaterial({ color: "#fff0ce", roughness: 0.72, metalness: 0.01 })
  ];
  const petalGeometry = new THREE.PlaneGeometry(0.34, 0.09);

  for (let i = 0; i < 72; i += 1) {
    const side = i % 4;
    const alongX = -PITCH.halfLength - 6 + random01(i * 5 + 1) * (PITCH.length + 12);
    const alongZ = -PITCH.halfWidth - 6 + random01(i * 7 + 2) * (PITCH.width + 12);
    const x =
      side < 2
        ? alongX
        : (side === 2 ? -1 : 1) * (PITCH.halfLength + 4 + random01(i * 11 + 3) * 14);
    const z =
      side < 2
        ? (side === 0 ? -1 : 1) * (PITCH.halfWidth + 4 + random01(i * 13 + 4) * 10)
        : alongZ;
    const petal = new THREE.Mesh(petalGeometry, petalMaterials[i % petalMaterials.length]);
    petal.rotation.x = -Math.PI / 2;
    petal.rotation.z = random01(i * 13 + 3) * Math.PI;
    petal.position.set(x, 0.055, z);
    petal.scale.setScalar(0.55 + random01(i * 17 + 4) * 0.45);
    world.add(petal);
  }
}

function addSakuraGarden(world: THREE.Group): void {
  const spots = [
    [-47, PITCH.halfWidth + 12],
    [-30, PITCH.halfWidth + 11],
    [-12, PITCH.halfWidth + 13],
    [18, PITCH.halfWidth + 12],
    [40, PITCH.halfWidth + 11],
    [-42, -PITCH.halfWidth - 12],
    [-22, -PITCH.halfWidth - 11],
    [27, -PITCH.halfWidth - 12],
    [48, -PITCH.halfWidth - 13]
  ] as const;

  spots.forEach(([x, z], index) => {
    const tree = createSakuraTree(0.88 + (index % 3) * 0.08);
    tree.position.set(x, 0, z);
    tree.rotation.y = index * 0.47;
    world.add(tree);
  });
}

function createSakuraTree(scale: number): THREE.Group {
  const tree = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: "#6b4432",
    roughness: 0.78,
    metalness: 0.02
  });
  const blossomMaterials = [
    new THREE.MeshStandardMaterial({ color: COLORS.sakura, roughness: 0.6, metalness: 0.01 }),
    new THREE.MeshStandardMaterial({ color: COLORS.sakuraLight, roughness: 0.62, metalness: 0.01 }),
    new THREE.MeshStandardMaterial({ color: "#e982a0", roughness: 0.64, metalness: 0.01 })
  ];

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 3.8, 12), trunkMaterial);
  trunk.position.y = 1.9 * scale;
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  tree.add(trunk);

  const branchGeometry = new THREE.CylinderGeometry(0.08, 0.14, 2.35, 10);
  for (let i = 0; i < 4; i += 1) {
    const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
    branch.position.set(Math.cos(i) * 0.42 * scale, 3.2 * scale, Math.sin(i) * 0.42 * scale);
    branch.rotation.z = 0.85;
    branch.rotation.y = i * Math.PI * 0.5;
    branch.scale.setScalar(scale);
    tree.add(branch);
  }

  const clusterGeometry = new THREE.IcosahedronGeometry(1, 2);
  const clusterPositions = [
    [0, 4.1, 0],
    [-0.95, 3.75, 0.28],
    [0.9, 3.8, -0.22],
    [0.25, 4.48, 0.85],
    [-0.16, 4.3, -0.95]
  ] as const;

  clusterPositions.forEach((position, index) => {
    const blossom = new THREE.Mesh(clusterGeometry, blossomMaterials[index % blossomMaterials.length]);
    blossom.position.set(position[0] * scale, position[1] * scale, position[2] * scale);
    blossom.scale.setScalar((0.86 + (index % 2) * 0.18) * scale);
    tree.add(blossom);
  });

  return tree;
}

function random01(seed: number): number {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
