package com.eartrip.course.repository;

import com.eartrip.course.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    @Query("select distinct c from Course c left join fetch c.scenes")
    List<Course> findAllWithScenes();

    @Query("select c from Course c left join fetch c.scenes where c.id = :id")
    Optional<Course> findByIdWithScenes(Long id);
}
