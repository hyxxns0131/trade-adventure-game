/**
 * minigames.js
 * 섬 곳곳의 '무역 챌린지 부스'에서 즐기는 학습 미니게임
 *  1) 인코텀즈 퀴즈        — 위험·비용은 어디서 넘어갈까?
 *  2) 선적서류 짝맞추기    — 카드 뒤집기 메모리 게임
 *  3) 관세 계산 챌린지     — 관세 · 부가세 직접 계산
 *  4) 컨테이너 적재 챌린지 — CBM · R/T 계산과 FCL/LCL 선택
 */

const MINIGAME_META = {
  incoterms: { title: '인코텀즈 퀴즈', icon: '🚢', color: '#f2a93b', desc: '위험은 어디서 넘어가고, 운임은 누가 낼까요? 실무에서 자주 헷갈리는 인코텀즈 상황 8문제!' },
  docs: { title: '선적서류 짝맞추기', icon: '📑', color: '#e8913d', desc: '카드를 두 장씩 뒤집어 서류 이름과 설명을 짝지어 보세요. 적은 횟수로 맞출수록 고수!' },
  duty: { title: '관세 계산 챌린지', icon: '🧮', color: '#5b7cfa', desc: '과세가격과 관세율이 주어지면 관세와 부가세를 직접 계산해 보세요. (한국 = CIF 기준)' },
  cbm: { title: '컨테이너 적재 챌린지', icon: '📦', color: '#36b5a2', desc: '화물의 부피(CBM)와 무게를 보고 운임 기준(R/T)을 구한 뒤, FCL과 LCL 중 무엇이 좋을지 골라보세요.' },
};

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('ko-KR');

/* ---------------- 문제 은행 ---------------- */
const INCOTERMS_QUIZ = [
  {
    q: '<b>FOB Busan</b> 조건으로 계약했어요. 물품의 위험은 언제 매수인에게 넘어갈까요?',
    options: ['부산항에서 물품이 본선에 적재되었을 때', '매도인 공장에서 트럭에 실었을 때', '수입항에 배가 도착했을 때', '수입통관이 끝났을 때'],
    answer: 0,
    explain: 'FOB(본선인도)는 지정 선적항에서 물품이 <b>배 위에 놓이는 순간</b> 위험이 매수인에게 이전돼요.',
  },
  {
    q: '<b>CIF New York</b> 조건에서 해상 보험에 가입하고 보험료를 내는 사람은?',
    options: ['매도인 (수출자)', '매수인 (수입자)', '선사', '보험은 필요 없다'],
    answer: 0,
    explain: 'CIF는 매도인이 <b>운임과 보험료</b>를 부담해요. 단, 위험은 여전히 <b>선적항 선적 시</b> 매수인에게 넘어가요!',
  },
  {
    q: 'CIF 조건에서 항해 중 폭풍으로 화물이 손상됐어요. 위험(손해)은 원칙적으로 누구의 몫일까요?',
    options: ['매수인 — 위험은 선적 시 이미 이전됨', '매도인 — 보험료를 냈으니까', '선사가 무조건 책임', '반반씩 나눔'],
    answer: 0,
    explain: 'C 그룹은 <b>비용 이전 지점과 위험 이전 지점이 달라요</b>. 위험은 선적 시 매수인에게 넘어갔으니, 매수인이 매도인이 들어준 보험으로 보상을 청구해요.',
  },
  {
    q: '매도인의 의무가 <b>가장 적은</b> 조건은?',
    options: ['EXW', 'FCA', 'DAP', 'DDP'],
    answer: 0,
    explain: '<b>EXW(공장인도)</b>는 매도인 작업장에서 물품을 처분 가능하게 두면 끝이에요. 반대로 <b>DDP</b>는 매도인 의무가 가장 커요.',
  },
  {
    q: '수입국의 <b>관세와 부가세까지 매도인</b>이 부담하는 조건은?',
    options: ['DDP', 'DAP', 'DPU', 'CIP'],
    answer: 0,
    explain: '<b>DDP(관세지급인도)</b>는 수입통관과 세금까지 매도인 책임이에요. 수입국에 사업자가 없으면 실무상 어렵기도 해요.',
  },
  {
    q: '항공 화물이나 컨테이너 화물에 FOB 대신 쓰기 좋은 조건은?',
    options: ['FCA', 'FAS', 'CFR', 'EXW'],
    answer: 0,
    explain: '컨테이너·항공 화물은 배에 싣기 전에 운송인에게 넘기는 경우가 많아서, 운송인 인도 시점에 위험이 넘어가는 <b>FCA</b>가 더 정확해요.',
  },
  {
    q: '목적지에서 물품을 <b>양하(내려놓기)까지</b> 매도인이 책임지는 조건은?',
    options: ['DPU', 'DAP', 'CPT', 'FOB'],
    answer: 0,
    explain: '<b>DPU</b>는 2020년에 DAT를 대체한 조건으로, 목적지에서 <b>양하까지</b> 매도인 책임이에요. DAP는 양하 전 상태로 인도해요.',
  },
  {
    q: 'Incoterms® 2020에서 <b>CIP</b> 조건의 매도인이 들어야 하는 보험 범위는?',
    options: ['ICC(A) — 가장 넓은 담보', 'ICC(C) — 최소 담보', '보험 의무 없음', '매수인이 정함'],
    answer: 0,
    explain: '2020 개정으로 <b>CIP는 ICC(A)</b>, <b>CIF는 ICC(C)</b> 수준의 보험이 기본이에요. 보험금액은 계약금액의 110%가 일반적이에요.',
  },
];

const DOC_PAIRS = [
  { term: 'B/L', sub: '선하증권', desc: '운송인이 발행 · 화물을 찾을 수 있는 권리증권' },
  { term: 'Commercial Invoice', sub: '상업송장', desc: '거래 명세서 겸 대금 청구서 · 과세가격의 근거' },
  { term: 'Packing List', sub: '포장명세서', desc: '포장 개수 · 순중량/총중량 · 용적(CBM) 명세' },
  { term: 'C/O', sub: '원산지증명서', desc: '어느 나라에서 만들었는지 증명 · FTA 특혜관세' },
  { term: 'L/C', sub: '신용장', desc: '서류가 일치하면 은행이 대금 지급을 확약' },
  { term: 'Insurance Policy', sub: '보험증권', desc: '운송 중 화물 손해를 보상하는 적하보험 증서' },
];

const CBM_ROUNDS = [
  { box: [120, 100, 80], qty: 5, kg: 240, item: '가구 부품' },
  { box: [100, 80, 50], qty: 4, kg: 900, item: '금속 부품 (무거움!)' },
  { box: [50, 40, 30], qty: 100, kg: 8, item: '화장품 상자' },
  { box: [110, 110, 120], qty: 20, kg: 600, item: '전자제품 팔레트' },
];

/* ---------------- 미니게임 매니저 ---------------- */
class MiniGames {
  constructor({ onFinish } = {}) {
    this.root = document.getElementById('game-modal');
    this.titleEl = document.getElementById('game-title');
    this.iconEl = document.getElementById('game-icon');
    this.body = document.getElementById('game-body');
    this.onFinish = onFinish;
    this.current = null;
    document.getElementById('game-close').addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.close();
    });
  }

  get isOpen() {
    return this.current !== null;
  }

  sfx(name) {
    if (typeof gameAudio !== 'undefined' && gameAudio[name]) gameAudio[name]();
  }

  open(id) {
    const meta = MINIGAME_META[id];
    if (!meta) return;
    this.current = id;
    this.root.style.setProperty('--game-color', meta.color);
    this.titleEl.textContent = meta.title;
    this.iconEl.textContent = meta.icon;
    this.root.classList.remove('hidden');
    this.sfx('open');
    this.body.innerHTML = `
      <p class="game-desc">${meta.desc}</p>
      <div class="game-actions"><button class="btn primary lg" data-act="start" type="button">게임 시작 ▶</button></div>`;
    this.body.querySelector('[data-act="start"]').addEventListener('click', () => this.start(id));
  }

  close() {
    if (!this.current) return;
    this.current = null;
    this.root.classList.add('hidden');
  }

  start(id) {
    this.sfx('pop');
    if (id === 'incoterms') this.runQuiz(shuffle(INCOTERMS_QUIZ).map((q) => this.shuffleOptions(q)), id);
    else if (id === 'duty') this.runQuiz(this.makeDutyQuestions(), id);
    else if (id === 'cbm') this.runQuiz(this.makeCbmQuestions(), id);
    else if (id === 'docs') this.runMemory(id);
  }

  shuffleOptions(q) {
    const correct = q.options[q.answer];
    const options = shuffle(q.options);
    return { ...q, options, answer: options.indexOf(correct) };
  }

  /* ---------- 공용 퀴즈 엔진 ---------- */
  runQuiz(questions, id) {
    let i = 0;
    let score = 0;
    const show = () => {
      const q = questions[i];
      this.body.innerHTML = `
        <div class="quiz-progress"><span>${i + 1} / ${questions.length}</span><div class="bar"><i style="width:${(i / questions.length) * 100}%"></i></div><span>⭐ ${score}</span></div>
        ${q.visual || ''}
        <p class="quiz-q">${q.q}</p>
        <div class="quiz-options">${q.options.map((o, k) => `<button class="quiz-opt" type="button" data-k="${k}"><span class="opt-key">${'ABCD'[k]}</span>${o}</button>`).join('')}</div>
        <div class="quiz-feedback" hidden></div>`;
      const fb = this.body.querySelector('.quiz-feedback');
      this.body.querySelectorAll('.quiz-opt').forEach((btn) => btn.addEventListener('click', () => {
        const k = Number(btn.dataset.k);
        const ok = k === q.answer;
        if (ok) score += 1;
        this.sfx(ok ? 'correct' : 'wrong');
        this.body.querySelectorAll('.quiz-opt').forEach((b, bk) => {
          b.disabled = true;
          if (bk === q.answer) b.classList.add('correct');
          else if (bk === k) b.classList.add('wrong');
        });
        fb.hidden = false;
        fb.className = `quiz-feedback ${ok ? 'ok' : 'no'}`;
        fb.innerHTML = `<b>${ok ? '정답이에요! 🎉' : '아쉬워요! 🤔'}</b><p>${q.explain}</p>
          <button class="btn primary" type="button" data-act="next">${i < questions.length - 1 ? '다음 문제 ▶' : '결과 보기'}</button>`;
        fb.querySelector('[data-act="next"]').addEventListener('click', () => {
          this.sfx('pop');
          i += 1;
          if (i < questions.length) show();
          else this.finish(id, score, questions.length);
        });
      }));
    };
    show();
  }

  finish(id, score, total, extra = '') {
    const ratio = score / total;
    const passed = ratio >= 0.6;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    this.sfx(passed ? 'fanfare' : 'wrong');
    this.body.innerHTML = `
      <div class="game-result">
        <div class="stars">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
        <h3>${passed ? '챌린지 성공!' : '조금만 더 연습해 봐요!'}</h3>
        <p>${extra || `${total}문제 중 <b>${score}문제</b>를 맞혔어요.`}</p>
        ${passed ? `<p class="badge-get">🏅 <b>${MINIGAME_META[id].title}</b> 배지를 획득했어요!</p>` : '<p class="muted">60% 이상 맞히면 배지를 받을 수 있어요.</p>'}
        <div class="game-actions">
          <button class="btn" type="button" data-act="retry">다시 하기</button>
          <button class="btn primary" type="button" data-act="close">섬으로 돌아가기</button>
        </div>
      </div>`;
    this.body.querySelector('[data-act="retry"]').addEventListener('click', () => this.start(id));
    this.body.querySelector('[data-act="close"]').addEventListener('click', () => this.close());
    if (this.onFinish) this.onFinish(id, passed);
  }

  /* ---------- 관세 계산 문제 생성 ---------- */
  makeDutyQuestions() {
    const items = [
      { name: '스웨터 (의류)', rate: 13 }, { name: '노트북', rate: 0 }, { name: '와인', rate: 15 },
      { name: '자동차 부품', rate: 8 }, { name: '커피 원두(생두)', rate: 2 }, { name: '운동화', rate: 13 },
    ];
    const values = [500, 800, 1200, 2000, 3000];
    const picks = shuffle(items).slice(0, 3);
    const qs = [];
    picks.forEach((it, idx) => {
      const cif = values[Math.floor(Math.random() * values.length)];
      const fta = idx === 2 && it.rate > 0;
      const rate = fta ? 0 : it.rate;
      const duty = (cif * rate) / 100;
      const vat = (cif + duty) * 0.1;
      const visual = `<div class="calc-card">
          <div><small>품목</small><b>${it.name}</b></div>
          <div><small>과세가격(CIF)</small><b>${fmt(cif)}만 원</b></div>
          <div><small>관세율</small><b>${fta ? `<s>${it.rate}%</s> → FTA 0%` : `${rate}%`}</b></div>
        </div>`;
      const dutyOpts = shuffle([...new Set([duty, (cif * (rate + 5)) / 100, cif * 0.1, duty * 2 + 10])].slice(0, 4));
      qs.push({
        visual,
        q: `이 물품의 <b>관세</b>는 얼마일까요?`,
        options: dutyOpts.map((v) => `${fmt(v)}만 원`),
        answer: dutyOpts.indexOf(duty),
        explain: `관세 = 과세가격 × 관세율 = ${fmt(cif)} × ${rate}% = <b>${fmt(duty)}만 원</b>${fta ? '<br>FTA 원산지증명서를 갖추면 협정세율(0%)을 적용받을 수 있어요!' : ''}`,
      });
      const vatOpts = shuffle([...new Set([vat, cif * 0.1 + (rate ? 0 : 7), (cif + duty) * 0.08, vat + duty])].slice(0, 4));
      qs.push({
        visual,
        q: `그럼 수입 <b>부가가치세</b>는 얼마일까요?`,
        options: vatOpts.map((v) => `${fmt(v)}만 원`),
        answer: vatOpts.indexOf(vat),
        explain: `부가세 = (과세가격 + 관세) × 10% = (${fmt(cif)} + ${fmt(duty)}) × 10% = <b>${fmt(vat)}만 원</b><br>관세를 더한 금액에 부가세가 붙는다는 점이 포인트!`,
      });
    });
    return qs;
  }

  /* ---------- 컨테이너 적재 문제 생성 ---------- */
  makeCbmQuestions() {
    const qs = [];
    shuffle(CBM_ROUNDS).slice(0, 3).forEach((r) => {
      const unit = (r.box[0] / 100) * (r.box[1] / 100) * (r.box[2] / 100);
      const cbm = Math.round(unit * r.qty * 100) / 100;
      const ton = (r.kg * r.qty) / 1000;
      const rt = Math.max(cbm, ton);
      const fill = Math.min(100, (cbm / 33) * 100);
      const boxes = Math.min(40, Math.max(1, Math.round(fill / 2.5)));
      const visual = `<div class="cargo">
          <div class="cargo-info">
            <div><small>화물</small><b>${r.item}</b></div>
            <div><small>상자 크기</small><b>${r.box.join(' × ')} cm</b></div>
            <div><small>수량</small><b>${r.qty}개</b></div>
            <div><small>상자당 무게</small><b>${r.kg} kg</b></div>
          </div>
          <div class="container-viz" title="20ft 컨테이너 약 33 CBM">
            <span class="cv-label">20ft (≈33 CBM)</span>
            <div class="cv-fill">${'<i></i>'.repeat(boxes)}</div>
          </div>
        </div>`;
      const rtOpts = shuffle([...new Set([rt, Math.min(cbm, ton), cbm + ton, Math.round(rt * 10) / 100])].slice(0, 4));
      qs.push({
        visual,
        q: '이 화물의 LCL 운임 기준 <b>R/T(Revenue Ton)</b>는?',
        options: rtOpts.map((v) => `${fmt(v)} R/T`),
        answer: rtOpts.indexOf(rt),
        explain: `총 부피 = ${fmt(unit)} CBM × ${r.qty} = <b>${fmt(cbm)} CBM</b>, 총 무게 = <b>${fmt(ton)} 톤</b><br>R/T는 둘 중 <b>큰 값</b> → <b>${fmt(rt)} R/T</b>`,
      });
      const fcl = cbm >= 15;
      const choice = ['LCL (다른 화물과 혼재)', 'FCL 20ft (컨테이너 단독 사용)'];
      qs.push({
        visual,
        q: `부피 <b>${fmt(cbm)} CBM</b>인 이 화물, 어떻게 보내는 게 좋을까요?`,
        options: choice,
        answer: fcl ? 1 : 0,
        explain: fcl
          ? '15 CBM을 넘으면 20ft 컨테이너를 통째로 쓰는 <b>FCL</b>이 대체로 경제적이고, 다른 화물과 섞이지 않아 안전해요.'
          : '컨테이너를 다 채우기엔 적어요. 다른 화주와 함께 싣는 <b>LCL</b>로 보내고 R/T만큼 운임을 내는 게 경제적이에요.',
      });
    });
    return qs;
  }

  /* ---------- 서류 짝맞추기 (메모리 게임) ---------- */
  runMemory(id) {
    const cards = shuffle(DOC_PAIRS.flatMap((p, i) => [
      { pair: i, html: `<b>${p.term}</b><small>${p.sub}</small>`, kind: 'term' },
      { pair: i, html: `<span>${p.desc}</span>`, kind: 'desc' },
    ]));
    let open = [];
    let matched = 0;
    let moves = 0;
    let lock = false;
    this.body.innerHTML = `
      <div class="quiz-progress"><span>짝 맞춘 수 <b class="mm-matched">0</b> / ${DOC_PAIRS.length}</span><span>시도 <b class="mm-moves">0</b>회</span></div>
      <div class="memory-grid">${cards.map((c, i) => `
        <button class="mem-card ${c.kind}" type="button" data-i="${i}">
          <span class="mem-back">📄</span><span class="mem-front">${c.html}</span>
        </button>`).join('')}</div>`;
    const matchedEl = this.body.querySelector('.mm-matched');
    const movesEl = this.body.querySelector('.mm-moves');
    this.body.querySelectorAll('.mem-card').forEach((el) => el.addEventListener('click', () => {
      const i = Number(el.dataset.i);
      if (lock || el.classList.contains('flipped') || el.classList.contains('done')) return;
      el.classList.add('flipped');
      this.sfx('pop');
      open.push({ i, el });
      if (open.length < 2) return;
      moves += 1;
      movesEl.textContent = moves;
      const [a, b] = open;
      if (cards[a.i].pair === cards[b.i].pair) {
        a.el.classList.add('done');
        b.el.classList.add('done');
        matched += 1;
        matchedEl.textContent = matched;
        open = [];
        this.sfx('correct');
        if (matched === DOC_PAIRS.length) {
          setTimeout(() => {
            const score = moves <= 9 ? 10 : moves <= 13 ? 8 : 6;
            this.finish(id, score, 10, `<b>${moves}번</b> 만에 서류 ${DOC_PAIRS.length}쌍을 모두 맞혔어요!<br><small>${DOC_PAIRS.map((p) => `${p.term}(${p.sub})`).join(' · ')}</small>`);
          }, 600);
        }
      } else {
        lock = true;
        setTimeout(() => {
          a.el.classList.remove('flipped');
          b.el.classList.remove('flipped');
          open = [];
          lock = false;
        }, 900);
      }
    }));
  }
}
