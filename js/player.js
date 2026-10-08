/**
 * player.js
 * - 키보드(방향키 / WASD) 및 터치 D-Pad 입력 처리
 * - 플레이어 이동, 점프, 맵 경계 처리, 장애물 · 캐릭터 충돌 감지
 */

const KEY_MAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/* 플레이어: 사진 속 인물을 참고한 캐릭터 (크림색 블라우스 · 목걸이 · 긴 웨이브 머리) */
const PLAYER_LOOK = {
  skin: '#f7d9c6',
  hair: '#3b2a22',
  top: '#f3ead8',
  collar: '#fffaf0',
  bottom: '#5b4b45',
  bottomType: 'skirt',
  legs: '#f2cdb8',
  shoes: '#5a4038',
  necklace: true,
};

class Input {
  constructor() {
    this.pressed = new Set(); // 눌려 있는 키 코드 (ArrowLeft 와 A 를 따로 추적)
    this.virtual = { up: false, down: false, left: false, right: false };
    this.sprint = false;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.sprint = true;
      if (!KEY_MAP[e.code] || e.ctrlKey || e.metaKey || e.altKey) return;
      this.pressed.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault(); // 페이지 스크롤 방지
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.sprint = false;
      this.pressed.delete(e.code);
    });
    window.addEventListener('blur', () => this.reset());
  }

  isDown(dir) {
    if (this.virtual[dir]) return true;
    for (const code of this.pressed) if (KEY_MAP[code] === dir) return true;
    return false;
  }

  get axis() {
    return {
      x: (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0),
      y: (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0),
    };
  }

  reset() {
    this.pressed.clear();
    this.sprint = false;
    Object.keys(this.virtual).forEach((k) => { this.virtual[k] = false; });
  }

  /** 터치 기기용 방향 버튼 연결 */
  bindDpad(root) {
    if (!root) return;
    root.querySelectorAll('[data-dir]').forEach((btn) => {
      const dir = btn.dataset.dir;
      const on = (e) => {
        e.preventDefault();
        this.virtual[dir] = true;
        btn.classList.add('active');
      };
      const off = () => {
        this.virtual[dir] = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerdown', on);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, off));
    });
  }
}

class Player {
  constructor(x, y, look = PLAYER_LOOK) {
    this.x = x;
    this.y = y;
    this.speed = 230; // px / s
    this.sprintMultiplier = 1.6;
    this.w = 22; // 충돌 박스 (발밑 기준)
    this.h = 12;
    this.moving = false;
    this.jumpY = 0; // 3D 단위
    this.jumpV = 0;
    this.rig = createRig(look);
    this.sync();
  }

  getBox(x = this.x, y = this.y) {
    return { x: x - this.w / 2, y: y - this.h, w: this.w, h: this.h };
  }

  collides(x, y, boxes) {
    const b = this.getBox(x, y);
    for (const o of boxes) {
      if (b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y) return true;
    }
    return false;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.moving = false;
    this.rig.root.rotation.y = 0;
    this.sync();
  }

  jump() {
    if (this.jumpY === 0 && this.jumpV === 0) this.jumpV = 7.2;
  }

  /**
   * @param {Input|null} input  null 이면 제자리 (대화 중 등)
   * @param {Array} obstacles   고정 장애물 (px 박스)
   * @param {Array} actors      움직이는 캐릭터들의 충돌 박스
   */
  update(dt, input, world, obstacles, actors) {
    let dx = 0;
    let dy = 0;
    if (input) ({ x: dx, y: dy } = input.axis);
    this.moving = dx !== 0 || dy !== 0;
    const sprint = !!(input && input.sprint);

    if (this.moving) {
      this.rig.faceToward(dx, dy, dt, 14);
      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      const dist = this.speed * (sprint ? this.sprintMultiplier : 1) * dt;
      const steps = Math.max(1, Math.ceil(dist / 6)); // 얇은 벽 관통 방지를 위한 분할 이동
      const minX = this.w / 2;
      const maxX = world.width - this.w / 2;
      const minY = 60;
      const maxY = world.height - 2;
      const check = (x, y) => this.collides(x, y, obstacles) || this.collides(x, y, actors);

      for (let i = 0; i < steps; i++) {
        // 축 별로 따로 판정해 벽을 따라 미끄러지듯 이동
        const nx = Math.min(maxX, Math.max(minX, this.x + (dx * dist) / steps));
        if (!check(nx, this.y)) this.x = nx;
        const ny = Math.min(maxY, Math.max(minY, this.y + (dy * dist) / steps));
        if (!check(this.x, ny)) this.y = ny;
      }
    }

    // 점프
    if (this.jumpV !== 0 || this.jumpY > 0) {
      this.jumpY += this.jumpV * dt;
      this.jumpV -= 24 * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
      }
    }

    this.rig.jumpY = this.jumpY;
    this.rig.update(dt, this.moving && this.jumpY === 0, sprint ? 1.45 : 1);
    this.sync();
  }

  sync() {
    this.rig.root.position.set(this.x * S, 0, this.y * S);
  }
}
