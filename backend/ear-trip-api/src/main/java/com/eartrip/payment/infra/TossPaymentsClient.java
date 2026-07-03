package com.eartrip.payment.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

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

    public record TossConfirmResponse(
            String paymentKey, String orderId, String status,
            String method, int totalAmount, String approvedAt) {}
}
