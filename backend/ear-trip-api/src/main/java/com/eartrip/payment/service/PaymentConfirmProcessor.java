package com.eartrip.payment.service;

import com.eartrip.payment.domain.Payment;
import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PaymentRepository;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * confirm의 DB 단계 전담. 각 메서드가 독립 트랜잭션으로 커밋되므로
 * 토스 HTTP 호출(외부 I/O)이 DB 트랜잭션·커넥션을 점유하지 않고,
 * FAILED 같은 상태 기록이 예외 롤백에 휩쓸리지 않는다.
 */
@Component
@RequiredArgsConstructor
public class PaymentConfirmProcessor {

    private final PurchaseOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final EntitlementService entitlementService;

    public enum ClaimStatus { CLAIMED, ALREADY_DONE, TAMPERED }
    public record ClaimResult(ClaimStatus status) {}

    /**
     * 주문 클레임: 행 잠금으로 동시 confirm을 직렬화하고 IN_PROGRESS로 전이.
     * 금액 위변조는 FAILED를 '커밋'한 뒤 TAMPERED를 반환한다
     * (여기서 바로 throw하면 롤백되어 FAILED가 저장되지 않음 — 기존 버그).
     */
    @Transactional
    public ClaimResult claim(String orderId, int clientAmount) {
        if (paymentRepository.existsByOrderId(orderId)) {
            return new ClaimResult(ClaimStatus.ALREADY_DONE); // 멱등
        }
        PurchaseOrder order = orderRepository.findWithLockByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문 없음: " + orderId));

        if (order.isPaid()) return new ClaimResult(ClaimStatus.ALREADY_DONE);
        if (order.isInProgress())
            throw new IllegalStateException("결제 승인 처리 중인 주문: " + orderId);
        if (!order.isPending())
            throw new IllegalStateException("이미 처리된 주문: " + orderId);

        if (!order.amountMatches(clientAmount)) {
            order.markFailed();                      // 이 트랜잭션이 커밋되며 확정 저장
            return new ClaimResult(ClaimStatus.TAMPERED);
        }
        order.markInProgress();
        return new ClaimResult(ClaimStatus.CLAIMED);
    }

    /** 승인 성공 기록: 결제 스냅샷 + PAID 전이 + 이용권 발급 (원자적) */
    @Transactional
    public void recordSuccess(String orderId, TossPaymentsClient.TossConfirmResponse res) {
        PurchaseOrder order = orderRepository.findWithLockByOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("주문 유실: " + orderId));

        paymentRepository.save(Payment.builder()
                .paymentKey(res.paymentKey())
                .orderId(res.orderId())
                .amount(res.totalAmount())
                .method(res.method())
                .rawStatus(res.status())
                .approvedAt(LocalDateTime.now())
                .build());
        order.markPaid();

        Product product = productRepository.findById(order.getProductCode())
                .orElseThrow(() -> new IllegalStateException("상품 없음: " + order.getProductCode()));
        entitlementService.grantAll(order.getUserId(), product.getCourseIds(), orderId);
    }

    /**
     * 승인 실패 기록.
     * @param definitive true  — 토스가 거절(4xx): FAILED 확정
     *                   false — 네트워크 등 일시 장애: PENDING 복귀로 재시도 허용
     */
    @Transactional
    public void recordFailure(String orderId, boolean definitive) {
        orderRepository.findWithLockByOrderId(orderId).ifPresent(order -> {
            if (definitive) order.markFailed();
            else order.revertToPending();
        });
    }
}
