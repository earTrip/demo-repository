-- EP.01 자갈치 (판매 중) — 좌표: 통합작업문서 7-2
INSERT INTO course (id, title, subtitle, region, duration_min, distance_km, thumb_key) VALUES
  (1, '새벽, 자갈치', '자갈치 · EP.01', '자갈치', 28, 1.1, 'market');

-- trigger_type/dwell_sec/estimated_sec: 큐시트 B-1 앱 필드.
-- S3·S4는 59m 간격(S1↔S3 48m)으로 밀집해 3초 체류를 요구한다. 나머지는 이격이 커서 진입 즉시.
INSERT INTO scene (course_id, scene_order, title, lat, lng, radius_m, trigger_type, dwell_sec, estimated_sec, audio_url) VALUES
  (1, 1, '자갈밭 위의 좌판',      35.0972, 129.0298, 25, 'ENTER', NULL,  45, '/audio/ep01_s1.mp3'),
  (1, 2, '삼경에 일어나는 사람들', 35.0938, 129.0272, 30, 'ENTER', NULL,  60, '/audio/ep01_s2.mp3'),
  (1, 3, '버려지던 것들',         35.0968, 129.0300, 20, 'DWELL',    3,  45, '/audio/ep01_s3.mp3'),
  (1, 4, '오이소, 보이소',        35.0966, 129.0306, 20, 'DWELL',    3, 240, '/audio/ep01_s4.mp3'),
  (1, 5, '다리가 열리던 시절',     35.0975, 129.0345, 30, 'ENTER', NULL,  40, '/audio/ep01_s5.mp3');

INSERT INTO product (code, name, price, active) VALUES
  ('EP01', '새벽, 자갈치', 6900, true),
  ('BUSAN_BUNDLE', '부산 3편 번들', 14900, false);

INSERT INTO product_course_ids (product_code, course_ids) VALUES
  ('EP01', 1), ('BUSAN_BUNDLE', 1), ('BUSAN_BUNDLE', 2), ('BUSAN_BUNDLE', 3);
