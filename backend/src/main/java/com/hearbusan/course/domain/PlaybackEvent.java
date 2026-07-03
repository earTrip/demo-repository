package com.hearbusan.course.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "playback_event",
       indexes = @Index(name = "idx_course_type", columnList = "courseId,eventType"))
public class PlaybackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long courseId;
    private Integer sceneOrder;      // nullable (COURSE_* 이벤트)
    private String sessionId;        // 클라이언트 1회 청취 세션

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    private Instant occurredAt;

    protected PlaybackEvent() {}

    private PlaybackEvent(Long courseId, Integer sceneOrder, String sessionId, EventType eventType) {
        this.courseId = courseId;
        this.sceneOrder = sceneOrder;
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.occurredAt = Instant.now();
    }

    public static PlaybackEvent of(Long courseId, Integer sceneOrder, String sessionId, EventType type) {
        return new PlaybackEvent(courseId, sceneOrder, sessionId, type);
    }
}
