package com.eartrip.payment.service;

import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.service.PaymentConfirmProcessor.ClaimResult;
import com.eartrip.payment.service.PaymentConfirmProcessor.ClaimStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

/**
 * successUrl 콜백 오케스트레이션 (트랜잭션 없음 — DB 단계는 Processor가 담당).
 * 순서: 클레임(잠금·멱등·금액검증, tx1) → 토스 승인(HTTP, tx 밖) → 결과 기록(tx2)
 */
@Service
@RequiredArgsConstructor
public class PaymentConfirmService {

    private final PaymentConfirmProcessor processor;
    private final TossPaymentsClient tossClient;

    public void confirm(String paymentKey, String orderId, int amount) {
        ClaimResult claim = processor.claim(orderId, amount);

        if (claim.status() == ClaimStatus.ALREADY_DONE) return; // 멱등
        if (claim.status() == ClaimStatus.TAMPERED) {
            // FAILED는 이미 tx1에서 커밋됨 — 예외는 그 후에 던져야 안전
            throw new IllegalStateException("결제 금액 불일치 (위변조 의심): " + orderId);
        }

        TossPaymentsClient.TossConfirmResponse res;
        try {
            res = tossClient.confirm(paymentKey, orderId, amount);
        } catch (HttpClientErrorException e) {
            processor.recordFailure(orderId, true);   // 토스 거절: 확정 실패
            throw new IllegalStateException("토스 승인 거절: " + orderId, e);
        } catch (RuntimeException e) {
            processor.recordFailure(orderId, false);  // 일시 장애: 재시도 가능하게 복귀
            throw e;
        }

        processor.recordSuccess(orderId, res);
    }
}
