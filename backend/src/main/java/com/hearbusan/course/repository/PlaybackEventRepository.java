package com.hearbusan.course.repository;

import com.hearbusan.course.domain.EventType;
import com.hearbusan.course.domain.PlaybackEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaybackEventRepository extends JpaRepository<PlaybackEvent, Long> {
    long countByCourseIdAndEventType(Long courseId, EventType eventType);
}
