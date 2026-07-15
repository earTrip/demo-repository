package com.eartrip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** @EnableScheduling: PaymentRecoveryService의 굳은 주문 회수 스윕이 돌게 한다(없으면 조용히 안 돈다). */
@SpringBootApplication
@EnableScheduling
public class EarTripApplication {
    public static void main(String[] args) {
        SpringApplication.run(EarTripApplication.class, args);
    }
}
