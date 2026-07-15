package com.eartrip.payment.repository;

import com.eartrip.payment.domain.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {

    /** 동시 confirm 직렬화용 행 잠금 (SELECT ... FOR UPDATE) */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PurchaseOrder> findWithLockByOrderId(String orderId);
}
