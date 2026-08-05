package com.eartrip.course.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 지오펜스 트리거 조건 (큐시트 B-1).
 * - ENTER: 반경 진입 즉시 발동
 * - DWELL: 반경 안에서 dwellSec 체류 후 발동 — 밀집 지역(S3·S4) 오탐 방지
 *
 * 와이어 포맷은 소문자다 ("enter"/"dwell"). 클라이언트 geo.js가
 * `s.triggerType === "dwell"`로 비교하므로, 대문자로 나가면 전 씬이 조용히
 * enter로 떨어져 체류 조건이 사라진다 — @JsonValue를 제거하지 말 것.
 */
public enum TriggerType {
    ENTER, DWELL;

    @JsonValue
    public String wireValue() {
        return name().toLowerCase();
    }
}
