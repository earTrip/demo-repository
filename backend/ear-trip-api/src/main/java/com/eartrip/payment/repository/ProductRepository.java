package com.eartrip.payment.repository;

import com.eartrip.payment.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {
    Optional<Product> findByCodeAndActiveTrue(String code);
}
