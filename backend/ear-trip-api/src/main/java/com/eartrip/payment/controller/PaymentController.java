package com.eartrip.payment.controller;

import com.eartrip.payment.service.CheckoutService;
import com.eartrip.payment.service.EntitlementService;
import com.eartrip.payment.service.PaymentConfirmService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final CheckoutService checkoutService;
    private final PaymentConfirmService confirmService;
    private final EntitlementService entitlementService;

    /** 주문 생성 — 토스 위젯 requestPayment 파라미터 반환 */
    @PostMapping("/checkout")
    public CheckoutService.CheckoutResult checkout(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody CheckoutRequest req) {
        return checkoutService.checkout(jwt.getSubject(), req.productCode());
    }

    /** successUrl 콜백 → 승인 (주문 시점에 기록된 userId로 이용권 발급, 별도 principal 불필요) */
    @PostMapping("/payments/confirm")
    public Map<String, Object> confirm(@RequestBody ConfirmRequest req) {
        confirmService.confirm(req.paymentKey(), req.orderId(), req.amount());
        return Map.of("ok", true);
    }

    /** 코스 접근 판정 — 프론트 페이월 분기 근거 */
    @GetMapping("/courses/{courseId}/access")
    public AccessResponse access(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long courseId) {
        boolean owned = entitlementService.hasAccess(jwt.getSubject(), courseId);
        return new AccessResponse(owned, EntitlementService.FREE_SCENE_ORDERS);
    }

    /** 내 보유 코스 (저장함 탭) */
    @GetMapping("/me/courses")
    public List<Long> myCourses(@AuthenticationPrincipal Jwt jwt) {
        return entitlementService.ownedCourseIds(jwt.getSubject());
    }

    public record CheckoutRequest(String productCode) {}
    public record ConfirmRequest(String paymentKey, String orderId, int amount) {}
    public record AccessResponse(boolean hasAccess, List<Integer> freeSceneOrders) {}
}
