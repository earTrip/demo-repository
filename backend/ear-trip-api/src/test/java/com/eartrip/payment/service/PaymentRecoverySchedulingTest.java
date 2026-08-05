package com.eartrip.payment.service;

import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.EntitlementRepository;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

/**
 * 회수 스윕이 '실제로 도는지' 검증한다.
 * 단위 테스트는 recover()를 직접 부르므로 @EnableScheduling이 빠져도 통과한다 —
 * 그 경우 프로덕션에선 스윕이 조용히 영영 돌지 않는다. 그 간극을 메운다.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "payment.recovery.initial-delay-ms=200",
        "payment.recovery.interval-ms=200",
        "payment.recovery.stale-after-ms=0", // 클레임 즉시 회수 대상
        // 이 테스트는 별도 컨텍스트라 data.sql이 한 번 더 돈다. H2 인메모리 DB는 JVM 내에서
        // 이름으로 공유되므로, 기본 DB를 쓰면 다른 테스트가 심은 시드와 PK가 충돌한다.
        "spring.datasource.url=jdbc:h2:mem:eartrip-recovery;MODE=MySQL",
})
class PaymentRecoverySchedulingTest {

    @Autowired PurchaseOrderRepository orderRepository;
    @Autowired ProductRepository productRepository;
    @Autowired EntitlementRepository entitlementRepository;

    @MockBean TossPaymentsClient tossClient; // 실제 토스를 부르지 않는다

    @Test
    @DisplayName("승인 중 굳은 주문을 스케줄러가 자동으로 회수해 이용권까지 지급한다")
    void schedulerRecoversStuckOrder() {
        Product ep01 = productRepository.findById("EP01").orElseThrow();
        PurchaseOrder stuck = PurchaseOrder.create("order-stuck", "device-recovery", ep01);
        stuck.markInProgress(); // 여기서 프로세스가 죽었다고 가정
        orderRepository.saveAndFlush(stuck);

        // 토스 기준으로는 결제가 실제로 완료돼 있었다 (돈은 나갔고 우리 기록만 유실)
        given(tossClient.findByOrderId(anyString())).willReturn(Optional.of(
                new TossPaymentsClient.TossConfirmResponse(
                        "pk-stuck", "order-stuck", "DONE", "카드", ep01.getPrice(), "2026-07-16T12:00:00")));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            PurchaseOrder found = orderRepository.findById("order-stuck").orElseThrow();
            assertThat(found.getStatus()).isEqualTo(PurchaseOrder.Status.PAID);
        });

        // 회수는 상태 전이로 끝나면 안 된다 — 돈을 냈으니 이용권이 실제로 생겨야 한다
        assertThat(entitlementRepository.existsByUserIdAndCourseId("device-recovery", 1L)).isTrue();
        assertThat(orderRepository.findById("order-stuck").orElseThrow().getClaimedAt()).isNull();
    }
}
