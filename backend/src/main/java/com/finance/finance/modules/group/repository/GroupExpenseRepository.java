package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupExpense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupExpenseRepository extends JpaRepository<GroupExpense, UUID> {
    
    @Query("SELECT ge FROM GroupExpense ge WHERE ge.id = :id AND ge.deletedAt IS NULL")
    Optional<GroupExpense> findByIdAndNotDeleted(@Param("id") UUID id);
    
    @Query("SELECT ge FROM GroupExpense ge " +
           "WHERE ge.groupId = :groupId " +
           "AND ge.deletedAt IS NULL " +
           "ORDER BY ge.expenseDate DESC, ge.createdAt DESC")
    Page<GroupExpense> findByGroupId(@Param("groupId") UUID groupId, Pageable pageable);
    
    @Query("SELECT ge FROM GroupExpense ge " +
           "WHERE ge.groupId = :groupId " +
           "AND ge.expenseDate BETWEEN :startDate AND :endDate " +
           "AND ge.deletedAt IS NULL " +
           "ORDER BY ge.expenseDate DESC")
    Page<GroupExpense> findByGroupIdAndDateRange(@Param("groupId") UUID groupId,
                                                   @Param("startDate") LocalDate startDate,
                                                   @Param("endDate") LocalDate endDate,
                                                   Pageable pageable);
    
    @Query("SELECT SUM(ge.amount) FROM GroupExpense ge " +
           "WHERE ge.groupId = :groupId AND ge.deletedAt IS NULL")
    BigDecimal sumAmountByGroupId(@Param("groupId") UUID groupId);
    
    @Query("SELECT COUNT(ge) FROM GroupExpense ge " +
           "WHERE ge.groupId = :groupId AND ge.deletedAt IS NULL")
    long countByGroupId(@Param("groupId") UUID groupId);
}
