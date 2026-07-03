-- 좌표는 근사값. 반드시 현장 답사(보행 QA)로 재보정할 것.
INSERT INTO course (id, title, subtitle, region, duration_min, distance_km, thumb_key) VALUES
(1, '자갈치 시장',  '새벽, 자갈치 · EP.01',    '자갈치', 28, 1.1, 'market'),
(2, '광안대교',     '광안리 · EP.02(예정)',    '광안리', 35, 1.4, 'bridge'),
(3, '광안리 해변',  '부산 · EP.03(예정)',      '광안리', 40, 2.0, 'beach');

INSERT INTO scene (course_id, scene_order, title, lat, lng,
                   radius_m, exit_radius_m, audio_url, fallback_text) VALUES
(1, 1, '자갈밭 위의 좌판',       35.0972, 129.0298, 25, 45, '/audio/s1.wav', '지금 이 자리는 백 년 전 바다였습니다.'),
(1, 2, '삼경에 일어나는 사람들', 35.0938, 129.0272, 30, 55, '/audio/s2.wav', '새벽 다섯 시, 시장이 가장 뜨거운 시간.'),
(1, 3, '버려지던 것들',          35.0968, 129.0300, 20, 40, '/audio/s3.wav', '이 냄새는 곰장어 굽는 냄새입니다.'),
(1, 4, '오이소, 보이소',         35.0966, 129.0306, 20, 40, '/audio/s4.wav', '오이소 보이소 사이소, 그 유명한 소리.'),
(1, 5, '다리가 열리던 시절',     35.0975, 129.0345, 30, 55, '/audio/s5.wav', '저기 영도대교가 보입니다.');
