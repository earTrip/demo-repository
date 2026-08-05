-- 1) 결제 confirm 클레임 상태(IN_PROGRESS) 추가.
--    PurchaseOrder.Status에 IN_PROGRESS를 넣었는데 컬럼 enum이 그대로라
--    markInProgress()가 저장되지 않는다 (Value not permitted for column).
ALTER TABLE purchase_order
    MODIFY status enum ('CANCELED','FAILED','IN_PROGRESS','PAID','PENDING');

-- 2) 큐시트 B-1의 앱 필드(triggerType·dwellSec·estimatedSec)를 스키마에 반영.
--    지금까지 이 컬럼들이 없어 서버가 내려주는 코스는 전 씬이 'enter'로 떨어졌다 —
--    밀집 지역(S3·S4) 오탐 방지가 무력화된 상태였고, 에러 없이 조용히 그랬다.
--    dwell_sec은 trigger_type='DWELL'일 때만 의미가 있어 NULL 허용.
ALTER TABLE scene
    ADD COLUMN trigger_type enum ('ENTER','DWELL') NOT NULL DEFAULT 'ENTER';
ALTER TABLE scene
    ADD COLUMN dwell_sec integer NULL;
ALTER TABLE scene
    ADD COLUMN estimated_sec integer NULL;

-- EP.01 자갈치: S3·S4는 반경 20m가 서로 59m 거리로 근접하고 좌판 밀집 구역이라
-- 3초 체류를 요구해 '지나가기만 한 보행자' 오발동을 막는다 (큐시트 B-1).
UPDATE scene SET trigger_type = 'DWELL', dwell_sec = 3
 WHERE course_id = 1 AND scene_order IN (3, 4);

-- 낭독 길이(큐시트 B-1: 공백 제거 글자수 ÷ 315자/분 + 쉼 가산)
UPDATE scene SET estimated_sec = CASE scene_order
    WHEN 1 THEN 45 WHEN 2 THEN 60 WHEN 3 THEN 45 WHEN 4 THEN 240 WHEN 5 THEN 40 END
 WHERE course_id = 1;
