package com.eartrip.course.repository;

import com.eartrip.course.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    /**
     * order by c.id: 정렬을 안 걸면 DB가 돌려주는 순서 그대로 나가는데, 그건 삽입 순서에
     * 좌우된다 — 시드가 준비 중 코스(2~6)를 먼저 넣는 바람에 정작 판매 중인 EP.01이
     * 홈 목록 맨 뒤로 밀렸다. 홈 카드 번호 배지도 이 순서를 그대로 쓴다.
     */
    @Query("select distinct c from Course c left join fetch c.scenes order by c.id")
    List<Course> findAllWithScenes();

    @Query("select c from Course c left join fetch c.scenes where c.id = :id")
    Optional<Course> findByIdWithScenes(Long id);
}
