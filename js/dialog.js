/**
 * dialog.js
 * - 무역 실무 학습 대사 데이터 (DIALOG_SCRIPTS) · 산책 주민 꿀팁 (WALKER_TIPS)
 * - 말풍선 대화창: 타자기 효과 + 재잘거림 효과음, 단계 이동, 3D 초상화, 관련 사이트 버튼
 *
 * 대사 작성 규칙: **굵게** 로 감싸면 핵심 용어 하이라이트, \n 은 줄바꿈입니다.
 */

const DIALOG_SCRIPTS = {
  /* NPC 1 · 북서쪽 항구 — 무역의 기본 개념 (수달 선장) */
  captain: [
    '어서 와요, 새내기 무역인! 이 항구를 30년째 지키고 있는 수달 **한바다 선장**이에요. 오늘은 무역이 무엇인지, 큰 지도부터 함께 펼쳐볼까요? ⛵',
    '**무역(Trade)**은 나라와 나라 사이에 물품·서비스·기술을 사고파는 일이에요. 해외로 파는 건 **수출(Export)**, 해외에서 사 오는 건 **수입(Import)**이죠. 나라마다 잘 만드는 것이 달라서(**비교우위**) 서로 교환하면 모두가 이득을 봐요.',
    '무역에도 여러 형태가 있어요.\n· **직접무역** — 내가 해외 바이어와 직접 계약\n· **간접무역** — 무역 대행사를 통해 거래\n· **중계무역** — 물품을 수입해 가공 없이 제3국에 다시 수출하고 차익을 남김\n· **중개무역** — 제3자가 거래를 연결해 주고 수수료를 받음',
    '한국에서 무역을 할 때 꼭 알아야 할 3대 법규가 있어요. 물품의 수출입 질서를 정하는 **대외무역법**, 통관과 세금을 다루는 **관세법**, 외화 결제를 관리하는 **외국환거래법**이에요.',
    '무역에는 여러 주인공이 등장해요. 파는 **수출자(Seller·Shipper)**, 사는 **수입자(Buyer·Consignee)**, 운송을 맡는 **선사·항공사·포워더**, 통관을 돕는 **관세사**, 돈을 오가게 하는 **은행**, 위험을 덜어주는 **보험사**까지!',
    '거래는 이렇게 시작돼요.\n① **시장조사** → ② **거래처 발굴**(KOTRA·KITA, 해외 전시회, B2B 사이트) → ③ **거래 제의**(Circular Letter) → ④ **신용조회** → ⑤ **청약과 승낙** → ⑥ **계약 체결**',
    '**신용조회**는 상대가 믿을 만한지 확인하는 단계예요. 보통 **3C**를 봐요 — 성실성(**Character**), 거래 능력(**Capacity**), 재정 상태(**Capital**). 무역보험공사나 은행을 통해 조회할 수 있어요.',
    '**청약(Offer)**은 "이 조건으로 팔겠다/사겠다"는 확정적인 의사 표시예요. 유효기간 동안 철회할 수 없는 **확정청약(Firm Offer)**과 구속력이 약한 **자유청약(Free Offer)**이 있어요. 조건을 바꿔 답하면 **반대청약(Counter Offer)** — 새로운 청약이 된답니다.',
    '**승낙(Acceptance)**은 청약 조건을 그대로, 무조건 받아들이는 거예요. 조건이 하나라도 다르면 승낙이 아니에요(**경상의 원칙**, Mirror Image Rule). 승낙이 상대에게 도달하면 계약이 성립해요.',
    '계약서에는 8가지 기본 조건을 꼭 넣어요.\n**품질 · 수량 · 가격 · 선적 · 결제 · 보험 · 포장 · 분쟁해결(중재)**\n특히 가격은 "누가 어디까지 비용과 위험을 책임지나"를 정하는 **인코텀즈**와 함께 써요.',
    '계약 후 **수출자**의 흐름: 신용장 수령·확인 → 물품 생산/확보 → 운송 예약·보험 → **수출통관** → **선적** → 선적서류 준비 → 은행에 서류 제출 → **대금 회수**',
    '**수입자**의 흐름: 신용장 개설(또는 송금 준비) → 선적 서류 도착 → 대금 결제 → **B/L로 화물 인수 준비** → **수입통관**·세금 납부 → 물품 반출 → 판매!',
    '나라마다 법이 달라서 **국제 규칙**을 함께 써요. 거래 조건은 **Incoterms® 2020**, 신용장은 **UCP 600**, 국제 물품매매 계약은 **CISG(비엔나 협약)**가 대표적이에요.',
    '선장의 실무 꿀팁! 거래 중에 "계좌가 바뀌었어요"라는 이메일이 오면 꼭 **전화로 다시 확인**하세요. 이메일 해킹 **결제 사기**가 무역에서 정말 흔하답니다. 🛡️',
    '이제 섬을 한 바퀴 돌아보세요! 남동쪽 **컨테이너 야적장**, 동쪽 **CFS**, 중앙 **세관**, 서쪽 **물류센터**, 남서쪽 **무역은행**에서 친구들이 기다려요. 곳곳의 🎮 **무역 챌린지 부스**에서 게임도 해보세요!',
  ],

  /* NPC 2 · 남동쪽 컨테이너 야적장 — 인코텀즈 & 운송 방식 (강아지 팀장) */
  incoterms: [
    '멍! 반가워요. 컨테이너 야적장을 책임지는 **강운송 팀장**이에요. 안전모 잘 썼죠? 오늘은 **인코텀즈(Incoterms)**와 **운송 방식**을 알려드릴게요. 🚢',
    '**인코텀즈**는 국제상업회의소(**ICC**)가 만든 무역 거래 조건의 국제 규칙이에요. 지금은 **Incoterms® 2020**을 주로 쓰고, 모두 **11가지** 조건이 있어요. 계약서에는 "**FOB Busan Incoterms® 2020**"처럼 장소와 버전을 함께 적어요.',
    '인코텀즈가 정해주는 건 세 가지예요.\n**① 비용** — 운임·보험료·통관비를 어디까지 누가 내나\n**② 위험(Risk)** — 물건이 망가지거나 사라질 위험이 언제 넘어가나\n**③ 의무** — 통관, 운송 계약, 서류 제공을 누가 하나',
    '주의할 점! 인코텀즈는 **소유권 이전**이나 **대금 결제 방법**은 정하지 않아요. 그건 매매계약서와 결제 조건에서 따로 정해야 해요.',
    '11가지는 운송 방식으로 나눠요.\n**모든 운송 방식용 7개**: EXW · FCA · CPT · CIP · DAP · DPU · DDP\n**해상·내수로 운송 전용 4개**: FAS · FOB · CFR · CIF',
    '**E·F 그룹**부터 볼까요? **EXW(공장인도)**는 매도인 작업장에서 넘기면 끝 — 매도인 의무가 가장 적어요. **FCA(운송인인도)**는 매수인이 지정한 운송인에게 넘기는 순간 위험이 이전돼요. 컨테이너·항공 화물엔 FOB보다 **FCA**가 잘 맞아요.',
    '**FAS(선측인도)**는 수출항에서 배 옆(선측)에 놓으면, **FOB(본선인도)**는 수출항에서 **배에 실리는 순간** 위험이 매수인에게 넘어가요. FOB에서 바다 운임과 보험은 **매수인** 몫이에요.',
    '**C 그룹**이 가장 헷갈려요! **CFR·CIF**는 매도인이 도착항까지 운임(CIF는 보험료도)을 내지만, 위험은 **수출항 선적 시점**에 이미 넘어가요. **CPT·CIP**도 똑같이 **첫 운송인에게 인도할 때** 위험이 넘어가요.\n→ **비용 이전 지점 ≠ 위험 이전 지점**!',
    '보험도 달라요. **CIF**는 최소 담보인 **ICC(C)** 조건, **CIP**는 2020 개정으로 가장 넓은 **ICC(A)** 조건 보험을 매도인이 들어야 해요. 금액은 보통 계약금액의 **110%**예요.',
    '**D 그룹**은 도착지 인도예요. **DAP**는 목적지에 도착한 운송수단 위에서 인도(양하 전), **DPU**는 목적지에서 **양하(내려놓기)까지** 매도인 책임, **DDP**는 수입 관세·부가세까지 매도인이 내는 **매도인 의무 최대** 조건이에요.',
    '**DDP**는 매도인이 수입국에서 통관과 세금을 처리해야 해서, 그 나라에 사업자가 없으면 실무상 어려울 수 있어요. 수입자에게 맡기고 싶다면 **DAP**를 쓰는 경우가 많아요.',
    '운송 방식도 골라야 해요.\n**해상운송** — 대량·저렴, 대신 느림 (수출입 물동량 대부분)\n**항공운송** — 빠르지만 비쌈, 가볍고 비싼 물건에 적합\n**육상·철도** — 대륙 내 운송 (예: 중국–유럽 철도)\n**복합운송** — 여러 수단을 이어 한 번의 계약으로 운송',
    '여기 쌓인 컨테이너는 주로 **20ft(1 TEU, 약 33 CBM)**와 **40ft(2 TEU, 약 67 CBM)**예요. 높이가 큰 **40ft HC**는 약 76 CBM! 냉장·냉동은 **Reefer**, 키 큰 화물은 **Open Top**, 중장비는 **Flat Rack**을 써요.',
    '아래 **📘 인코텀즈 자세히 알아보기** 버튼을 누르면 11가지 조건을 그림으로 비교하는 페이지가 열려요. 남동쪽 🎮 부스의 **인코텀즈 퀴즈**로 실력도 확인해 보세요! 멍멍!',
  ],

  /* NPC 3 · 동쪽 CFS — LCL/FCL & CY/CFS (곰 반장) */
  cfs: [
    '어흠, 반가워요! CFS 작업장의 곰 **최혼재 반장**이에요. 오늘은 **FCL과 LCL**, **CY와 CFS**, 그리고 현장 비용까지 알려줄게요. 📦',
    '**FCL(Full Container Load)**은 한 화주가 컨테이너 하나를 통째로 쓰는 방식이에요. 화주가 직접 짐을 싣고 **봉인(Seal)**해서 보내니 다른 짐과 섞이지 않아 안전해요.',
    '**LCL(Less than Container Load)**은 컨테이너 하나를 못 채우는 소량 화물이에요. 여러 화주의 짐을 한 컨테이너에 모아 싣는 **혼재(Consolidation)**를 해요. 이 일을 주로 **포워더(Consolidator)**가 맡아요.',
    '**CY(Container Yard)**는 컨테이너 자체를 쌓아두고 주고받는 장소예요. **CFS(Container Freight Station)**는 바로 여기! LCL 화물을 모아 싣는 **적입(Stuffing)**과, 도착한 컨테이너에서 꺼내 나누는 **적출(Devanning)**을 하는 창고예요.',
    'LCL 흐름을 정리하면:\n수출화주 → **CFS 반입** → 혼재·적입 → **CY 이동** → 선적 → 도착항 **CY** → **CFS 적출** → 수입화주 인수\n운송 구간 표기는 **CY/CY**(FCL), **CFS/CFS**(LCL)처럼 써요.',
    'LCL 운임은 **R/T(Revenue Ton)** 기준이에요. **1 CBM**(가로×세로×높이 = 1㎥)과 **1,000kg** 중 큰 값으로 계산해요.\n예) 1.2×1.0×0.8m 상자 5개 = **4.8 CBM**, 무게 1,200kg → **4.8 R/T**',
    'FCL이냐 LCL이냐는 총비용으로 골라요. 대략 **15 CBM 안팎**을 넘으면 20ft FCL이 유리한 경우가 많아요. 다만 LCL은 **CFS 작업료**가 붙고, FCL은 컨테이너 운송료가 따로 들어요.',
    '현장에서 붙는 비용도 알아둬요.\n**THC** — 터미널 화물처리비\n**CFS Charge** — CFS 작업료\n**Wharfage** — 부두사용료\n**DOC Fee** — 서류 발급비\n견적을 받을 땐 이 항목이 포함인지 꼭 확인!',
    '정말 중요한 것! 컨테이너는 정해진 **Free Time**이 있어요. 터미널에서 늦게 빼가면 **Demurrage(디머리지)**, 컨테이너를 빌려가서 늦게 돌려주면 **Detention(디텐션)** 요금이 하루 단위로 붙어요. 💸',
    '선적 일정 용어도 있어요. **ETD**는 출항 예정일, **ETA**는 도착 예정일이에요. **Cut-off**는 서류·화물 반입 마감 시각인데, 이걸 놓치면 배를 못 타요!',
    '2016년부터는 국제협약(SOLAS)에 따라 수출 컨테이너의 **검증된 총중량(VGM)**을 선적 전에 신고해야 해요. 과적은 사고로 이어지니까요. 안전이 최우선! 🦺',
    '동쪽 🎮 **컨테이너 적재 챌린지**에서 CBM을 계산하고 FCL/LCL을 골라보세요. 위쪽 버튼으로 **화물 진행 조회** 사이트도 열 수 있어요!',
  ],

  /* NPC 4 · 중앙 세관 — 수출입 통관 & 관세·부가세 (고양이 관세사) */
  customs: [
    '야옹, 어서 오세요. 중앙 세관 앞의 관세사 **나세관**이에요. 오늘은 수출입 **통관 절차**와 **관세·부가세** 계산을 차근차근 정리해 드릴게요. 🏛️',
    '**통관**이란 물품을 수출·수입할 때 세관에 신고하고 **수리(허가)**를 받는 절차예요. 한국은 관세청 전자통관시스템 **UNI-PASS**로 신고하고, 보통 **관세사**가 화주를 대신해 처리해요.',
    '**수출통관** 흐름: 수출신고 → 심사(필요하면 물품검사) → **수출신고수리** → 선적!\n수출신고는 물품이 있는 곳에서 하고, 수리된 날부터 **30일 이내**에 선적해야 해요.',
    '수출할 때는 관세가 거의 없고, 부가가치세도 **영세율(0%)**이 적용돼요. 그리고 수출용 원재료를 수입할 때 낸 관세는 **관세환급(Drawback)**으로 돌려받을 수 있어요. (수출신고수리일부터 2년 이내 신청)',
    '**수입통관** 흐름: 입항 → **보세구역** 반입 → 수입신고 → 심사·검사 → **수입신고수리** → 세금 납부 → 반출\n**보세구역**은 세금 납부가 보류된 상태로 외국 물품을 보관하는 곳이에요.',
    '수입신고는 시기를 고를 수 있어요.\n**출항 전 신고** · **입항 전 신고** · **보세구역 도착 전 신고** · **보세구역 장치 후 신고**\n빨리 신고할수록 물건을 빨리 받을 수 있어요.',
    '신고가 들어오면 세관은 위험도에 따라 **P/L(서류 없이 수리)**, **서류 제출 심사**, **물품 검사**로 나눠 처리해요. 식품·전기용품처럼 다른 법의 허가가 필요한 물품은 **세관장 확인(요건확인)**도 받아야 해요.',
    '모든 물품에는 **HS Code**(품목분류번호)가 있어요. 세계 공통 **6자리**에 한국은 4자리를 더한 **HSK 10자리**를 써요. 이 코드에 따라 **관세율**과 수입 요건이 정해지니 정확한 분류가 정말 중요해요.',
    '관세의 기준이 되는 **과세가격**은 한국에서 **CIF 기준**이에요. 실제 거래가격에 수입항까지의 운임·보험료를 더해요. (WTO 관세평가협정의 **거래가격** 원칙)',
    '계산해 볼까요? 과세가격 1,000만 원, 관세율 8%라면\n**관세** = 1,000만 × 8% = **80만 원**\n**부가세** = (1,000만 + 80만) × 10% = **108만 원**\n총 세금 **188만 원**! 술·자동차 같은 품목은 개별소비세 등이 더 붙어요.',
    '세금은 보통 **수입신고수리일부터 15일 이내**에 납부해요. 성실한 업체는 월별로 모아 내는 **월별납부** 제도도 쓸 수 있어요.',
    '**FTA** 체결국에서 만든 물품은 **원산지증명서**를 갖추면 낮은 **협정세율**, 많은 경우 **무관세** 혜택을 받아요. 단, 원산지 기준을 충족해야 하고, 사후 검증에 대비해 서류를 **5년간 보관**해야 해요.',
    '중앙 광장 근처 🎮 **관세 계산 챌린지**에서 직접 세금을 계산해 보세요! 위 버튼으로 **UNI-PASS**와 **FTA 포털**도 바로 열 수 있어요. 야옹~ ✅',
  ],

  /* NPC 5 · 서쪽 물류센터 — 선적서류 (여우 포워더) */
  forwarder: [
    '안녕하세요! 서쪽 물류센터의 여우 포워더 **서류진**이에요. **포워더(Freight Forwarder)**는 화주를 대신해 선복 예약, 운송, 보험, 서류, 통관 연계까지 챙기는 **물류 코디네이터**예요. 📑',
    '선적은 **부킹(Booking)**부터 시작해요. 포워더가 선사에 배 자리를 예약하고, 화주는 **S/R(Shipping Request, 선적요청서)**에 화물 정보를 적어 보내요. 이 내용이 그대로 B/L이 되니 정확해야 해요!',
    '무역의 3대 선적서류를 배워볼게요.\n**Commercial Invoice(상업송장)** · **Packing List(포장명세서)** · **B/L(선하증권)**\n여기에 **원산지증명서**와 **보험증권**이 자주 함께 가요.',
    '**Commercial Invoice**는 거래 명세서이자 대금 청구서예요. 판매자·구매자, 송장 번호·날짜, 품명·HS Code, 수량, 단가, 총액, **인코텀즈·결제조건**을 적어요. 세관에서 **과세가격**을 정하는 근거가 돼요.',
    '**Packing List**는 "어떻게 포장했나"를 보여줘요. 포장 개수, **순중량(N.W.)**, **총중량(G.W.)**, **용적(CBM)**, 상자에 찍는 표시인 **Shipping Mark**를 적어요. 가격은 적지 않아요!',
    '**Shipping Mark**는 상자 겉면의 주소표 같은 거예요. 보통 수입자 약호, 목적항, 상자 번호(예: C/No. 1-50), 원산지(**MADE IN KOREA**)를 적어서 다른 화물과 헷갈리지 않게 해요.',
    '**B/L(Bill of Lading)**은 운송인이 발행하는 핵심 서류예요. 세 가지 기능이 있어요.\n**① 화물수령증** **② 운송계약의 증거** **③ 권리증권** — 원본 B/L을 가진 사람이 화물을 찾을 수 있어요.',
    'B/L에는 **Shipper**(송하인), **Consignee**(수하인), **Notify Party**(착화통지처)를 적어요. 신용장 거래처럼 은행이 끼면 Consignee를 **"To Order"**로 두고 배서로 권리를 넘기기도 해요.',
    'B/L 종류도 알아둬요.\n**Original B/L** — 원본 3부(Full Set) 발행\n**Surrender B/L** — 원본 회수 처리해 빠르게 화물 인도 (가까운 나라)\n**Sea Waybill** — 유통되지 않는 운송장\n**Master B/L**(선사→포워더) / **House B/L**(포워더→화주)',
    '배에 실린 뒤 발행되는 **On Board B/L**, 화물 상태에 이상이 없다는 **Clean B/L**이 은행이 좋아하는 B/L이에요. 이상이 적힌 **Foul B/L**은 결제에서 문제가 될 수 있어요. 항공 화물은 **AWB(Air Waybill)**을 써요.',
    '**원산지증명서(C/O)**는 물품이 어느 나라에서 만들어졌는지 증명해요. 일반 C/O는 **상공회의소**에서, FTA 특혜용은 상공회의소나 세관에서 발급받거나 **자율 발급**해요.',
    '실무 꿀팁! Invoice, Packing List, B/L의 **품명·수량·중량·Shipping Mark가 모두 일치**해야 해요. 한 글자만 달라도 통관 지연이나 신용장 **하자(Discrepancy)**가 생길 수 있어요. 꼼꼼함이 생명! ✍️',
    '전자무역 서류는 위 버튼의 **uTradeHub**에서 작성·전송할 수 있고, 원산지증명은 **대한상의**에서 발급받아요. 서쪽 🎮 **서류 짝맞추기** 게임도 꼭 해보세요!',
  ],

  /* NPC 6 (보너스) · 남서쪽 무역은행 — 대금결제 (양 지점장) */
  bank: [
    '매애~ 반갑습니다! 무역은행의 **신용장 지점장**이에요. 물건이 오가면 돈도 안전하게 오가야겠죠? 오늘은 **무역 대금결제**를 알려드릴게요. 💳',
    '가장 간단한 건 **송금(T/T, Telegraphic Transfer)**이에요. 물건을 보내기 전에 받으면 **사전송금**(수출자에게 안전), 받은 뒤 보내면 **사후송금**(수입자에게 안전)이에요. 실무에선 "선금 30% + 잔금 70%"처럼 나누기도 해요.',
    '**신용장(L/C, Letter of Credit)**은 수입자의 은행이 "약속한 서류만 제시하면 대금을 지급하겠다"고 보증하는 증서예요. 처음 거래해서 서로 믿기 어려울 때 많이 써요.',
    'L/C의 등장인물: **개설의뢰인**(수입자), **개설은행**(수입자 거래은행), **통지은행**(수출국 은행), **수익자**(수출자), 그리고 서류를 사주는 **매입은행**! 국제 규칙은 **UCP 600**이에요.',
    'L/C 흐름을 따라가 볼까요?\n① 계약 → ② 수입자가 **L/C 개설** 신청 → ③ 통지은행이 수출자에게 **통지** → ④ 수출자 **선적** → ⑤ 서류를 은행에 제출(**네고**) → ⑥ 개설은행 **대금 지급** → ⑦ 수입자 결제 후 **서류 인수** → ⑧ 화물 찾기',
    'L/C에서 은행은 물건이 아니라 **서류만 심사**해요(**독립성·추상성 원칙**). 서류가 L/C 조건과 엄격히 일치해야 하고, 은행은 제시일 다음 날부터 최대 **5은행영업일** 안에 심사해요.',
    '서류가 조건과 다르면 **하자(Discrepancy)**가 돼서 지급이 거절되거나 늦어질 수 있어요. 선적기일, 유효기일, 품명 철자… 작은 차이도 하자예요! 포워더에게 배운 "서류 일치", 기억나죠?',
    'L/C 종류도 다양해요. 서류를 보면 바로 지급하는 **일람불(At Sight)**, 일정 기간 뒤 지급하는 **기한부(Usance)**, 다른 은행이 지급을 한 번 더 보증하는 **확인(Confirmed) L/C**가 있어요.',
    '**추심(D/P, D/A)** 방식도 있어요. 은행이 서류를 전달만 하고 지급 보증은 하지 않아요(국제 규칙 **URC 522**).\n**D/P** — 수입자가 대금을 내야 서류를 받음\n**D/A** — 환어음을 인수(지급 약속)만 해도 서류를 받음 → 수출자 위험이 더 커요',
    '무역에는 **환율 변동**과 **대금 미회수** 위험이 따라요. 은행의 **선물환**으로 미래 환율을 고정하고, **한국무역보험공사(K-SURE)**의 수출보험으로 바이어 부도 위험에 대비할 수 있어요.',
    '위 버튼으로 **K-SURE**와 **한국은행 환율 정보**도 볼 수 있어요. 안전하고 성공적인 무역 되세요! 매애~ 🎉',
  ],
};

/* 산책하는 주민들의 꿀팁 (주민마다 3개씩 번갈아 말함) */
const WALKER_TIPS = [
  ['💡 <b>TEU</b>는 20피트 컨테이너 1개를 뜻하는 단위예요!', '💡 수출신고가 수리되면 <b>30일 이내</b>에 선적해야 해요.', '💡 <b>ETD</b>는 출항 예정일, <b>ETA</b>는 도착 예정일!'],
  ['💡 <b>CBM</b> = 가로 × 세로 × 높이(m) 로 구한 부피예요.', '💡 계좌 변경 이메일은 꼭 <b>전화로 재확인</b>! 결제사기 조심~', '💡 <b>CIF</b>는 운임·보험료를 내도 위험은 <b>선적 때</b> 넘어가요.'],
  ['💡 B/L·Invoice·Packing List의 <b>수량은 꼭 일치</b>시켜요!', '💡 <b>Demurrage</b>는 터미널 반출 지연, <b>Detention</b>은 컨테이너 반납 지연 요금!', '💡 FTA 원산지증명서는 <b>5년</b>간 보관해야 해요.'],
  ['💡 한국 수입 관세의 기준은 <b>CIF 가격</b>이에요.', '💡 <b>HSK</b>는 10자리 품목분류번호예요.', '💡 신용장 은행 심사는 최대 <b>5은행영업일</b>!'],
];

const TYPE_SPEED = 46; // 초당 출력 글자 수

/* 대화창 왼쪽 초상화: 별도의 작은 3D 렌더러로 NPC 얼굴을 실시간 렌더링 */
class PortraitView {
  constructor(canvas) {
    this.canvas = canvas;
    this.current = null;
    this.rigs = new Map();
    this.ok = typeof THREE !== 'undefined';
    if (!this.ok) return;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(112, 112, false);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#fffaf0', '#d9c9b8', 0.7));
    const key = new THREE.DirectionalLight('#fff1dc', 0.65);
    key.position.set(2, 4, 5);
    this.scene.add(key);
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  }

  show(id, look) {
    if (!this.ok) return;
    if (this.current) this.scene.remove(this.current.root);
    if (!this.rigs.has(id)) this.rigs.set(id, createRig(look));
    this.current = this.rigs.get(id);
    this.current.root.rotation.y = 0.15;
    this.scene.add(this.current.root);
    // 동물 머리는 사람보다 조금 낮게 위치
    const headY = look.species ? 1.95 : 2.15;
    this.camera.position.set(0.35, headY + 0.15, 4.4);
    this.camera.lookAt(0, headY - 0.12, 0);
  }

  update(dt) {
    if (!this.ok || !this.current) return;
    this.current.update(dt, false);
    this.renderer.render(this.scene, this.camera);
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** "**굵게**" 마크업을 세그먼트 배열로 분리 (이모지 등을 위해 Array.from 사용) */
function parseLine(text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      return { bold, chars: Array.from(bold ? part.slice(2, -2) : part) };
    });
}

function formatChars(chars, bold) {
  if (!chars.length) return '';
  const html = escapeHTML(chars.join('')).replace(/\n/g, '<br>');
  return bold ? `<strong>${html}</strong>` : html;
}

class DialogBox {
  constructor() {
    this.root = document.getElementById('dialog');
    this.nameEl = document.getElementById('dialog-name');
    this.roleEl = document.getElementById('dialog-role');
    this.stepEl = document.getElementById('dialog-step');
    this.textEl = document.getElementById('dialog-text');
    this.dotsEl = document.getElementById('dialog-dots');
    this.linksEl = document.getElementById('dialog-links');
    this.prevBtn = document.getElementById('dialog-prev');
    this.nextBtn = document.getElementById('dialog-next');
    this.closeBtn = document.getElementById('dialog-close');
    this.portrait = document.getElementById('portrait');

    this.npc = null;
    this.lines = [];
    this.index = 0;
    this.segments = [];
    this.flat = [];
    this.total = 0;
    this.shown = 0;
    this.rendered = -1;
    this.typing = false;
    this.reachedEnd = false;
    this.handlers = {};

    // 버튼 클릭 후 포커스를 해제해 Space/Enter 중복 입력을 막습니다.
    const bind = (el, fn) =>
      el.addEventListener('click', (e) => {
        e.currentTarget.blur();
        fn();
      });
    bind(this.nextBtn, () => this.advance());
    bind(this.prevBtn, () => this.prev());
    bind(this.closeBtn, () => this.close());
    this.textEl.addEventListener('click', () => this.advance());
  }

  get isOpen() {
    return this.npc !== null;
  }

  /**
   * @param {NPC} npc
   * @param {{ onOpen?, onComplete?, onClose? }} handlers
   */
  open(npc, handlers = {}) {
    this.npc = npc;
    this.handlers = handlers;
    this.lines = DIALOG_SCRIPTS[npc.id] || ['...'];
    this.index = 0;
    this.reachedEnd = false;

    this.root.style.setProperty('--npc-color', npc.color);
    this.nameEl.textContent = npc.name;
    this.roleEl.textContent = `${npc.species || ''} · ${npc.role}`;
    this.dotsEl.innerHTML = this.lines.map(() => '<i></i>').join('');
    this.renderLinks(npc);
    this.drawPortrait(npc);

    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('show');
    if (typeof gameAudio !== 'undefined') gameAudio.open();
    this.startLine();
    if (handlers.onOpen) handlers.onOpen(npc);
  }

  renderLinks(npc) {
    const parts = [];
    if (npc.page) {
      parts.push(`<a class="chip-link primary" href="${npc.page.url}" target="_blank" rel="noopener">📘 ${escapeHTML(npc.page.label)}</a>`);
    }
    (npc.links || []).forEach((l) => {
      parts.push(`<a class="chip-link" href="${l.url}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHTML(l.label)}<span aria-hidden="true">↗</span></a>`);
    });
    this.linksEl.innerHTML = parts.join('');
    this.linksEl.hidden = parts.length === 0;
    this.linksEl.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => a.blur()));
  }

  drawPortrait(npc) {
    if (!this.portraitView) this.portraitView = new PortraitView(this.portrait);
    this.portraitView.show(npc.id, npc.look);
  }

  startLine() {
    this.segments = parseLine(this.lines[this.index]);
    this.flat = this.segments.flatMap((s) => s.chars);
    this.total = this.flat.length;
    this.shown = 0;
    this.typing = true;
    this.render(true);
    this.updateControls();
  }

  update(dt) {
    if (!this.isOpen) return;
    if (this.portraitView) this.portraitView.update(dt);
    if (!this.typing) return;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.total, this.shown + dt * TYPE_SPEED);
    const after = Math.floor(this.shown);
    // 두 글자마다 재잘거림 효과음
    for (let i = before; i < after; i++) {
      if (i % 2 === 0 && this.flat[i] && this.flat[i].trim() && typeof gameAudio !== 'undefined') {
        gameAudio.babble(this.npc.voice || 1);
        break;
      }
    }
    if (this.shown >= this.total) {
      this.typing = false;
      this.render(true);
    } else {
      this.render(false);
    }
  }

  /** 출력된 부분 + 아직 안 나온 부분(투명)을 함께 렌더링해 레이아웃 흔들림을 막습니다. */
  render(force) {
    const n = Math.floor(this.shown);
    if (!force && n === this.rendered) return;
    this.rendered = n;

    let left = n;
    let visible = '';
    let ghost = '';
    for (const seg of this.segments) {
      const cut = Math.max(0, Math.min(seg.chars.length, left));
      visible += formatChars(seg.chars.slice(0, cut), seg.bold);
      ghost += formatChars(seg.chars.slice(cut), seg.bold);
      left -= seg.chars.length;
    }
    this.textEl.innerHTML =
      visible +
      (ghost ? `<span class="ghost" aria-hidden="true">${ghost}</span>` : '');
    this.root.classList.toggle('typing', this.typing);
  }

  updateControls() {
    const last = this.index === this.lines.length - 1;
    this.stepEl.textContent = `${this.index + 1} / ${this.lines.length}`;
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.querySelector('span').textContent = last ? '대화 마치기' : '다음';
    this.root.classList.toggle('last', last);
    Array.from(this.dotsEl.children).forEach((dot, i) => {
      dot.classList.toggle('on', i === this.index);
      dot.classList.toggle('done', i < this.index);
    });
    if (last && !this.reachedEnd) {
      this.reachedEnd = true;
      if (this.handlers.onComplete) this.handlers.onComplete(this.npc);
    }
  }

  /** 타이핑 중이면 문장을 즉시 완성하고, 아니면 다음 대사로 넘어갑니다. */
  advance() {
    if (!this.isOpen) return;
    if (this.typing) {
      this.shown = this.total;
      this.typing = false;
      this.render(true);
      return;
    }
    if (typeof gameAudio !== 'undefined') gameAudio.pop();
    if (this.index < this.lines.length - 1) {
      this.index += 1;
      this.startLine();
    } else {
      this.close();
    }
  }

  prev() {
    if (!this.isOpen || this.index === 0) return;
    this.index -= 1;
    this.startLine();
  }

  close() {
    if (!this.isOpen) return;
    const npc = this.npc;
    this.npc = null;
    this.typing = false;
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
    if (this.handlers.onClose) this.handlers.onClose(npc, this.reachedEnd);
  }
}
