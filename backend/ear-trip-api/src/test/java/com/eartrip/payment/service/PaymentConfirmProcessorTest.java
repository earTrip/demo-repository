package com.eartrip.payment.service;

import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PaymentRepository;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import com.eartrip.payment.service.PaymentConfirmProcessor.ClaimStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/** DB 단계 검증: 클레임 상태 전이·위변조 FAILED 커밋·성공 기록 */
@ExtendWith(MockitoExtension.class)
class PaymentConfirmProcessorTest {

    @Mock PurchaseOrderRepository orderRepository;
    @Mock ProductRepository productRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock EntitlementService entitlementService;
    @InjectMocks PaymentConfirmProcessor processor;

    private static final Product EP01 =
            Product.builder().code("EP01").name("새벽, 자갈치").price(6900).courseIds(List.of(1L)).active(true).build();

    private PurchaseOrder pendingOrder() {
        return PurchaseOrder.create("order-1", "device-1", EP01);
    }

    @Test
    @DisplayName("클레임 성공 시 주문을 IN_PROGRESS로 전이한다 (동시 confirm 차단)")
    void claim_marksInProgress() {
        PurchaseOrder order = pendingOrder();
        given(paymentRepository.existsByOrderId("order-1")).willReturn(false);
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        var result = processor.claim("order-1", 6900);

        assertThat(result.status()).isEqualTo(ClaimStatus.CLAIMED);
        assertThat(order.isInProgress()).isTrue();
    }

    @Test
    @DisplayName("금액 불일치면 예외 없이 FAILED로 전이하고 TAMPERED를 반환한다 — 롤백에 휩쓸리지 않도록")
    void claim_tamperedAmount_persistsFailed() {
        PurchaseOrder order = pendingOrder();
        given(paymentRepository.existsByOrderId("order-1")).willReturn(false);
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        var result = processor.claim("order-1", 100);

        assertThat(result.status()).isEqualTo(ClaimStatus.TAMPERED);
        assertThat(order.getStatus()).isEqualTo(PurchaseOrder.Status.FAILED);
    }

    @Test
    @DisplayName("결제 기록이 이미 있으면 ALREADY_DONE (잠금 조회조차 하지 않음)")
    void claim_existingPayment_isAlreadyDone() {
        given(paymentRepository.existsByOrderId("order-1")).willReturn(true);

        assertThat(processor.claim("order-1", 6900).status()).isEqualTo(ClaimStatus.ALREADY_DONE);
    }

    @Test
    @DisplayName("IN_PROGRESS 주문을 다시 클레임하면 409성 예외 (이중 승인 방지)")
    void claim_inProgress_conflicts() {
        PurchaseOrder order = pendingOrder();
        order.markInProgress();
        given(paymentRepository.existsByOrderId("order-1")).willReturn(false);
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        assertThatThrownBy(() -> processor.claim("order-1", 6900))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("처리 중");
    }

    @Test
    @DisplayName("recordSuccess: 결제 스냅샷 저장 + PAID 전이 + 이용권 발급을 한 트랜잭션에서 수행")
    void recordSuccess_grantsEntitlement() {
        PurchaseOrder order = pendingOrder();
        order.markInProgress();
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));
        given(productRepository.findById("EP01")).willReturn(Optional.of(EP01));

        processor.recordSuccess("order-1",
                new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "DONE", "카드", 6900, "2026-07-16T12:00:00"));

        assertThat(order.isPaid()).isTrue();
        verify(paymentRepository).save(argThat(p -> p.getPaymentKey().equals("pk-1") && p.getAmount() == 6900));
        verify(entitlementService).grantAll("device-1", List.of(1L), "order-1");
    }

    @Test
    @DisplayName("recordSuccess는 멱등하다 — 회수 스윕이 겹쳐도 결제를 두 번 기록하지 않는다")
    void recordSuccess_isIdempotent() {
        PurchaseOrder order = pendingOrder();
        order.markInProgress();
        order.markPaid(); // 앞선 호출이 이미 처리
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        processor.recordSuccess("order-1",
                new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "DONE", "카드", 6900, "2026-07-16T12:00:00"));

        verify(paymentRepository, never()).save(any());
        verify(entitlementService, never()).grantAll(any(), any(), any());
    }

    @Test
    @DisplayName("recordFailure(definitive=false): 일시 장애는 PENDING 복귀로 재시도를 허용한다")
    void recordFailure_transient_revertsToPending() {
        PurchaseOrder order = pendingOrder();
        order.markInProgress();
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        processor.recordFailure("order-1", false);

        assertThat(order.isPending()).isTrue();
    }

    @Test
    @DisplayName("recordFailure(definitive=true): 토스 거절은 FAILED 확정")
    void recordFailure_definitive_marksFailed() {
        PurchaseOrder order = pendingOrder();
        order.markInProgress();
        given(orderRepository.findWithLockByOrderId("order-1")).willReturn(Optional.of(order));

        processor.recordFailure("order-1", true);

        assertThat(order.getStatus()).isEqualTo(PurchaseOrder.Status.FAILED);
    }
}
