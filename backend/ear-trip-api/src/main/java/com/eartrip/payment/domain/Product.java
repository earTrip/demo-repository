package com.eartrip.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** 판매 상품. courseIds — 단품은 1개, 번들은 N개 */
@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Product {
    @Id private String code;              // "EP01", "BUSAN_BUNDLE"
    private String name;
    private int price;                    // KRW
    @ElementCollection(fetch = FetchType.EAGER)
    private List<Long> courseIds;
    private boolean active;
}
