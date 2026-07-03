package com.hearbusan.course.dto;

public record SceneResponse(
        Long sceneId,
        int order,
        String title,
        double lat,
        double lng,
        int radiusM,
        int exitRadiusM,
        String audioUrl,
        String fallbackText
) {}
