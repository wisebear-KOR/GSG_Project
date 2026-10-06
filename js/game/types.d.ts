// 게임의 타입 선언 — 실행에는 쓰이지 않는다 (브라우저는 .js만 읽는다).
// 검사는 머리에 `// @ts-check`를 단 .js 파일만 한다: npx -p typescript tsc -p jsconfig.json
// .js에서 쓰는 법: /** @param {import('./types').GameState} state */
//
// 세 부분이다.
//   1. 엔진의 상태 (GameState) — 지금 규칙(RULESET 27) 그대로. 재설계로 바뀌는 곳은 표시해 둔다
//   2. 자원 묶음 (Resources) — 자원은 어디서나 이 꼴 하나로 다룬다
//   3. 정보 객체 (GameInfo) — 판의 모든 정보를 한 객체로 묶은 것과, 누가 볼 수 있는지 (docs/redesign/INFO.md)

// ---------- 기본 값 ----------

export type Side = 'player' | 'enemy';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Terrain = 'plain' | 'forest' | 'mountain' | 'river' | 'hill' | 'desert';
export type Feature = 'oasis' | 'quarry';
export type Building = 'capital' | 'village';
export type ResourceKey = 'food' | 'wood' | 'stone' | 'faith';
export type Doctrine = 'peace' | 'war' | 'abundance' | 'wisdom';
export type ActionType = 'gather' | 'build' | 'pray' | 'explore' | 'preach' | 'attack';
export type BuildKind = 'village' | 'wall' | 'temple' | 'cathedral';
/** 일의 종류 12가지 — 거두기 넷 · 짓기 넷 · 기도 · 탐험 · 선교 · 공격. 해석기 질문의 단위 */
export type ActionKind = `gather:${ResourceKey}` | `build:${BuildKind}` | 'pray' | 'explore' | 'preach' | 'attack';
/** 칸 활성도: 풍요 · 정상 · 빈곤 (재설계 §5.1, 아직 엔진에 없다) */
export type Activity = 'rich' | 'normal' | 'poor';

// ---------- 자원 묶음 ----------

/** 자원 묶음: 네 칸이 늘 다 있고 값은 정수다. 신도(pop)는 자원이 아니라 따로 둔다 */
export interface Resources {
  food: number;
  wood: number;
  stone: number;
  faith: number;
}

/** 자원 묶음 셈 (만들 모듈의 모양) */
export interface ResourceOps {
  zero(): Resources;
  add(a: Resources, b: Resources): Resources;
  sub(a: Resources, b: Resources): Resources;
  scale(a: Resources, n: number): Resources;
  /** 엔진의 canPay와 같은 판정 */
  canPay(have: Resources, cost: Resources): boolean;
  /** 모자란 만큼만 남긴 묶음 (넉넉한 칸은 0) */
  short(have: Resources, need: Resources): Resources;
  /** "식량 2, 나무 4" — 이름표는 언어팩에서 */
  render(a: Resources, labels: Record<ResourceKey, string>): string;
}

// ---------- 1. 엔진의 상태 ----------

export interface Tile {
  id: string;
  r: number;
  c: number;
  terrain: Terrain;
  owner: Side | null;
  building: Building | null;
  wall: boolean;
  /** 우리 시야에 들어왔는가 (율법파에게는 안개가 없다) */
  revealed: boolean;
  feature?: Feature | null;
  site?: { id: string; found: boolean };
  /** 선교로 쌓인 믿음의 표식 — FLIP_MARKS(4)면 마을이 넘어온다 */
  faithMarks?: { side: Side; n: number; round: number } | null;
}

/** 한 진영. 자원은 지금 엔진에서 낱칸으로 섞여 있다 (정보 객체에서는 Resources로 묶는다) */
export interface SideState extends Resources {
  pop: number;
  templeLevel: number;
  capitalHp: number;
  /** 신앙이 바닥난 채 넘긴 장 수 */
  faithless: number;
  cathedral: number;
  /** 율법 석판 (율법파) */
  edict: number;
  doctrine: Record<Doctrine, number>;
}

/** 가능한 행동 (legalActions) — key는 'type:tile:gather|build' */
export interface Action {
  type: ActionType;
  tile: string;
  gather?: ResourceKey;
  build?: BuildKind;
  /** 율법파의 원정 공격 */
  crusade?: boolean;
  side: Side;
  key: string;
  text: string;
  /** 자동 채우기가 넣은 손 */
  auto?: boolean;
  /** 자동 채우기 가운데 계시의 뜻을 헤아린 손 */
  heeded?: boolean;
  /** 율법파의 뜻 가운데 플레이어에게 보이는 것 (enemyIntent) */
  shown?: boolean;
  /** LLM 프롬프트의 행동 번호 (A1…) */
  id?: string;
}

export interface EventCard {
  id: string;
  name: string;
  text: string;
  rule: string;
  /** 두 갈래 사건의 선택지 */
  choice?: { id: string; label: string }[];
  special?: boolean;
}

export interface LawRule {
  type: ActionType;
  gather?: ResourceKey;
  build?: BuildKind;
  target?: 'capital';
  crusade?: boolean;
}

export interface LawCard {
  id: string;
  name: string;
  text: string;
  rules: LawRule[];
  /** 검열 카드: 다음 장 낱말 하나를 봉인한다 */
  ban?: boolean;
}

export interface Revelation {
  round: number;
  text: string;
  doctrine: Doctrine | null;
  /** 되풀이였나 */
  echo?: boolean;
  /** 석판이 알아들은 일의 목록 (되풀이 판정용) */
  sig?: string;
}

/** 신학 노트: 대사제가 배운 신의 말버릇 */
export interface Lesson {
  word: string;
  type: ActionType;
  gather: ResourceKey | null;
  build: BuildKind | null;
}

export interface Petition {
  from: string;
  text: string;
  need: { type: ActionType; gather?: ResourceKey; build?: BuildKind } | null;
  alt?: ActionType;
  keys?: string;
}

export interface LogEntry {
  round: number;
  side: Side | 'god' | 'priest' | 'leader';
  text: string;
  dice?: { attacker: number; attackerBonus: number; defender: number; defenderBonus: number; win: boolean } | null;
  fx?: { tile?: string; kind?: string; gain?: Partial<Resources>; [k: string]: unknown } | null;
  act?: string | null;
  /** 연출 재생용 판 (저장할 때는 지운다) */
  snap?: unknown;
}

export interface HistoryEntry {
  round: number;
  ps: number;
  es: number;
  res: Resources & { pop: number };
  text: string | null;
  verdict?: string;
}

export interface GameConfig {
  mode: 'standard' | 'tutorial';
  size: 4 | 5 | 6 | 7;
  difficulty: Difficulty;
  seed: number;
  veteran?: boolean;
  /** 끝낸 판 수 (0~4) — 모듈이 한 판에 한 묶음씩 열린다 */
  unlock?: number;
  trial?: string;
  daily?: string;
  challenge?: unknown;
  ascension?: number;
  blessing?: string;
  canon?: { text: string; doctrine: Doctrine };
  legacy?: unknown;
}

/** 엔진의 상태 (createState · startRound가 만드는 필드). 저장은 이 객체를 그대로 직렬화한다 */
export interface GameState {
  config: GameConfig;
  tutorial: boolean;
  rows: number;
  cols: number;
  /** 난수 두 흐름: 덱 섞기, 주사위 */
  rng: { deck: number; dice: number };
  ruleset: number;
  round: number;
  maxRounds: number;
  enemyBonus: number;

  // 판
  tiles: Tile[];
  tileAt: Record<string, Tile>;
  holyId: string | null;
  /** 붙인 이름: 칸 → 이름 */
  names: Record<string, string>;
  /** 전설이 된 땅의 별칭 */
  legends: Record<string, string>;

  // 진영
  sides: Record<Side, SideState>;
  /** 선공 (startRound) */
  first?: Side;
  /** 저울: 6점 이상 뒤진 쪽 */
  trailing: Side | null;
  /** 율법파의 결집 (저울로 행동 +1) */
  rally: boolean;

  // 덱과 카드
  eventDeck: EventCard[];
  lawDeck: LawCard[];
  event: EventCard | null;
  lawCard: LawCard | null;
  /** 지혜 궁극: 고를 수 있는 사건 둘 */
  eventChoice: string[] | null;
  dilemmaPick?: string | null;
  pendingDilemma: unknown;
  /** 율법파가 지난 장의 말에 맞선 카드를 골랐나 (교리 또는 'vow') */
  reacted: string | null;
  vowNext: string | null;
  leader: string | null;
  judgement: string;

  // 말의 층
  revelations: Revelation[];
  lessons: Lesson[];
  petition: Petition | null;
  prophecy: { kind: string; due: number; [k: string]: unknown } | null;
  grace: { round: number; used: number };
  bannedWords: string[];
  bannedNext: string | null;
  commandments: string[];
  sacred: { word: string; clue: string } | null;
  silentRun: number;
  /** 칼이나 말씀을 이어 든 장 수 */
  streak: { doctrine: Doctrine | null; n: number } | null;
  /** 읽힘으로 얻은 율법파의 방어 (우리 선교·공격에 +0~2) */
  lawGuard: number;

  // 기적
  miracleHand: string[];
  miracleOffer: string[] | null;
  miracleUses: Record<string, number>;
  miracleUsed: boolean;
  rainActive: boolean;
  roundMods: Record<string, number | boolean>;

  // 판 밖의 목표·이야기
  destiny: { id: string; done: boolean } | null;
  destinyOffer: string[] | null;
  edictOn: boolean;
  crusadeEnd: number | null;
  prayedAt: number;
  pendingSite: unknown;
  miraDone: boolean;
  miraQuote: string | null;
  saints: unknown[];
  fallen: unknown[];
  deeds: Record<string, unknown>;
  stats: { converted: number; captured: number; miracles: number; prophecies: number; petitions: number; [k: string]: number };

  // 그 밖
  /** 대사제 성향 — 걷어냈다, 늘 'loyal' */
  priest: string;
  reinterpretUsed: boolean;
  log: LogEntry[];
  history: HistoryEntry[];
  winner: Side | 'draw' | null;
  winReason: string;
  winKind: string | null;
}

// ---------- 2. 정보 객체 ----------
// 판의 모든 정보를 주제별로 묶는다. gameInfo(state)가 매번 state에서 만들어 낸다 (읽기만 한다).
// 둘 다 못 보는 정보 — 덱의 뒷순서, 안개 속, 난이도로 가려진 뜻, 주사위 — 는 넣지 않는다.

export interface GameInfo {
  turn: TurnInfo;
  event: EventInfo;
  board: BoardInfo;
  us: UsInfo;
  enemy: EnemyInfo;
  words: WordsInfo;
  /** 건설 비용 (이번 장 기준). 지을 수 없는 것은 null */
  costs: Record<BuildKind, Resources | null>;
  /** 확인 화면의 계산값 — 계시를 받은 뒤에만 있다 */
  preview?: PreviewInfo;
}

/** 장 */
export interface TurnInfo {
  round: number;
  maxRounds: number;
  /** 막 (1~3) */
  act: number;
  /** 선공 */
  first: Side;
  /** 저울: 6점 이상 뒤져 행동 +1을 받는 쪽 */
  scale: Side | null;
}

export interface CardInfo {
  id: string;
  name: string;
  text: string;
  rule: string;
}

/** 사건과 땅의 운 */
export interface EventInfo {
  now: CardInfo;
  /** 다음 장 사건 예고 */
  next: CardInfo | null;
  /** 두 갈래 사건의 선택지 */
  choice: { id: string; label: string }[] | null;
  /** 땅의 운 (재설계 §5.2, 아직 엔진에 없다) */
  fortune: { now: FortuneInfo | null; next: FortuneInfo | null };
}

/** 땅의 운 카드 하나: 점대칭인 두 칸의 활성도를 바꾼다 */
export interface FortuneInfo {
  id: string;
  name: string;
  tiles: string[];
  to: Activity;
}

export interface BoardInfo {
  rows: number;
  cols: number;
  tiles: TileInfo[];
}

/** 안개 속 칸은 있다는 것만 안다 */
export type TileInfo = FogTileInfo | SeenTileInfo;

export interface FogTileInfo {
  id: string;
  revealed: false;
}

export interface SeenTileInfo {
  id: string;
  revealed: true;
  terrain: Terrain;
  feature: Feature | null;
  owner: Side | null;
  building: Building | null;
  wall: boolean;
  holy: boolean;
  /** 붙인 이름 */
  name: string | null;
  /** 전설 (별칭, 이야기용) */
  legend: string | null;
  activity: Activity;
  /** 절대 가치: 이 칸에서 거두면 얻는 자원 (활성도·사건을 반영) */
  value: Resources;
  /** 믿음의 표식 */
  marks: { side: Side; n: number } | null;
}

/** 우리 부족 */
export interface UsInfo {
  resources: Resources;
  /** 장마다 들어오는 것 */
  income: Resources;
  pop: number;
  popCap: number;
  /** 행동 수 */
  actions: number;
  /** 지금 규칙상 할 수 있는 일의 종류 (자원·계명·시련을 반영) */
  legalKinds: ActionKind[];
  /** 모자란 것 (넉넉한 칸은 0) */
  short: Resources;
  temple: number;
  villages: number;
  capitalHp: number;
  score: number;
  scoreParts: { key: string; n: number; w: number }[];
  doctrine: Record<Doctrine, number>;
  streak: { doctrine: Doctrine | null; n: number } | null;
  commandments: string[];
  miracles: { id: string; cost: number; uses: number; usable: boolean }[];
  prophecy: { kind: string; due: number } | null;
  destiny: { id: string; done: boolean } | null;
  /** 대사제가 배운 신의 말버릇 */
  lessons: Lesson[];
  grace: { used: number; max: number };
  /** 이어진 침묵 */
  silent: number;
  faithless: number;
}

/** 율법파의 뜻 하나 */
export interface IntentInfo {
  kind: ActionKind;
  tile: string;
}

/** 율법파 */
export interface EnemyInfo {
  /** 이번 장 뜻 — 난이도만큼 보이는 것만 */
  intents: IntentInfo[];
  /** 가려진 뜻의 수 */
  hiddenIntents: number;
  resources: Resources;
  pop: number;
  popCap: number;
  actions: number;
  temple: number;
  villages: number;
  capitalHp: number;
  score: number;
  /** 우리 선교·공격에 대한 방어 (읽힘) */
  guard: 0 | 1 | 2;
  /** 결집: 저울로 행동 +1 */
  rally: boolean;
  /** 원정이 더 닿는 칸 수 */
  march: number;
  edict: { n: number; max: number } | null;
  leader: { id: string; name: string } | null;
  /** 이번 장 율법 카드 — 해결 때 공개된다 (그 전에는 null) */
  lawCard: CardInfo | null;
  /** 지난 장의 말에 맞선 카드인가 */
  reacted: string | null;
}

/** 지난 일과 말의 층 */
export interface WordsInfo {
  /** 지난 계시 (최근 것부터) */
  revelations: { round: number; text: string }[];
  /** 지난 장에 실제로 한 일 */
  lastOrders: IntentInfo[];
  petition: { from: string; text: string; need: ActionKind | null } | null;
  /** 검열로 봉인된 낱말 */
  banned: string[];
  sacredClue: string | null;
}

/** 확인 화면의 계산값 */
export interface PreviewInfo {
  /** 계시 비용 (신앙) */
  cost: number;
  /** 이번 장에 들어올 것 */
  gains: Resources;
  /** 이번 장이 끝난 뒤 (유지까지) */
  after: Resources;
  /** 행동 key → 이길 확률 */
  odds: Record<string, number>;
  /** 행동 key → 먼저 차지해 막는다 / 빼앗긴다 */
  first: Record<string, 'block' | 'lost'>;
  /** 이 계시를 내리면 율법파가 읽는가 */
  wouldRead: boolean;
}

// ---------- 3. 누가 볼 수 있나 ----------

export type Viewer = 'player' | 'priest';

/**
 * 정보 하나를 누가 볼 수 있나.
 * - priest: 플레이어도 대사제도
 * - player: 플레이어만
 * - byDifficulty: 난이도에 따라 (예: 모자란 것 — 쉬움·보통은 대사제도, 어려움은 플레이어만)
 * - afterReveal: 공개된 뒤에만 둘 다 (예: 이번 장 율법 카드 — 해결 때 공개)
 */
export type Seen = 'priest' | 'player' | 'byDifficulty' | 'afterReveal';

/** 정보 객체의 경로 → 누가 보나. 경로는 'enemy.intents', 'board.tiles.activity'처럼 점으로 잇는다 */
export type SeenTable = Record<string, Seen>;

export interface ViewOptions {
  difficulty: Difficulty;
  /** 율법 카드가 공개됐나 (해결 단계부터) */
  revealed: boolean;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? DeepPartial<U>[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** view(info, 'priest', opts)가 돌려주는 것: 볼 수 없는 칸을 지운 정보 객체 */
export type InfoView = DeepPartial<GameInfo>;
