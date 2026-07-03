package com.eartrip.payment.controller;

import com.eartrip.payment.service.CheckoutService;
import com.eartrip.payment.service.EntitlementService;
import com.eartrip.payment.service.PaymentConfirmService;
import lombok.RequiredArgsConstructor;
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
            @RequestHeader("X-Device-Id") String userId,
            @RequestBody CheckoutRequest req) {
        return checkoutService.checkout(userId, req.productCode());
    }

    /** successUrl 콜백 → 승인 */
    @PostMapping("/payments/confirm")
    public Map<String, Object> confirm(@RequestBody ConfirmRequest req) {
        confirmService.confirm(req.paymentKey(), req.orderId(), req.amount());
        return Map.of("ok", true);
    }

    /** 코스 접근 판정 — 프론트 페이월 분기 근거 */
    @GetMapping("/courses/{courseId}/access")
    public AccessResponse access(
            @RequestHeader("X-Device-Id") String userId,
            @PathVariable Long courseId) {
        boolean owned = entitlementService.hasAccess(userId, courseId);
        return new AccessResponse(owned, EntitlementService.FREE_SCENE_ORDERS);
    }

    /** 내 보유 코스 (저장함 탭) */
    @GetMapping("/me/courses")
    public List<Long> myCourses(@RequestHeader("X-Device-Id") String userId) {
        return entitlementService.ownedCourseIds(userId);
    }

    public record CheckoutRequest(String productCode) {}
    public record ConfirmRequest(String paymentKey, String orderId, int amount) {}
    public record AccessResponse(boolean hasAccess, List<Integer> freeSceneOrders) {}
}
