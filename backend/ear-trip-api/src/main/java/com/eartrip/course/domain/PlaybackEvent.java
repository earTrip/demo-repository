package com.eartrip.course.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "playback_event", indexes = @Index(name = "idx_course_type", columnList = "courseId,eventType"))
@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED) @AllArgsConstructor @Builder
public class PlaybackEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long courseId;
    private Integer sceneOrder;  // nullable (COURSE_* 이벤트)
    private String sessionId;    // 클라이언트 1회 청취 세션

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    private Instant occurredAt;

    public static PlaybackEvent of(Long courseId, Integer sceneOrder, String sessionId, EventType type) {
        return PlaybackEvent.builder()
                .courseId(courseId)
                .sceneOrder(sceneOrder)
                .sessionId(sessionId)
                .eventType(type)
                .occurredAt(Instant.now())
                .build();
    }
}
