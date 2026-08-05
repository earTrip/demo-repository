package com.eartrip.payment.service;

import com.eartrip.payment.domain.Entitlement;
import com.eartrip.payment.repository.EntitlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EntitlementService {

    /** 프리미엄 정책: 씬 1~2 무료, S4 절정 직전 페이월 */
    public static final List<Integer> FREE_SCENE_ORDERS = List.of(1, 2);

    private final EntitlementRepository entitlementRepository;

    @Transactional
    public void grantAll(String userId, List<Long> courseIds, String orderId) {
        for (Long cid : courseIds) {
            if (entitlementRepository.existsByUserIdAndCourseId(userId, cid)) continue;
            try {
                entitlementRepository.save(Entitlement.builder()
                        .userId(userId)
                        .courseId(cid)
                        .orderId(orderId)
                        .grantedAt(LocalDateTime.now())
                        .build());
            } catch (DataIntegrityViolationException e) {
                // 동시 발급 레이스: unique(userId, courseId) 제약이 최종 방어선 — 이미 보유이므로 무시
            }
        }
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(String userId, Long courseId) {
        return entitlementRepository.existsByUserIdAndCourseId(userId, courseId);
    }

    @Transactional(readOnly = true)
    public List<Long> ownedCourseIds(String userId) {
        return entitlementRepository.findAllByUserId(userId).stream()
                .map(Entitlement::getCourseId)
                .toList();
    }
}
