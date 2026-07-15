package com.eartrip.payment.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/** 토스페이먼츠 결제 승인 호출 전담 (외부 연동 격리) */
@Component
public class TossPaymentsClient {

    private final RestClient restClient;

    public TossPaymentsClient(@Value("${toss.secret-key}") String secretKey) {
        String auth = Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
        this.restClient = RestClient.builder()
                .baseUrl("https://api.tosspayments.com")
                .defaultHeader("Authorization", "Basic " + auth)
                .build();
    }

    /** POST /v1/payments/confirm — 승인 실패 시 4xx 예외 발생 */
    public TossConfirmResponse confirm(String paymentKey, String orderId, int amount) {
        return restClient.post()
                .uri("/v1/payments/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("paymentKey", paymentKey, "orderId", orderId, "amount", amount))
                .retrieve()
                .body(TossConfirmResponse.class);
    }

    /**
     * GET /v1/payments/orders/{orderId} — 토스 기준의 실제 결제 상태 조회.
     * 승인 도중 우리 쪽이 죽었을 때 '돈이 실제로 나갔는지'를 판별하는 유일한 근거다.
     * 승인된 적 없으면 토스가 404(NOT_FOUND_PAYMENT)를 주므로 empty로 변환한다.
     */
    public Optional<TossConfirmResponse> findByOrderId(String orderId) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri("/v1/payments/orders/{orderId}", orderId)
                    .retrieve()
                    .body(TossConfirmResponse.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    public record TossConfirmResponse(
            String paymentKey, String orderId, String status,
            String method, int totalAmount, String approvedAt) {}
}
