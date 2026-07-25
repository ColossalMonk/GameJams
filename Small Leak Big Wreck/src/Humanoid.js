import * as THREE from 'three';

// Builds a small low-poly humanoid (torso/head/arms/legs) entirely out of
// primitive shapes, so it stays cheap to build and render. Shared by
// Player.js (the janitor, withMop: true) and NPC.js (decorative, no mop)
// so both use identical geometry/animation code instead of two copies
// drifting apart. Colors are parametrized so each NPC can read as a
// different person while the player keeps its original fixed colors.
export function buildHumanoid({
  skin = 0xe0a878,
  suit = 0x2b4d8a,
  suitDark = 0x1f3a68,
  mopWood = 0x8a5a2b,
  mopHead = 0xf0ead6,
  withMop = true,
} = {}) {
  const root = new THREE.Group();

  // hips - everything else is built relative to this, root itself stays at y=0 (ground)
  const hips = new THREE.Group();
  hips.position.y = 0.55;
  root.add(hips);

  const torsoGeo = new THREE.BoxGeometry(0.34, 0.4, 0.2);
  const torso = new THREE.Mesh(torsoGeo, new THREE.MeshStandardMaterial({ color: suit }));
  torso.position.y = 0.25;
  torso.castShadow = true;
  hips.add(torso);

  const headGeo = new THREE.SphereGeometry(0.14, 10, 8);
  const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: skin }));
  head.position.y = 0.58;
  head.castShadow = true;
  hips.add(head);

  // a tiny cap - just a squashed cylinder, reads fine at gameplay distance
  const capGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10);
  const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: suitDark }));
  cap.position.y = 0.68;
  hips.add(cap);

  // legs - each is its own pivot group so we can swing them for a walk cycle
  function buildLeg(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(0.09 * sideSign, 0, 0);
    const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: suitDark }));
    leg.position.y = -0.2;
    leg.castShadow = true;
    pivot.add(leg);
    return pivot;
  }
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  hips.add(legL, legR);

  // arms - left is a free swinging arm, right holds the mop (if withMop)
  function buildArm(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(0.22 * sideSign, 0.42, 0);
    const armGeo = new THREE.BoxGeometry(0.09, 0.32, 0.09);
    const arm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: suit }));
    arm.position.y = -0.16;
    arm.castShadow = true;
    pivot.add(arm);
    const handGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const hand = new THREE.Mesh(handGeo, new THREE.MeshStandardMaterial({ color: skin }));
    hand.position.y = -0.32;
    pivot.add(hand);
    return pivot;
  }
  const armL = buildArm(-1);
  const armR = buildArm(1);
  hips.add(armL, armR);

  let mopGroup = null;
  if (withMop) {
    // the mop: wooden handle + a squashed, slightly lumpy head made of a
    // couple of overlapping small shapes so it doesn't read as a single blob.
    mopGroup = new THREE.Group();
    mopGroup.position.set(0, -0.3, 0.05);
    mopGroup.rotation.x = -0.35;

    const handleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.75, 6);
    const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: mopWood }));
    handle.position.y = 0.2;
    mopGroup.add(handle);

    const mopHeadMat = new THREE.MeshStandardMaterial({ color: mopHead, roughness: 1 });
    const mopCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mopHeadMat);
    mopCore.scale.set(1, 0.6, 1);
    mopCore.position.y = -0.2;
    mopGroup.add(mopCore);
    // a few small offset strands so the head reads as fibrous, not a smooth ball
    for (let i = 0; i < 5; i++) {
      const strand = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 4), mopHeadMat);
      const angle = (i / 5) * Math.PI * 2;
      strand.position.set(Math.cos(angle) * 0.06, -0.28, Math.sin(angle) * 0.06);
      strand.rotation.x = Math.PI;
      mopGroup.add(strand);
    }
    armR.add(mopGroup);
  }

  return { root, hips, legL, legR, armL, armR, mopGroup };
}

// Shared walk-cycle leg/arm swing + idle bob. `swingArms` lets Player.js
// suppress arm swing while its separate mop-swipe animation is driving
// armL/armR instead - NPCs (no mop) always leave it at the default true.
export function applyWalkCycle(parts, walkCycleValue, moving, { swingArms = true } = {}) {
  const { legL, legR, armL, armR, hips } = parts;

  if (moving) {
    const swing = Math.sin(walkCycleValue) * 0.5;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    if (swingArms) {
      armL.rotation.x = -swing;
      armR.rotation.x = swing * 0.5;
    }
    hips.position.y = 0.55 + Math.abs(Math.sin(walkCycleValue)) * 0.02;
  } else {
    legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, 0.2);
    legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, 0.2);
    if (swingArms) {
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, 0.2);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, 0.2);
    }
    hips.position.y = 0.55 + Math.sin(performance.now() * 0.002) * 0.01;
  }
}
