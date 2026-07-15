-- 승인 중 프로세스가 죽으면 주문이 IN_PROGRESS로 굳어 재시도도 회수도 안 된다.
-- 회수 스윕이 '언제부터 굳었는지' 판단할 기준 시각.
ALTER TABLE purchase_order
    ADD COLUMN claimed_at datetime(6) NULL;
