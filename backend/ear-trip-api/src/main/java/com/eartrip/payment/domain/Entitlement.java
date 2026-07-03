package com.eartrip.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 유저↔코스 접근 권한. 결제 승인 시 발급 (번들은 코스 수만큼) */
@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "courseId"}))
public class Entitlement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userId;
    private Long courseId;
    private String orderId;               // 발급 근거
    private LocalDateTime grantedAt;
}
