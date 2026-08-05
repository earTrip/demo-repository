package com.eartrip.payment.domain;

import com.eartrip.payment.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 결제 confirm의 상태 전이가 '실제 스키마에' 저장되는지 검증한다.
 * confirm 단위 테스트는 전부 Mockito라 DB를 타지 않아, 자바 enum에 값을 추가하고
 * 마이그레이션을 빠뜨리면 프로덕션에서만 터진다 — 그 간극을 메운다.
 */
// 기본 임베디드 DB로 교체하면 MODE=MySQL이 빠져 V1 baseline(engine=InnoDB, enum)이 깨진다.
// local 프로파일의 H2(MODE=MySQL)를 그대로 써야 실제 스키마를 검증할 수 있다.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("local")
class PurchaseOrderPersistenceTest {

    @Autowired PurchaseOrderRepository orderRepository;

    private static final Product EP01 =
            Product.builder().code("EP01").name("새벽, 자갈치").price(6900).courseIds(List.of(1L)).active(true).build();

    @Test
    @DisplayName("IN_PROGRESS 주문이 실제 스키마에 저장된다 (마이그레이션 누락 감지)")
    void inProgressPersists() {
        PurchaseOrder order = PurchaseOrder.create("order-1", "device-1", EP01);
        order.markInProgress();

        orderRepository.saveAndFlush(order);

        PurchaseOrder found = orderRepository.findById("order-1").orElseThrow();
        assertThat(found.getStatus()).isEqualTo(PurchaseOrder.Status.IN_PROGRESS);
    }

    @Test
    @DisplayName("모든 주문 상태가 저장 가능하다")
    void allStatusesPersist() {
        for (PurchaseOrder.Status status : PurchaseOrder.Status.values()) {
            PurchaseOrder order = PurchaseOrder.create("order-" + status, "device-1", EP01);
            switch (status) {
                case PENDING -> { }
                case IN_PROGRESS -> order.markInProgress();
                case PAID -> order.markPaid();
                case FAILED -> order.markFailed();
                case CANCELED -> { continue; } // 취소 전이 메서드가 아직 없음
            }
            orderRepository.saveAndFlush(order);
            assertThat(orderRepository.findById("order-" + status).orElseThrow().getStatus())
                    .isEqualTo(status);
        }
    }

    @Test
    @DisplayName("claimedAt이 스키마에 저장되고, 굳은 주문 조회로 회수 대상이 잡힌다")
    void staleInProgressIsQueryable() {
        PurchaseOrder fresh = PurchaseOrder.create("order-fresh", "device-1", EP01);
        fresh.markInProgress();
        orderRepository.saveAndFlush(fresh);

        // 방금 클레임한 주문은 회수 대상이 아니다
        assertThat(orderRepository.findByStatusAndClaimedAtBefore(
                PurchaseOrder.Status.IN_PROGRESS, LocalDateTime.now().minusMinutes(2)))
                .isEmpty();

        // 2분 전에 굳은 주문은 잡힌다
        assertThat(orderRepository.findByStatusAndClaimedAtBefore(
                PurchaseOrder.Status.IN_PROGRESS, LocalDateTime.now().plusSeconds(1)))
                .extracting(PurchaseOrder::getOrderId)
                .containsExactly("order-fresh");

        assertThat(orderRepository.findById("order-fresh").orElseThrow().getClaimedAt()).isNotNull();
    }

    @Test
    @DisplayName("PAID로 확정되면 claimedAt이 비워져 회수 대상에서 빠진다")
    void paidOrderLeavesStaleQueue() {
        PurchaseOrder order = PurchaseOrder.create("order-paid", "device-1", EP01);
        order.markInProgress();
        order.markPaid();
        orderRepository.saveAndFlush(order);

        assertThat(orderRepository.findByStatusAndClaimedAtBefore(
                PurchaseOrder.Status.IN_PROGRESS, LocalDateTime.now().plusSeconds(1))).isEmpty();
        assertThat(orderRepository.findById("order-paid").orElseThrow().getClaimedAt()).isNull();
    }
}
