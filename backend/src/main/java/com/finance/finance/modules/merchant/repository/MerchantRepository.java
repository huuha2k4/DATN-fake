package com.finance.finance.modules.merchant.repository;

import com.finance.finance.modules.merchant.entity.Merchant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, UUID> {

    /**
     * Tìm merchant theo ID và userId (hoặc system merchant)
     */
    @Query("SELECT m FROM Merchant m WHERE m.id = :id " +
           "AND (m.userId = :userId OR m.userId IS NULL)")
    Optional<Merchant> findByIdAndUserIdOrSystem(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả merchants của user (bao gồm cả system merchants)
     */
    @Query("SELECT m FROM Merchant m WHERE m.userId = :userId OR m.userId IS NULL " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    List<Merchant> findAllByUserIdOrSystem(@Param("userId") UUID userId);

    /**
     * Lấy system merchants
     */
    @Query("SELECT m FROM Merchant m WHERE m.userId IS NULL " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    List<Merchant> findSystemMerchants();

    /**
     * Lấy custom merchants của user
     */
    @Query("SELECT m FROM Merchant m WHERE m.userId = :userId " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    List<Merchant> findCustomMerchantsByUserId(@Param("userId") UUID userId);

    /**
     * Tìm kiếm merchants theo tên (tìm trong name và normalized_name)
     */
    @Query("SELECT m FROM Merchant m WHERE (m.userId = :userId OR m.userId IS NULL) " +
           "AND (LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(m.normalizedName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    Page<Merchant> searchByName(@Param("keyword") String keyword, 
                                  @Param("userId") UUID userId, 
                                  Pageable pageable);

    /**
     * Tìm merchant theo normalized name (để tránh duplicate)
     */
    @Query("SELECT m FROM Merchant m WHERE m.normalizedName = :normalizedName " +
           "AND (m.userId = :userId OR m.userId IS NULL) " +
           "AND (:merchantId IS NULL OR m.id != :merchantId)")
    Optional<Merchant> findByNormalizedName(@Param("normalizedName") String normalizedName, 
                                             @Param("userId") UUID userId, 
                                             @Param("merchantId") UUID merchantId);

    /**
     * Tìm merchant theo alias
     */
    @Query(value = "SELECT * FROM merchants m WHERE (m.user_id = :userId OR m.user_id IS NULL) " +
           "AND :alias = ANY(m.aliases)", nativeQuery = true)
    List<Merchant> findByAlias(@Param("alias") String alias, @Param("userId") UUID userId);

    /**
     * Tìm merchants theo category
     */
    @Query("SELECT m FROM Merchant m WHERE m.defaultCategoryId = :categoryId " +
           "AND (m.userId = :userId OR m.userId IS NULL) " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    List<Merchant> findByDefaultCategoryId(@Param("categoryId") UUID categoryId, 
                                            @Param("userId") UUID userId);

    /**
     * Tìm merchants theo MCC (Merchant Category Code)
     */
    @Query("SELECT m FROM Merchant m WHERE m.mcc = :mcc " +
           "AND (m.userId = :userId OR m.userId IS NULL) " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    List<Merchant> findByMcc(@Param("mcc") String mcc, @Param("userId") UUID userId);

    /**
     * Lấy top merchants được sử dụng nhiều nhất
     */
    @Query("SELECT m FROM Merchant m WHERE (m.userId = :userId OR m.userId IS NULL) " +
           "ORDER BY m.usageCount DESC, m.name ASC")
    Page<Merchant> findTopByUsageCount(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Đếm số lượng transactions sử dụng merchant này
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.merchantId = :merchantId AND t.deletedAt IS NULL")
    Long countTransactionsByMerchantId(@Param("merchantId") UUID merchantId);

    /**
     * Lấy transactions của merchant (để hiển thị lịch sử)
     */
    @Query("SELECT t FROM Transaction t WHERE t.merchantId = :merchantId " +
           "AND t.userId = :userId AND t.deletedAt IS NULL " +
           "ORDER BY t.occurredAt DESC")
    Page<Object> findTransactionsByMerchantId(@Param("merchantId") UUID merchantId, 
                                               @Param("userId") UUID userId, 
                                               Pageable pageable);

    /**
     * Tăng usage count khi merchant được sử dụng
     */
    @Modifying
    @Query("UPDATE Merchant m SET m.usageCount = m.usageCount + 1 WHERE m.id = :merchantId")
    void incrementUsageCount(@Param("merchantId") UUID merchantId);

    /**
     * Kiểm tra merchant có thể xóa không (chỉ xóa được nếu không có transaction)
     */
    @Query("SELECT CASE WHEN COUNT(t) = 0 THEN true ELSE false END " +
           "FROM Transaction t WHERE t.merchantId = :merchantId AND t.deletedAt IS NULL")
    Boolean canDelete(@Param("merchantId") UUID merchantId);

    /**
     * Kiểm tra tên merchant đã tồn tại chưa
     */
    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM Merchant m " +
           "WHERE LOWER(m.name) = LOWER(:name) " +
           "AND (m.userId = :userId OR (m.userId IS NULL AND :userId IS NOT NULL)) " +
           "AND (:merchantId IS NULL OR m.id != :merchantId)")
    Boolean existsByNameAndUserId(@Param("name") String name, 
                                    @Param("userId") UUID userId, 
                                    @Param("merchantId") UUID merchantId);

    /**
     * Lấy merchant statistics
     */
    @Query("SELECT m.id as merchantId, m.name as merchantName, " +
           "COUNT(t.id) as transactionCount, SUM(t.amount) as totalAmount " +
           "FROM Merchant m " +
           "LEFT JOIN Transaction t ON t.merchantId = m.id AND t.deletedAt IS NULL " +
           "WHERE (m.userId = :userId OR m.userId IS NULL) " +
           "GROUP BY m.id, m.name " +
           "ORDER BY transactionCount DESC")
    List<Object[]> getMerchantStatistics(@Param("userId") UUID userId);
}
