package com.hearbusan.course.dto;

import java.util.List;

public record CourseResponse(
        Long id,
        String title,
        String region,
        Integer durationMin,
        Double distanceKm,
        List<SceneResponse> scenes
) {}
