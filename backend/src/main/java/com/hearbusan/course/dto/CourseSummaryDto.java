package com.hearbusan.course.dto;

public record CourseSummaryDto(
        Long id,
        int no,
        String title,
        String subtitle,
        String region,
        int durationMin,
        double distanceKm,
        int sceneCount,
        String thumb
) {}
