package com.finance.finance.modules.system.repository;

import com.finance.finance.modules.system.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankRepository extends JpaRepository<Bank, UUID> {

    Optional<Bank> findByCode(String code);

    @Query("SELECT b FROM Bank b WHERE b.isActive = true ORDER BY b.name ASC")
    List<Bank> findAllActive();

    @Query("SELECT b FROM Bank b WHERE b.kind = :kind AND b.isActive = true ORDER BY b.name ASC")
    List<Bank> findByKind(@Param("kind") String kind);
}
