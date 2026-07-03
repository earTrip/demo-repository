package com.eartrip.course.controller;

import com.eartrip.course.domain.Course;
import com.eartrip.course.dto.CourseDtos;
import com.eartrip.course.repository.CourseRepository;
import com.eartrip.payment.service.EntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final EntitlementService entitlementService;

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
    public CourseDtos.Detail detail(@RequestHeader("X-Device-Id") String userId,
                                    @PathVariable Long id) {
        Course c = courseRepository.findByIdWithScenes(id)
                .orElseThrow(() -> new IllegalArgumentException("코스 없음: " + id));

        boolean owned = entitlementService.hasAccess(userId, id);

        List<CourseDtos.SceneView> scenes = c.getScenes().stream()
                .map(s -> CourseDtos.SceneView.of(s,
                        owned || EntitlementService.FREE_SCENE_ORDERS.contains(s.getSceneOrder())))
                .toList();

        return new CourseDtos.Detail(c.getId(), c.getTitle(), c.getRegion(),
                c.getDurationMin(), c.getDistanceKm(), owned, scenes);
    }
}
