package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.DataSharingLevel;
import com.finance.finance.common.enums.SharingRequestStatus;
import com.finance.finance.modules.group.entity.ChildDataSharingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChildDataSharingRequestRepository extends JpaRepository<ChildDataSharingRequest, UUID> {
    
    /**
     * Tìm tất cả yêu cầu của một child wallet
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "ORDER BY r.requestedAt DESC")
    List<ChildDataSharingRequest> findByChildWalletId(@Param("walletId") UUID walletId);
    
    /**
     * Tìm tất cả yêu cầu PENDING của một con (để con xem và phản hồi)
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.childUserId = :childUserId " +
           "AND r.status = 'PENDING' " +
           "ORDER BY r.requestedAt DESC")
    List<ChildDataSharingRequest> findPendingRequestsByChildUser(@Param("childUserId") UUID childUserId);
    
    /**
     * Tìm yêu cầu APPROVED còn hiệu lực giữa parent và child wallet
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "AND r.requestedByUserId = :parentUserId " +
           "AND r.status = 'APPROVED' " +
           "AND (r.expiresAt IS NULL OR r.expiresAt > :now) " +
           "ORDER BY r.respondedAt DESC")
    Optional<ChildDataSharingRequest> findActiveApprovedRequest(
            @Param("walletId") UUID walletId,
            @Param("parentUserId") UUID parentUserId,
            @Param("now") LocalDateTime now
    );
    
    /**
     * Kiểm tra xem parent có quyền xem dữ liệu của child wallet không
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
           "FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "AND r.requestedByUserId = :parentUserId " +
           "AND r.status = 'APPROVED' " +
           "AND (r.expiresAt IS NULL OR r.expiresAt > :now)")
    boolean hasActivePermission(
            @Param("walletId") UUID walletId,
            @Param("parentUserId") UUID parentUserId,
            @Param("now") LocalDateTime now
    );
    
    /**
     * Lấy mức độ chia sẻ hiện tại (nếu có)
     */
    @Query("SELECT r.requestedLevel FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "AND r.requestedByUserId = :parentUserId " +
           "AND r.status = 'APPROVED' " +
           "AND (r.expiresAt IS NULL OR r.expiresAt > :now) " +
           "ORDER BY r.respondedAt DESC " +
           "LIMIT 1")
    Optional<DataSharingLevel> findActiveSharingLevel(
            @Param("walletId") UUID walletId,
            @Param("parentUserId") UUID parentUserId,
            @Param("now") LocalDateTime now
    );
    
    /**
     * Tìm tất cả yêu cầu đã hết hạn nhưng chưa được đánh dấu
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.status = 'APPROVED' " +
           "AND r.expiresAt IS NOT NULL " +
           "AND r.expiresAt <= :now")
    List<ChildDataSharingRequest> findExpiredRequests(@Param("now") LocalDateTime now);
    
    /**
     * Tìm yêu cầu PENDING hiện tại giữa parent và child
     * (để tránh tạo nhiều yêu cầu trùng lặp)
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "AND r.requestedByUserId = :parentUserId " +
           "AND r.status = 'PENDING' " +
           "ORDER BY r.requestedAt DESC")
    Optional<ChildDataSharingRequest> findPendingRequest(
            @Param("walletId") UUID walletId,
            @Param("parentUserId") UUID parentUserId
    );
    
    /**
     * Đếm số yêu cầu PENDING của một con
     */
    @Query("SELECT COUNT(r) FROM ChildDataSharingRequest r " +
           "WHERE r.childUserId = :childUserId " +
           "AND r.status = 'PENDING'")
    long countPendingByChildUser(@Param("childUserId") UUID childUserId);
    
    /**
     * Thu hồi tất cả quyền truy cập còn hiệu lực của một child wallet
     */
    @Query("SELECT r FROM ChildDataSharingRequest r " +
           "WHERE r.childWalletId = :walletId " +
           "AND r.status = 'APPROVED' " +
           "AND (r.expiresAt IS NULL OR r.expiresAt > :now)")
    List<ChildDataSharingRequest> findActiveRequestsByWallet(
            @Param("walletId") UUID walletId,
            @Param("now") LocalDateTime now
    );
}
