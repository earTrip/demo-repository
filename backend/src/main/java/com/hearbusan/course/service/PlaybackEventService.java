package com.hearbusan.course.service;

import com.hearbusan.course.domain.EventType;
import com.hearbusan.course.domain.PlaybackEvent;
import com.hearbusan.course.dto.CourseStats;
import com.hearbusan.course.dto.PlaybackEventRequest;
import com.hearbusan.course.repository.PlaybackEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaybackEventService {

    private final PlaybackEventRepository eventRepository;

    public PlaybackEventService(PlaybackEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public void record(Long courseId, PlaybackEventRequest req) {
        eventRepository.save(
                PlaybackEvent.of(courseId, req.sceneOrder(), req.sessionId(), req.eventType()));
    }

    @Transactional(readOnly = true)
    public CourseStats stats(Long courseId) {
        long starts = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_START);
        long completions = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_COMPLETE);
        double rate = starts == 0 ? 0.0 : (double) completions / starts;
        return new CourseStats(starts, completions, rate);
    }
}
