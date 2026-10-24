package com.finance.finance.modules.category.service;

import com.finance.finance.common.enums.CategoryKind;
import com.finance.finance.modules.category.dto.request.CreateCategoryRequest;
import com.finance.finance.modules.category.dto.request.UpdateCategoryRequest;
import com.finance.finance.modules.category.dto.response.CategoryListResponse;
import com.finance.finance.modules.category.dto.response.CategoryResponse;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.exception.CategoryNotFoundException;
import com.finance.finance.modules.category.exception.DuplicateCategoryException;
import com.finance.finance.modules.category.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResponse createCategory(UUID userId, CreateCategoryRequest request) {
        log.info("Creating category for user: {}, name: {}", userId, request.getName());

        // Check duplicate
        if (categoryRepository.existsByNameAndUserId(request.getName(), userId, null)) {
            throw new DuplicateCategoryException("Danh mục '" + request.getName() + "' đã tồn tại");
        }

        // Validate parent if provided
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findByIdAndUserIdOrSystem(request.getParentId(), userId)
                    .orElseThrow(() -> new CategoryNotFoundException("Danh mục cha không tồn tại"));
            
            // Check max 2 levels
            if (parent.getParentId() != null) {
                throw new IllegalArgumentException("Chỉ hỗ trợ tối đa 2 cấp danh mục");
            }
        }

        Integer displayOrder = categoryRepository.getNextDisplayOrder(userId);

        Category category = Category.builder()
                .userId(userId)
                .parentId(request.getParentId())
                .code(request.getCode())
                .name(request.getName())
                .kind(request.getKind())
                .icon(request.getIcon())
                .color(request.getColor())
                .isSystem(false)
                .displayOrder(displayOrder != null ? displayOrder.shortValue() : 0)
                .build();

        category = categoryRepository.save(category);
        log.info("Category created: {}", category.getId());

        return mapToResponse(category, false);
    }

    @Transactional(readOnly = true)
    public CategoryListResponse getCategories(UUID userId, CategoryKind kind, Boolean includeSystem) {
        log.info("Getting categories for user: {}", userId);

        List<Category> categories;
        if (kind != null) {
            categories = categoryRepository.findByUserIdOrSystemAndKind(userId, kind);
        } else {
            categories = categoryRepository.findAllByUserIdOrSystem(userId);
        }

        List<CategoryResponse> categoryResponses = categories.stream()
                .map(cat -> mapToResponse(cat, true))
                .collect(Collectors.toList());

        // Calculate summary
        long totalCategories = categories.size();
        long customCategories = categories.stream().filter(c -> !c.isSystemCategory()).count();
        long systemCategories = categories.stream().filter(Category::isSystemCategory).count();

        return CategoryListResponse.builder()
                .categories(categoryResponses)
                .summary(CategoryListResponse.SummaryDto.builder()
                        .totalCategories((int) totalCategories)
                        .customCategories((int) customCategories)
                        .systemCategories((int) systemCategories)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(UUID userId, UUID categoryId) {
        log.info("Getting category: {}", categoryId);

        Category category = categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId)
                .orElseThrow(() -> new CategoryNotFoundException("Không tìm thấy danh mục"));

        return mapToResponse(category, true);
    }

    @Transactional
    public CategoryResponse updateCategory(UUID userId, UUID categoryId, UpdateCategoryRequest request) {
        log.info("Updating category: {}", categoryId);

        Category category = categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId)
                .orElseThrow(() -> new CategoryNotFoundException("Không tìm thấy danh mục"));

        // Cannot edit system categories
        if (category.isSystemCategory()) {
            throw new IllegalArgumentException("Không thể chỉnh sửa danh mục hệ thống");
        }

        // Check user ownership
        if (!category.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Không có quyền chỉnh sửa danh mục này");
        }

        // Check duplicate name
        if (request.getName() != null && !request.getName().equals(category.getName())) {
            if (categoryRepository.existsByNameAndUserId(request.getName(), userId, categoryId)) {
                throw new DuplicateCategoryException("Danh mục '" + request.getName() + "' đã tồn tại");
            }
        }

        // Update fields
        if (request.getName() != null) category.setName(request.getName());
        if (request.getIcon() != null) category.setIcon(request.getIcon());
        if (request.getColor() != null) category.setColor(request.getColor());
        if (request.getDisplayOrder() != null) category.setDisplayOrder(request.getDisplayOrder());

        category = categoryRepository.save(category);
        log.info("Category updated: {}", categoryId);

        return mapToResponse(category, false);
    }

    @Transactional
    public void deleteCategory(UUID userId, UUID categoryId) {
        log.info("Deleting category: {}", categoryId);

        Category category = categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId)
                .orElseThrow(() -> new CategoryNotFoundException("Không tìm thấy danh mục"));

        // Cannot delete system categories
        if (category.isSystemCategory()) {
            throw new IllegalArgumentException("Không thể xóa danh mục hệ thống");
        }

        // Check user ownership
        if (!category.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Không có quyền xóa danh mục này");
        }

        // Check if can delete
        if (!categoryRepository.canDelete(categoryId)) {
            throw new IllegalArgumentException("Không thể xóa danh mục đang được sử dụng hoặc có danh mục con");
        }

        category.markAsDeleted();
        categoryRepository.save(category);
        log.info("Category deleted: {}", categoryId);
    }

    @Transactional(readOnly = true)
    public Page<CategoryResponse> searchCategories(UUID userId, String keyword, Pageable pageable) {
        log.info("Searching categories with keyword: {}", keyword);

        return categoryRepository.searchByName(keyword, userId, pageable)
                .map(cat -> mapToResponse(cat, false));
    }

    private CategoryResponse mapToResponse(Category category, boolean includeChildren) {
        CategoryResponse.CategoryResponseBuilder builder = CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .code(category.getCode())
                .kind(category.getKind())
                .icon(category.getIcon())
                .color(category.getColor())
                .parentId(category.getParentId())
                .isSystem(category.isSystemCategory())
                .displayOrder(category.getDisplayOrder() != null ? category.getDisplayOrder().intValue() : 0)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt());

        // Add children if requested and no parent (root category)
        if (includeChildren && category.getParentId() == null) {
            List<Category> children = categoryRepository.findSubcategories(category.getId(), category.getUserId());
            List<CategoryResponse> childrenResponses = children.stream()
                    .map(child -> mapToResponse(child, false))
                    .collect(Collectors.toList());
            builder.children(childrenResponses);
        }

        // Add usage statistics
        Long transactionCount = categoryRepository.countTransactionsByCategoryId(category.getId());
        builder.usageStatistics(CategoryResponse.UsageStatisticsDto.builder()
                .transactionCount(transactionCount != null ? transactionCount.intValue() : 0)
                .build());

        return builder.build();
    }
}
