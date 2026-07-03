package com.eartrip.payment.service;

import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PaymentRepository;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
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

@ExtendWith(MockitoExtension.class)
class PaymentConfirmServiceTest {

    @Mock PurchaseOrderRepository orderRepository;
    @Mock ProductRepository productRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock EntitlementService entitlementService;
    @Mock TossPaymentsClient tossClient;
    @InjectMocks PaymentConfirmService service;

    private static final Product EP01 =
            Product.builder().code("EP01").name("새벽, 자갈치").price(6900).courseIds(List.of(1L)).active(true).build();

    private PurchaseOrder pendingOrder() {
        return PurchaseOrder.create("order-1", "device-1", EP01);
    }

    @Test
    @DisplayName("금액 불일치(위변조)면 승인 호출 없이 실패 처리한다")
    void rejectTamperedAmount() {
        given(paymentRepository.existsByOrderId("order-1")).willReturn(false);
        given(orderRepository.findById("order-1")).willReturn(Optional.of(pendingOrder()));

        assertThatThrownBy(() -> service.confirm("pk-1", "order-1", 100))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("금액 불일치");

        verify(tossClient, never()).confirm(any(), any(), anyInt());
        verify(entitlementService, never()).grantAll(any(), any(), any());
    }

    @Test
    @DisplayName("이미 승인된 orderId는 재호출해도 아무 일도 하지 않는다(멱등)")
    void idempotentConfirm() {
        given(paymentRepository.existsByOrderId("order-1")).willReturn(true);

        service.confirm("pk-1", "order-1", 6900);

        verify(tossClient, never()).confirm(any(), any(), anyInt());
        verify(orderRepository, never()).findById(any());
    }

    @Test
    @DisplayName("정상 승인 시 결제 기록 + 주문 PAID + 이용권 발급까지 수행한다")
    void confirmGrantsEntitlement() {
        PurchaseOrder order = pendingOrder();
        given(paymentRepository.existsByOrderId("order-1")).willReturn(false);
        given(orderRepository.findById("order-1")).willReturn(Optional.of(order));
        given(productRepository.findById("EP01")).willReturn(Optional.of(EP01));
        given(tossClient.confirm("pk-1", "order-1", 6900)).willReturn(
                new TossPaymentsClient.TossConfirmResponse("pk-1", "order-1", "DONE", "카드", 6900, "2026-07-03T12:00:00"));

        service.confirm("pk-1", "order-1", 6900);

        assertThat(order.isPending()).isFalse();
        verify(paymentRepository).save(argThat(p -> p.getPaymentKey().equals("pk-1")));
        verify(entitlementService).grantAll("device-1", List.of(1L), "order-1");
    }
}
