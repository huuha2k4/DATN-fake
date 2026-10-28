package com.finance.finance.modules.category.repository;

import com.finance.finance.common.enums.CategoryKind;
import com.finance.finance.modules.category.entity.Category;
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
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    /**
     * Tìm category theo ID và userId (hoặc system category)
     */
    @Query("SELECT c FROM Category c WHERE c.id = :id AND c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true)")
    Optional<Category> findByIdAndUserIdOrSystem(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Tìm category theo code (dùng cho system category có mã cố định)
     */
    Optional<Category> findByCode(String code);

    /**
     * Lấy tất cả categories của user (bao gồm cả system categories)
     */
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true) " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findAllByUserIdOrSystem(@Param("userId") UUID userId);

    /**
     * Lấy categories theo user và kind (INCOME/EXPENSE)
     */
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true) " +
           "AND c.kind = :kind " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findByUserIdOrSystemAndKind(@Param("userId") UUID userId, @Param("kind") CategoryKind kind);

    /**
     * Lấy system categories
     */
    @Query("SELECT c FROM Category c WHERE c.isSystem = true AND c.deletedAt IS NULL " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findSystemCategories();

    /**
     * Lấy custom categories của user
     */
    @Query("SELECT c FROM Category c WHERE c.userId = :userId AND c.isSystem = false " +
           "AND c.deletedAt IS NULL ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findCustomCategoriesByUserId(@Param("userId") UUID userId);

    /**
     * Lấy root categories (không có parent)
     */
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true) " +
           "AND c.parentId IS NULL " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findRootCategories(@Param("userId") UUID userId);

    /**
     * Lấy subcategories của parent
     */
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true) " +
           "AND c.parentId = :parentId " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<Category> findSubcategories(@Param("parentId") UUID parentId, @Param("userId") UUID userId);

    /**
     * Tìm kiếm categories theo tên
     */
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR c.isSystem = true) " +
           "AND LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    Page<Category> searchByName(@Param("keyword") String keyword, 
                                 @Param("userId") UUID userId, 
                                 Pageable pageable);

    /**
     * Đếm số lượng transactions sử dụng category này
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.categoryId = :categoryId AND t.deletedAt IS NULL")
    Long countTransactionsByCategoryId(@Param("categoryId") UUID categoryId);

    /**
     * Kiểm tra xem category có thể xóa không (không có transaction và không có subcategory)
     */
    @Query("SELECT CASE WHEN (COUNT(t) = 0 AND COUNT(c) = 0) THEN true ELSE false END " +
           "FROM Category cat " +
           "LEFT JOIN Transaction t ON t.categoryId = cat.id AND t.deletedAt IS NULL " +
           "LEFT JOIN Category c ON c.parentId = cat.id AND c.deletedAt IS NULL " +
           "WHERE cat.id = :categoryId")
    Boolean canDelete(@Param("categoryId") UUID categoryId);

    /**
     * Kiểm tra category code đã tồn tại chưa
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Category c " +
           "WHERE c.code = :code AND c.deletedAt IS NULL " +
           "AND (:categoryId IS NULL OR c.id != :categoryId)")
    Boolean existsByCode(@Param("code") String code, @Param("categoryId") UUID categoryId);

    /**
     * Kiểm tra tên category đã tồn tại chưa (cho user hoặc system)
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Category c " +
           "WHERE LOWER(c.name) = LOWER(:name) AND c.deletedAt IS NULL " +
           "AND (c.userId = :userId OR (c.isSystem = true AND :userId IS NOT NULL)) " +
           "AND (:categoryId IS NULL OR c.id != :categoryId)")
    Boolean existsByNameAndUserId(@Param("name") String name, 
                                    @Param("userId") UUID userId, 
                                    @Param("categoryId") UUID categoryId);

    /**
     * Lấy category statistics
     */
    @Query("SELECT c.id as categoryId, c.name as categoryName, " +
           "COUNT(t.id) as transactionCount, SUM(t.amount) as totalAmount " +
           "FROM Category c " +
           "LEFT JOIN Transaction t ON t.categoryId = c.id AND t.deletedAt IS NULL " +
           "WHERE c.deletedAt IS NULL AND (c.userId = :userId OR c.isSystem = true) " +
           "GROUP BY c.id, c.name " +
           "ORDER BY transactionCount DESC")
    List<Object[]> getCategoryStatistics(@Param("userId") UUID userId);

    /**
     * Lấy next display order cho user
     */
    @Query("SELECT COALESCE(MAX(c.displayOrder), 0) + 1 FROM Category c " +
           "WHERE (c.userId = :userId OR c.isSystem = true) AND c.deletedAt IS NULL")
    Integer getNextDisplayOrder(@Param("userId") UUID userId);
}
