package com.finance.finance.modules.tag.repository;

import com.finance.finance.modules.tag.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {

    /**
     * Tìm tag theo ID và userId
     */
    @Query("SELECT t FROM Tag t WHERE t.id = :id AND t.userId = :userId AND t.deletedAt IS NULL")
    Optional<Tag> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả tags của user
     */
    @Query("SELECT t FROM Tag t WHERE t.userId = :userId AND t.deletedAt IS NULL " +
           "ORDER BY t.name ASC")
    List<Tag> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Lấy tags với phân trang
     */
    @Query("SELECT t FROM Tag t WHERE t.userId = :userId AND t.deletedAt IS NULL " +
           "ORDER BY t.name ASC")
    Page<Tag> findAllByUserId(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Tìm tag theo tên (exact match)
     */
    @Query("SELECT t FROM Tag t WHERE LOWER(t.name) = LOWER(:name) " +
           "AND t.userId = :userId AND t.deletedAt IS NULL")
    Optional<Tag> findByNameAndUserId(@Param("name") String name, @Param("userId") UUID userId);

    /**
     * Tìm kiếm tags theo tên (partial match)
     */
    @Query("SELECT t FROM Tag t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "AND t.userId = :userId AND t.deletedAt IS NULL " +
           "ORDER BY t.name ASC")
    Page<Tag> searchByName(@Param("keyword") String keyword, 
                           @Param("userId") UUID userId, 
                           Pageable pageable);

    /**
     * Kiểm tra tên tag đã tồn tại chưa (cho user)
     */
    @Query("SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM Tag t " +
           "WHERE LOWER(t.name) = LOWER(:name) AND t.userId = :userId " +
           "AND t.deletedAt IS NULL " +
           "AND (:tagId IS NULL OR t.id != :tagId)")
    Boolean existsByNameAndUserId(@Param("name") String name, 
                                   @Param("userId") UUID userId, 
                                   @Param("tagId") UUID tagId);

    /**
     * Đếm số lượng transactions có tag này
     */
    @Query(value = "SELECT COUNT(*) FROM transaction_tags tt " +
           "INNER JOIN transactions t ON t.id = tt.transaction_id " +
           "WHERE tt.tag_id = :tagId AND t.deleted_at IS NULL", 
           nativeQuery = true)
    Long countTransactionsByTagId(@Param("tagId") UUID tagId);

    /**
     * Lấy tags được sử dụng nhiều nhất
     */
    @Query(value = "SELECT t.*, COUNT(tt.transaction_id) as usage_count " +
           "FROM tags t " +
           "LEFT JOIN transaction_tags tt ON t.id = tt.tag_id " +
           "LEFT JOIN transactions tr ON tr.id = tt.transaction_id AND tr.deleted_at IS NULL " +
           "WHERE t.user_id = :userId AND t.deleted_at IS NULL " +
           "GROUP BY t.id " +
           "ORDER BY usage_count DESC, t.name ASC",
           nativeQuery = true)
    Page<Tag> findTopByUsageCount(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Lấy transactions có tag này
     */
    @Query(value = "SELECT t.* FROM transactions t " +
           "INNER JOIN transaction_tags tt ON t.id = tt.transaction_id " +
           "WHERE tt.tag_id = :tagId AND t.user_id = :userId AND t.deleted_at IS NULL " +
           "ORDER BY t.occurred_at DESC",
           nativeQuery = true)
    Page<Object> findTransactionsByTagId(@Param("tagId") UUID tagId, 
                                         @Param("userId") UUID userId, 
                                         Pageable pageable);

    /**
     * Lấy tags của transaction
     */
    @Query(value = "SELECT t.* FROM tags t " +
           "INNER JOIN transaction_tags tt ON t.id = tt.tag_id " +
           "WHERE tt.transaction_id = :transactionId AND t.deleted_at IS NULL " +
           "ORDER BY t.name ASC",
           nativeQuery = true)
    List<Tag> findByTransactionId(@Param("transactionId") UUID transactionId);

    /**
     * Kiểm tra tag có thể xóa không (có thể xóa dù có transactions)
     * Tags có thể xóa soft delete, không cần check
     */
    @Query("SELECT true FROM Tag t WHERE t.id = :tagId")
    Boolean canDelete(@Param("tagId") UUID tagId);

    /**
     * Lấy tag statistics
     */
    @Query(value = "SELECT t.id as tag_id, t.name as tag_name, " +
           "COUNT(tt.transaction_id) as transaction_count, " +
           "SUM(tr.amount) as total_amount " +
           "FROM tags t " +
           "LEFT JOIN transaction_tags tt ON t.id = tt.tag_id " +
           "LEFT JOIN transactions tr ON tr.id = tt.transaction_id AND tr.deleted_at IS NULL " +
           "WHERE t.user_id = :userId AND t.deleted_at IS NULL " +
           "GROUP BY t.id, t.name " +
           "ORDER BY transaction_count DESC",
           nativeQuery = true)
    List<Object[]> getTagStatistics(@Param("userId") UUID userId);

    /**
     * Xóa tất cả tags của transaction (khi xóa transaction)
     */
    @Query(value = "DELETE FROM transaction_tags WHERE transaction_id = :transactionId", 
           nativeQuery = true)
    void deleteAllByTransactionId(@Param("transactionId") UUID transactionId);

    /**
     * Bulk tạo transaction-tag associations
     */
    @Query(value = "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (:transactionId, :tagId)", 
           nativeQuery = true)
    void addTagToTransaction(@Param("transactionId") UUID transactionId, @Param("tagId") UUID tagId);
}
