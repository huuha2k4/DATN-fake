package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.ChildWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChildWalletRepository extends JpaRepository<ChildWallet, UUID> {
    
    @Query("SELECT cw FROM ChildWallet cw WHERE cw.id = :id AND cw.deletedAt IS NULL")
    Optional<ChildWallet> findByIdAndNotDeleted(@Param("id") UUID id);
    
    @Query("SELECT cw FROM ChildWallet cw " +
           "WHERE cw.groupId = :groupId " +
           "AND cw.deletedAt IS NULL " +
           "ORDER BY cw.createdAt ASC")
    List<ChildWallet> findByGroupId(@Param("groupId") UUID groupId);
    
    @Query("SELECT COUNT(cw) FROM ChildWallet cw " +
           "WHERE cw.groupId = :groupId AND cw.deletedAt IS NULL")
    long countByGroupId(@Param("groupId") UUID groupId);
}
