-- 코스에 hero_key(사진)·description(소개)·tags 추가.
--
-- 이 세 필드는 목 데이터에만 있고 백엔드에는 없었다. 그래서 백엔드가 살아나는 순간
-- 홈 카드 사진과 상세 히어로 사진이 사라지고 소개가 '준비 중'으로 떨어졌다 —
-- 에러 없이 조용히, 폴백이 성공 응답과 구분되지 않아서 원인을 찾기 어려웠다.
--
-- hero_key: 번들된 실사진 키. 앱의 HERO_IMAGES 매핑 테이블 키와 1:1이다
--   (require가 정적 경로만 허용해 이미지 자체는 앱 번들에 있고, 서버는 키만 내려준다).
ALTER TABLE course
    ADD COLUMN hero_key varchar(255) NULL;
ALTER TABLE course
    ADD COLUMN description varchar(4000) NULL;

CREATE TABLE course_tags (
    course_id bigint not null,
    tags varchar(255)
) engine=InnoDB;

ALTER TABLE course_tags
    ADD CONSTRAINT FK_course_tags_course FOREIGN KEY (course_id) REFERENCES course (id);

UPDATE course SET
    hero_key = 'jagalchi',
    description = '부산에서 시장이라고 하면 가장 먼저 떠오르는 이름, 바로 자갈치 시장입니다. 새벽 세 시, 남들이 가장 깊이 잠든 시간에 하루를 여는 사람들의 이야기를 따라 걷습니다.

파도에 닳아 동글동글해진 자갈이 깔려 있던 자리에 좌판을 펴면서 시작된 이름 "자갈치". 다섯 개의 지점을 지나며 시장의 백 년을 귀로 듣는 코스입니다.'
 WHERE id = 1;

-- Flyway는 data.sql보다 먼저 돈다. 로컬(H2)에서는 이 시점에 course 테이블이 비어 있어서
-- 값을 그대로 INSERT하면 FK 위반으로 마이그레이션 자체가 실패한다(V4의 UPDATE는 조용히
-- 0행을 스쳤지만 INSERT는 죽는다). course가 실제로 있을 때만 넣도록 SELECT로 감싼다 —
-- 즉 여기는 이미 행이 있는 환경(운영)용이고, 로컬 시드는 data.sql이 담당한다.
INSERT INTO course_tags (course_id, tags)
SELECT c.id, v.tag
  FROM course c
 CROSS JOIN (
        SELECT '부산' AS tag
  UNION ALL SELECT '중구'
  UNION ALL SELECT '자갈치'
  UNION ALL SELECT '자갈치시장'
  UNION ALL SELECT '수산시장'
 ) v
 WHERE c.id = 1;
