package com.eartrip.payment.repository;

import com.eartrip.payment.domain.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {

    /** 동시 confirm 직렬화용 행 잠금 (SELECT ... FOR UPDATE) */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PurchaseOrder> findWithLockByOrderId(String orderId);

    /** 승인 중 프로세스가 죽어 굳은 주문 회수 대상 (스윕용) */
    List<PurchaseOrder> findByStatusAndClaimedAtBefore(PurchaseOrder.Status status, LocalDateTime before);
}
