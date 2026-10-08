/**
 * main.js
 * 게임 진입점 & 전역 상태 관리 (Three.js 3D 렌더링)
 * - 아늑한 무역섬 3D 월드 생성 (잔디·모래사장·바다, 흙길, 박공지붕 건물, 등대, 컨테이너, 크레인, 선박,
 *   나무·꽃·덤불·바위, 가랜드, 나비·갈매기·구름, 분수 광장, 텐트·모닥불, 미니게임 부스)
 * - 카메라 추적, 조명/그림자, 캐릭터 업데이트 루프
 * - HUD(학습 진행도 · 배지), 이름표/안내 팝업, 미니맵, 사운드, 저장/불러오기
 */
(function () {
  'use strict';

  const INK = '#4a3b2a';

  if (typeof THREE === 'undefined') {
    const lead = document.querySelector('#intro .lead');
    if (lead) lead.innerHTML = '<b>3D 엔진(Three.js)을 불러오지 못했어요.</b><br>인터넷 연결을 확인한 뒤 새로고침해 주세요.';
    return;
  }
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  const WORLD = { width: 2400, height: 1600 };
  const SPAWN = { x: 1250, y: 1040 };
  const STORAGE_KEY = 'tradePort.metNpcs.v1';
  const BADGE_KEY = 'tradeIsland.badges.v1';
  const PALETTE = ['#f28b6b', '#5b7cfa', '#36b5a2', '#f2c14e', '#9b86e8', '#e8607a', '#4cc3e0'];

  /* =========================================================
   * 맵 데이터 (단위: 맵 px · 3D 변환 시 S 배율)
   * ========================================================= */
  const WATER = [
    { x: 0, y: 0, w: 2400, h: 150 },
    { x: 0, y: 150, w: 760, h: 170 },
  ];
  const LAND = [
    { x: 0, y: 320, w: 2400, h: 1280 },
    { x: 760, y: 150, w: 1640, h: 170 },
  ];

  const ZONES = [
    { id: 'port', name: '북서쪽 항구', label: 'HARBOR', x: 20, y: 350, w: 880, h: 270, tex: 'plank', color: '#dcb27c' },
    { id: 'forwarder', name: '서쪽 물류센터', label: 'LOGISTICS', x: 30, y: 650, w: 650, h: 320, tex: 'brick', color: '#e9b48e' },
    { id: 'customs', name: '중앙 세관', label: 'CUSTOMS', x: 920, y: 440, w: 500, h: 520, tex: 'tile', color: '#e6e0d2' },
    { id: 'cfs', name: '동쪽 CFS', label: 'CFS STATION', x: 1560, y: 430, w: 820, h: 520, tex: 'tile', color: '#d9e6e2' },
    { id: 'yard', name: '남동쪽 컨테이너 야적장', label: 'CONTAINER YARD', x: 1540, y: 1100, w: 840, h: 460, tex: 'concrete', color: '#e2ddd3' },
    { id: 'bank', name: '남서쪽 무역은행', label: 'TRADE BANK', x: 40, y: 1110, w: 720, h: 450, tex: 'check', color: '#e7def2' },
  ];

  const ROADS = [
    { x: 0, y: 1000, w: 2400, h: 70, axis: 'h' },
    { x: 1450, y: 190, w: 70, h: 1370, axis: 'v' },
    { x: 774, y: 190, w: 1626, h: 60, axis: 'h' },
  ];

  const BUILDINGS = [
    { x: 700, y: 430, w: 150, h: 100, hu: 3.4, color: '#f6efe2', trim: '#f28b6b', roof: '#e8705a', label: 'PORT OFFICE', style: 'house' },
    { x: 90, y: 700, w: 380, h: 190, hu: 4.4, color: '#f3e3c3', trim: '#c98a4a', roof: '#d9824a', label: 'LOGIS · 포워더', style: 'warehouse' },
    { x: 1010, y: 540, w: 330, h: 170, hu: 5.6, color: '#f4f1ea', trim: '#5b7cfa', roof: '#5b7cfa', label: '세관 CUSTOMS', style: 'civic' },
    { x: 1960, y: 540, w: 340, h: 200, hu: 4.4, color: '#e9f3ee', trim: '#2f9c86', roof: '#36b5a2', label: 'CFS 작업장', style: 'warehouse' },
    { x: 150, y: 1220, w: 300, h: 180, hu: 5.0, color: '#f6f0fa', trim: '#9b86e8', roof: '#8a74dd', label: 'TRADE BANK', style: 'civic' },
  ];

  const CONTAINERS = [];
  {
    const prefixes = ['TPCU', 'HLXU', 'MSKU', 'KMTU'];
    let i = 0;
    for (const y of [1200, 1320, 1440]) {
      for (const x of [1720, 1880, 2040, 2200]) {
        CONTAINERS.push({
          x, y, w: 130, h: 52,
          color: PALETTE[(i * 3 + 1) % PALETTE.length],
          top: PALETTE[(i * 5 + 4) % PALETTE.length],
          double: (i % 3) !== 1,
          code: `${prefixes[i % 4]} ${String(100000 + ((i * 7919) % 899999)).slice(0, 6)}`,
        });
        i += 1;
      }
    }
  }

  const TREES = [
    [640, 600], [60, 990], [980, 985], [1400, 960], [1570, 985], [2340, 985],
    [790, 1160], [640, 1520], [1000, 1480], [1280, 1530], [1100, 320],
    [1700, 330], [2250, 330], [950, 480], [1390, 480], [1590, 1545],
  ].map(([x, y]) => ({ x, y }));

  const LAMPS = [];
  [160, 480, 800, 1120, 1760, 2080].forEach((x) => { LAMPS.push({ x, y: 992 }, { x: x + 160, y: 1084 }); });

  const CRATES = [[490, 700], [522, 700], [2010, 800], [2042, 800], [2026, 778]].map(([x, y]) => ({ x, y }));
  const CRANES = [{ x: 300, base: 345 }, { x: 560, base: 345 }];
  const SIGNS = [{ x: 1360, y: 985, text: '⚓ TRADE ISLAND' }];
  const FOUNTAIN = { x: 1150, y: 1320 };
  const LIGHTHOUSE = { x: 2330, y: 300 };
  const TENTS = [{ x: 870, y: 1500, color: '#f2c14e' }, { x: 1380, y: 1480, color: '#f28b6b' }];
  const CAMPFIRE = { x: 960, y: 1545 };
  const BENCHES = [
    { x: 1050, y: 1235, rot: 0 }, { x: 1250, y: 1235, rot: 0 },
    { x: 1050, y: 1408, rot: Math.PI }, { x: 1250, y: 1408, rot: Math.PI },
  ];
  const BOARD = { x: 1210, y: 968 };

  const SHIPS = [
    { x: 190, y: 235, len: 250, hull: '#2d4a8a', phase: 0, vx: 0 },
    { x: 560, y: 240, len: 220, hull: '#e8607a', phase: 1.3, vx: 0, flip: true },
    { x: 1300, y: 75, len: 300, hull: '#2b3a5c', phase: 2.1, vx: 14 },
    { x: 2100, y: 85, len: 240, hull: '#36b5a2', phase: 0.7, vx: -10, flip: true },
  ];

  /* 미니게임 부스 */
  const BOOTHS = [
    { gameId: 'incoterms', x: 1620, y: 1480 },
    { gameId: 'docs', x: 760, y: 760 },
    { gameId: 'duty', x: 900, y: 1290 },
    { gameId: 'cbm', x: 2200, y: 870 },
  ].map((b) => ({
    ...b,
    kind: 'game',
    id: `booth-${b.gameId}`,
    name: MINIGAME_META[b.gameId].title,
    icon: MINIGAME_META[b.gameId].icon,
    color: MINIGAME_META[b.gameId].color,
    reach: 22,
    distanceTo(px, py) { return Math.hypot(px - this.x, py - (this.y + 30)); },
  }));

  /* =========================================================
   * 렌더러 · 씬 · 카메라 · 조명
   * ========================================================= */
  const app = document.getElementById('app');
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const FOG = '#cdeaf6';
  scene.fog = new THREE.Fog(FOG, 95, 200);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 600);
  const CAM_OFFSET = new THREE.Vector3(0, 31, 34);
  const camTarget = new THREE.Vector3(SPAWN.x * S, 0, SPAWN.y * S);
  let camZoom = 1;
  let screenZoom = 1;

  scene.add(new THREE.HemisphereLight('#fffaf0', '#9fbf7a', 0.5));
  const sun = new THREE.DirectionalLight('#fff1d6', 0.72);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 150 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#d6e8ff', 0.16);
  fill.position.set(30, 20, -20);
  scene.add(fill);

  /* =========================================================
   * 3D 빌더 유틸
   * ========================================================= */
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 24);
  const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
  const matCache = new Map();

  function mat(color, roughness = 0.8, extra = {}) {
    const key = `${color}|${roughness}|${JSON.stringify(extra)}`;
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, ...extra }));
    return matCache.get(key);
  }

  function add(parent, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, opts = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
  }

  function roundedRectShape(w, d, rad) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -d / 2;
    const r = Math.max(0.001, Math.min(rad, w / 2, d / 2));
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + d - r);
    s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + d);
    s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  const rbCache = new Map();
  /** 모서리가 둥근 상자 (바닥 y=0 ~ 윗면 y=h) */
  function roundedBox(w, h, d, r) {
    const key = [w, h, d, r].map((v) => v.toFixed(3)).join('|');
    if (rbCache.has(key)) return rbCache.get(key);
    const rr = Math.min(r, w / 2 - 0.02, h / 2 - 0.02, d / 2 - 0.02);
    const g = new THREE.ExtrudeGeometry(roundedRectShape(w - 2 * rr, d - 2 * rr, rr * 0.8), {
      depth: Math.max(0.001, h - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: 4, curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, rr, 0);
    rbCache.set(key, g);
    return g;
  }

  function slab(w, d, h, rad) {
    const g = new THREE.ExtrudeGeometry(roundedRectShape(w, d, rad), { depth: h, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    return g;
  }

  function rrPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function circlePath(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  function canvasTexture(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = maxAniso;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
  }

  function shade(hex, amount) {
    const c = new THREE.Color(hex);
    if (amount < 0) c.lerp(new THREE.Color('#2a1d14'), -amount);
    else c.lerp(new THREE.Color('#ffffff'), amount);
    return `#${c.getHexString()}`;
  }

  function mulberry32(a) {
    return function rand() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261008);

  /** 애니메이션되는 오브젝트 표시 (정적 배칭에서 제외) */
  const dyn = (o) => { o.userData.dynamic = true; return o; };

  /**
   * 정적 배칭: 움직이지 않는 메시를 머티리얼별로 하나의 지오메트리로 합쳐 드로우콜을 크게 줄입니다.
   */
  function bakeStatic(root) {
    root.updateMatrixWorld(true);
    const skip = new Set();
    root.traverse((o) => { if (o.userData.dynamic) o.traverse((c) => skip.add(c)); });
    const groups = new Map();
    const victims = [];
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || skip.has(o) || Array.isArray(o.material) || o.material.transparent) return;
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
      if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      groups.get(key).geos.push(g);
      victims.push(o);
    });
    victims.forEach((o) => o.parent.remove(o));
    groups.forEach(({ material, cast, receive, geos }) => {
      const count = geos.reduce((n, g) => n + g.attributes.position.count, 0);
      const pos = new Float32Array(count * 3);
      const nor = new Float32Array(count * 3);
      const uv = new Float32Array(count * 2);
      let off = 0;
      geos.forEach((g) => {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, off * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, n * 2), off * 2);
        off += n;
        g.dispose();
      });
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
    });
  }

  /** 우드 간판 (원목 판 + 크림색 글씨) */
  function signPlane(text, color, height = 0.95, style = 'cream') {
    const fs = 64;
    const m = document.createElement('canvas').getContext('2d');
    m.font = `800 ${fs}px ${FONT}`;
    const tw = Math.ceil(m.measureText(text).width) + 150;
    const th = 128;
    const tex = canvasTexture(tw, th, (ctx, w, h) => {
      if (style === 'wood') {
        ctx.fillStyle = '#9a6a42';
        rrPath(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,35,15,0.25)';
        ctx.lineWidth = 3;
        for (let y = 26; y < h - 10; y += 22) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(w - 18, y + 4); ctx.stroke(); }
        ctx.fillStyle = '#fff6e2';
      } else {
        ctx.fillStyle = '#fffaf0';
        rrPath(ctx, 4, 4, w - 8, h - 8, (h - 8) / 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = color;
        circlePath(ctx, 60, h / 2, 16);
        ctx.fill();
        ctx.fillStyle = INK;
      }
      ctx.font = `800 ${fs}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2 + (style === 'wood' ? 0 : 22), h / 2 + 4);
    });
    return new THREE.Mesh(
      new THREE.PlaneGeometry((height * tw) / th, height),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7 }),
    );
  }

  /** 바닥에 새겨진 구역 이름 */
  function groundLabel(text, x, z, height = 1.5) {
    const fs = 110;
    const m = document.createElement('canvas').getContext('2d');
    m.font = `900 ${fs}px ${FONT}`;
    const tw = Math.ceil(m.measureText(text).width) + 40;
    const th = 150;
    const tex = canvasTexture(tw, th, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(90, 60, 30, 0.16)';
      ctx.font = `900 ${fs}px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 20, h / 2 + 6);
    });
    const width = (height * tw) / th;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x + width / 2, 0.08, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const stripeTexCache = new Map();
  function stripeTexture(a, b, horizontal = false) {
    const key = `${a}|${b}|${horizontal}`;
    if (!stripeTexCache.has(key)) {
      stripeTexCache.set(key, canvasTexture(128, 128, (ctx, w, h) => {
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? a : b;
          if (horizontal) ctx.fillRect(0, (i * h) / 8, w, h / 8);
          else ctx.fillRect((i * w) / 8, 0, w / 8, h);
        }
      }));
    }
    return stripeTexCache.get(key);
  }

  /** 바닥 재질 텍스처 (나무 데크 · 벽돌 · 석재 타일 · 콘크리트 · 체크) */
  function floorTexture(kind, color, rx, ry) {
    return canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      const dark = shade(color, -0.14);
      const light = shade(color, 0.2);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      if (kind === 'plank') {
        for (let y = 0; y < h; y += 32) {
          ctx.fillStyle = (y / 32) % 2 ? shade(color, -0.04) : shade(color, 0.04);
          ctx.fillRect(0, y, w, 32);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          const off = ((y / 32) % 3) * 70;
          for (let x = off; x < w; x += 200) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke(); }
        }
      } else if (kind === 'brick') {
        for (let y = 0; y < h; y += 32) {
          const off = (y / 32) % 2 ? 32 : 0;
          for (let x = -off; x < w; x += 64) {
            ctx.fillStyle = rand() > 0.5 ? shade(color, 0.05) : shade(color, -0.05);
            ctx.fillRect(x + 2, y + 2, 60, 28);
          }
        }
      } else if (kind === 'tile' || kind === 'concrete') {
        const step = kind === 'tile' ? 64 : 128;
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            ctx.fillStyle = rand() > 0.5 ? shade(color, 0.04) : shade(color, -0.03);
            ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
          }
        }
        ctx.strokeStyle = light;
        ctx.lineWidth = 2;
        for (let i = 0; i <= w; i += step) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }
      } else if (kind === 'check') {
        for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
          if (((x + y) / 64) % 2) { ctx.fillStyle = shade(color, 0.12); ctx.fillRect(x, y, 64, 64); }
        }
      }
    }, [rx, ry]);
  }

  /* =========================================================
   * 지형 · 바다 · 길
   * ========================================================= */
  let water = null;

  function buildSky() {
    scene.background = canvasTexture(16, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#6ec3ef');
      g.addColorStop(0.55, '#b6e2f6');
      g.addColorStop(1, FOG);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function buildTerrain() {
    const grassTex = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#8ccc6a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(120, 190, 90, 0.5)' : 'rgba(160, 215, 120, 0.45)';
        circlePath(ctx, rand() * w, rand() * h, 10 + rand() * 30);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(90, 160, 70, 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 500; i++) {
        const x = rand() * w;
        const y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 5, y - 6 - rand() * 6);
        ctx.stroke();
      }
    }, [24, 16]);
    const cliffTex = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#c99a63';
      ctx.fillRect(0, 0, w, h);
      for (let y = 14; y < h; y += 26) {
        ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
        ctx.fillRect(0, y, w, 8 + rand() * 4);
      }
      ctx.fillStyle = '#7cba5a';
      ctx.fillRect(0, 0, w, 14);
    }, [40, 1]);

    const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 });
    const cliff = new THREE.MeshStandardMaterial({ map: cliffTex, roughness: 0.95 });
    LAND.forEach((l) => {
      const m = new THREE.Mesh(boxGeo, [cliff, cliff, grass, cliff, cliff, cliff]);
      m.scale.set(l.w * S, 3, l.h * S);
      m.position.set((l.x + l.w / 2) * S, -1.5, (l.y + l.h / 2) * S);
      m.receiveShadow = true;
      scene.add(m);
    });

    // 바닷가 모래사장 (섬 바깥 가장자리)
    const sand = new THREE.MeshStandardMaterial({
      map: canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f3e2b6';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = rand() > 0.5 ? 'rgba(220,190,130,0.5)' : 'rgba(255,250,230,0.6)';
          ctx.fillRect(rand() * w, rand() * h, 2, 2);
        }
      }, [10, 10]),
      roughness: 1,
    });
    [
      { x: 0, y: 1556, w: 2400, h: 44 },
      { x: 0, y: 334, w: 40, h: 1222 },
      { x: 2360, y: 164, w: 40, h: 1392 },
    ].forEach((r) => add(scene, slab(r.w * S, r.h * S, 0.04, 0.6), sand, (r.x + r.w / 2) * S, 0.005, (r.y + r.h / 2) * S, 1, 1, 1, { cast: false }));

    // 항구 쪽 나무 데크 (물가)
    const deck = new THREE.MeshStandardMaterial({ map: floorTexture('plank', '#c99a63', 12, 1), roughness: 0.85 });
    [
      { x: 774, y: 150, w: 1626, h: 36 },
      { x: 0, y: 320, w: 774, h: 32 },
      { x: 760, y: 150, w: 36, h: 184 },
    ].forEach((k) => add(scene, boxGeo, deck, (k.x + k.w / 2) * S, 0.1, (k.y + k.h / 2) * S, k.w * S, 0.2, k.h * S, { cast: false }));
    const bollard = mat('#4a3b2a', 0.4);
    for (let x = 40; x < 760; x += 110) add(scene, cylGeo, bollard, x * S, 0.45, 327 * S, 0.16, 0.5, 0.16);
    for (let x = 840; x < 2400; x += 140) add(scene, cylGeo, bollard, x * S, 0.45, 157 * S, 0.16, 0.5, 0.16);
    // 부두 타이어 펜더
    const tire = mat('#2f2a2a', 0.7);
    const torusGeo = new THREE.TorusGeometry(0.32, 0.12, 8, 16);
    for (let x = 95; x < 760; x += 220) add(scene, torusGeo, tire, x * S, -0.35, 320 * S - 0.08, 1, 1, 1);
    for (let x = 900; x < 2400; x += 260) add(scene, torusGeo, tire, x * S, -0.35, 150 * S - 0.08, 1, 1, 1);

    // 바다 (섬 가까이는 에메랄드, 멀수록 짙은 파랑)
    const wg = new THREE.PlaneGeometry(480, 400, 96, 80);
    wg.rotateX(-Math.PI / 2);
    const base = Float32Array.from(wg.attributes.position.array);
    const colors = new Float32Array(wg.attributes.position.count * 3);
    const shallow = new THREE.Color('#7fe3da');
    const deep = new THREE.Color('#2f9fd0');
    const tmp = new THREE.Color();
    const cx = 60;
    const cz = 40;
    for (let i = 0; i < wg.attributes.position.count; i++) {
      const x = base[i * 3] + cx;
      const z = base[i * 3 + 2] + cz;
      const dx = Math.max(0, -x, x - 120);
      const dz = Math.max(0, 7.5 - z, z - 80);
      const d = Math.hypot(dx, dz);
      tmp.copy(shallow).lerp(deep, Math.min(1, d / 26));
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    wg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.25, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.95,
    }));
    water.position.set(cx, -0.9, cz);
    water.receiveShadow = true;
    water.userData.base = base;
    dyn(water);
    scene.add(water);

    // 파도 거품
    const foamM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, roughness: 0.4 });
    water.userData.foam = foamM;
    [
      [60, 80.35, 120.8, 0.45], [120.35, 43.8, 0.45, 72.6], [-0.35, 48, 0.45, 64],
      [19, 15.65, 38, 0.45], [37.65, 11.8, 0.45, 8.6], [79, 7.15, 82, 0.45],
    ].forEach(([x, z, w, d]) => add(scene, boxGeo, foamM, x, -0.82, z, w, 0.06, d, { cast: false }));

    // 구역 바닥
    ZONES.forEach((z) => {
      const tex = floorTexture(z.tex, z.color, (z.w * S) / 4, (z.h * S) / 4);
      add(scene, slab(z.w * S + 0.5, z.h * S + 0.5, 0.05, 1.6), mat('#b48a5c', 0.9), (z.x + z.w / 2) * S, 0, (z.y + z.h / 2) * S, 1, 1, 1, { cast: false });
      const m = add(scene, slab(z.w * S, z.h * S, 0.09, 1.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), (z.x + z.w / 2) * S, 0, (z.y + z.h / 2) * S, 1, 1, 1, { cast: false });
      // 슬랩 UV를 월드 크기에 맞춤
      const uv = m.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (z.w * S), uv.getY(i) / (z.h * S));
      groundLabel(z.label, (z.x + 28) * S, (z.y + z.h - 40) * S);
    });

    // 흙길 (가장자리 테두리 + 길)
    const pathM = new THREE.MeshStandardMaterial({
      map: canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e4cc9c';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = rand() > 0.5 ? 'rgba(200,165,110,0.35)' : 'rgba(250,235,200,0.45)';
          circlePath(ctx, rand() * w, rand() * h, 3 + rand() * 9);
          ctx.fill();
        }
      }, [1, 1]),
      roughness: 0.95,
    });
    ROADS.forEach((r) => {
      const W = r.w * S;
      const D = r.h * S;
      add(scene, slab(W + 0.4, D + 0.4, 0.05, 1.2), mat('#c9a774', 0.95), (r.x + r.w / 2) * S, 0, (r.y + r.h / 2) * S, 1, 1, 1, { cast: false });
      const m = add(scene, slab(W, D, 0.07, 1.0), pathM, (r.x + r.w / 2) * S, 0, (r.y + r.h / 2) * S, 1, 1, 1, { cast: false });
      const uv = m.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
    });
    // 교차로 징검돌
    const stone = mat('#d7d2c6', 0.9);
    for (let i = 0; i < 5; i++) add(scene, new THREE.CylinderGeometry(0.42, 0.48, 0.12, 10), stone, 1485 * S + (i - 2) * 0.9, 0.1, 1035 * S + (i % 2 ? 0.4 : -0.4), 1, 1, 1, { cast: false });
  }

  function updateWater(t) {
    const pos = water.geometry.attributes.position;
    const base = water.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.35 + t * 1.4) * 0.12 + Math.cos(z * 0.3 + t * 1.1) * 0.1;
    }
    pos.needsUpdate = true;
    water.userData.foam.opacity = 0.45 + Math.sin(t * 1.6) * 0.25;
  }

  /* =========================================================
   * 건물 (박공지붕 집 · 창고 · 관공서)
   * ========================================================= */
  const flags = [];
  const lanterns = [];
  const sidingCache = new Map();
  function sidingMat(color) {
    if (!sidingCache.has(color)) {
      sidingCache.set(color, new THREE.MeshStandardMaterial({
        map: canvasTexture(128, 128, (ctx, w, h) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 16) {
            ctx.fillStyle = 'rgba(120, 90, 50, 0.12)';
            ctx.fillRect(0, y + 13, w, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(0, y, w, 2);
          }
        }, [3, 3]),
        roughness: 0.85,
      }));
    }
    return sidingCache.get(color);
  }

  const glassM = () => mat('#cfe9ff', 0.12, { metalness: 0.2, emissive: '#bfe0ff', emissiveIntensity: 0.22 });

  function windowAt(g, x, y, z, trim, wide = 1.2) {
    add(g, boxGeo, mat('#ffffff', 0.6), x, y, z, wide + 0.22, 1.2, 0.14);
    add(g, boxGeo, glassM(), x, y, z + 0.06, wide, 0.98, 0.1, { cast: false });
    add(g, boxGeo, mat('#ffffff', 0.6), x, y, z + 0.1, wide, 0.07, 0.05, { cast: false });
    add(g, boxGeo, mat('#ffffff', 0.6), x, y, z + 0.1, 0.07, 0.98, 0.05, { cast: false });
    // 덧창 + 화분
    [-1, 1].forEach((s) => add(g, boxGeo, mat(trim, 0.7), x + s * (wide / 2 + 0.3), y, z + 0.04, 0.36, 1.2, 0.08));
    add(g, boxGeo, mat('#a8754e', 0.85), x, y - 0.72, z + 0.2, wide + 0.1, 0.28, 0.36);
    ['#ff8fa3', '#ffd23f', '#ffffff', '#f28b6b'].forEach((c, i) => add(g, sphereGeo, mat(c, 0.7), x - wide / 2 + 0.2 + i * (wide - 0.4) / 3, y - 0.5, z + 0.24, 0.13, 0.13, 0.13, { cast: false }));
  }

  function gableRoof(g, W, D, H, roofH, color, over = 0.6) {
    // 박공 벽 (삼각 프리즘)
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2, 0);
    tri.lineTo(D / 2, 0);
    tri.lineTo(0, roofH);
    tri.closePath();
    const prism = new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false });
    prism.rotateY(Math.PI / 2);
    prism.translate(-W / 2, 0, 0);
    add(g, prism, mat(shade(color, 0.85), 0.85), 0, H, 0);

    // 지붕판 2장 + 기와 줄무늬
    const a = Math.atan2(roofH, D / 2);
    const L = Math.hypot(D / 2, roofH) + over;
    const roofMat = new THREE.MeshStandardMaterial({ map: stripeTexture(color, shade(color, -0.12), true), roughness: 0.7 });
    roofMat.map.repeat.set(1, 4);
    [1, -1].forEach((s) => {
      const slabMesh = add(g, boxGeo, roofMat, 0, 0, 0, W + over * 1.6, 0.28, L);
      slabMesh.rotation.x = s * a;
      slabMesh.position.set(0, H + roofH / 2 + Math.cos(a) * 0.14 - over * 0.25 * Math.sin(a), s * (D / 4 + Math.sin(a) * 0.14 + over * 0.25 * Math.cos(a)));
    });
    const ridge = add(g, cylGeo, mat(shade(color, -0.2), 0.6), 0, H + roofH + 0.1, 0, 0.22, W + over * 1.6, 0.22);
    ridge.rotation.z = Math.PI / 2;
    // 굴뚝
    add(g, roundedBox(0.8, roofH + 0.6, 0.8, 0.08), mat('#c97a5a', 0.85), W / 2 - 1.4, H + roofH * 0.3, -D / 4);
  }

  function buildBuilding(b) {
    const g = new THREE.Group();
    const W = b.w * S;
    const D = b.h * S;
    const H = b.hu;
    const front = D / 2;
    g.position.set((b.x + b.w / 2) * S, 0, (b.y + b.h / 2) * S);
    scene.add(g);

    // 기단 + 벽
    add(g, roundedBox(W + 0.4, 0.35, D + 0.4, 0.12), mat('#d9cbb5', 0.9), 0, 0, 0);
    add(g, roundedBox(W, H, D, 0.22), sidingMat(b.color), 0, 0.2, 0);
    // 모서리 기둥 장식
    [-1, 1].forEach((s) => add(g, boxGeo, mat(b.trim, 0.7), s * (W / 2 - 0.05), H / 2 + 0.2, front - 0.05, 0.3, H, 0.3));
    add(g, boxGeo, mat(b.trim, 0.7), 0, H + 0.15, front, W + 0.2, 0.3, 0.3);

    const doorTop = 2.5;
    if (b.style === 'warehouse') {
      const shutterM = new THREE.MeshStandardMaterial({ map: stripeTexture('#eef1f4', '#d4dae2', true), roughness: 0.6 });
      const n = W > 15 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * (W / n);
        add(g, boxGeo, mat(b.trim, 0.6), x, 1.75, front + 0.04, 2.9, 3.2, 0.12);
        add(g, boxGeo, shutterM, x, 1.65, front + 0.1, 2.5, 2.9, 0.08, { cast: false });
      }
      const canopy = add(g, boxGeo, new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', b.roof), roughness: 0.7 }), 0, 3.65, front + 0.8, W * 0.92, 0.14, 1.7);
      canopy.rotation.x = 0.18;
      gableRoof(g, W, D, H + 0.3, 2.0, b.roof);
      // 팔레트 & 지게차 느낌의 소품
      add(g, roundedBox(1.1, 0.9, 1.1, 0.08), mat('#d9a066', 0.85), -W / 2 - 0.9, 0, front - 1.2);
      add(g, roundedBox(1.1, 0.9, 1.1, 0.08), mat('#c98f57', 0.85), -W / 2 - 0.9, 0.9, front - 1.2);
    } else {
      for (let y = 1.5, row = 0; y + 0.7 < H - (b.style === 'civic' ? 1.3 : 0.4); y += 2.1, row++) {
        for (let x = -W / 2 + 1.5; x <= W / 2 - 1.4; x += 2.4) {
          if (row === 0 && Math.abs(x) < 2.0) continue;
          windowAt(g, x, y + 0.3, front + 0.1, b.trim, W > 10 ? 1.2 : 0.9);
        }
      }
      // 출입문 (둥근 창 + 문고리) · 계단 · 랜턴 · 차양
      add(g, roundedBox(1.7, doorTop, 0.22, 0.08), mat(shade(b.trim, -0.25), 0.55), 0, 0.2, front + 0.02);
      add(g, cylGeo, glassM(), 0, doorTop - 0.45, front + 0.16, 0.32, 0.06, 0.32, { cast: false }).rotation.x = Math.PI / 2;
      add(g, sphereGeo, mat('#e6bf72', 0.3, { metalness: 0.6 }), 0.55, 1.3, front + 0.18, 0.07, 0.07, 0.07);
      add(g, roundedBox(2.6, 0.2, 1.0, 0.06), mat('#d9cbb5', 0.9), 0, 0, front + 0.5);
      [-1, 1].forEach((s) => {
        const l = add(g, roundedBox(0.3, 0.45, 0.3, 0.06), mat('#fff3c4', 0.3, { emissive: '#ffd77a', emissiveIntensity: 0.5 }), s * 1.25, 2.0, front + 0.2, 1, 1, 1, { cast: false });
        lanterns.push(l);
      });
      const awning = add(g, boxGeo, new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', b.trim), roughness: 0.7 }), 0, doorTop + 0.55, front + 0.6, 2.9, 0.14, 1.2);
      awning.rotation.x = 0.25;

      if (b.style === 'civic') {
        const white = mat('#fbfaf6', 0.6);
        [-W / 2 + 0.9, -1.8, 1.8, W / 2 - 0.9].forEach((x) => {
          add(g, cylGeo, white, x, (H + 0.2) / 2, front + 0.6, 0.26, H + 0.2, 0.26);
          add(g, boxGeo, white, x, 0.25, front + 0.6, 0.7, 0.3, 0.7);
          add(g, boxGeo, white, x, H + 0.15, front + 0.6, 0.65, 0.25, 0.65);
        });
        add(g, roundedBox(W + 0.6, 0.7, 1.6, 0.1), white, 0, H + 0.2, front + 0.1);
        // 지붕 + 앞쪽 삼각 페디먼트
        add(g, roundedBox(W + 0.8, 0.5, D + 0.6, 0.14), mat(b.roof, 0.7), 0, H + 0.85, 0);
        const ped = new THREE.Shape();
        ped.moveTo(-W / 2 - 0.3, 0);
        ped.lineTo(W / 2 + 0.3, 0);
        ped.lineTo(0, 1.6);
        ped.closePath();
        add(g, new THREE.ExtrudeGeometry(ped, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }), white, 0, H + 0.9, front + 0.2);
        add(g, sphereGeo, mat(b.trim, 0.4), 0, H + 1.55, front + 0.88, 0.32, 0.32, 0.08);
        add(g, roundedBox(W * 0.62, 0.22, 1.3, 0.06), white, 0, 0, front + 0.85);
        add(g, roundedBox(W * 0.5, 0.42, 0.8, 0.06), white, 0, 0, front + 0.6);
      } else {
        gableRoof(g, W, D, H + 0.3, 1.9, b.roof);
        // 깃발
        const pole = add(g, cylGeo, mat('#f4f6fa', 0.4), W / 2 + 0.6, 2.4, front - 0.4, 0.06, 4.8, 0.06);
        pole.castShadow = true;
        const flag = new THREE.Group();
        flag.position.set(W / 2 + 0.6, 4.3, front - 0.4);
        g.add(flag);
        add(flag, boxGeo, mat('#f28b6b', 0.7), 0.6, 0, 0, 1.2, 0.75, 0.04);
        flags.push(dyn(flag));
      }
    }

    const signY = b.style === 'civic' ? H + 0.55 : H - 0.55;
    const sign = signPlane(b.label, b.trim, W > 10 ? 1.1 : 0.75);
    sign.position.set(0, signY, front + (b.style === 'civic' ? 0.98 : 0.2));
    g.add(sign);
  }

  /* =========================================================
   * 등대 · 컨테이너 · 크레인 · 선박
   * ========================================================= */
  let lightBeam = null;
  function buildLighthouse(l) {
    const g = new THREE.Group();
    g.position.set(l.x * S, 0, l.y * S);
    scene.add(g);
    add(g, new THREE.CylinderGeometry(1.7, 1.9, 0.6, 24), mat('#d7d2c6', 0.9), 0, 0.3, 0);
    for (let i = 0; i < 5; i++) {
      add(g, new THREE.CylinderGeometry(1.25 - i * 0.12, 1.37 - i * 0.12, 1.6, 24), mat(i % 2 ? '#e8607a' : '#fbfaf6', 0.6), 0, 1.4 + i * 1.6, 0);
    }
    add(g, new THREE.CylinderGeometry(1.15, 1.15, 0.2, 24), mat('#4a3b2a', 0.5), 0, 9.3, 0);
    add(g, new THREE.CylinderGeometry(0.7, 0.7, 1.2, 16), mat('#fff6c8', 0.2, { emissive: '#ffe28a', emissiveIntensity: 0.9 }), 0, 10.0, 0);
    add(g, new THREE.ConeGeometry(0.95, 0.9, 16), mat('#e8607a', 0.5), 0, 11.05, 0);
    lightBeam = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 9, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    );
    lightBeam.geometry.translate(0, -4.5, 0);
    lightBeam.rotation.z = Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(0, 10, 0);
    pivot.add(lightBeam);
    dyn(pivot);
    g.add(pivot);
    lightBeam.userData.pivot = pivot;
  }

  const containerTexCache = new Map();
  function containerSideMat(color) {
    if (!containerTexCache.has(color)) {
      const tex = canvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        for (let x = 6; x < w; x += 14) {
          ctx.fillStyle = 'rgba(40,30,20,0.16)';
          ctx.fillRect(x, 8, 4, h - 16);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x + 5, 8, 3, h - 16);
        }
        ctx.fillStyle = 'rgba(40,30,20,0.28)';
        ctx.fillRect(0, 0, w, 7);
        ctx.fillRect(0, h - 7, w, 7);
      });
      containerTexCache.set(color, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }));
    }
    return containerTexCache.get(color);
  }

  function containerFrontMat(color, code) {
    const tex = canvasTexture(512, 192, (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      for (let x = 8; x < w; x += 18) {
        ctx.fillStyle = 'rgba(40,30,20,0.16)';
        ctx.fillRect(x, 10, 5, h - 20);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x + 6, 10, 4, h - 20);
      }
      ctx.fillStyle = 'rgba(40,30,20,0.28)';
      ctx.fillRect(0, 0, w, 10);
      ctx.fillRect(0, h - 10, w, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `900 46px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, w / 2, h / 2 + 2);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 });
  }

  function buildContainer(c) {
    const W = c.w * S;
    const D = c.h * S;
    const h = 2.4;
    const cx = (c.x + c.w / 2) * S;
    const cz = (c.y + c.h / 2) * S;
    const make = (color, y, code) => {
      const side = containerSideMat(color);
      const top = mat(shade(color, 0.15), 0.6);
      const frontM = code ? containerFrontMat(color, code) : side;
      const m = new THREE.Mesh(boxGeo, [side, side, top, side, frontM, side]);
      m.scale.set(W, h, D);
      m.position.set(cx, y, cz);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    };
    make(c.color, h / 2 + 0.05, c.code);
    if (c.double) make(c.top, h * 1.5 + 0.09, null);
  }

  const spreaders = [];
  function buildCrane(c) {
    const g = new THREE.Group();
    const zf = c.base * S - 0.3;
    const zb = zf - 4.4;
    g.position.set(c.x * S, 0, 0);
    scene.add(g);
    const paint = mat('#f2c14e', 0.5);
    const red = mat('#e8607a', 0.5);
    [-2, 2].forEach((x) => {
      add(g, boxGeo, paint, x, 4.0, zf, 0.45, 10, 0.45);
      add(g, boxGeo, paint, x, 4.0, zb, 0.45, 10, 0.45);
      add(g, boxGeo, red, x, 8.8, (zf + zb) / 2, 0.5, 0.5, 4.9);
      add(g, boxGeo, paint, x, 2.4, (zf + zb) / 2, 0.3, 0.3, 4.6);
    });
    add(g, boxGeo, red, 0, 8.8, zf, 4.5, 0.5, 0.5);
    add(g, boxGeo, red, 0, 8.8, zb, 4.5, 0.5, 0.5);
    [0.58, -0.58].forEach((r) => { add(g, boxGeo, paint, 0, 5.4, zf, 0.25, 6.5, 0.25).rotation.z = r; });
    add(g, boxGeo, paint, 0, 9.5, zf - 5, 0.8, 0.7, 15);
    add(g, roundedBox(1.4, 1.1, 1.4, 0.12), mat('#ffffff', 0.5), 0, 7.7, zf - 1.2);
    add(g, boxGeo, mat('#3a4560', 0.3), 0, 8.3, zf - 0.48, 1.1, 0.35, 0.05, { cast: false });

    const sp = new THREE.Group();
    sp.position.set(0, 9.1, zb - 4);
    g.add(sp);
    add(sp, cylGeo, mat('#3a4560', 0.4), 0, -1.5, 0, 0.03, 3, 0.03);
    add(sp, boxGeo, mat(PALETTE[c.x % PALETTE.length], 0.6), 0, -3.2, 0, 1.6, 0.5, 3.0);
    spreaders.push({ sp: dyn(sp), phase: c.x * 0.01 });
  }

  const ships = [];
  function buildShip(s) {
    const L = s.len * S;
    const B = L * 0.2;
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    scene.add(g);

    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, -B / 2);
    shape.lineTo(L / 2 - B * 0.9, -B / 2);
    shape.quadraticCurveTo(L / 2 + B * 0.35, 0, L / 2 - B * 0.9, B / 2);
    shape.lineTo(-L / 2, B / 2);
    shape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3 });
    hullGeo.rotateX(-Math.PI / 2);
    add(inner, hullGeo, mat(s.hull, 0.5), 0, -1.2, 0);
    add(inner, boxGeo, mat('#e8607a', 0.6), 0, -0.95, 0, L * 0.98, 0.35, B + 0.32, { cast: false });
    add(inner, boxGeo, mat('#d9dde4', 0.8), -0.4, 0.58, 0, L * 0.82, 0.08, B * 0.82, { cast: false });

    const cw = 1.0;
    const cols = Math.floor((L * 0.62) / (cw + 0.08));
    const rows = 3;
    const ch = (B * 0.8) / rows;
    const inst = new THREE.InstancedMesh(boxGeo, mat('#ffffff', 0.6), cols * rows * 2);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    let i = 0;
    for (let cx = 0; cx < cols; cx++) {
      for (let r = 0; r < rows; r++) {
        for (let lv = 0; lv < 2; lv++) {
          const x = -L / 2 + B * 0.95 + cx * (cw + 0.08) + cw / 2;
          const z = -B * 0.4 + ch * r + ch / 2;
          m4.compose(new THREE.Vector3(x, 1.12 + lv * 0.95, z), new THREE.Quaternion(), new THREE.Vector3(cw, 0.9, ch - 0.08));
          inst.setMatrixAt(i, m4);
          inst.setColorAt(i, col.set(PALETTE[(cx * 7 + r * 3 + lv * 5 + Math.round(L)) % PALETTE.length]));
          i += 1;
        }
      }
    }
    inst.castShadow = true;
    inst.receiveShadow = true;
    inner.add(inst);

    const bx = -L / 2 + B * 0.42;
    add(inner, roundedBox(B * 0.55, 2.8, B * 0.9, 0.12), mat('#ffffff', 0.5), bx, 0.6, 0);
    add(inner, boxGeo, mat('#2b3656', 0.3), bx, 2.95, 0, B * 0.57, 0.35, B * 0.92, { cast: false });
    add(inner, cylGeo, mat('#f28b6b', 0.5), bx - 0.25, 4.0, 0, 0.32, 1.1, 0.32);

    if (s.flip) g.rotation.y = Math.PI;
    g.position.set(s.x * S, -0.75, s.y * S);
    ships.push({ s, g: dyn(g), inner });
  }

  /* =========================================================
   * 소품: 나무 · 가로등 · 상자 · 표지판 · 분수 · 텐트 · 벤치 · 게시판 · 부스 · 가랜드
   * ========================================================= */
  function buildTree(t, kind = 'round', scale = 1) {
    const g = new THREE.Group();
    g.position.set(t.x * S, 0, t.y * S);
    g.scale.setScalar(scale);
    g.rotation.y = rand() * Math.PI * 2;
    scene.add(g);
    if (kind === 'cedar') {
      add(g, cylGeo, mat('#8a5a3a', 0.9), 0, 0.5, 0, 0.18, 1, 0.18);
      ['#4f9e6a', '#5aaf74', '#68bf80'].forEach((c, i) => add(g, new THREE.ConeGeometry(1.2 - i * 0.3, 1.6, 10), mat(c, 0.85), 0, 1.5 + i * 0.85, 0));
    } else if (kind === 'palm') {
      for (let i = 0; i < 6; i++) add(g, cylGeo, mat(i % 2 ? '#b8875a' : '#a8754e', 0.9), Math.sin(i * 0.4) * 0.15 * i, 0.35 + i * 0.6, 0, 0.17 - i * 0.012, 0.62, 0.17 - i * 0.012);
      const top = new THREE.Group();
      top.position.set(0.75, 3.7, 0);
      g.add(top);
      for (let k = 0; k < 7; k++) {
        const leaf = add(top, sphereGeo, mat(k % 2 ? '#5fb86c' : '#4fa75e', 0.8), 0, 0, 0, 1.5, 0.08, 0.38);
        leaf.rotation.set(0, (k / 7) * Math.PI * 2, -0.45);
        leaf.position.set(Math.cos((k / 7) * Math.PI * 2) * 0.9, -0.25, -Math.sin((k / 7) * Math.PI * 2) * 0.9);
        leaf.rotation.order = 'YZX';
      }
      add(top, sphereGeo, mat('#7a5233', 0.7), 0, -0.2, 0, 0.22, 0.22, 0.22);
    } else {
      add(g, new THREE.CylinderGeometry(0.16, 0.24, 1, 12), mat('#a8754e', 0.9), 0, 0.7, 0, 1, 1.4, 1);
      const greens = ['#78cb8b', '#6abf80', '#8bd79c', '#7fd093'];
      [[0, 2.0, 0, 1.0], [0.55, 1.7, 0.3, 0.72], [-0.5, 1.75, -0.2, 0.78], [0.1, 2.65, -0.1, 0.66]].forEach(([x, y, z, r], i) =>
        add(g, sphereGeo, mat(greens[i], 0.85), x, y, z, r, r * 0.95, r));
      if (t.fruit) ['#e8505b', '#e8505b', '#e8505b'].forEach((c, i) => add(g, sphereGeo, mat(c, 0.4), Math.cos(i * 2.1) * 0.85, 1.9 + (i % 2) * 0.4, Math.sin(i * 2.1) * 0.85, 0.14, 0.14, 0.14));
    }
  }

  function buildLamp(l) {
    const g = new THREE.Group();
    g.position.set(l.x * S, 0, l.y * S);
    scene.add(g);
    const dark = mat('#4a3b2a', 0.5);
    add(g, cylGeo, dark, 0, 0.15, 0, 0.2, 0.3, 0.2);
    add(g, cylGeo, dark, 0, 1.8, 0, 0.07, 3.4, 0.07);
    add(g, roundedBox(0.5, 0.6, 0.5, 0.08), mat('#fff3c4', 0.3, { emissive: '#ffd77a', emissiveIntensity: 0.55 }), 0, 3.35, 0, 1, 1, 1, { cast: false });
    add(g, new THREE.ConeGeometry(0.45, 0.4, 4), dark, 0, 4.15, 0).rotation.y = Math.PI / 4;
  }

  function buildCrate(c) {
    add(scene, roundedBox(1.35, 1.35, 1.1, 0.08), new THREE.MeshStandardMaterial({ map: stripeTexture('#d9a066', '#c98f57'), roughness: 0.85 }), c.x * S, 0, (c.y - 5) * S);
  }

  function buildSign(s) {
    const g = new THREE.Group();
    g.position.set(s.x * S, 0, s.y * S);
    scene.add(g);
    add(g, cylGeo, mat('#8a5a3a', 0.85), 0, 1.1, 0, 0.09, 2.2, 0.09);
    const board = signPlane(s.text, '#f28b6b', 0.9, 'wood');
    board.position.set(0, 2.25, 0.08);
    g.add(board);
  }

  const drops = [];
  function buildFountain(f) {
    const g = new THREE.Group();
    g.position.set(f.x * S, 0, f.y * S);
    scene.add(g);
    add(g, slab(13, 9, 0.1, 4.5), new THREE.MeshStandardMaterial({ map: floorTexture('tile', '#ebe2cf', 3, 2), roughness: 0.9 }), 0, 0, 0, 1, 1, 1, { cast: false });
    const stone = mat('#fbfaf6', 0.55);
    add(g, new THREE.CylinderGeometry(2.5, 2.7, 0.7, 40), stone, 0, 0.35, 0);
    add(g, new THREE.CylinderGeometry(2.2, 2.2, 0.1, 40), mat('#5cc8e0', 0.15, { metalness: 0.1 }), 0, 0.62, 0, 1, 1, 1, { cast: false });
    add(g, new THREE.CylinderGeometry(0.28, 0.4, 1.8, 20), stone, 0, 1.4, 0);
    add(g, new THREE.CylinderGeometry(1.1, 0.5, 0.4, 32), stone, 0, 2.35, 0);
    add(g, new THREE.CylinderGeometry(0.95, 0.95, 0.06, 32), mat('#5cc8e0', 0.15), 0, 2.56, 0, 1, 1, 1, { cast: false });
    const dropM = mat('#bfe6ff', 0.15, { emissive: '#9fd8ff', emissiveIntensity: 0.25, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 18; i++) {
      const d = add(g, sphereGeo, dropM, 0, 2.6, 0, 0.09, 0.12, 0.09, { cast: false });
      drops.push({ d: dyn(d), a: (i / 18) * Math.PI * 2, p: i / 18 });
    }
    [[-4.6, 0], [4.6, 0]].forEach(([x, z]) => {
      add(g, roundedBox(2.4, 0.45, 1.4, 0.12), mat('#a8754e', 0.9), x, 0, z);
      for (let i = 0; i < 10; i++) add(g, sphereGeo, mat(['#ff8fa3', '#ffd23f', '#ffffff', '#f28b6b', '#b48cff'][i % 5], 0.7), x - 0.9 + (i % 5) * 0.45, 0.6, z + (i < 5 ? -0.3 : 0.3), 0.19, 0.19, 0.19);
    });
  }

  function updateFountain(t) {
    drops.forEach(({ d, a, p }) => {
      const k = (t * 0.6 + p) % 1;
      const r = 0.2 + k * 1.7;
      d.position.set(Math.cos(a) * r, 2.7 + k * 1.6 - k * k * 3.2, Math.sin(a) * r);
    });
  }

  function buildTent(t) {
    const g = new THREE.Group();
    g.position.set(t.x * S, 0, t.y * S);
    scene.add(g);
    const tent = add(g, new THREE.ConeGeometry(2.1, 2.4, 4), mat(t.color, 0.75), 0, 1.2, 0);
    tent.rotation.y = Math.PI / 4;
    const door = new THREE.Shape();
    door.moveTo(-0.6, 0);
    door.lineTo(0.6, 0);
    door.lineTo(0, 1.5);
    door.closePath();
    add(g, new THREE.ShapeGeometry(door), mat('#4a3b2a', 0.9), 0, 0.02, 1.46, 1, 1, 1, { cast: false });
    add(g, cylGeo, mat('#8a5a3a', 0.8), 0, 2.5, 0, 0.05, 0.4, 0.05);
  }

  let fire = null;
  function buildCampfire(c) {
    const g = new THREE.Group();
    g.position.set(c.x * S, 0, c.y * S);
    scene.add(g);
    for (let i = 0; i < 8; i++) add(g, sphereGeo, mat('#9a9389', 0.9), Math.cos((i / 8) * Math.PI * 2) * 0.7, 0.12, Math.sin((i / 8) * Math.PI * 2) * 0.7, 0.2, 0.15, 0.2);
    [0, 1.2, 2.4].forEach((r) => { const log = add(g, cylGeo, mat('#7a5233', 0.9), 0, 0.2, 0, 0.09, 1.0, 0.09); log.rotation.set(Math.PI / 2, r, 0.3); });
    fire = dyn(new THREE.Group());
    g.add(fire);
    [['#ffb347', 0.38, 0.9], ['#ff7a3d', 0.26, 0.65], ['#fff1a8', 0.14, 0.45]].forEach(([c2, r, h]) =>
      add(fire, new THREE.ConeGeometry(r, h, 10), mat(c2, 0.4, { emissive: c2, emissiveIntensity: 0.9 }), 0, 0.3 + h / 2, 0, 1, 1, 1, { cast: false }));
    const glow = new THREE.PointLight('#ffae5c', 0.9, 7, 2);
    glow.position.set(0, 1, 0);
    g.add(glow);
  }

  function buildBench(b) {
    const g = new THREE.Group();
    g.position.set(b.x * S, 0, b.y * S);
    g.rotation.y = b.rot;
    scene.add(g);
    const wood = mat('#b5814f', 0.8);
    const iron = mat('#4a3b2a', 0.5);
    add(g, roundedBox(2.4, 0.14, 0.7, 0.04), wood, 0, 0.55, 0);
    add(g, roundedBox(2.4, 0.5, 0.12, 0.04), wood, 0, 0.75, -0.32);
    [-1, 1].forEach((s) => add(g, boxGeo, iron, s * 1.05, 0.3, 0, 0.1, 0.6, 0.6));
  }

  function buildBoard(b) {
    const g = new THREE.Group();
    g.position.set(b.x * S, 0, b.y * S);
    scene.add(g);
    const wood = mat('#9a6a42', 0.85);
    [-1, 1].forEach((s) => add(g, cylGeo, wood, s * 1.0, 1.0, 0, 0.08, 2.0, 0.08));
    add(g, roundedBox(2.4, 1.4, 0.15, 0.05), wood, 0, 0.9, 0);
    const paper = canvasTexture(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#c99a63';
      ctx.fillRect(0, 0, w, h);
      [['#fffaf0', 14, 14, 110, 70], ['#ffe9a8', 136, 20, 104, 60], ['#d8f0ff', 30, 92, 96, 56], ['#ffd8e0', 140, 90, 100, 58]].forEach(([c, x, y, ww, hh], i) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, ww, hh);
        ctx.fillStyle = 'rgba(74,59,42,0.45)';
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 10, y + 16 + k * 14, ww - 24 - k * 12, 4);
        ctx.fillStyle = '#e8607a';
        circlePath(ctx, x + ww / 2, y + 4, 4 + (i % 2));
        ctx.fill();
      });
    });
    add(g, new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), 0, 1.6, 0.085, 1, 1, 1, { cast: false });
    [1, -1].forEach((s) => {
      const roof = add(g, boxGeo, mat('#d9824a', 0.7), 0, 2.45, s * 0.18, 2.8, 0.1, 0.5);
      roof.rotation.x = s * 0.5;
    });
  }

  function buildBooth(b) {
    const g = new THREE.Group();
    g.position.set(b.x * S, 0, b.y * S);
    scene.add(g);
    const wood = mat('#c9925a', 0.8);
    add(g, roundedBox(3.4, 1.2, 1.4, 0.12), wood, 0, 0, 0.3);
    add(g, roundedBox(3.6, 0.15, 1.6, 0.05), mat('#fffaf0', 0.7), 0, 1.2, 0.3);
    [[-1.6, -0.3], [1.6, -0.3], [-1.6, 0.9], [1.6, 0.9]].forEach(([x, z]) => add(g, cylGeo, mat('#fffaf0', 0.6), x, 1.6, z, 0.07, 3.2, 0.07));
    const awn = add(g, boxGeo, new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', b.color), roughness: 0.7 }), 0, 3.3, 0.35, 3.8, 0.16, 2.0);
    awn.rotation.x = 0.2;
    // 진열 소품
    add(g, roundedBox(0.5, 0.5, 0.5, 0.06), mat(PALETTE[1], 0.6), -0.9, 1.3, 0.3);
    add(g, roundedBox(0.4, 0.7, 0.4, 0.06), mat(PALETTE[3], 0.6), -0.3, 1.3, 0.4);
    add(g, sphereGeo, mat('#7fd3e8', 0.4), 0.8, 1.6, 0.35, 0.3, 0.3, 0.3);
    const sign = signPlane(`${b.icon} ${b.name}`, b.color, 0.7);
    sign.position.set(0, 3.95, 1.25);
    g.add(sign);
    // 앞쪽 발판
    add(g, slab(4.4, 3.2, 0.06, 0.8), mat('#e4cc9c', 0.95), 0, 0, 1.0, 1, 1, 1, { cast: false });
  }

  /** 가로등 사이 깃발 가랜드 */
  function buildBunting() {
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.38, 0], 3));
    flagGeo.computeVertexNormals();
    const flagsPos = [];
    const pairs = [[160, 480], [480, 800], [800, 1120], [1760, 2080]];
    const ropeM = mat('#fffaf0', 0.8);
    pairs.forEach(([a, b]) => {
      const p0 = new THREE.Vector3(a * S, 3.85, 992 * S);
      const p1 = new THREE.Vector3(b * S, 3.85, 992 * S);
      const mid = p0.clone().lerp(p1, 0.5);
      mid.y -= 1.0;
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.03, 5, false), ropeM));
      for (let i = 1; i < 14; i++) flagsPos.push(curve.getPoint(i / 14));
    });
    const inst = new THREE.InstancedMesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7 }), flagsPos.length);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    flagsPos.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, col.set(PALETTE[i % PALETTE.length]));
    });
    inst.castShadow = true;
    scene.add(inst);
  }

  /* =========================================================
   * 자연 산포: 나무 · 덤불 · 꽃 · 풀 · 바위 (시드 고정 랜덤)
   * ========================================================= */
  const scatterObstacles = [];
  function isFree(x, y, pad, extra = []) {
    const inLand = LAND.some((l) => x > l.x + 60 && x < l.x + l.w - 60 && y > l.y + 50 && y < l.y + l.h - 60);
    if (!inLand) return false;
    const blockers = [
      ...ZONES, ...ROADS, ...BUILDINGS,
      { x: FOUNTAIN.x - 160, y: FOUNTAIN.y - 110, w: 320, h: 220 },
      { x: LIGHTHOUSE.x - 50, y: LIGHTHOUSE.y - 50, w: 100, h: 100 },
      { x: SPAWN.x - 80, y: SPAWN.y - 80, w: 160, h: 160 },
      { x: BOARD.x - 40, y: BOARD.y - 30, w: 80, h: 40 },
      ...BOOTHS.map((b) => ({ x: b.x - 70, y: b.y - 50, w: 140, h: 140 })),
      ...TENTS.map((t) => ({ x: t.x - 60, y: t.y - 60, w: 120, h: 120 })),
      { x: CAMPFIRE.x - 30, y: CAMPFIRE.y - 30, w: 60, h: 60 },
      ...extra,
    ];
    return !blockers.some((r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad);
  }

  function scatterNature() {
    const placed = [];
    // 나무
    let tries = 0;
    while (placed.length < 70 && tries < 4000) {
      tries += 1;
      const x = rand() * WORLD.width;
      const y = rand() * WORLD.height;
      if (!isFree(x, y, 26)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 75) || TREES.some((p) => Math.hypot(p.x - x, p.y - y) < 70)) continue;
      const nearBeach = x < 140 || x > 2260 || y > 1480;
      const kind = nearBeach && rand() > 0.35 ? 'palm' : rand() > 0.65 ? 'cedar' : 'round';
      placed.push({ x, y });
      buildTree({ x, y, fruit: kind === 'round' && rand() > 0.6 }, kind, 0.85 + rand() * 0.35);
      scatterObstacles.push({ x: x - 9, y: y - 8, w: 18, h: 10 });
    }

    // 덤불
    const bushPts = [];
    tries = 0;
    while (bushPts.length < 60 && tries < 3000) {
      tries += 1;
      const x = rand() * WORLD.width;
      const y = rand() * WORLD.height;
      if (!isFree(x, y, 12) || placed.some((p) => Math.hypot(p.x - x, p.y - y) < 40)) continue;
      bushPts.push({ x, y, s: 0.5 + rand() * 0.4, flower: rand() > 0.6 });
    }
    const bushInst = new THREE.InstancedMesh(sphereGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), bushPts.length * 3);
    const dotInst = new THREE.InstancedMesh(sphereGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), bushPts.length * 4);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    let bi = 0;
    let di = 0;
    bushPts.forEach((b) => {
      [[0, 0.5, 0, 0.75], [0.55, 0.38, 0.2, 0.55], [-0.5, 0.4, -0.1, 0.6]].forEach(([dx, dy, dz, r]) => {
        m4.compose(new THREE.Vector3(b.x * S + dx * b.s, dy * b.s, b.y * S + dz * b.s), q, new THREE.Vector3(r * b.s, r * b.s * 0.85, r * b.s));
        bushInst.setMatrixAt(bi, m4);
        bushInst.setColorAt(bi, col.set(['#6abf80', '#5aaf74', '#7fd093'][bi % 3]));
        bi += 1;
      });
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7;
        const visible = b.flower ? 1 : 0;
        m4.compose(new THREE.Vector3(b.x * S + Math.cos(a) * 0.5 * b.s, (0.55 + (k % 2) * 0.25) * b.s, b.y * S + Math.sin(a) * 0.5 * b.s + 0.25), q, new THREE.Vector3(0.1 * visible, 0.1 * visible, 0.1 * visible));
        dotInst.setMatrixAt(di, m4);
        dotInst.setColorAt(di, col.set(['#ff8fa3', '#ffffff', '#ffd23f'][Math.floor(b.x) % 3]));
        di += 1;
      }
    });
    bushInst.castShadow = true;
    bushInst.receiveShadow = true;
    scene.add(bushInst, dotInst);

    // 꽃 (줄기 + 꽃송이)
    const flowers = [];
    tries = 0;
    while (flowers.length < 420 && tries < 8000) {
      tries += 1;
      // 꽃밭처럼 군집으로
      const cx = rand() * WORLD.width;
      const cy = rand() * WORLD.height;
      const n = 4 + Math.floor(rand() * 6);
      const c = ['#ff6f91', '#ffd23f', '#ffffff', '#ff9a3d', '#b48cff', '#ff4f6a'][Math.floor(rand() * 6)];
      for (let k = 0; k < n; k++) {
        const x = cx + (rand() - 0.5) * 60;
        const y = cy + (rand() - 0.5) * 40;
        if (isFree(x, y, 6)) flowers.push({ x, y, c });
      }
    }
    const stemInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), mat('#4f9e5a', 0.9), flowers.length);
    const headGeo = new THREE.SphereGeometry(1, 8, 6);
    const headInst = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), flowers.length);
    flowers.forEach((f, i) => {
      m4.compose(new THREE.Vector3(f.x * S, 0.25, f.y * S), q, new THREE.Vector3(1, 1, 1));
      stemInst.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(f.x * S, 0.52, f.y * S), q, new THREE.Vector3(0.13, 0.1, 0.13));
      headInst.setMatrixAt(i, m4);
      headInst.setColorAt(i, col.set(f.c));
    });
    scene.add(stemInst, headInst);

    // 풀 무더기
    const tufts = [];
    tries = 0;
    while (tufts.length < 900 && tries < 6000) {
      tries += 1;
      const x = rand() * WORLD.width;
      const y = rand() * WORLD.height;
      if (isFree(x, y, 4)) tufts.push({ x, y, r: rand() * Math.PI, s: 0.6 + rand() * 0.6 });
    }
    const tuftInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.4, 3), mat('#5fa857', 0.95), tufts.length * 3);
    const e = new THREE.Euler();
    let ti = 0;
    tufts.forEach((t) => {
      for (let k = 0; k < 3; k++) {
        e.set((k - 1) * 0.35, t.r, 0);
        q.setFromEuler(e);
        m4.compose(new THREE.Vector3(t.x * S + (k - 1) * 0.08, 0.18 * t.s, t.y * S), q, new THREE.Vector3(t.s, t.s, t.s));
        tuftInst.setMatrixAt(ti++, m4);
      }
    });
    scene.add(tuftInst);

    // 바위
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0, n = 0; i < 400 && n < 16; i++) {
      const x = rand() * WORLD.width;
      const y = rand() * WORLD.height;
      if (!isFree(x, y, 20)) continue;
      n += 1;
      const s = 0.4 + rand() * 0.5;
      const r = add(scene, rockGeo, new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.9, flatShading: true }), x * S, s * 0.4, y * S, s, s * 0.7, s);
      r.rotation.y = rand() * 3;
      scatterObstacles.push({ x: x - s * 16, y: y - s * 12, w: s * 32, h: s * 16 });
    }
  }

  /* =========================================================
   * 움직이는 생명체: 나비 · 갈매기 · 구름
   * ========================================================= */
  const butterflies = [];
  const gulls = [];
  const clouds = [];
  function buildCritters() {
    const wingGeo = new THREE.CircleGeometry(0.22, 10);
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const c = ['#ffd23f', '#ffffff', '#ff8fa3', '#9fd8ff'][i % 4];
      const wm = new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6 });
      const wings = [-1, 1].map((s) => {
        const pivot = new THREE.Group();
        g.add(pivot);
        const w = new THREE.Mesh(wingGeo, wm);
        w.position.set(s * 0.2, 0, 0);
        w.rotation.x = -Math.PI / 2;
        pivot.add(w);
        return pivot;
      });
      scene.add(g);
      butterflies.push({ g: dyn(g), wings, cx: (300 + rand() * 1800) * S, cz: (500 + rand() * 1000) * S, r: 2 + rand() * 4, sp: 0.3 + rand() * 0.4, ph: rand() * 10 });
    }

    const gullBody = new THREE.SphereGeometry(0.3, 10, 8);
    const gullWing = new THREE.BoxGeometry(1.2, 0.05, 0.35);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      add(g, gullBody, mat('#ffffff', 0.6), 0, 0, 0, 1, 0.8, 1.6, { cast: false });
      const wings = [-1, 1].map((s) => {
        const pivot = new THREE.Group();
        g.add(pivot);
        add(pivot, gullWing, mat(i % 2 ? '#ffffff' : '#e9edf3', 0.6), s * 0.65, 0, 0, 1, 1, 1, { cast: false });
        return pivot;
      });
      scene.add(g);
      gulls.push({ g: dyn(g), wings, cx: (200 + rand() * 2000) * S, cz: rand() * 6, r: 6 + rand() * 8, y: 9 + rand() * 4, sp: 0.25 + rand() * 0.2, ph: rand() * 10 });
    }

    const cloudM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 5; k++) add(g, sphereGeo, cloudM, (k - 2) * 1.6 + rand(), rand() * 0.8, rand() * 1.5, 1.6 + rand() * 1.4, 1.1 + rand() * 0.6, 1.4 + rand(), { cast: false, receive: false });
      g.position.set(-40 + rand() * 200, 26 + rand() * 10, -40 + rand() * 110);
      scene.add(g);
      clouds.push({ g: dyn(g), v: 0.6 + rand() * 0.8 });
    }
  }

  function updateCritters(t, dt) {
    butterflies.forEach((b) => {
      const a = t * b.sp + b.ph;
      b.g.position.set(b.cx + Math.cos(a) * b.r, 1.2 + Math.sin(t * 2 + b.ph) * 0.5, b.cz + Math.sin(a * 1.3) * b.r * 0.6);
      b.g.rotation.y = -a;
      const flap = Math.sin(t * 18 + b.ph) * 0.9;
      b.wings[0].rotation.z = flap;
      b.wings[1].rotation.z = -flap;
    });
    gulls.forEach((s) => {
      const a = t * s.sp + s.ph;
      s.g.position.set(s.cx + Math.cos(a) * s.r, s.y + Math.sin(t + s.ph) * 0.4, s.cz + Math.sin(a) * s.r * 0.5);
      s.g.rotation.y = -a + Math.PI;
      const flap = Math.sin(t * 6 + s.ph) * 0.35;
      s.wings[0].rotation.z = flap;
      s.wings[1].rotation.z = -flap;
    });
    clouds.forEach((c) => {
      c.g.position.x += c.v * dt;
      if (c.g.position.x > 170) c.g.position.x = -50;
    });
  }

  /* =========================================================
   * 게임 상태 (캐릭터)
   * ========================================================= */
  const npcs = NPC_DATA.map((d) => new NPC(d));
  const walkers = WALKER_DATA.map((d, i) => new Walker(d, WALKER_TIPS[i % WALKER_TIPS.length]));
  const actors = [...npcs, ...walkers];
  const interactables = [...npcs, ...BOOTHS];
  const player = new Player(SPAWN.x, SPAWN.y);
  const input = new Input();
  const dialog = new DialogBox();
  input.bindDpad(document.getElementById('dpad'));
  actors.forEach((a) => scene.add(dyn(a.rig.root)));
  scene.add(dyn(player.rig.root));
  [player, ...actors].forEach((a) => a.rig.root.traverse((o) => { if (o.isMesh && o.castShadow) o.receiveShadow = false; }));

  const state = { started: false, completeShown: false };
  let badges = new Set();
  let near = null;
  let time = 0;
  let last = performance.now();
  let cssW = 0;
  let cssH = 0;
  let currentZone = '';

  // 고정 충돌 장애물 (발밑 기준 풋프린트, px)
  const obstacles = [
    ...WATER,
    ...BUILDINGS.map(({ x, y, w, h, style }) => ({ x: x - 6, y, w: w + 12, h: h + (style === 'civic' ? 22 : 8) })),
    ...CONTAINERS.map(({ x, y, w, h }) => ({ x, y, w, h })),
    ...TREES.map((t) => ({ x: t.x - 9, y: t.y - 8, w: 18, h: 10 })),
    ...LAMPS.map((l) => ({ x: l.x - 6, y: l.y - 6, w: 12, h: 8 })),
    ...CRATES.map((c) => ({ x: c.x - 14, y: c.y - 16, w: 28, h: 22 })),
    ...CRANES.flatMap((c) => [{ x: c.x - 46, y: c.base - 14, w: 12, h: 12 }, { x: c.x + 34, y: c.base - 14, w: 12, h: 12 }]),
    ...SIGNS.map((s) => ({ x: s.x - 6, y: s.y - 6, w: 12, h: 8 })),
    { x: FOUNTAIN.x - 50, y: FOUNTAIN.y - 44, w: 100, h: 90 },
    { x: FOUNTAIN.x - 116, y: FOUNTAIN.y - 16, w: 48, h: 30 },
    { x: FOUNTAIN.x + 68, y: FOUNTAIN.y - 16, w: 48, h: 30 },
    { x: LIGHTHOUSE.x - 36, y: LIGHTHOUSE.y - 36, w: 72, h: 60 },
    ...TENTS.map((t) => ({ x: t.x - 42, y: t.y - 42, w: 84, h: 72 })),
    { x: CAMPFIRE.x - 16, y: CAMPFIRE.y - 16, w: 32, h: 26 },
    ...BENCHES.map((b) => ({ x: b.x - 24, y: b.y - 10, w: 48, h: 16 })),
    { x: BOARD.x - 26, y: BOARD.y - 6, w: 52, h: 8 },
    ...BOOTHS.map((b) => ({ x: b.x - 36, y: b.y - 14, w: 72, h: 36 })),
    // 자연 산포 장애물(나무·바위)은 buildWorld() 에서 추가됩니다.
  ];

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const actorWorld = {
    blocked(nx, ny, self) {
      if (nx < 30 || ny < 60 || nx > WORLD.width - 30 || ny > WORLD.height - 10) return true;
      const b = { x: nx - 13, y: ny - 10, w: 26, h: 12 };
      if (obstacles.some((o) => overlap(b, o))) return true;
      if (overlap(b, player.getBox())) return true;
      return actors.some((a) => a !== self && overlap(b, a.box));
    },
  };

  /* =========================================================
   * 카메라
   * ========================================================= */
  function resize() {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / Math.max(1, cssH);
    screenZoom = cssW < 640 ? 1.3 : cssW / Math.max(1, cssH) < 1 ? 1.2 : 1;
    camera.updateProjectionMatrix();
    sizeMinimap();
    updateCamera(0, true);
  }

  function updateCamera(dt, snap) {
    const tx = Math.min(WORLD.width * S - 6, Math.max(6, player.x * S));
    const tz = Math.min(WORLD.height * S - 4, Math.max(8, player.y * S));
    if (snap) camTarget.set(tx, 0, tz);
    else {
      const k = 1 - Math.exp(-dt * 6);
      camTarget.x += (tx - camTarget.x) * k;
      camTarget.z += (tz - camTarget.z) * k;
    }
    camera.position.copy(camTarget).addScaledVector(CAM_OFFSET, camZoom * screenZoom);
    camera.lookAt(camTarget.x, 1.2, camTarget.z);
    sun.position.set(camTarget.x - 18, 34, camTarget.z + 16);
    sun.target.position.copy(camTarget);
  }

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camZoom = Math.min(1.6, Math.max(0.55, camZoom * (e.deltaY > 0 ? 1.08 : 0.93)));
  }, { passive: false });

  const _v = new THREE.Vector3();
  function toScreen(x, y, z) {
    _v.set(x, y, z).project(camera);
    return { x: (_v.x * 0.5 + 0.5) * cssW, y: (-_v.y * 0.5 + 0.5) * cssH, front: _v.z < 1 };
  }

  /* =========================================================
   * 이름표 · 말풍선 오버레이 (DOM)
   * ========================================================= */
  const labelLayer = document.getElementById('labels');
  interactables.forEach((n) => {
    const el = document.createElement('div');
    el.className = `npc-label ${n.kind === 'game' ? 'booth' : ''}`;
    el.style.setProperty('--c', n.color);
    el.innerHTML = n.kind === 'game'
      ? `<span class="marker">${n.icon}</span><span class="name">${n.name}</span>`
      : `<span class="marker">!</span><span class="name"><i></i>${n.name}</span>`;
    labelLayer.appendChild(el);
    n.labelEl = el;
    n.markerEl = el.querySelector('.marker');
  });
  walkers.forEach((w) => {
    const el = document.createElement('div');
    el.className = 'walker-tip';
    labelLayer.appendChild(el);
    w.tipEl = el;
  });

  function placeEl(el, p) {
    el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  function updateLabels() {
    const nearObj = near ? near.npc : null;
    interactables.forEach((n) => {
      const h = n.kind === 'game' ? 4.9 : 3.45;
      const p = toScreen(n.x * S, h, n.y * S);
      const show = p.front && !n.talking && p.x > -100 && p.x < cssW + 100 && p.y > -60 && p.y < cssH + 160;
      n.labelEl.classList.toggle('hidden', !show);
      if (!show) return;
      placeEl(n.labelEl, p);
      const done = n.kind === 'game' ? badges.has(n.gameId) : n.met;
      n.labelEl.classList.toggle('met', done);
      n.labelEl.classList.toggle('near', n === nearObj);
      if (n.kind !== 'game') n.markerEl.textContent = n.met ? '✓' : '!';
    });
    walkers.forEach((w) => {
      const show = w.near && state.started && !dialog.isOpen && !games.isOpen;
      w.tipEl.classList.toggle('show', show);
      if (show) {
        const html = `<b class="who">${w.name}</b>${w.tip}`;
        if (w.tipEl.dataset.html !== html) {
          w.tipEl.innerHTML = html;
          w.tipEl.dataset.html = html;
        }
        placeEl(w.tipEl, toScreen(w.x * S, 3.2, w.y * S));
      }
    });
  }

  /* =========================================================
   * 미니맵 (2D)
   * ========================================================= */
  const minimapCard = document.getElementById('minimap-card');
  const mmCanvas = document.getElementById('minimap');
  const mmCtx = mmCanvas.getContext('2d');
  const mmStatic = document.createElement('canvas');
  const mm = { w: 0, h: 0, s: 0, dpr: 1 };
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const _hit = new THREE.Vector3();

  function sizeMinimap() {
    const w = mmCanvas.clientWidth;
    if (!w) return;
    const h = Math.round((w * WORLD.height) / WORLD.width);
    mm.dpr = Math.min(window.devicePixelRatio || 1, 2);
    mmCanvas.style.height = `${h}px`;
    mmCanvas.width = Math.round(w * mm.dpr);
    mmCanvas.height = Math.round(h * mm.dpr);
    mm.w = w;
    mm.h = h;
    mm.s = w / WORLD.width;
    buildMinimapStatic();
  }

  function buildMinimapStatic() {
    mmStatic.width = mmCanvas.width;
    mmStatic.height = mmCanvas.height;
    const c = mmStatic.getContext('2d');
    c.setTransform(mm.dpr * mm.s, 0, 0, mm.dpr * mm.s, 0, 0);
    c.fillStyle = '#5fc1dc';
    c.fillRect(0, 0, WORLD.width, WORLD.height);
    c.fillStyle = '#f3e2b6';
    LAND.forEach((l) => c.fillRect(l.x, l.y, l.w, l.h));
    c.fillStyle = '#8ccc6a';
    LAND.forEach((l) => c.fillRect(l.x + 36, l.y + 10, l.w - 72, l.h - 50));
    ZONES.forEach((z) => {
      c.fillStyle = z.color;
      rrPath(c, z.x, z.y, z.w, z.h, 40);
      c.fill();
    });
    c.fillStyle = '#e4cc9c';
    ROADS.forEach((r) => c.fillRect(r.x, r.y, r.w, r.h));
    BUILDINGS.forEach((b) => {
      c.fillStyle = b.roof;
      rrPath(c, b.x, b.y, b.w, b.h, 24);
      c.fill();
    });
    CONTAINERS.forEach((ct) => {
      c.fillStyle = ct.color;
      c.fillRect(ct.x, ct.y, ct.w, ct.h);
    });
    c.fillStyle = '#5fb86c';
    TREES.forEach((t) => { circlePath(c, t.x, t.y - 10, 22); c.fill(); });
    c.fillStyle = '#ffffff';
    circlePath(c, FOUNTAIN.x, FOUNTAIN.y, 56);
    c.fill();
    c.fillStyle = '#5fc1dc';
    circlePath(c, FOUNTAIN.x, FOUNTAIN.y, 42);
    c.fill();
    c.fillStyle = '#e8607a';
    circlePath(c, LIGHTHOUSE.x, LIGHTHOUSE.y, 34);
    c.fill();
  }

  function drawMinimap() {
    if (!mm.w || minimapCard.classList.contains('collapsed')) return;
    mmCtx.setTransform(1, 0, 0, 1, 0, 0);
    mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);
    mmCtx.drawImage(mmStatic, 0, 0);
    mmCtx.setTransform(mm.dpr, 0, 0, mm.dpr, 0, 0);

    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
      raycaster.setFromCamera({ x, y }, camera);
      return raycaster.ray.intersectPlane(groundPlane, _hit) ? { x: (_hit.x / S) * mm.s, y: (_hit.z / S) * mm.s } : null;
    });
    if (pts.every(Boolean)) {
      mmCtx.beginPath();
      pts.forEach((p, i) => (i ? mmCtx.lineTo(p.x, p.y) : mmCtx.moveTo(p.x, p.y)));
      mmCtx.closePath();
      mmCtx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      mmCtx.fill();
      mmCtx.strokeStyle = 'rgba(74, 59, 42, 0.7)';
      mmCtx.lineWidth = 1.2;
      mmCtx.setLineDash([3, 2]);
      mmCtx.stroke();
      mmCtx.setLineDash([]);
    }

    BOOTHS.forEach((b) => {
      mmCtx.fillStyle = badges.has(b.gameId) ? '#ffffff' : b.color;
      mmCtx.strokeStyle = INK;
      mmCtx.lineWidth = 1.2;
      mmCtx.beginPath();
      mmCtx.rect(b.x * mm.s - 3.5, b.y * mm.s - 3.5, 7, 7);
      mmCtx.fill();
      mmCtx.stroke();
    });

    npcs.forEach((n) => {
      const x = n.x * mm.s;
      const y = n.y * mm.s;
      if (!n.met) {
        mmCtx.fillStyle = n.color;
        mmCtx.globalAlpha = 0.35 + Math.sin(time * 4) * 0.15;
        circlePath(mmCtx, x, y, 8);
        mmCtx.fill();
        mmCtx.globalAlpha = 1;
      }
      mmCtx.fillStyle = n.met ? '#ffffff' : n.color;
      mmCtx.strokeStyle = INK;
      mmCtx.lineWidth = 1.4;
      circlePath(mmCtx, x, y, 4.5);
      mmCtx.fill();
      mmCtx.stroke();
    });

    const px = player.x * mm.s;
    const py = player.y * mm.s;
    mmCtx.fillStyle = '#ff5d73';
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 2;
    circlePath(mmCtx, px, py, 4.5);
    mmCtx.fill();
    mmCtx.stroke();
  }

  /* =========================================================
   * HUD · 진행도 · 배지 · 토스트 · 안내
   * ========================================================= */
  const metCountEl = document.getElementById('met-count');
  const metTotalEl = document.getElementById('met-total');
  const progressFillEl = document.getElementById('progress-fill');
  const chipsEl = document.getElementById('npc-chips');
  const badgeEl = document.getElementById('badge-chips');
  const badgeCountEl = document.getElementById('badge-count');
  const zoneNameEl = document.getElementById('zone-name');
  const hintEl = document.getElementById('interact-hint');
  const hintInner = document.getElementById('hint-inner');
  const arrowEl = document.getElementById('guide-arrow');
  const arrowIcon = arrowEl.querySelector('.ga-icon');
  const arrowTip = arrowEl.querySelector('.ga-tip');
  const toastEl = document.getElementById('toast');
  const introEl = document.getElementById('intro');
  const completeEl = document.getElementById('complete');
  const guideEl = document.getElementById('guide');
  const soundBtn = document.getElementById('sound-btn');
  let hintTarget = null;
  let toastTimer = null;

  const games = new MiniGames({
    onFinish: (id, passed) => {
      if (!passed || badges.has(id)) return;
      badges.add(id);
      saveProgress();
      renderProgress();
      toast(`🏅 <b>${MINIGAME_META[id].title}</b> 배지 획득! (${badges.size}/${BOOTHS.length})`);
    },
  });

  const chipEls = npcs.map((n, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = n.icon;
    btn.style.setProperty('--chip-color', n.color);
    btn.title = `${i + 1}. ${n.name} (${n.species}) — ${n.topic} · ${n.zone}`;
    btn.setAttribute('aria-label', btn.title);
    btn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      toast(`📍 <b>${n.name}</b>은(는) <b>${n.zone}</b>에 있어요 · ${n.topic}`);
    });
    li.appendChild(btn);
    chipsEl.appendChild(li);
    return btn;
  });

  const badgeEls = BOOTHS.map((b) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip badge';
    btn.textContent = b.icon;
    btn.style.setProperty('--chip-color', b.color);
    btn.title = `🎮 ${b.name}`;
    btn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      toast(`🎮 <b>${b.name}</b> 부스를 찾아가 보세요! 미니맵의 네모 표시예요.`);
    });
    li.appendChild(btn);
    badgeEl.appendChild(li);
    return { btn, id: b.gameId };
  });

  const metCount = () => npcs.filter((n) => n.met).length;

  function renderProgress() {
    const met = metCount();
    metCountEl.textContent = met;
    metTotalEl.textContent = npcs.length;
    progressFillEl.style.width = `${(met / npcs.length) * 100}%`;
    chipEls.forEach((el, i) => el.classList.toggle('met', npcs[i].met));
    badgeEls.forEach(({ btn, id }) => btn.classList.toggle('met', badges.has(id)));
    badgeCountEl.textContent = badges.size;
  }

  function toast(html, ms = 3000) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function loadProgress() {
    try {
      const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(ids)) npcs.forEach((n) => { n.met = ids.includes(n.id); });
      const b = JSON.parse(localStorage.getItem(BADGE_KEY) || '[]');
      if (Array.isArray(b)) badges = new Set(b);
    } catch (_) { /* 저장소를 쓸 수 없는 환경이면 무시 */ }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(npcs.filter((n) => n.met).map((n) => n.id)));
      localStorage.setItem(BADGE_KEY, JSON.stringify([...badges]));
    } catch (_) { /* 무시 */ }
  }

  function updateHint() {
    const target = state.started && !dialog.isOpen && !games.isOpen && near ? near.npc : null;
    if (!target) {
      hintEl.classList.add('hidden');
      hintTarget = null;
      return;
    }
    if (hintTarget !== target) {
      hintTarget = target;
      hintInner.innerHTML = target.kind === 'game'
        ? `<b>${target.icon} ${target.name}</b><kbd>Space</kbd> 또는 <kbd>Enter</kbd> 로 게임 시작`
        : `<b>${target.name}</b><kbd>Space</kbd> 또는 <kbd>Enter</kbd> 를 눌러 대화하기`;
    }
    placeEl(hintEl, toScreen(target.x * S, target.kind === 'game' ? 6.2 : 4.6, target.y * S));
    hintEl.classList.remove('hidden');
  }

  function updateGuideArrow() {
    let target = null;
    let best = Infinity;
    if (state.started && !dialog.isOpen && !games.isOpen) {
      npcs.forEach((n) => {
        if (n.met) return;
        const d = n.distanceTo(player.x, player.y);
        if (d < best) { best = d; target = n; }
      });
    }
    if (!target) { arrowEl.classList.add('hidden'); return; }

    const p = toScreen(target.x * S, 1.5, target.y * S);
    const left = 44;
    const right = cssW - 44;
    const top = cssW < 640 ? 170 : 160;
    const bottom = cssH - 44;
    if (p.front && p.x > left && p.x < right && p.y > top && p.y < bottom) { arrowEl.classList.add('hidden'); return; }

    const cx = cssW / 2;
    const cy = (top + bottom) / 2;
    let ang = Math.atan2(p.y - cy, p.x - cx);
    if (!p.front) ang += Math.PI;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const tx = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity;
    const ty = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity;
    const t = Math.min(tx, ty);
    arrowEl.classList.remove('hidden');
    arrowEl.style.transform = `translate3d(${(cx + dx * t).toFixed(1)}px, ${(cy + dy * t).toFixed(1)}px, 0) translate(-50%, -50%)`;
    arrowEl.style.setProperty('--angle', `${ang}rad`);
    arrowEl.style.setProperty('--c', target.color);
    if (arrowIcon.textContent !== target.icon) {
      arrowIcon.textContent = target.icon;
      arrowTip.textContent = target.name;
    }
  }

  function updateZoneLabel() {
    const z = ZONES.find((zz) => player.x >= zz.x && player.x <= zz.x + zz.w && player.y >= zz.y && player.y <= zz.y + zz.h);
    const onRoad = ROADS.some((r) => player.x >= r.x && player.x <= r.x + r.w && player.y >= r.y && player.y <= r.y + r.h);
    const plaza = Math.hypot(player.x - FOUNTAIN.x, player.y - FOUNTAIN.y) < 220;
    const name = z ? z.name : plaza ? '분수 광장' : onRoad ? '섬 중앙길' : '무역섬';
    if (name !== currentZone) {
      currentZone = name;
      zoneNameEl.textContent = `📍 ${name}`;
    }
  }

  function syncSoundBtn() {
    soundBtn.textContent = gameAudio.muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', gameAudio.muted ? '소리 켜기' : '소리 끄기');
    soundBtn.classList.toggle('off', gameAudio.muted);
  }

  /* =========================================================
   * 대화 · 미니게임 · 시작 · 수료
   * ========================================================= */
  function openDialog(npc) {
    app.classList.add('dialog-open');
    npc.talking = true;
    dialog.open(npc, {
      onComplete: (n) => {
        if (n.met) return;
        n.met = true;
        saveProgress();
        renderProgress();
        gameAudio.coin();
        toast(`🎉 <b>${n.name}</b>님과의 학습 완료! 만난 무역 전문가 ${metCount()}/${npcs.length}`);
      },
      onClose: (n) => {
        n.talking = false;
        app.classList.remove('dialog-open');
        if (metCount() === npcs.length && !state.completeShown) {
          state.completeShown = true;
          setTimeout(showComplete, 350);
        }
      },
    });
  }

  function interact(target) {
    if (target.kind === 'game') games.open(target.gameId);
    else openDialog(target);
  }

  function startGame() {
    gameAudio.start();
    syncSoundBtn();
    if (state.started) return;
    state.started = true;
    introEl.classList.add('hidden');
    const met = metCount();
    toast(met
      ? `다시 오신 걸 환영해요! 지금까지 ${met}/${npcs.length}명을 만났어요 🌴`
      : '방향키로 걸어가 머리 위에 <b>!</b> 가 있는 주민을 찾아보세요 🧭');
  }

  function showComplete() {
    gameAudio.fanfare();
    document.getElementById('summary-list').innerHTML = npcs
      .map((n) => `<li><span class="ico">${n.icon}</span><span>${n.topic}<small>${n.name} (${n.species}) · ${n.zone}</small></span></li>`)
      .join('');
    completeEl.classList.remove('hidden');
  }

  const hideComplete = () => completeEl.classList.add('hidden');
  const isCompleteVisible = () => !completeEl.classList.contains('hidden');

  function resetProgress() {
    npcs.forEach((n) => { n.met = false; });
    badges = new Set();
    saveProgress();
    renderProgress();
    state.completeShown = false;
    player.setPosition(SPAWN.x, SPAWN.y);
    updateCamera(0, true);
    hideComplete();
    toast('처음부터 다시 시작해요! 섬을 둘러보세요 🌴');
  }

  function primaryAction() {
    if (!state.started) return startGame();
    if (isCompleteVisible()) return hideComplete();
    if (dialog.isOpen) return dialog.advance();
    if (near) return interact(near.npc);
    return null;
  }

  /* =========================================================
   * 이벤트 바인딩
   * ========================================================= */
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const code = e.code;

    if (games.isOpen) {
      if (code === 'Escape') games.close();
      return; // 미니게임 중에는 버튼 조작에 맡김
    }
    if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') {
      e.preventDefault();
      if (e.repeat) return;
      if (code === 'Space' && state.started && !dialog.isOpen && !isCompleteVisible() && !near) {
        player.jump();
        gameAudio.jump();
      } else primaryAction();
      return;
    }
    if (code === 'Escape') {
      if (dialog.isOpen) dialog.close();
      else if (isCompleteVisible()) hideComplete();
      return;
    }
    if (dialog.isOpen) {
      if (code === 'ArrowRight') { e.preventDefault(); if (!e.repeat) dialog.advance(); }
      if (code === 'ArrowLeft') { e.preventDefault(); if (!e.repeat) dialog.prev(); }
      return;
    }
    if (code === 'KeyM') minimapCard.classList.toggle('collapsed');
    if (code === 'KeyH') guideEl.classList.toggle('collapsed');
  });

  document.getElementById('start-btn').addEventListener('click', (e) => { e.currentTarget.blur(); startGame(); });
  document.getElementById('continue-btn').addEventListener('click', (e) => { e.currentTarget.blur(); hideComplete(); });
  document.getElementById('reset-btn').addEventListener('click', (e) => { e.currentTarget.blur(); resetProgress(); });
  document.getElementById('action-btn').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (state.started && !near && !dialog.isOpen && !isCompleteVisible()) player.jump();
    else primaryAction();
  });
  soundBtn.addEventListener('click', (e) => {
    e.currentTarget.blur();
    gameAudio.start();
    gameAudio.toggle();
    syncSoundBtn();
  });
  hintEl.addEventListener('click', () => { if (near && !dialog.isOpen) interact(near.npc); });
  window.addEventListener('resize', resize);

  /* =========================================================
   * 게임 루프
   * ========================================================= */
  function update(dt) {
    const canMove = state.started && !dialog.isOpen && !games.isOpen && !isCompleteVisible();
    player.update(dt, canMove ? input : null, WORLD, obstacles, actors.map((a) => a.box));
    actors.forEach((a) => a.update(dt, player, actorWorld));
    dialog.update(dt);

    updateWater(time);
    ships.forEach(({ s, g, inner }) => {
      if (s.vx) {
        s.x += s.vx * dt;
        if (s.x > WORLD.width + 400) s.x = -400;
        if (s.x < -400) s.x = WORLD.width + 400;
        g.position.x = s.x * S;
      }
      inner.position.y = Math.sin(time * 1.3 + s.phase) * 0.1;
      inner.rotation.x = Math.sin(time * 1.1 + s.phase) * 0.02;
    });
    spreaders.forEach(({ sp, phase }) => { sp.position.y = 9.1 + Math.sin(time * 0.7 + phase) * 1.2; });
    flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 3 + i) * 0.25; });
    if (lightBeam) lightBeam.userData.pivot.rotation.y = time * 0.8;
    if (fire) fire.children.forEach((f, i) => { f.scale.y = 1 + Math.sin(time * 12 + i * 2) * 0.15; });
    updateFountain(time);
    updateCritters(time, dt);

    near = state.started && !dialog.isOpen && !games.isOpen ? findNearestNPC(interactables, player.x, player.y, INTERACT_RADIUS) : null;
    updateCamera(dt, false);
    updateLabels();
    updateHint();
    updateGuideArrow();
    updateZoneLabel();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    update(dt);
    renderer.render(scene, camera);
    drawMinimap();
    requestAnimationFrame(frame);
  }

  /* =========================================================
   * 초기화 (간판 글꼴을 먼저 불러온 뒤 월드 생성)
   * ========================================================= */
  function buildWorld() {
    buildSky();
    buildTerrain();
    BUILDINGS.forEach(buildBuilding);
    CONTAINERS.forEach(buildContainer);
    TREES.forEach((t, i) => buildTree({ ...t, fruit: i % 3 === 0 }, 'round', 1));
    LAMPS.forEach(buildLamp);
    CRATES.forEach(buildCrate);
    CRANES.forEach(buildCrane);
    SHIPS.forEach(buildShip);
    SIGNS.forEach(buildSign);
    buildFountain(FOUNTAIN);
    buildLighthouse(LIGHTHOUSE);
    TENTS.forEach(buildTent);
    buildCampfire(CAMPFIRE);
    BENCHES.forEach(buildBench);
    buildBoard(BOARD);
    BOOTHS.forEach(buildBooth);
    buildBunting();
    scatterNature();
    obstacles.push(...scatterObstacles);
    buildCritters();
    bakeStatic(scene);
  }

  function init() {
    buildWorld();
    loadProgress();
    state.completeShown = metCount() === npcs.length;
    renderProgress();
    syncSoundBtn();
    if (metCount() > 0 || badges.size > 0) document.getElementById('start-btn').textContent = '이어서 탐험하기 🌴';
    resize();
    requestAnimationFrame((now) => {
      last = now;
      frame(now);
    });
  }

  const glyphs = [
    ...BUILDINGS.map((b) => b.label), ...ZONES.map((z) => z.label), ...SIGNS.map((s) => s.text),
    ...BOOTHS.map((b) => b.name), 'TPCU HLXU MSKU KMTU 0123456789',
  ].join(' ');
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load(`800 64px ${FONT}`, glyphs), document.fonts.load(`900 46px ${FONT}`, glyphs)])
    : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).catch(() => {}).then(init);
})();
