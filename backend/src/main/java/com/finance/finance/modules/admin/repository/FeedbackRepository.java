package com.finance.finance.modules.admin.repository;

import com.finance.finance.modules.admin.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    @Query("SELECT f FROM Feedback f WHERE " +
           "(:status IS NULL OR f.status = :status) AND " +
           "(:category IS NULL OR f.category = :category) " +
           "ORDER BY f.createdAt DESC")
    List<Feedback> findWithFilters(@Param("status") String status, @Param("category") String category);

    List<Feedback> findByUserIdOrderByCreatedAtDesc(UUID userId);
}

