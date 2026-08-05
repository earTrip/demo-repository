package com.eartrip.course.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Course {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String subtitle;
    private String region;
    private int durationMin;
    private double distanceKm;
    private String thumbKey;

    /**
     * 번들된 실사진 키 (예: 'jagalchi'). 앱의 HERO_IMAGES 매핑 테이블 키와 1:1이다 —
     * require가 정적 경로만 허용해 이미지는 앱 번들에 있고 서버는 키만 내려준다.
     * 비어 있으면 홈 카드·상세 화면이 사진 없이 배경색만 남는다.
     */
    private String heroKey;

    /** 코스 상세 소개문. 없으면 화면이 '준비 중'으로 떨어진다. */
    @Column(length = 4000)
    private String description;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "course_tags", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "tags")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL)
    @OrderBy("sceneOrder ASC")
    @Builder.Default
    private List<Scene> scenes = new ArrayList<>();
}
