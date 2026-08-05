package com.eartrip.course.controller;

import com.eartrip.course.domain.Course;
import com.eartrip.course.dto.CourseDtos;
import com.eartrip.course.repository.CourseRepository;
import com.eartrip.course.service.PlaybackEventService;
import com.eartrip.payment.service.EntitlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final EntitlementService entitlementService;
    private final PlaybackEventService playbackEventService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourseDtos.Summary> list(@RequestParam(required = false) String region) {
        return courseRepository.findAllWithScenes().stream()
                .filter(c -> region == null || region.isBlank() || region.equals(c.getRegion()))
                .map(CourseDtos.Summary::from)
                .toList();
    }

    /** 씬별 잠금 여부를 서버가 판정해 내려줌 — 프론트는 locked만 따른다 */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public CourseDtos.Detail detail(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable Long id) {
        Course c = courseRepository.findByIdWithScenes(id)
                .orElseThrow(() -> new IllegalArgumentException("코스 없음: " + id));

        // jwt는 보통 null이 아니다(이 엔드포인트는 인증 필수). 개발 스위치
        // app.dev.permit-anonymous-course-detail=true일 때만 null로 들어오며,
        // 그 경우 보유 코스가 없는 비로그인 사용자로 취급한다 — 무료 씬만 열린다.
        String userId = jwt != null ? jwt.getSubject() : null;
        boolean owned = userId != null && entitlementService.hasAccess(userId, id);

        List<CourseDtos.SceneView> scenes = c.getScenes().stream()
                .map(s -> CourseDtos.SceneView.of(s,
                        owned || EntitlementService.FREE_SCENE_ORDERS.contains(s.getSceneOrder())))
                .toList();

        return new CourseDtos.Detail(c.getId(), c.getTitle(), c.getRegion(),
                c.getDurationMin(), c.getDistanceKm(), owned,
                // tags는 @ElementCollection(LAZY)이고 open-in-view=false라, 컬렉션 객체를 그대로
                //넘기면 트랜잭션 종료 후 Jackson이 건드리는 순간 LazyInitializationException이 난다.
                // 여기서 복사해 트랜잭션 안에서 초기화를 강제한다.
                c.getHeroKey(), c.getDescription(), List.copyOf(c.getTags()), scenes);
    }

    /** 완주율 계측 이벤트 기록 — 모바일 오프라인 큐(eventQueue.js)가 posting */
    @PostMapping("/{id}/events")
    public ResponseEntity<Void> recordEvent(@PathVariable Long id,
                                            @Valid @RequestBody CourseDtos.PlaybackEventRequest req) {
        playbackEventService.record(id, req);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/stats")
    public CourseDtos.CourseStats stats(@PathVariable Long id) {
        return playbackEventService.stats(id);
    }
}
