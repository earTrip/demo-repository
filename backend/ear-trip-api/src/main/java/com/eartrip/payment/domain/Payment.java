package com.eartrip.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 토스 승인 결과 스냅샷 */
@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Payment {
    @Id private String paymentKey;        // 토스 paymentKey
    private String orderId;
    private int amount;
    private String method;                // 카드/간편결제 등
    private String rawStatus;             // DONE 등
    private LocalDateTime approvedAt;
}
