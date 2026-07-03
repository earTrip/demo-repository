package com.hearbusan.course.dto;

import com.hearbusan.course.domain.EventType;
import jakarta.validation.constraints.NotNull;

public record PlaybackEventRequest(
        @NotNull String sessionId,
        Integer sceneOrder,          // COURSE_* 이벤트는 null 허용
        @NotNull EventType eventType
) {}
