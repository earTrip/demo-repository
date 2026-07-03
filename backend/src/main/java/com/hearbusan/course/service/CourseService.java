package com.hearbusan.course.service;

import com.hearbusan.course.domain.Course;
import com.hearbusan.course.domain.Scene;
import com.hearbusan.course.dto.CourseResponse;
import com.hearbusan.course.dto.SceneResponse;
import com.hearbusan.course.repository.CourseRepository;
import com.hearbusan.course.web.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourse(Long id) {
        Course course = courseRepository.findWithScenesById(id)
                .orElseThrow(() -> new NotFoundException("course not found: " + id));
        return toResponse(course);
    }

    private CourseResponse toResponse(Course c) {
        List<SceneResponse> scenes = c.getScenes().stream()
                .map(this::toSceneResponse)
                .toList();
        return new CourseResponse(
                c.getId(), c.getTitle(), c.getRegion(),
                c.getDurationMin(), c.getDistanceKm(), scenes);
    }

    private SceneResponse toSceneResponse(Scene s) {
        return new SceneResponse(
                s.getId(), s.getSceneOrder(), s.getTitle(),
                s.getLat(), s.getLng(),
                s.getRadiusM(), s.getExitRadiusM(),
                s.getAudioUrl(), s.getFallbackText());
    }
}
