package com.eartrip.payment.service;

import com.eartrip.payment.domain.Payment;
import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.infra.TossPaymentsClient;
import com.eartrip.payment.repository.PaymentRepository;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentConfirmService {

    private final PurchaseOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final EntitlementService entitlementService;
    private final TossPaymentsClient tossClient;

    /**
     * successUrl 콜백 처리.
     * 순서: 멱등 체크 → 주문·금액 검증 → 토스 승인 → 기록 → 이용권 발급
     */
    @Transactional
    public void confirm(String paymentKey, String orderId, int amount) {
        if (paymentRepository.existsByOrderId(orderId)) return; // 멱등

        PurchaseOrder order = findPendingOrder(orderId);
        validateAmount(order, amount);

        TossPaymentsClient.TossConfirmResponse res = approve(order, paymentKey, amount);

        savePayment(res);
        order.markPaid();
        grantEntitlements(order);
    }

    private PurchaseOrder findPendingOrder(String orderId) {
        PurchaseOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문 없음: " + orderId));
        if (!order.isPending()) throw new IllegalStateException("이미 처리된 주문: " + orderId);
        return order;
    }

    private void validateAmount(PurchaseOrder order, int clientAmount) {
        if (!order.amountMatches(clientAmount)) {
            order.markFailed();
            throw new IllegalStateException("결제 금액 불일치 (위변조 의심): " + order.getOrderId());
        }
    }

    private TossPaymentsClient.TossConfirmResponse approve(PurchaseOrder order, String paymentKey, int amount) {
        try {
            return tossClient.confirm(paymentKey, order.getOrderId(), amount);
        } catch (RuntimeException e) {
            order.markFailed();
            throw e;
        }
    }

    private void savePayment(TossPaymentsClient.TossConfirmResponse res) {
        paymentRepository.save(Payment.builder()
                .paymentKey(res.paymentKey())
                .orderId(res.orderId())
                .amount(res.totalAmount())
                .method(res.method())
                .rawStatus(res.status())
                .approvedAt(LocalDateTime.now())
                .build());
    }

    private void grantEntitlements(PurchaseOrder order) {
        Product product = productRepository.findById(order.getProductCode())
                .orElseThrow(() -> new IllegalStateException("상품 없음: " + order.getProductCode()));
        entitlementService.grantAll(order.getUserId(), product.getCourseIds(), order.getOrderId());
    }
}
