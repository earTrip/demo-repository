package com.eartrip.course.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Scene {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    private int sceneOrder;
    private String title;
    private double lat;
    private double lng;
    @Column(name = "radius_m", nullable = false)
    private int radiusM;
    private String audioUrl;

    /** 큐시트 B-1 트리거 조건. 미지정 씬은 진입 즉시(ENTER). */
    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false)
    private TriggerType triggerType;

    /** DWELL일 때만 의미 있는 체류 시간(초). ENTER면 null. */
    @Column(name = "dwell_sec")
    private Integer dwellSec;

    /** 예상 낭독 길이(초) — 큐시트 B-1. 트리거 충돌 검토·UI 표시에 쓴다. */
    @Column(name = "estimated_sec")
    private Integer estimatedSec;
}
