package com.eartrip.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity @Table(name = "purchase_order")
@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PurchaseOrder {

    /** IN_PROGRESS: 토스 승인 API 호출 중 (동시 confirm 차단용 클레임 상태) */
    public enum Status { PENDING, IN_PROGRESS, PAID, FAILED, CANCELED }

    @Id private String orderId;           // UUID — 토스 orderId로 사용
    private String userId;                // MVP: deviceId, 회원 도입 시 memberId
    private String productCode;
    private int amount;                   // 서버가 확정한 결제 금액
    @Enumerated(EnumType.STRING) private Status status;
    private LocalDateTime createdAt;
    /** IN_PROGRESS로 전이한 시각. 승인 중 프로세스가 죽은 주문을 골라내는 기준. */
    private LocalDateTime claimedAt;

    public static PurchaseOrder create(String orderId, String userId, Product product) {
        PurchaseOrder o = new PurchaseOrder();
        o.orderId = orderId;
        o.userId = userId;
        o.productCode = product.getCode();
        o.amount = product.getPrice();
        o.status = Status.PENDING;
        o.createdAt = LocalDateTime.now();
        return o;
    }

    public void markInProgress() {
        this.status = Status.IN_PROGRESS;
        this.claimedAt = LocalDateTime.now();
    }
    public void markPaid()       { this.status = Status.PAID; this.claimedAt = null; }
    public void markFailed()     { this.status = Status.FAILED; this.claimedAt = null; }
    /** 일시적(네트워크 등) 승인 실패 시 재시도 허용을 위해 PENDING 복귀 */
    public void revertToPending() { this.status = Status.PENDING; this.claimedAt = null; }

    /**
     * 승인 중 프로세스가 죽어 IN_PROGRESS로 굳은 주문인지.
     * 정상 confirm은 수초 내에 끝나므로, 임계치를 넘겼다면 회수 대상이다.
     */
    public boolean isStaleInProgress(LocalDateTime now, Duration threshold) {
        return status == Status.IN_PROGRESS
                && claimedAt != null
                && claimedAt.isBefore(now.minus(threshold));
    }

    /** 클라이언트가 보낸 금액이 서버 확정 금액과 다르면 위변조 */
    public boolean amountMatches(int clientAmount) { return this.amount == clientAmount; }
    public boolean isPending()    { return status == Status.PENDING; }
    public boolean isInProgress() { return status == Status.IN_PROGRESS; }
    public boolean isPaid()       { return status == Status.PAID; }
}
