package com.eartrip.payment.service;

import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/** 굳은 주문 회수: 토스 조회 결과에 따라 지급/재시도/실패확정으로 갈린다 */
@ExtendWith(MockitoExtension.class)
class PaymentRecoveryServiceTest {

    @Mock PurchaseOrderRepository orderRepository;
    @Mock PaymentConfirmProcessor processor;
    @Mock TossPaymentsClient tossClient;
    @InjectMocks PaymentRecoveryService service;

    private static final TossPaymentsClient.TossConfirmResponse DONE =
            new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "DONE", "카드", 6900, "2026-07-16T12:00:00");

    @Test
    @DisplayName("토스가 승인 완료(DONE)면 — 돈은 나갔고 기록만 유실된 것 → 이용권을 지급한다")
    void tossSaysDone_grantsEntitlement() {
        given(tossClient.findByOrderId("order-1")).willReturn(Optional.of(DONE));

        service.recover("order-1");

        verify(processor).recordSuccess("order-1", DONE);
        verify(processor, never()).recordFailure(any(), anyBoolean());
    }

    @Test
    @DisplayName("토스에 승인 기록이 없으면 PENDING 복귀 — 사용자가 다시 시도할 수 있어야 한다")
    void tossHasNoPayment_revertsToPending() {
        given(tossClient.findByOrderId("order-1")).willReturn(Optional.empty());

        service.recover("order-1");

        verify(processor).recordFailure("order-1", false);
        verify(processor, never()).recordSuccess(any(), any());
    }

    @Test
    @DisplayName("토스 상태가 취소/만료면 실패 확정")
    void tossSaysCanceled_marksFailed() {
        given(tossClient.findByOrderId("order-1")).willReturn(Optional.of(
                new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "CANCELED", "카드", 6900, null)));

        service.recover("order-1");

        verify(processor).recordFailure("order-1", true);
        verify(processor, never()).recordSuccess(any(), any());
    }

    @Test
    @DisplayName("토스 조회가 실패하면 상태를 건드리지 않는다 — 결제된 주문을 실패로 만들면 안 된다")
    void lookupFails_leavesOrderUntouched() {
        given(tossClient.findByOrderId("order-1")).willThrow(new ResourceAccessException("timeout"));

        service.recover("order-1"); // 예외를 삼키고 다음 스윕에 맡긴다

        verifyNoInteractions(processor);
    }

    @Test
    @DisplayName("스윕은 임계치를 넘긴 IN_PROGRESS 주문만 회수한다")
    void sweepPicksOnlyStaleInProgress() {
        ReflectionTestUtils.setField(service, "staleAfterMs", 120_000L);
        PurchaseOrder stale = mock(PurchaseOrder.class);
        given(stale.getOrderId()).willReturn("order-1");
        given(orderRepository.findByStatusAndClaimedAtBefore(eq(PurchaseOrder.Status.IN_PROGRESS), any()))
                .willReturn(List.of(stale));
        given(tossClient.findByOrderId("order-1")).willReturn(Optional.empty());

        service.sweepStaleInProgress();

        verify(orderRepository).findByStatusAndClaimedAtBefore(eq(PurchaseOrder.Status.IN_PROGRESS), any(LocalDateTime.class));
        verify(processor).recordFailure("order-1", false);
    }

    @Test
    @DisplayName("굳은 주문이 없으면 토스를 부르지 않는다")
    void sweepWithNothingStale_doesNothing() {
        ReflectionTestUtils.setField(service, "staleAfterMs", 120_000L);
        given(orderRepository.findByStatusAndClaimedAtBefore(any(), any())).willReturn(List.of());

        service.sweepStaleInProgress();

        verifyNoInteractions(tossClient, processor);
    }
}
