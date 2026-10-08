/**
 * npc.js
 * - 3D 캐릭터 리그: 동물 주민(AnimalRig) · 사람 플레이어(HumanRig)
 *   ※ 특정 게임의 캐릭터를 복제하지 않은 오리지널 디자인입니다. (아늑한 섬 생활 게임 분위기만 참고)
 * - NPC(무역 전문가) 데이터 · 관련 사이트 링크 · 배회 AI
 * - 섬을 산책하는 주민(보행자) NPC
 * - 플레이어와의 근접(인터랙션) 판정
 *
 * 좌표계: 게임 로직은 맵 픽셀 좌표(x, y), 3D 렌더링은 (x*S, 높이, y*S) 로 변환합니다.
 */

const S = 1 / 20; // 맵 px → 3D 월드 단위
const INTERACT_RADIUS = 90; // px, 이 반경 안에서 대화 가능
const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/* ---------------------------------------------------------
 * 공용 지오메트리 · 머티리얼 캐시
 * --------------------------------------------------------- */
const Toon = {
  _geo: null,
  _mat: new Map(),
  _caps: new Map(),
  _pattern: new Map(),

  geo() {
    if (!this._geo) {
      this._geo = {
        sphere: new THREE.SphereGeometry(1, 28, 20),
        hemi: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
        cone: new THREE.CylinderGeometry(0.7, 1, 1, 28),
        spike: new THREE.ConeGeometry(1, 1, 24),
        box: new THREE.BoxGeometry(1, 1, 1),
        ring: new THREE.TorusGeometry(1, 0.1, 8, 28),
        arc: new THREE.TorusGeometry(1, 0.16, 8, 20, Math.PI),
        thinArc: new THREE.TorusGeometry(1, 0.06, 6, 28, Math.PI),
      };
    }
    return this._geo;
  },

  capsule(r, len) {
    const key = `${r}|${len}`;
    if (!this._caps.has(key)) this._caps.set(key, new THREE.CapsuleGeometry(r, len, 8, 16));
    return this._caps.get(key);
  },

  mat(color, o = {}) {
    const rough = o.roughness ?? 0.6;
    const metal = o.metalness ?? 0;
    const opacity = o.opacity ?? 1;
    const emissive = o.emissive || '#000000';
    const ei = o.emissiveIntensity ?? 1;
    const key = `${color}|${rough}|${metal}|${opacity}|${emissive}|${ei}`;
    if (!this._mat.has(key)) {
      this._mat.set(key, new THREE.MeshStandardMaterial({
        color, roughness: rough, metalness: metal,
        transparent: opacity < 1, opacity, emissive, emissiveIntensity: ei,
        depthWrite: opacity >= 1,
      }));
    }
    return this._mat.get(key);
  },

  /** 줄무늬 · 체크 옷감 */
  pattern(color, kind, color2) {
    const key = `${color}|${kind}|${color2}`;
    if (!this._pattern.has(key)) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = color2;
      if (kind === 'stripe') {
        for (let y = 0; y < 128; y += 32) ctx.fillRect(0, y, 128, 12);
      } else {
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 128; i += 32) {
          ctx.fillRect(i, 0, 12, 128);
          ctx.fillRect(0, i, 128, 12);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 2);
      this._pattern.set(key, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    }
    return this._pattern.get(key);
  },

  part(parent, geometry, material, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], shadow = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(p[0], p[1], p[2]);
    if (typeof s === 'number') mesh.scale.setScalar(s);
    else mesh.scale.set(s[0], s[1], s[2]);
    mesh.rotation.set(r[0], r[1], r[2]);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  },
};

/* ---------------------------------------------------------
 * 리그 공통: 걷기 · 숨쉬기 · 눈 깜빡임 · 귀/꼬리/머리카락 흔들림
 * --------------------------------------------------------- */
class RigBase {
  constructor() {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.t = Math.random() * 10;
    this.phase = 0;
    this.walkBlend = 0;
    this.jumpY = 0;
    this.blinkTimer = 1.5 + Math.random() * 3;
    this.blinking = 0;
    this.locks = [];
    this.ears = [];
    this.eyes = [];
    this.tail = null;
    this.armZ = 0.12;
  }

  /** 이동 방향(맵 dx, dy)을 바라보도록 부드럽게 회전 */
  faceToward(dx, dy, dt, rate = 10) {
    if (Math.abs(dx) + Math.abs(dy) < 0.0001) return;
    this.faceAngle(Math.atan2(dx, dy), dt, rate);
  }

  faceAngle(target, dt, rate = 10) {
    let diff = target - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += diff * Math.min(1, dt * rate);
  }

  update(dt, moving, speed = 1) {
    this.t += dt;
    if (moving) this.phase += dt * 9.5 * speed;
    this.walkBlend += ((moving ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 10);
    const wb = this.walkBlend;
    const sw = Math.sin(this.phase) * wb;
    const idle = 1 - wb;

    this.legs[0].rotation.x = sw * 0.7;
    this.legs[1].rotation.x = -sw * 0.7;
    this.arms[0].rotation.x = -sw * 0.6;
    this.arms[1].rotation.x = sw * 0.6;
    this.arms[0].rotation.z = -this.armZ - Math.sin(this.t * 2.2) * 0.02 * idle;
    this.arms[1].rotation.z = this.armZ + Math.sin(this.t * 2.2) * 0.02 * idle;

    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.08 * wb + this.jumpY;
    this.body.rotation.x = 0.06 * wb * speed;
    this.torso.scale.y = 1 + Math.sin(this.t * 2.2) * 0.018 * idle;
    this.head.rotation.z = Math.sin(this.t * 1.1) * 0.05 * idle;
    this.head.rotation.x = Math.sin(this.phase * 2) * 0.03 * wb;

    this.locks.forEach((lock, i) => {
      lock.rotation.x = -0.12 * wb * speed + Math.sin(this.t * 1.7 + i) * 0.035 + Math.sin(this.phase * 2) * 0.05 * wb;
    });
    this.ears.forEach((ear, i) => {
      const twitch = Math.sin(this.t * 0.8 + i * 2.1) > 0.85 ? Math.sin(this.t * 22) * 0.12 : 0;
      ear.rotation.z = ear.userData.baseZ + Math.sin(this.t * 2 + i) * 0.04 + twitch;
    });
    if (this.tail) this.tail.rotation.y = Math.sin(this.t * (moving ? 10 : 3)) * (moving ? 0.4 : 0.22);

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = 0.13;
      this.blinkTimer = 2 + Math.random() * 3.5;
    }
    if (this.blinking > 0) this.blinking -= dt;
    const eyeY = this.blinking > 0 ? 0.12 : 1;
    this.eyes.forEach((e) => { e.scale.y = eyeY; });
  }
}

/* ---------------------------------------------------------
 * 동물 주민 리그
 * look: { species, fur, fur2, inner, ear, nose, top, top2, pattern, collar, buttons, bottom, bottomType,
 *         shoes, hat, hatColor, glasses, tie, scarf, necklace, bow, vest, clipboard, lashes, blush }
 * --------------------------------------------------------- */
const HEAD_SHAPE = {
  bear: [0.68, 0.6, 0.6], dog: [0.64, 0.6, 0.6], cat: [0.64, 0.58, 0.58], fox: [0.63, 0.58, 0.58],
  rabbit: [0.6, 0.62, 0.58], otter: [0.66, 0.58, 0.58], sheep: [0.6, 0.6, 0.58], koala: [0.66, 0.6, 0.6],
  deer: [0.6, 0.62, 0.58], frog: [0.72, 0.52, 0.6], hamster: [0.68, 0.6, 0.6],
};
const MUZZLE = {
  bear: [0.29, 0.2, 0.18], dog: [0.27, 0.19, 0.19], cat: [0.21, 0.14, 0.14], fox: [0.24, 0.16, 0.22],
  rabbit: [0.2, 0.15, 0.14], otter: [0.28, 0.18, 0.17], sheep: [0.24, 0.17, 0.15], koala: [0.2, 0.14, 0.1],
  deer: [0.22, 0.16, 0.17], hamster: [0.24, 0.16, 0.15],
};

class AnimalRig extends RigBase {
  constructor(look) {
    super();
    const g = Toon.geo();
    const M = (c, o) => Toon.mat(c, o);
    const P = (...a) => Toon.part(...a);
    const sp = look.species;
    this.look = look;
    this.armZ = 0.15;

    const fur = M(look.fur, { roughness: 0.78 });
    const fur2 = M(look.fur2 || '#fff4e6', { roughness: 0.78 });
    const inner = M(look.inner || '#ffb8c6', { roughness: 0.7 });
    const noseM = M(look.nose || '#33231d', { roughness: 0.25 });
    const topM = look.pattern ? Toon.pattern(look.top, look.pattern, look.top2 || '#ffffff') : M(look.top, { roughness: 0.82 });
    const bottomM = M(look.bottom, { roughness: 0.82 });
    const shoeM = M(look.shoes || look.fur, { roughness: 0.6 });
    const gold = M('#e6bf72', { roughness: 0.25, metalness: 0.7 });
    const pants = look.bottomType !== 'skirt';

    // 다리
    this.legs = [-1, 1].map((s) => {
      const pv = new THREE.Group();
      pv.position.set(s * 0.16, 0.56, 0);
      this.body.add(pv);
      P(pv, Toon.capsule(0.12, 0.16), pants ? bottomM : fur, [0, -0.2, 0]);
      P(pv, g.sphere, shoeM, [0, -0.46, 0.05], [0.15, 0.1, 0.2]);
      return pv;
    });

    // 하의 · 상의
    if (pants) P(this.body, Toon.capsule(0.28, 0.06), bottomM, [0, 0.62, 0], [1, 0.7, 0.86]);
    else P(this.body, g.cone, bottomM, [0, 0.6, 0], [0.4, 0.34, 0.37]);
    this.torso = P(this.body, Toon.capsule(0.32, 0.2), topM, [0, 0.98, 0], [1, 1, 0.86]);

    if (look.collar) {
      [-1, 1].forEach((s) => P(this.body, g.box, M(look.collar, { roughness: 0.7 }), [s * 0.085, 1.33, 0.21], [0.17, 0.035, 0.12], [0.35, 0, s * 0.55]));
    }
    if (look.buttons) [1.17, 1.03, 0.89].forEach((y) => P(this.body, g.sphere, M(look.buttons, { roughness: 0.3, metalness: 0.3 }), [0, y, 0.285], 0.024, [0, 0, 0], false));
    P(this.body, g.box, M(look.top2 || look.collar || '#ffffff', { roughness: 0.8 }), [0.15, 1.02, 0.278], [0.1, 0.09, 0.012], [0, 0, 0], false);
    if (look.vest) {
      [0.9, 1.1].forEach((y) => P(this.body, g.box, M('#fff7c2', { roughness: 0.3, emissive: '#fff2a0', emissiveIntensity: 0.25 }), [0, y, 0.26], [0.56, 0.045, 0.08], [0, 0, 0], false));
    }
    if (look.tie) {
      P(this.body, g.box, M(look.tie, { roughness: 0.5 }), [0, 1.13, 0.29], [0.07, 0.24, 0.02], [0, 0, 0], false);
      P(this.body, g.box, M(look.tie, { roughness: 0.5 }), [0, 1.3, 0.27], [0.09, 0.06, 0.03], [0, 0, 0], false);
    }
    if (look.scarf) P(this.body, Toon.capsule(0.12, 0.4), M(look.scarf, { roughness: 0.85 }), [0, 1.36, 0.02], 1, [0, 0, Math.PI / 2]);
    if (look.necklace) {
      P(this.body, g.thinArc, gold, [0, 1.36, 0.19], 0.13, [-0.45, 0, Math.PI], false);
      P(this.body, g.sphere, gold, [0, 1.225, 0.27], 0.026, [0, 0, 0], false);
    }

    // 팔
    this.arms = [-1, 1].map((s) => {
      const pv = new THREE.Group();
      pv.position.set(s * 0.34, 1.25, 0);
      pv.rotation.z = s * this.armZ;
      this.body.add(pv);
      P(pv, Toon.capsule(0.09, 0.18), topM, [0, -0.17, 0]);
      P(pv, g.sphere, fur, [0, -0.38, 0.01], 0.1);
      return pv;
    });
    if (look.clipboard) {
      P(this.arms[1], g.box, M('#c8925a', { roughness: 0.6 }), [-0.02, -0.42, 0.16], [0.24, 0.32, 0.03]);
      P(this.arms[1], g.box, M('#ffffff', { roughness: 0.8 }), [-0.02, -0.44, 0.18], [0.19, 0.24, 0.01], [0, 0, 0], false);
    }

    // 꼬리
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.68, -0.28);
    this.body.add(this.tail);
    if (sp === 'cat') {
      P(this.tail, Toon.capsule(0.05, 0.4), fur, [0, 0.16, -0.12], 1, [-0.7, 0, 0]);
      P(this.tail, Toon.capsule(0.05, 0.22), fur, [0, 0.42, -0.2], 1, [0.3, 0, 0]);
    } else if (sp === 'fox') {
      P(this.tail, g.sphere, fur, [0, 0.12, -0.28], [0.17, 0.17, 0.36], [-0.6, 0, 0]);
      P(this.tail, g.sphere, fur2, [0, 0.3, -0.52], 0.11);
    } else if (sp === 'dog') {
      P(this.tail, Toon.capsule(0.05, 0.22), fur, [0, 0.15, -0.06], 1, [-0.9, 0, 0]);
    } else if (sp === 'otter') {
      P(this.tail, Toon.capsule(0.08, 0.42), fur, [0, -0.08, -0.28], [1, 1, 0.6], [1.2, 0, 0]);
    } else if (sp === 'rabbit' || sp === 'deer') {
      P(this.tail, g.sphere, M('#ffffff', { roughness: 0.9 }), [0, 0, -0.04], 0.12);
    } else if (sp === 'sheep') {
      P(this.tail, g.sphere, M('#ffffff', { roughness: 0.95 }), [0, 0, -0.05], 0.14);
    } else if (sp !== 'frog') {
      P(this.tail, g.sphere, fur, [0, 0, -0.03], 0.09);
    }

    // 머리
    this.head = new THREE.Group();
    this.head.position.set(0, 1.9, 0);
    this.body.add(this.head);
    const hs = HEAD_SHAPE[sp] || HEAD_SHAPE.bear;
    P(this.head, g.sphere, fur, [0, 0, 0], hs);
    const surfZ = (x, y) => hs[2] * Math.sqrt(Math.max(0, 1 - (x / hs[0]) ** 2 - (y / hs[1]) ** 2));

    // 주둥이 · 코 · 입
    let noseZ = hs[2];
    if (sp === 'frog') {
      P(this.head, g.arc, M('#3f6b35', { roughness: 0.4 }), [0, -0.14, 0.56], [0.2, 0.12, 0.1], [0, 0, Math.PI], false);
    } else {
      const ms = MUZZLE[sp];
      const mz = surfZ(0, -0.16) - ms[2] * 0.45;
      P(this.head, g.sphere, fur2, [0, -0.16, mz], ms);
      noseZ = mz + ms[2] * 0.92;
      const koala = sp === 'koala';
      const pinkNose = sp === 'cat' || sp === 'rabbit' || sp === 'hamster';
      P(this.head, g.sphere, pinkNose ? M(look.nose || '#ff9fb0', { roughness: 0.3 }) : noseM,
        [0, koala ? -0.06 : -0.09, noseZ], koala ? [0.13, 0.16, 0.09] : [0.07, 0.05, 0.05]);
      P(this.head, g.arc, M('#5a3a30', { roughness: 0.5 }), [0, -0.22, noseZ - 0.03], [0.045, 0.04, 0.04], [0, 0, Math.PI], false);
      if (sp === 'cat' || sp === 'otter' || sp === 'fox') {
        [-1, 1].forEach((s) => [-1, 1].forEach((k) =>
          P(this.head, Toon.capsule(0.006, 0.18), M('#4a3a34', { roughness: 0.5 }), [s * (ms[0] + 0.06), -0.16 + k * 0.035, mz + 0.06], 1, [0, 0, Math.PI / 2 + s * k * 0.15], false)));
      }
      if (sp === 'hamster') [-1, 1].forEach((s) => P(this.head, g.sphere, fur2, [s * 0.38, -0.14, surfZ(0.38, -0.14) - 0.12], [0.2, 0.17, 0.16]));
    }

    // 눈
    const eyeDark = M('#241815', { roughness: 0.2 });
    const shine = M('#ffffff', { roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.7 });
    if (sp === 'frog') {
      this.eyes = [-1, 1].map((s) => {
        const eye = new THREE.Group();
        eye.position.set(s * 0.3, 0.4, 0.2);
        this.head.add(eye);
        P(eye, g.sphere, fur, [0, -0.04, -0.02], 0.2);
        P(eye, g.sphere, M('#ffffff', { roughness: 0.3 }), [0, 0, 0.04], 0.16);
        P(eye, g.sphere, eyeDark, [0, 0, 0.17], [0.07, 0.09, 0.04], [0, 0, 0], false);
        P(eye, g.sphere, shine, [0.025, 0.03, 0.2], 0.022, [0, 0, 0], false);
        return eye;
      });
    } else {
      this.eyes = [-1, 1].map((s) => {
        const ex = s * 0.24;
        const ey = 0.05;
        const eye = new THREE.Group();
        eye.position.set(ex, ey, surfZ(ex, ey) - 0.025);
        this.head.add(eye);
        P(eye, g.sphere, eyeDark, [0, 0, 0], [0.068, 0.088, 0.04], [0, 0, 0], false);
        P(eye, g.sphere, shine, [0.022, 0.032, 0.032], 0.024, [0, 0, 0], false);
        if (look.lashes) P(eye, Toon.capsule(0.011, 0.05), eyeDark, [s * 0.07, 0.07, 0.01], 1, [0, 0, -s * 0.9], false);
        return eye;
      });
    }
    if (look.blush || look.lashes) {
      [-1, 1].forEach((s) => P(this.head, g.sphere, M('#ff8f9c', { opacity: 0.35, roughness: 0.9 }), [s * 0.37, -0.1, surfZ(0.37, -0.1) - 0.04], [0.1, 0.06, 0.05], [0, 0, 0], false));
    }
    if (look.glasses) {
      const frame = M('#3a2f3a', { roughness: 0.3, metalness: 0.3 });
      this.eyes.forEach((e, i) => P(this.head, g.ring, frame, [e.position.x, e.position.y, e.position.z + 0.05], 0.125, [0, 0, 0], false));
      P(this.head, Toon.capsule(0.011, 0.14), frame, [0, 0.07, this.eyes[0].position.z + 0.07], 1, [0, 0, Math.PI / 2], false);
    }

    // 귀
    const addEar = (pos, rotZ, build) => {
      const ear = new THREE.Group();
      ear.position.set(pos[0], pos[1], pos[2]);
      ear.rotation.z = rotZ;
      ear.userData.baseZ = rotZ;
      this.head.add(ear);
      build(ear);
      this.ears.push(ear);
    };
    [-1, 1].forEach((s) => {
      if (sp === 'bear' || sp === 'hamster') {
        addEar([s * 0.42, 0.42, -0.02], 0, (e) => {
          P(e, g.sphere, fur, [0, 0, 0], [0.17, 0.17, 0.1]);
          P(e, g.sphere, inner, [0, 0, 0.05], [0.1, 0.1, 0.05], [0, 0, 0], false);
        });
      } else if (sp === 'otter') {
        addEar([s * 0.5, 0.28, -0.02], 0, (e) => P(e, g.sphere, fur, [0, 0, 0], [0.1, 0.1, 0.07]));
      } else if (sp === 'cat' || sp === 'fox') {
        addEar([s * 0.34, 0.48, -0.03], -s * 0.32, (e) => {
          P(e, g.spike, fur, [0, 0.13, 0], [0.17, 0.32, 0.1]);
          P(e, g.spike, sp === 'fox' ? M('#3a2a24', { roughness: 0.7 }) : inner, [0, 0.11, 0.045], [0.1, 0.22, 0.05], [0, 0, 0], false);
        });
      } else if (sp === 'dog') {
        addEar([s * 0.55, 0.24, 0], s * 0.35, (e) => P(e, g.sphere, M(look.ear || look.fur, { roughness: 0.8 }), [0, -0.18, 0], [0.14, 0.3, 0.2]));
      } else if (sp === 'rabbit') {
        addEar([s * 0.2, 0.52, -0.05], -s * 0.12, (e) => {
          P(e, Toon.capsule(0.1, 0.42), fur, [0, 0.3, 0], [1, 1, 0.6]);
          P(e, Toon.capsule(0.055, 0.34), inner, [0, 0.3, 0.05], [1, 1, 0.4], [0, 0, 0], false);
        });
      } else if (sp === 'sheep') {
        addEar([s * 0.58, 0.06, 0], s * 1.2, (e) => P(e, g.sphere, fur, [0, -0.12, 0], [0.09, 0.18, 0.07]));
      } else if (sp === 'koala') {
        addEar([s * 0.58, 0.34, 0], 0, (e) => {
          P(e, g.sphere, fur, [0, 0, 0], [0.26, 0.26, 0.13]);
          P(e, g.sphere, M('#f5f5f5', { roughness: 0.95 }), [0, 0, 0.05], [0.17, 0.17, 0.07], [0, 0, 0], false);
        });
      } else if (sp === 'deer') {
        addEar([s * 0.56, 0.3, 0], s * 0.5, (e) => {
          P(e, g.sphere, fur, [0, 0, 0], [0.22, 0.1, 0.09]);
          P(e, g.sphere, inner, [0, 0, 0.04], [0.14, 0.06, 0.04], [0, 0, 0], false);
        });
      }
    });
    if (sp === 'sheep') {
      const wool = M('#ffffff', { roughness: 0.95 });
      [[0, 0.5, 0, 0.3], [0.26, 0.42, 0.1, 0.22], [-0.26, 0.42, 0.1, 0.22], [0, 0.42, 0.3, 0.2],
        [0.34, 0.24, -0.15, 0.22], [-0.34, 0.24, -0.15, 0.22], [0, 0.34, -0.32, 0.25]].forEach(([x, y, z, r]) => P(this.head, g.sphere, wool, [x, y, z], r));
    }
    if (sp === 'deer') [[0.15, 0.48, 0.2], [-0.2, 0.42, 0.28], [0.05, 0.52, -0.1]].forEach((p) => P(this.head, g.sphere, M('#fff4e6'), p, 0.045, [0, 0, 0], false));

    // 리본
    if (look.bow) {
      const bow = new THREE.Group();
      bow.position.set(0.32, 0.46, 0.12);
      bow.rotation.z = -0.4;
      this.head.add(bow);
      const bm = M(look.bow, { roughness: 0.5 });
      [-1, 1].forEach((s) => P(bow, g.sphere, bm, [s * 0.1, 0, 0], [0.11, 0.08, 0.05], [0, 0, s * 0.4]));
      P(bow, g.sphere, bm, [0, 0, 0.02], 0.045);
    }

    // 모자
    this.addHat(look, 0.55);
  }

  addHat(look, top) {
    const g = Toon.geo();
    const M = (c, o) => Toon.mat(c, o);
    const P = (...a) => Toon.part(...a);
    if (look.hat === 'captain') {
      const hat = new THREE.Group();
      hat.position.set(0, top - 0.04, -0.02);
      hat.rotation.x = -0.12;
      this.head.add(hat);
      const white = M('#ffffff', { roughness: 0.5 });
      const navy = M('#1f2a44', { roughness: 0.35 });
      P(hat, g.cyl, white, [0, 0.06, 0], [0.48, 0.2, 0.48]);
      P(hat, g.cyl, white, [0, 0.19, -0.02], [0.58, 0.09, 0.58]);
      P(hat, g.cyl, navy, [0, -0.04, 0], [0.5, 0.07, 0.5]);
      P(hat, g.cyl, navy, [0, -0.06, 0.35], [0.3, 0.03, 0.24]);
      P(hat, g.sphere, M('#e6bf72', { roughness: 0.25, metalness: 0.7 }), [0, 0.07, 0.48], [0.08, 0.08, 0.03]);
    } else if (look.hat === 'helmet') {
      const yellow = M('#ffd23f', { roughness: 0.3 });
      const hat = new THREE.Group();
      hat.position.set(0, top * 0.3, 0);
      this.head.add(hat);
      P(hat, g.hemi, yellow, [0, 0, 0], [0.72, 0.6, 0.72]);
      P(hat, g.cyl, yellow, [0, 0, 0.08], [0.82, 0.04, 0.86]);
      P(hat, Toon.capsule(0.06, 0.5), yellow, [0, 0.58, 0], 1, [Math.PI / 2, 0, 0]);
    } else if (look.hat === 'cap') {
      const capM = M(look.hatColor || '#1f8a74', { roughness: 0.6 });
      P(this.head, g.hemi, capM, [0, top * 0.22, 0], [0.69, 0.58, 0.69]);
      P(this.head, g.cyl, capM, [0, top * 0.22 + 0.01, 0.52], [0.34, 0.03, 0.3]);
      P(this.head, g.sphere, capM, [0, top * 0.22 + 0.58, 0], 0.06);
    } else if (look.hat === 'straw') {
      const straw = M('#f1d38a', { roughness: 0.9 });
      P(this.head, g.cyl, straw, [0, top * 0.75, 0], [0.95, 0.04, 0.95]);
      P(this.head, g.hemi, straw, [0, top * 0.75, 0], [0.55, 0.38, 0.55]);
      P(this.head, g.cyl, M(look.hatColor || '#e8505b', { roughness: 0.6 }), [0, top * 0.75 + 0.08, 0], [0.56, 0.08, 0.56]);
    }
  }
}

/* ---------------------------------------------------------
 * 사람 리그 (플레이어: 사진 속 인물을 참고한 긴 웨이브 머리 캐릭터)
 * --------------------------------------------------------- */
class HumanRig extends RigBase {
  constructor(look) {
    super();
    const g = Toon.geo();
    const M = (c, o) => Toon.mat(c, o);
    const P = (...a) => Toon.part(...a);
    this.look = look;

    const skin = M(look.skin, { roughness: 0.55 });
    const hairM = M(look.hair, { roughness: 0.45 });
    const topM = M(look.top, { roughness: 0.75 });
    const bottomM = M(look.bottom, { roughness: 0.75 });
    const legM = M(look.bottomType === 'skirt' ? look.legs || look.skin : look.bottom, { roughness: 0.7 });
    const shoeM = M(look.shoes || '#4a3a36', { roughness: 0.4 });
    const collarM = M(look.collar || '#fffaf0', { roughness: 0.7 });
    const gold = M('#e6bf72', { roughness: 0.25, metalness: 0.7 });

    this.legs = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.16, 0.8, 0);
      this.body.add(pivot);
      P(pivot, Toon.capsule(0.115, 0.42), legM, [0, -0.36, 0]);
      P(pivot, g.sphere, shoeM, [0, -0.72, 0.06], [0.14, 0.1, 0.21]);
      return pivot;
    });
    if (look.bottomType === 'skirt') P(this.body, g.cone, bottomM, [0, 0.84, 0], [0.42, 0.44, 0.37]);
    else P(this.body, Toon.capsule(0.29, 0.08), bottomM, [0, 0.86, 0], [1, 0.75, 0.85]);

    this.torso = P(this.body, Toon.capsule(0.31, 0.3), topM, [0, 1.2, 0], [1, 1, 0.82]);
    [-1, 1].forEach((s) => P(this.body, g.box, collarM, [s * 0.085, 1.55, 0.2], [0.17, 0.035, 0.12], [0.35, 0, s * 0.55]));
    [1.41, 1.28, 1.15].forEach((y) => P(this.body, g.sphere, collarM, [0, y, 0.262], 0.022, [0, 0, 0], false));
    P(this.body, g.cyl, skin, [0, 1.68, 0], [0.09, 0.16, 0.09]);
    if (look.necklace) {
      P(this.body, g.thinArc, gold, [0, 1.6, 0.17], 0.14, [-0.45, 0, Math.PI], false);
      P(this.body, g.sphere, gold, [0, 1.455, 0.255], 0.026, [0, 0, 0], false);
    }
    if (look.backpack) {
      P(this.body, g.box, M(look.backpack, { roughness: 0.6 }), [0, 1.2, -0.36], [0.5, 0.55, 0.26]);
    }

    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.35, 1.5, 0);
      pivot.rotation.z = s * 0.12;
      this.body.add(pivot);
      P(pivot, Toon.capsule(0.092, 0.36), topM, [0, -0.27, 0]);
      P(pivot, g.sphere, skin, [0, -0.55, 0.02], 0.098);
      return pivot;
    });

    this.head = new THREE.Group();
    this.head.position.set(0, 2.18, 0);
    this.body.add(this.head);
    P(this.head, g.sphere, skin, [0, 0, 0], [0.62, 0.58, 0.58]);
    [-1, 1].forEach((s) => P(this.head, g.sphere, skin, [s * 0.6, -0.05, 0], [0.08, 0.12, 0.07]));

    const eyeDark = M('#3a2418', { roughness: 0.2 });
    const iris = M('#6e4632', { roughness: 0.25 });
    const shine = M('#ffffff', { roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.7 });
    const lash = M('#2a1a14', { roughness: 0.5 });
    this.eyes = [-1, 1].map((s) => {
      const eye = new THREE.Group();
      eye.position.set(s * 0.21, -0.04, 0.5);
      this.head.add(eye);
      P(eye, g.sphere, eyeDark, [0, 0, 0], [0.115, 0.135, 0.07], [0, 0, 0], false);
      P(eye, g.sphere, iris, [0, -0.035, 0.035], [0.07, 0.065, 0.04], [0, 0, 0], false);
      P(eye, g.sphere, shine, [0.035, 0.05, 0.06], [0.034, 0.034, 0.02], [0, 0, 0], false);
      P(eye, g.sphere, shine, [-0.035, -0.06, 0.06], [0.014, 0.014, 0.01], [0, 0, 0], false);
      P(eye, g.arc, lash, [0, 0.0, 0.03], [0.125, 0.135, 0.1], [0, 0, 0], false);
      P(eye, Toon.capsule(0.012, 0.05), lash, [s * 0.12, 0.08, 0.03], 1, [0, 0, -s * 0.9], false);
      return eye;
    });
    [-1, 1].forEach((s) => {
      P(this.head, Toon.capsule(0.018, 0.1), M(look.hair, { roughness: 0.6 }), [s * 0.21, 0.18, 0.505], 1, [0, 0, Math.PI / 2 + s * 0.12], false);
      P(this.head, g.sphere, M('#ff8f9c', { opacity: 0.45, roughness: 0.9 }), [s * 0.34, -0.19, 0.43], [0.1, 0.065, 0.05], [0, 0, 0], false);
    });
    P(this.head, g.sphere, M('#f0b8a2', { roughness: 0.5 }), [0, -0.14, 0.565], [0.045, 0.035, 0.035], [0, 0, 0], false);
    P(this.head, g.arc, M('#c4506a', { roughness: 0.4 }), [0, -0.245, 0.515], [0.065, 0.06, 0.06], [0, 0, Math.PI], false);

    // 가운데 가르마 + 긴 웨이브 머리
    this.hair = new THREE.Group();
    this.head.add(this.hair);
    [-1, 1].forEach((s) => P(this.hair, g.hemi, hairM, [s * 0.02, 0.03, -0.03], [0.655, 0.64, 0.63], [-0.58, 0, s * 0.13]));
    [-1, 1].forEach((s) => P(this.hair, g.sphere, hairM, [s * 0.56, -0.02, 0.06], [0.16, 0.46, 0.3], [0, 0, s * 0.12]));
    P(this.hair, g.sphere, hairM, [0, -0.2, -0.2], [0.64, 0.72, 0.5]);
    const back = new THREE.Group();
    back.position.set(0, -0.35, -0.25);
    this.hair.add(back);
    P(back, Toon.capsule(0.42, 0.5), hairM, [0, -0.5, 0], [1, 1, 0.55]);
    [-1, 1].forEach((s) => P(back, g.sphere, hairM, [s * 0.3, -0.95, 0.05], [0.2, 0.26, 0.2]));
    this.locks.push(back);
    [-1, 1].forEach((s) => {
      const lock = new THREE.Group();
      lock.position.set(s * 0.5, -0.22, 0.1);
      this.hair.add(lock);
      [[0, -0.02, 0.0, 0.17, -0.22], [s * 0.05, -0.3, 0.05, 0.165, 0.26], [0, -0.58, 0.1, 0.155, -0.26], [s * 0.05, -0.84, 0.14, 0.13, 0.24]]
        .forEach(([x, y, z, r, tilt]) => P(lock, Toon.capsule(r, 0.2), hairM, [x, y, z], [1, 1, 0.82], [0.12, 0, s * tilt]));
      this.locks.push(lock);
    });
    if (look.hat === 'straw') {
      const straw = M('#f1d38a', { roughness: 0.9 });
      P(this.head, g.cyl, straw, [0, 0.5, -0.03], [1.0, 0.04, 1.0], [-0.12, 0, 0]);
      P(this.head, g.hemi, straw, [0, 0.5, -0.03], [0.6, 0.36, 0.6], [-0.12, 0, 0]);
      P(this.head, g.cyl, M(look.hatColor || '#e8505b', { roughness: 0.6 }), [0, 0.58, -0.04], [0.61, 0.08, 0.61], [-0.12, 0, 0]);
    }
  }
}

function createRig(look) {
  return look.species ? new AnimalRig(look) : new HumanRig(look);
}

/* ---------------------------------------------------------
 * NPC 데이터 (남녀 섞인 동물 주민 + 관련 사이트)
 * --------------------------------------------------------- */
const NPC_DATA = [
  {
    id: 'captain',
    name: '한바다 선장',
    species: '수달',
    gender: '남',
    role: '북서쪽 항구 · 무역 기초',
    topic: '무역의 기본 개념과 거래 흐름',
    zone: '북서쪽 항구',
    icon: '⚓',
    color: '#f28b6b',
    voice: 0.85,
    x: 420, y: 440,
    look: { species: 'otter', fur: '#8c5f43', fur2: '#ecd6bd', inner: '#6b4632', top: '#2d4a8a', collar: '#ffffff', buttons: '#e6bf72', bottom: '#f3ede0', shoes: '#1f2a44', hat: 'captain' },
    links: [
      { label: '한국무역협회 KITA', url: 'https://www.kita.net' },
      { label: 'KOTRA 해외시장 정보', url: 'https://www.kotra.or.kr' },
    ],
  },
  {
    id: 'incoterms',
    name: '강운송 팀장',
    species: '강아지',
    gender: '여',
    role: '컨테이너 야적장 · 운송',
    topic: '인코텀즈(Incoterms) & 운송 방식',
    zone: '남동쪽 컨테이너 야적장',
    icon: '🚢',
    color: '#f2a93b',
    voice: 1.3,
    x: 1630, y: 1300,
    look: { species: 'dog', fur: '#e9c38f', fur2: '#fff3e0', ear: '#b98450', top: '#ff8f3a', vest: true, bottom: '#3b4a6b', shoes: '#5a4038', hat: 'helmet', lashes: true },
    page: { label: '인코텀즈 자세히 알아보기', url: 'incoterms.html' },
    links: [{ label: 'ICC 인코텀즈 공식 안내', url: 'https://iccwbo.org/business-solutions/incoterms-rules/' }],
  },
  {
    id: 'cfs',
    name: '최혼재 반장',
    species: '곰',
    gender: '남',
    role: 'CFS 작업장 · 화물',
    topic: 'LCL·FCL 화물 & CY·CFS 차이',
    zone: '동쪽 CFS',
    icon: '📦',
    color: '#36b5a2',
    voice: 0.7,
    x: 1880, y: 660,
    look: { species: 'bear', fur: '#a8714a', fur2: '#e9c9a3', inner: '#7a4e32', top: '#2fae8f', pattern: 'stripe', top2: '#e8fff6', bottom: '#2c3e66', shoes: '#3a2f2f', hat: 'cap', hatColor: '#1f6f5e' },
    links: [
      { label: '부산항만공사', url: 'https://www.busanpa.com' },
      { label: 'UNI-PASS 화물진행조회', url: 'https://unipass.customs.go.kr' },
    ],
  },
  {
    id: 'customs',
    name: '나세관 관세사',
    species: '고양이',
    gender: '여',
    role: '중앙 세관 · 통관',
    topic: '수출입 통관 절차 & 관세·부가세',
    zone: '중앙 관세사무소/세관',
    icon: '🏛️',
    color: '#5b7cfa',
    voice: 1.45,
    x: 1180, y: 805,
    look: { species: 'cat', fur: '#8f97a8', fur2: '#f4f4f6', inner: '#ffb8c6', nose: '#ff9fb0', top: '#3d5bd9', collar: '#ffffff', bottom: '#26315a', bottomType: 'skirt', shoes: '#26315a', glasses: true, necklace: true, lashes: true },
    links: [
      { label: 'UNI-PASS 전자통관', url: 'https://unipass.customs.go.kr' },
      { label: '관세청', url: 'https://www.customs.go.kr' },
      { label: 'FTA 포털', url: 'https://www.customs.go.kr/ftaportalkor/main.do' },
    ],
  },
  {
    id: 'forwarder',
    name: '서류진 포워더',
    species: '여우',
    gender: '남',
    role: '서쪽 물류센터 · 서류',
    topic: '선적서류 (B/L · Invoice · Packing List)',
    zone: '서쪽 물류센터',
    icon: '📑',
    color: '#e8913d',
    voice: 1.0,
    x: 570, y: 830,
    look: { species: 'fox', fur: '#ef8a3c', fur2: '#fff4e6', top: '#f4c260', pattern: 'check', top2: '#c98a2e', collar: '#ffffff', tie: '#3d6bff', bottom: '#6b4a36', shoes: '#3a2a24', glasses: true, clipboard: true },
    links: [
      { label: 'uTradeHub 전자무역 서류작성', url: 'https://www.utradehub.or.kr' },
      { label: '대한상의 원산지증명 발급', url: 'https://cert.korcham.net' },
      { label: 'KITA 무역서식', url: 'https://www.kita.net' },
    ],
  },
  {
    id: 'bank',
    name: '신용장 지점장',
    species: '양',
    gender: '여',
    role: '무역은행 · 결제 (보너스)',
    topic: '무역 대금결제 (T/T · L/C · 추심)',
    zone: '남서쪽 무역은행',
    icon: '💳',
    color: '#9b86e8',
    voice: 1.5,
    x: 575, y: 1320,
    look: { species: 'sheep', fur: '#f6e7d8', fur2: '#fffaf3', inner: '#f7c5c5', top: '#9b86e8', collar: '#ffffff', scarf: '#ffc7d6', bottom: '#2a2f4a', bottomType: 'skirt', shoes: '#2a2f4a', necklace: true, lashes: true, bow: '#ff8fab' },
    links: [
      { label: '한국무역보험공사 K-SURE', url: 'https://www.ksure.or.kr' },
      { label: '한국은행 ECOS 환율', url: 'https://ecos.bok.or.kr' },
    ],
  },
];

/* 섬을 산책하는 주민 (남녀 섞음) */
const WALKER_DATA = [
  { name: '코코 (코알라)', route: [{ x: 90, y: 1022 }, { x: 2320, y: 1022 }], look: { species: 'koala', fur: '#9aa3ad', fur2: '#dfe3e8', nose: '#2a2a2e', top: '#f7cd46', bottom: '#5a6b8c', hat: 'straw', hatColor: '#3d6bff' } },
  { name: '사슴이 (사슴)', route: [{ x: 2320, y: 1052 }, { x: 90, y: 1052 }], look: { species: 'deer', fur: '#c98f5a', fur2: '#fff1e0', inner: '#f2b9a0', top: '#ffd8e0', bottom: '#7f8fb8', bottomType: 'skirt', lashes: true, bow: '#ffffff' } },
  { name: '개굴 (개구리)', route: [{ x: 1474, y: 280 }, { x: 1474, y: 1560 }], look: { species: 'frog', fur: '#7cc576', fur2: '#e8f7d0', top: '#ffffff', pattern: 'stripe', top2: '#3d6bff', bottom: '#e8505b' } },
  { name: '햄찌 (햄스터)', route: [{ x: 2340, y: 222 }, { x: 830, y: 222 }], look: { species: 'hamster', fur: '#f0a65a', fur2: '#fff6ea', top: '#bfe6ff', bottom: '#f28b6b', bottomType: 'skirt', lashes: true, bow: '#ffffff' } },
];

/* ---------------------------------------------------------
 * 액터 공통 (위치 · 충돌 박스 · 3D 동기화)
 * --------------------------------------------------------- */
class Actor {
  constructor(x, y, look) {
    this.x = x;
    this.y = y;
    this.rig = createRig(look);
    this.moving = false;
  }

  get box() {
    return { x: this.x - 13, y: this.y - 10, w: 26, h: 12 };
  }

  distanceTo(px, py) {
    return Math.hypot(px - this.x, py - this.y);
  }

  sync() {
    this.rig.root.position.set(this.x * S, 0, this.y * S);
  }

  /** 목표 지점으로 한 걸음 이동. 막히면 false */
  stepToward(tx, ty, speed, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    if (world.blocked(nx, ny, this)) return false;
    this.x = nx;
    this.y = ny;
    this.moving = true;
    this.rig.faceToward(dx, dy, dt, 8);
    return true;
  }
}

/* 무역 전문가 NPC: 자기 자리 주변을 천천히 배회하다가 플레이어가 오면 멈춰서 바라봅니다. */
class NPC extends Actor {
  constructor(data) {
    super(data.x, data.y, data.look);
    Object.assign(this, data);
    this.kind = 'npc';
    this.home = { x: data.x, y: data.y };
    this.wanderRadius = data.wanderRadius || 70;
    this.met = false;
    this.talking = false;
    this.target = null;
    this.wait = 1 + Math.random() * 2;
    this.sync();
  }

  update(dt, player, world) {
    this.moving = false;
    const d = this.distanceTo(player.x, player.y);

    if (this.talking || d < INTERACT_RADIUS * 1.7) {
      this.target = null;
      this.wait = 1.5;
      this.rig.faceToward(player.x - this.x, player.y - this.y, dt, 8);
    } else if (this.target) {
      const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
      if (dist < 3) {
        this.target = null;
        this.wait = 2 + Math.random() * 3;
      } else if (!this.stepToward(this.target.x, this.target.y, 46, dt, world)) {
        this.target = null;
        this.wait = 0.8;
      }
    } else {
      this.wait -= dt;
      this.rig.faceAngle(0, dt, 2);
      if (this.wait <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = this.wanderRadius * (0.3 + Math.random() * 0.7);
        this.target = { x: this.home.x + Math.cos(a) * r, y: this.home.y + Math.sin(a) * r };
      }
    }

    this.rig.update(dt, this.moving, 0.75);
    this.sync();
  }
}

/* 산책하는 주민: 길을 따라 왕복하다가 플레이어가 다가오면 멈춰서 무역 꿀팁을 말해줍니다. */
class Walker extends Actor {
  constructor(data, tips) {
    super(data.route[0].x, data.route[0].y, data.look);
    this.name = data.name;
    this.route = data.route;
    this.index = 1;
    this.tips = tips;
    this.tipIndex = 0;
    this.tipTimer = 0;
    this.near = false;
    this.blockedFor = 0;
    this.rig.root.rotation.y = Math.atan2(this.route[1].x - this.x, this.route[1].y - this.y);
    this.sync();
  }

  get tip() {
    return this.tips[this.tipIndex % this.tips.length];
  }

  update(dt, player, world) {
    this.moving = false;
    const wasNear = this.near;
    this.near = this.distanceTo(player.x, player.y) < 85;
    if (this.near) {
      this.tipTimer += dt;
      if (!wasNear) this.tipTimer = 0;
      if (this.tipTimer > 4.5) {
        this.tipTimer = 0;
        this.tipIndex += 1;
      }
      this.rig.faceToward(player.x - this.x, player.y - this.y, dt, 8);
    } else {
      if (wasNear) this.tipIndex += 1;
      const t = this.route[this.index];
      if (Math.hypot(t.x - this.x, t.y - this.y) < 4) {
        this.index = (this.index + 1) % this.route.length;
      } else if (!this.stepToward(t.x, t.y, 60, dt, world)) {
        this.blockedFor += dt;
        if (this.blockedFor > 2.5) {
          this.index = (this.index + 1) % this.route.length;
          this.blockedFor = 0;
        }
      } else {
        this.blockedFor = 0;
      }
    }
    this.rig.update(dt, this.moving, 0.8);
    this.sync();
  }
}

/**
 * 플레이어 위치에서 반경 안에 있는 가장 가까운 대상(NPC · 게임 부스)을 찾습니다.
 * @returns {{ npc: object, dist: number } | null}
 */
function findNearestNPC(targets, px, py, radius = INTERACT_RADIUS) {
  let best = null;
  for (const npc of targets) {
    const dist = npc.distanceTo(px, py) - (npc.reach || 0);
    if (dist <= radius && (!best || dist < best.dist)) best = { npc, dist };
  }
  return best;
}
