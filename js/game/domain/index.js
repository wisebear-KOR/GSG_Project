// @ts-check
// 도메인 영역의 입구: 게임이 쓰는 모든 정보의 정의(./types.d.ts)와 그 정보를 만드는 함수.
// 화면(main.js·board.js)·해석기(interpreter.js)·엔진의 자원 셈·도구는 정보를 여기서 받는다.
//   resources.js  자원 묶음 Res — 비용·수입·유지·미리보기·결산의 셈
//   kinds.js      일의 종류 12가지 — 칸에 묶이지 않은 일
//   info.js       정보 객체 — 판 설정, 장, 사건, 판·칸, 진영, 율법파의 뜻, 말의 층, 비용, 확인 화면, 결산
//   seen.js       누가 볼 수 있나 — 플레이어만 / 대사제도

export { RES_KEYS, Res } from './resources.js';
export { KINDS, kindOf, kindParts, fromKey, isHomeAct } from './kinds.js';
export {
  setupInfo, turnInfo, eventInfo, tileInfo, boardInfo, sideInfo, usInfo, intentsInfo, enemyInfo, wordsInfo, speechInfo,
  nextLawInfo, costsInfo, gameInfo, previewInfo, ledgerInfo, MIRACLE_PREVIEW_GAIN,
} from './info.js';
export { SEEN, seenOf, view } from './seen.js';
