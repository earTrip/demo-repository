package com.hearbusan.course.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeoUtilsTest {

    @Test
    void distanceMeters_knownPoints() {
        // 자갈치 씬1 → 씬4 사이 거리는 대략 90~100m 수준
        double d = GeoUtils.distanceMeters(35.0972, 129.0298, 35.0966, 129.0306);
        assertEquals(95, d, 20);
    }

    @Test
    void distanceMeters_samePoint_isZero() {
        assertEquals(0.0, GeoUtils.distanceMeters(35.0, 129.0, 35.0, 129.0), 1e-9);
    }
}
