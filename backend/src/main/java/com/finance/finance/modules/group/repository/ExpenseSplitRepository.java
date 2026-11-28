package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.ExpenseSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, UUID> {
    
    List<ExpenseSplit> findByExpenseId(UUID expenseId);
    
    @Query("SELECT es FROM ExpenseSplit es WHERE es.expenseId IN :expenseIds")
    List<ExpenseSplit> findByExpenseIdIn(@Param("expenseIds") List<UUID> expenseIds);
    
    @Query("SELECT SUM(es.amount) FROM ExpenseSplit es " +
           "WHERE es.expenseId IN (SELECT ge.id FROM GroupExpense ge WHERE ge.groupId = :groupId " +
           "AND ge.deletedAt IS NULL AND ge.financialPurpose = 'MEMBER_SPLIT') " +
           "AND es.userId = :userId")
    BigDecimal sumByGroupIdAndUserId(@Param("groupId") UUID groupId, @Param("userId") UUID userId);

    @Query("""
            select s.userId, sum(s.amount) from ExpenseSplit s join GroupExpense e on e.id = s.expenseId
            where e.groupId = :groupId and e.deletedAt is null and e.financialPurpose = 'MEMBER_SPLIT'
            group by s.userId
            """)
    List<Object[]> sumMemberSplits(@Param("groupId") UUID groupId);

    @Query("""
            select s.userId, e.paidByUserId, sum(s.amount)
            from ExpenseSplit s join GroupExpense e on e.id = s.expenseId
            where e.groupId = :groupId and e.deletedAt is null and e.financialPurpose = 'MEMBER_SPLIT'
              and s.userId <> e.paidByUserId
            group by s.userId, e.paidByUserId
            """)
    List<Object[]> sumMemberDebts(@Param("groupId") UUID groupId);
    
    @Modifying
    @Query("DELETE FROM ExpenseSplit es WHERE es.expenseId = :expenseId")
    void deleteByExpenseId(@Param("expenseId") UUID expenseId);
}
