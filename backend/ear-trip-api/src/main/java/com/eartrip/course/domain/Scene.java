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

    /** 서사용 씬 제목 (예: '자갈밭 위의 좌판'). 잠금화면 메타데이터에 쓴다. */
    private String title;

    /**
     * 트리거 지점의 실제 장소명 (예: '부산 자갈치시장 입구').
     * title은 서사용이라 보행 중 "어디로 가라"는 안내가 안 돼서 분리했다.
     * 플레이어의 NEXT STOP·씬 헤더가 이 값을 쓰고, 없으면 title로 폴백한다.
     */
    private String landmark;

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

    /**
     * 플레이어 자막 텍스트(대본). 오디오와 함께 팔리는 프리미엄 콘텐츠라
     * audioUrl과 동일하게 잠금 씬에는 내려주지 않는다 — SceneView.of() 참조.
     *
     * length=8000: v3 확장본 기준 최장 씬이 약 1,990자다. TEXT 대신 varchar를 쓰는 건
     * ddl-auto=validate가 TEXT(LONGVARCHAR) ↔ String(VARCHAR) 매핑에서 타입 불일치로
     * 부팅을 막기 때문 — 넉넉한 varchar가 검증까지 통과하는 조합이다.
     */
    @Column(name = "script", length = 8000)
    private String script;
}
