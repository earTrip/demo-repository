-- 준비 중인 코스 5개를 백엔드 시드로 옮긴다.
--
-- 지금까지 홈 목록의 코스 6개는 앱 목 데이터에만 있었다. 백엔드가 응답하면 목록이
-- 백엔드 것으로 교체되면서 EP.01 하나만 남았다 — 앱은 멀쩡한데 화면만 허전해진다.
--
-- 씬(scene)은 넣지 않는다. EP.02~04는 대본 v1까지만 나왔고 녹음·좌표 재보정 전이며,
-- 해운대·서면은 대본도 준비 중이다. 따라서 sceneCount는 0으로 나가고 상세 화면의
-- 지점 목록도 비어 있다 — 의도된 상태다. 씬이 생기면 그때 채운다.
INSERT INTO course (id, title, subtitle, region, duration_min, distance_km, thumb_key, hero_key, description) VALUES
  (2, '광안리 밤바다', '밤의 다리, 광안리 · EP.02(대본)', '광안리', 30, 1.4, 'bridge', 'gwangalli',
   '광안대교의 불빛이 바다 위로 부서지는 밤, 광안리를 걷습니다. 다리가 놓이기 전과 후, 이 바다가 품어 온 이야기를 들려드립니다.

(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)'),
  (3, '흰여울 마을', '흰여울, 절벽 위의 방 · EP.03(대본)', '영도', 20, 0.5, 'beach', 'huinyeoul',
   '절벽 위에 아슬아슬하게 붙은 방들, 흰여울 마을. 피란의 시절부터 이어져 온 삶의 결을 좁은 골목을 따라 더듬어 갑니다.

(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)'),
  (4, '보수동 책방골목', '헌책 냄새, 보수동 · EP.04(대본)', '보수동', 25, 0.5, 'market', 'bosudong',
   '헌책 냄새가 골목을 가득 채우는 보수동 책방골목. 한 권의 책이 여러 사람의 손을 거쳐 온 시간을, 책방 주인들의 목소리로 만납니다.

(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)'),
  (5, '해운대 해수욕장', '여름, 해운대 · 준비 중', '해운대', 26, 1.2, 'beach', 'haeundae',
   '부산에서 해수욕장이라고 하면 가장 먼저 떠오르는 이름, 해운대입니다. 파라솔이 끝없이 늘어선 백사장과 뒤로 솟은 마천루가 한 장면에 담기는 곳이죠.

너른 모래밭을 걸으며 파도 소리에 실린 이야기를 듣는 코스로 준비하고 있습니다.

(대본 준비 중 · 녹음 및 좌표 배선 전)'),
  (6, '서면 번화가', '골목마다 불빛, 서면 · 준비 중', '서면', 24, 1.0, 'market', 'seomyeon',
   '간판 불빛이 골목을 가득 메우는 부산의 한복판, 서면입니다. 낮과 밤의 표정이 가장 다른 동네죠.

먹자골목과 지하상가, 사람 물결을 따라 걸으며 도시의 리듬을 듣는 코스로 준비하고 있습니다.

(대본 준비 중 · 녹음 및 좌표 배선 전)');

-- V5와 같은 이유로 SELECT를 거친다: Flyway가 data.sql보다 먼저 돌아서 로컬에서는 위 INSERT가
-- 아직 없는 상태일 수 있고, 그때 값을 그대로 넣으면 FK 위반으로 마이그레이션이 죽는다.
INSERT INTO course_tags (course_id, tags)
SELECT c.id, v.tag
  FROM course c
 CROSS JOIN (
        SELECT 2 AS cid, '부산' AS tag
  UNION ALL SELECT 2, '수영구'   UNION ALL SELECT 2, '광안리'   UNION ALL SELECT 2, '광안대교' UNION ALL SELECT 2, '밤바다'
  UNION ALL SELECT 3, '부산'     UNION ALL SELECT 3, '영도구'   UNION ALL SELECT 3, '흰여울'   UNION ALL SELECT 3, '흰여울문화마을' UNION ALL SELECT 3, '절영해안'
  UNION ALL SELECT 4, '부산'     UNION ALL SELECT 4, '중구'     UNION ALL SELECT 4, '보수동'   UNION ALL SELECT 4, '책방골목' UNION ALL SELECT 4, '헌책방'
  UNION ALL SELECT 5, '부산'     UNION ALL SELECT 5, '부산광역시' UNION ALL SELECT 5, '해운대구' UNION ALL SELECT 5, '해운대' UNION ALL SELECT 5, '해운대해수욕장'
  UNION ALL SELECT 6, '부산'     UNION ALL SELECT 6, '부산진구' UNION ALL SELECT 6, '서면'     UNION ALL SELECT 6, '서면번화가' UNION ALL SELECT 6, '먹자골목'
 ) v
 WHERE c.id = v.cid;
