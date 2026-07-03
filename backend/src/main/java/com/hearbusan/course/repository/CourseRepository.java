package com.hearbusan.course.repository;

import com.hearbusan.course.domain.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    @EntityGraph(attributePaths = "scenes")   // N+1 방지
    Optional<Course> findWithScenesById(Long id);

    @Query("select distinct c from Course c left join fetch c.scenes order by c.id")
    List<Course> findAllWithScenes();
}
