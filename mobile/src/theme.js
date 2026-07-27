/**
 * 앱 공용 디자인 토큰.
 * 두 레퍼런스의 색을 문맥별로 나눠 쓴다 (사용자 지시: "각각의 색깔로"):
 *  - purple  : 앱 셸/홈/코스 상세/내비게이션 (해운대.png)
 *  - orange  : 플레이어/지오펜스 진행 문맥 (자갈치.png)
 */
export const colors = {
  // 해운대 — 퍼플 계열 (브랜드/내비)
  purple: '#6C4CE0',
  purpleDeep: '#5334C9',
  purpleHeader: '#8878E8',
  purpleSoft: '#EEE9FC',

  // 자갈치 — 오렌지 계열 (플레이어)
  orange: '#E0863C',
  orangeDeep: '#C46E24',
  orangeSoft: '#FBEEE0',

  // 뉴트럴
  ink: '#1B1B1F',
  inkMid: '#4A4E5A',
  inkSoft: '#6B7280', // 흰 배경 대비 ~4.6:1 (WCAG AA 통과 — 보조 텍스트용)
  line: '#ECECF0',
  bg: '#FFFFFF',
  bgSoft: '#F5F6F8',
  white: '#FFFFFF',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };

/** 4pt 스페이싱 스케일 */
export const space = (n) => n * 4;

export const font = {
  brand: { fontSize: 26, fontWeight: '800' },
  h1: { fontSize: 24, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  meta: { fontSize: 12, fontWeight: '400' },
};

/** 카드/플로팅 요소 공용 그림자 (iOS shadow* + Android elevation) */
export const shadow = {
  card: {
    shadowColor: '#1B1B1F',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  float: {
    shadowColor: '#1B1B1F',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};

/** 지역 → 히어로/썸네일 그라디언트 대체 단색 (실사진 배선 전 플레이스홀더) */
export const regionTint = {
  자갈치: '#E7A977',
  광안리: '#6E86C8',
  영도: '#6FB4C4',
  보수동: '#C58C6A',
  해운대: '#4FA3C7',
  서면: '#7E8AA8',
  부산: '#8878E8',
};
