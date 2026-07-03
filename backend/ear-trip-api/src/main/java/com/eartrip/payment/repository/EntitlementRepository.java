package com.eartrip.payment.repository;

import com.eartrip.payment.domain.Entitlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EntitlementRepository extends JpaRepository<Entitlement, Long> {
    boolean existsByUserIdAndCourseId(String userId, Long courseId);
    List<Entitlement> findAllByUserId(String userId);
}
