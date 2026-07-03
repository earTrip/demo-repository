package com.eartrip.payment.service;

import com.eartrip.payment.domain.Product;
import com.eartrip.payment.domain.PurchaseOrder;
import com.eartrip.payment.repository.ProductRepository;
import com.eartrip.payment.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final ProductRepository productRepository;
    private final PurchaseOrderRepository orderRepository;

    public record CheckoutResult(String orderId, String orderName, int amount) {}

    /** 주문 생성. 금액은 클라이언트가 아닌 DB 상품가로 확정 */
    @Transactional
    public CheckoutResult checkout(String userId, String productCode) {
        Product product = productRepository.findByCodeAndActiveTrue(productCode)
                .orElseThrow(() -> new IllegalArgumentException("판매 중인 상품이 아닙니다: " + productCode));

        PurchaseOrder order = PurchaseOrder.create(UUID.randomUUID().toString(), userId, product);
        orderRepository.save(order);

        return new CheckoutResult(order.getOrderId(), product.getName(), order.getAmount());
    }
}
