package com.eartrip.payment.service;

import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 승인 중 프로세스가 죽어 IN_PROGRESS로 굳은 주문을 회수한다.
 *
 * 굳은 주문은 claim()이 409로 막으므로 사용자가 재시도할 수도, 환불받을 수도 없다.
 * 특히 '토스 승인은 성공했는데 우리가 기록하기 직전에 죽은' 경우가 위험하다 —
 * 돈은 나갔는데 이용권이 없다. 이때 그냥 PENDING으로 되돌리면 재시도가 토스에서
 * 거절되어 FAILED로 확정된다(= 결제했는데 실패 처리).
 *
 * 그래서 로컬 추측이 아니라 토스 조회로 실제 상태를 확인한 뒤 분기한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentRecoveryService {

    private final PurchaseOrderRepository orderRepository;
    private final PaymentConfirmProcessor processor;
    private final TossPaymentsClient tossClient;

    /** 정상 confirm은 수초 내 끝난다. 이보다 오래 IN_PROGRESS면 죽은 것으로 본다. */
    @Value("${payment.recovery.stale-after-ms:120000}")
    private long staleAfterMs;

    @Scheduled(
            initialDelayString = "${payment.recovery.initial-delay-ms:60000}",
            fixedDelayString = "${payment.recovery.interval-ms:60000}")
    public void sweepStaleInProgress() {
        LocalDateTime before = LocalDateTime.now().minus(Duration.ofMillis(staleAfterMs));
        List<PurchaseOrder> stale =
                orderRepository.findByStatusAndClaimedAtBefore(PurchaseOrder.Status.IN_PROGRESS, before);
        if (stale.isEmpty()) return;

        log.warn("승인 중 굳은 주문 {}건 회수 시도", stale.size());
        for (PurchaseOrder order : stale) {
            recover(order.getOrderId());
        }
    }

    /**
     * 주문 1건 회수. 토스 기준 상태가 진실이다.
     * - 승인 기록 없음 → PENDING 복귀 (사용자가 다시 시도할 수 있게)
     * - DONE          → 결제된 것이므로 성공 기록 + 이용권 지급
     * - 그 외(취소·만료) → FAILED 확정
     * 조회 자체가 실패하면 상태를 건드리지 않는다 — 다음 스윕이 다시 시도한다.
     */
    void recover(String orderId) {
        try {
            Optional<TossPaymentsClient.TossConfirmResponse> found = tossClient.findByOrderId(orderId);

            if (found.isEmpty()) {
                log.info("주문 {} — 토스에 승인 기록 없음 → 재시도 허용(PENDING)", orderId);
                processor.recordFailure(orderId, false);
                return;
            }

            TossPaymentsClient.TossConfirmResponse payment = found.get();
            if ("DONE".equals(payment.status())) {
                log.warn("주문 {} — 토스는 승인 완료였음(기록 유실) → 이용권 지급", orderId);
                processor.recordSuccess(orderId, payment);
            } else {
                log.info("주문 {} — 토스 상태 {} → 실패 확정", orderId, payment.status());
                processor.recordFailure(orderId, true);
            }
        } catch (RuntimeException e) {
            // 상태를 함부로 바꾸면 결제된 주문을 실패로 만들 수 있다 — 그대로 두고 다음 스윕에 맡긴다.
            log.error("주문 {} 회수 실패 — 다음 스윕에서 재시도", orderId, e);
        }
    }
}
