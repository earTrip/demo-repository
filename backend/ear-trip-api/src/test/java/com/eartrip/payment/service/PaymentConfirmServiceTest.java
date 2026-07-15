package com.eartrip.payment.service;

import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.service.PaymentConfirmProcessor.ClaimResult;
import com.eartrip.payment.service.PaymentConfirmProcessor.ClaimStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/** 오케스트레이션 검증: 클레임 → 토스 승인 → 기록의 순서·실패 분기 */
@ExtendWith(MockitoExtension.class)
class PaymentConfirmServiceTest {

    @Mock PaymentConfirmProcessor processor;
    @Mock TossPaymentsClient tossClient;
    @InjectMocks PaymentConfirmService service;

    private static final TossPaymentsClient.TossConfirmResponse DONE =
            new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "DONE", "카드", 6900, "2026-07-16T12:00:00");

    @Test
    @DisplayName("이미 승인된 주문(ALREADY_DONE)은 토스 호출 없이 조용히 반환한다(멱등)")
    void idempotentConfirm() {
        given(processor.claim("order-1", 6900)).willReturn(new ClaimResult(ClaimStatus.ALREADY_DONE));

        service.confirm("pk-1", "order-1", 6900);

        verifyNoInteractions(tossClient);
        verify(processor, never()).recordSuccess(any(), any());
    }

    @Test
    @DisplayName("금액 위변조(TAMPERED)면 FAILED 커밋 이후 예외를 던지고 토스를 호출하지 않는다")
    void rejectTamperedAmount() {
        given(processor.claim("order-1", 100)).willReturn(new ClaimResult(ClaimStatus.TAMPERED));

        assertThatThrownBy(() -> service.confirm("pk-1", "order-1", 100))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("금액 불일치");

        verifyNoInteractions(tossClient);
    }

    @Test
    @DisplayName("정상 승인: 클레임 → 토스 confirm → recordSuccess 순서로 수행한다")
    void confirmSuccess() {
        given(processor.claim("order-1", 6900)).willReturn(new ClaimResult(ClaimStatus.CLAIMED));
        given(tossClient.confirm("pk-1", "order-1", 6900)).willReturn(DONE);

        service.confirm("pk-1", "order-1", 6900);

        var inOrder = inOrder(processor, tossClient);
        inOrder.verify(processor).claim("order-1", 6900);
        inOrder.verify(tossClient).confirm("pk-1", "order-1", 6900);
        inOrder.verify(processor).recordSuccess(eq("order-1"), same(DONE));
    }

    @Test
    @DisplayName("토스가 4xx로 거절하면 FAILED 확정 기록 후 예외를 전파한다")
    void tossRejection_marksFailedDefinitively() {
        given(processor.claim("order-1", 6900)).willReturn(new ClaimResult(ClaimStatus.CLAIMED));
        given(tossClient.confirm(any(), any(), anyInt()))
                .willThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "REJECT", null, null, null));

        assertThatThrownBy(() -> service.confirm("pk-1", "order-1", 6900))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("승인 거절");

        verify(processor).recordFailure("order-1", true);
        verify(processor, never()).recordSuccess(any(), any());
    }

    @Test
    @DisplayName("네트워크 등 일시 장애면 PENDING 복귀(재시도 허용) 후 예외를 전파한다")
    void transientFailure_revertsToPending() {
        given(processor.claim("order-1", 6900)).willReturn(new ClaimResult(ClaimStatus.CLAIMED));
        given(tossClient.confirm(any(), any(), anyInt()))
                .willThrow(new ResourceAccessException("connect timeout"));

        assertThatThrownBy(() -> service.confirm("pk-1", "order-1", 6900))
                .isInstanceOf(ResourceAccessException.class);

        verify(processor).recordFailure("order-1", false);
        verify(processor, never()).recordSuccess(any(), any());
    }
}
