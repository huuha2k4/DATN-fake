package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.DataSharingLevel;
import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.SharingRequestStatus;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.group.dto.request.RequestDataSharingRequest;
import com.finance.finance.modules.group.dto.request.RespondSharingRequest;
import com.finance.finance.modules.group.dto.response.ChildTransactionSummaryResponse;
import com.finance.finance.modules.group.dto.response.DataSharingRequestResponse;
import com.finance.finance.modules.group.entity.ChildDataSharingRequest;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.entity.GroupMemberId;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.repository.ChildDataSharingRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChildDataSharingService {

    private final ChildDataSharingRequestRepository sharingRequestRepository;
    private final ChildWalletRepository walletRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemAuditService systemAuditService;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Bố mẹ yêu cầu chia sẻ dữ liệu từ con
     */
    @Transactional
    public DataSharingRequestResponse requestDataSharing(UUID groupId, UUID walletId, RequestDataSharingRequest request, UUID parentUserId) {
        // Validate parent is admin or owner
        GroupMember parentMember = groupMemberRepository.findById(new GroupMemberId(groupId, parentUserId))
                .orElseThrow(() -> new ResourceNotFoundException("Bạn không phải thành viên của nhóm"));

        if (parentMember.getRole() != com.finance.finance.common.enums.MemberRole.OWNER &&
            parentMember.getRole() != com.finance.finance.common.enums.MemberRole.ADMIN) {
            throw new BusinessException("Chỉ admin và owner mới có thể yêu cầu chia sẻ dữ liệu");
        }

        // Validate wallet exists and belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví trẻ em"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Ví không thuộc nhóm này");
        }

        if (wallet.getUserId() == null) {
            throw new BusinessException("Ví này không có tài khoản độc lập, không cần yêu cầu chia sẻ");
        }

        // Check if there's already a pending request
        sharingRequestRepository.findPendingRequest(walletId, parentUserId).ifPresent(existing -> {
            throw new BusinessException("Bạn đã có yêu cầu đang chờ phê duyệt từ con");
        });

        // Check if there's already an active approved request
        sharingRequestRepository.findActiveApprovedRequest(walletId, parentUserId, LocalDateTime.now())
                .ifPresent(existing -> {
                    throw new BusinessException("Bạn đã có quyền truy cập dữ liệu của con (hết hạn: " + existing.getExpiresAt() + ")");
                });

        // Create sharing request
        ChildDataSharingRequest sharingRequest = ChildDataSharingRequest.builder()
                .childWalletId(walletId)
                .childUserId(wallet.getUserId())
                .requestedByUserId(parentUserId)
                .groupId(groupId)
                .requestedLevel(request.getRequestedLevel())
                .status(SharingRequestStatus.PENDING)
                .requestReason(request.getRequestReason())
                .requestedAt(LocalDateTime.now())
                .build();

        sharingRequest = sharingRequestRepository.save(sharingRequest);

        log.info("Parent {} requested {} data sharing from child wallet {}", 
                parentUserId, request.getRequestedLevel(), walletId);

        // Send notification to child
        try {
            String parentName = userRepository.findById(parentUserId)
                    .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                    .orElse("Phụ huynh");

            String levelText = request.getRequestedLevel() == DataSharingLevel.SUMMARY_DAILY 
                    ? "tổng chi tiêu theo ngày" 
                    : "chi tiết từng giao dịch";

            notificationService.createNotification(
                    wallet.getUserId(),
                    NotificationType.SYSTEM,
                    NotificationPriority.HIGH,
                    parentName + " muốn xem dữ liệu chi tiêu của bạn",
                    parentName + " đã yêu cầu xem " + levelText + " của bạn. Bạn có thể chấp nhận hoặc từ chối yêu cầu này.",
                    "/child-wallets/sharing-requests",
                    "Xem yêu cầu"
            );
        } catch (Exception e) {
            log.warn("Failed to send data sharing request notification: {}", e.getMessage());
        }

        return buildResponse(sharingRequest);
    }

    /**
     * Con phản hồi yêu cầu chia sẻ (approve hoặc reject)
     */
    @Transactional
    public DataSharingRequestResponse respondToRequest(UUID requestId, RespondSharingRequest request, UUID childUserId) {
        ChildDataSharingRequest sharingRequest = sharingRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu chia sẻ"));

        // Validate child is the owner
        if (!sharingRequest.getChildUserId().equals(childUserId)) {
            throw new BusinessException("Bạn không có quyền phản hồi yêu cầu này");
        }

        if (sharingRequest.getStatus() != SharingRequestStatus.PENDING) {
            throw new BusinessException("Yêu cầu này đã được phản hồi");
        }

        LocalDateTime now = LocalDateTime.now();
        
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            // Approve request
            sharingRequest.setStatus(SharingRequestStatus.APPROVED);
            sharingRequest.setRespondedAt(now);
            
            // Set expiration date
            int days = request.getExpiresInDays() != null ? request.getExpiresInDays() : 90;
            sharingRequest.setExpiresAt(now.plusDays(days));

            log.info("Child {} approved data sharing request {} (expires in {} days)", 
                    childUserId, requestId, days);

            // Notify parent
            try {
                String childName = userRepository.findById(childUserId)
                        .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                        .orElse("Con");

                notificationService.createNotification(
                        sharingRequest.getRequestedByUserId(),
                        NotificationType.SYSTEM,
                        NotificationPriority.NORMAL,
                        childName + " đã chấp nhận chia sẻ dữ liệu",
                        childName + " đã đồng ý cho bạn xem dữ liệu chi tiêu trong " + days + " ngày tới.",
                        "/groups?groupId=" + sharingRequest.getGroupId() + "&tab=CHILD_WALLETS",
                        "Xem ngay"
                );
            } catch (Exception e) {
                log.warn("Failed to send approval notification: {}", e.getMessage());
            }

        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            // Reject request
            sharingRequest.setStatus(SharingRequestStatus.REJECTED);
            sharingRequest.setRespondedAt(now);
            sharingRequest.setRejectionReason(request.getRejectionReason());

            log.info("Child {} rejected data sharing request {}", childUserId, requestId);

            // Notify parent
            try {
                String childName = userRepository.findById(childUserId)
                        .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                        .orElse("Con");

                notificationService.createNotification(
                        sharingRequest.getRequestedByUserId(),
                        NotificationType.SYSTEM,
                        NotificationPriority.NORMAL,
                        childName + " đã từ chối chia sẻ dữ liệu",
                        childName + " không đồng ý chia sẻ dữ liệu chi tiêu lúc này.",
                        "/groups?groupId=" + sharingRequest.getGroupId(),
                        "OK"
                );
            } catch (Exception e) {
                log.warn("Failed to send rejection notification: {}", e.getMessage());
            }

        } else {
            throw new BusinessException("Action không hợp lệ. Chỉ chấp nhận APPROVE hoặc REJECT");
        }

        sharingRequest = sharingRequestRepository.save(sharingRequest);
        if (systemAuditService != null) {
            AuditEventType evt = sharingRequest.getStatus() == SharingRequestStatus.APPROVED
                    ? AuditEventType.CHILD_DATA_SHARING_APPROVED
                    : AuditEventType.CHILD_DATA_SHARING_REJECTED;
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(evt)
                    .actorId(childUserId)
                    .subjectUserId(sharingRequest.getRequestedByUserId())
                    .groupId(sharingRequest.getGroupId())
                    .resourceType("CHILD_DATA_SHARING")
                    .resourceId(sharingRequest.getId())
                    .relatedResourceId(sharingRequest.getChildWalletId())
                    .newValues(java.util.Map.of("status", sharingRequest.getStatus().name()))
                    .build());
        }
        return buildResponse(sharingRequest);
    }

    /**
     * Con thu hồi quyền truy cập
     */
    @Transactional
    public void revokeAccess(UUID walletId, UUID childUserId) {
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví"));

        if (!wallet.getUserId().equals(childUserId)) {
            throw new BusinessException("Bạn không có quyền thu hồi quyền truy cập của ví này");
        }

        // Find all active approved requests
        List<ChildDataSharingRequest> activeRequests = sharingRequestRepository
                .findActiveRequestsByWallet(walletId, LocalDateTime.now());

        if (activeRequests.isEmpty()) {
            throw new BusinessException("Không có quyền truy cập nào đang hoạt động");
        }

        LocalDateTime now = LocalDateTime.now();
        for (ChildDataSharingRequest req : activeRequests) {
            req.setStatus(SharingRequestStatus.REVOKED);
            req.setRevokedAt(now);
            sharingRequestRepository.save(req);
            if (systemAuditService != null) {
                systemAuditService.record(AuditEventRequest.builder()
                        .eventType(AuditEventType.CHILD_DATA_SHARING_REVOKED)
                        .actorId(childUserId)
                        .subjectUserId(req.getRequestedByUserId())
                        .groupId(req.getGroupId())
                        .resourceType("CHILD_DATA_SHARING")
                        .resourceId(req.getId())
                        .relatedResourceId(walletId)
                        .build());
            }

            // Notify parent
            try {
                String childName = userRepository.findById(childUserId)
                        .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                        .orElse("Con");

                notificationService.createNotification(
                        req.getRequestedByUserId(),
                        NotificationType.SYSTEM,
                        NotificationPriority.HIGH,
                        childName + " đã thu hồi quyền truy cập",
                        childName + " đã thu hồi quyền xem dữ liệu chi tiêu của mình.",
                        "/groups?groupId=" + req.getGroupId(),
                        "OK"
                );
            } catch (Exception e) {
                log.warn("Failed to send revoke notification: {}", e.getMessage());
            }
        }

        log.info("Child {} revoked {} active data sharing permissions", childUserId, activeRequests.size());
    }

    /**
     * Lấy danh sách yêu cầu pending của con
     */
    @Transactional(readOnly = true)
    public List<DataSharingRequestResponse> getPendingRequests(UUID childUserId) {
        List<ChildDataSharingRequest> requests = sharingRequestRepository.findPendingRequestsByChildUser(childUserId);
        return requests.stream()
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    /**
     * Kiểm tra quyền truy cập và lấy mức độ chia sẻ
     */
    @Transactional(readOnly = true)
    public DataSharingLevel checkPermission(UUID walletId, UUID parentUserId) {
        return sharingRequestRepository.findActiveSharingLevel(walletId, parentUserId, LocalDateTime.now())
                .orElse(DataSharingLevel.NONE);
    }

    /**
     * Kiểm tra xem parent có quyền xem không
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(UUID walletId, UUID parentUserId) {
        return sharingRequestRepository.hasActivePermission(walletId, parentUserId, LocalDateTime.now());
    }

    /**
     * Scheduled job: Đánh dấu các request đã hết hạn
     */
    @Transactional
    public void markExpiredRequests() {
        List<ChildDataSharingRequest> expiredRequests = sharingRequestRepository.findExpiredRequests(LocalDateTime.now());
        
        for (ChildDataSharingRequest req : expiredRequests) {
            req.setStatus(SharingRequestStatus.EXPIRED);
            sharingRequestRepository.save(req);
            
            log.info("Marked sharing request {} as EXPIRED", req.getId());
        }
        
        if (!expiredRequests.isEmpty()) {
            log.info("Marked {} data sharing requests as expired", expiredRequests.size());
        }
    }

    /**
     * Lấy tổng quan hoặc chi tiết giao dịch của con
     * Tùy theo DataSharingLevel mà bố mẹ được phép xem
     */
    @Transactional(readOnly = true)
    public ChildTransactionSummaryResponse getTransactionSummary(UUID groupId, UUID walletId, 
                                                                  LocalDate startDate, LocalDate endDate, 
                                                                  UUID parentUserId) {
        // Validate wallet
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví trẻ em"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Ví không thuộc nhóm này");
        }

        if (wallet.getUserId() == null) {
            throw new BusinessException("Ví này không có tài khoản độc lập");
        }

        // Check permission level
        DataSharingLevel level = checkPermission(walletId, parentUserId);

        if (level == DataSharingLevel.NONE) {
            return ChildTransactionSummaryResponse.builder()
                    .message("Con chưa cho phép bạn xem dữ liệu chi tiêu. Hãy gửi yêu cầu chia sẻ dữ liệu.")
                    .build();
        }

        // Default date range: last 30 days
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        // Query transactions của con trong khoảng thời gian
        org.springframework.data.domain.Pageable unpaged = org.springframework.data.domain.Pageable.unpaged();
        List<com.finance.finance.modules.transaction.entity.Transaction> transactions = 
                transactionRepository.findByUserIdAndDateRange(wallet.getUserId(), startDate, endDate, unpaged).getContent();

        // Build response theo level
        if (level == DataSharingLevel.SUMMARY_DAILY) {
            return buildSummaryResponse(transactions, startDate, endDate);
        } else {
            // DETAILED level - trả về chi tiết (sẽ implement ở endpoint khác)
            return buildSummaryResponse(transactions, startDate, endDate);
        }
    }

    private ChildTransactionSummaryResponse buildSummaryResponse(
            List<com.finance.finance.modules.transaction.entity.Transaction> transactions,
            LocalDate startDate, LocalDate endDate) {

        if (transactions.isEmpty()) {
            return ChildTransactionSummaryResponse.builder()
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalSpent(java.math.BigDecimal.ZERO)
                    .transactionCount(0)
                    .avgPerDay(java.math.BigDecimal.ZERO)
                    .dailyBreakdown(java.util.Collections.emptyList())
                    .categoryBreakdown(java.util.Collections.emptyList())
                    .build();
        }

        // Tính tổng
        java.math.BigDecimal totalSpent = transactions.stream()
                .filter(t -> t.getType() == com.finance.finance.common.enums.TransactionType.EXPENSE)
                .map(com.finance.finance.modules.transaction.entity.Transaction::getAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        long dayCount = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        java.math.BigDecimal avgPerDay = totalSpent.divide(
                java.math.BigDecimal.valueOf(dayCount), 2, java.math.RoundingMode.HALF_UP);

        // Group by date
        java.util.Map<LocalDate, java.util.List<com.finance.finance.modules.transaction.entity.Transaction>> byDate = 
                transactions.stream()
                        .filter(t -> t.getType() == com.finance.finance.common.enums.TransactionType.EXPENSE)
                        .collect(java.util.stream.Collectors.groupingBy(
                                com.finance.finance.modules.transaction.entity.Transaction::getOccurredDate));

        java.util.List<ChildTransactionSummaryResponse.DailySummary> dailyBreakdown = 
                byDate.entrySet().stream()
                        .sorted(java.util.Map.Entry.<LocalDate, java.util.List<com.finance.finance.modules.transaction.entity.Transaction>>comparingByKey().reversed())
                        .map(entry -> {
                            LocalDate date = entry.getKey();
                            java.util.List<com.finance.finance.modules.transaction.entity.Transaction> dayTxs = entry.getValue();

                            java.math.BigDecimal dayTotal = dayTxs.stream()
                                    .map(com.finance.finance.modules.transaction.entity.Transaction::getAmount)
                                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

                            // Group by category
                            java.util.Map<java.util.UUID, java.math.BigDecimal> categoryAmounts = dayTxs.stream()
                                    .filter(t -> t.getCategoryId() != null)
                                    .collect(java.util.stream.Collectors.groupingBy(
                                            com.finance.finance.modules.transaction.entity.Transaction::getCategoryId,
                                            java.util.stream.Collectors.reducing(
                                                    java.math.BigDecimal.ZERO,
                                                    com.finance.finance.modules.transaction.entity.Transaction::getAmount,
                                                    java.math.BigDecimal::add)));

                            java.util.List<ChildTransactionSummaryResponse.CategoryAmount> categories = 
                                    categoryAmounts.entrySet().stream()
                                            .map(cat -> {
                                                String categoryName = categoryRepository.findById(cat.getKey())
                                                        .map(com.finance.finance.modules.category.entity.Category::getName)
                                                        .orElse("Khác");
                                                return ChildTransactionSummaryResponse.CategoryAmount.builder()
                                                        .categoryName(categoryName)
                                                        .amount(cat.getValue())
                                                        .build();
                                            })
                                            .collect(java.util.stream.Collectors.toList());

                            return ChildTransactionSummaryResponse.DailySummary.builder()
                                    .date(date)
                                    .total(dayTotal)
                                    .count(dayTxs.size())
                                    .categories(categories)
                                    .build();
                        })
                        .collect(java.util.stream.Collectors.toList());

        // Category breakdown (overall)
        java.util.Map<java.util.UUID, java.util.List<com.finance.finance.modules.transaction.entity.Transaction>> byCategory = 
                transactions.stream()
                        .filter(t -> t.getType() == com.finance.finance.common.enums.TransactionType.EXPENSE && t.getCategoryId() != null)
                        .collect(java.util.stream.Collectors.groupingBy(
                                com.finance.finance.modules.transaction.entity.Transaction::getCategoryId));

        java.util.List<ChildTransactionSummaryResponse.CategorySummary> categoryBreakdown = 
                byCategory.entrySet().stream()
                        .map(entry -> {
                            java.util.UUID categoryId = entry.getKey();
                            java.util.List<com.finance.finance.modules.transaction.entity.Transaction> catTxs = entry.getValue();

                            String categoryName = categoryRepository.findById(categoryId)
                                    .map(com.finance.finance.modules.category.entity.Category::getName)
                                    .orElse("Khác");

                            java.math.BigDecimal catTotal = catTxs.stream()
                                    .map(com.finance.finance.modules.transaction.entity.Transaction::getAmount)
                                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

                            java.math.BigDecimal percentage = totalSpent.compareTo(java.math.BigDecimal.ZERO) > 0
                                    ? catTotal.divide(totalSpent, 4, java.math.RoundingMode.HALF_UP)
                                            .multiply(java.math.BigDecimal.valueOf(100))
                                    : java.math.BigDecimal.ZERO;

                            return ChildTransactionSummaryResponse.CategorySummary.builder()
                                    .categoryName(categoryName)
                                    .amount(catTotal)
                                    .count(catTxs.size())
                                    .percentage(percentage)
                                    .build();
                        })
                        .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
                        .collect(java.util.stream.Collectors.toList());

        return ChildTransactionSummaryResponse.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalSpent(totalSpent)
                .transactionCount(transactions.size())
                .avgPerDay(avgPerDay)
                .dailyBreakdown(dailyBreakdown)
                .categoryBreakdown(categoryBreakdown)
                .build();
    }

    private DataSharingRequestResponse buildResponse(ChildDataSharingRequest request) {
        String requestedByName = userRepository.findById(request.getRequestedByUserId())
                .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                .orElse("Unknown");

        String childName = userRepository.findById(request.getChildUserId())
                .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                .orElse("Unknown");

        boolean isExpired = request.getExpiresAt() != null && request.getExpiresAt().isBefore(LocalDateTime.now());
        boolean canRevoke = request.getStatus() == SharingRequestStatus.APPROVED && !isExpired;

        return DataSharingRequestResponse.builder()
                .id(request.getId())
                .childWalletId(request.getChildWalletId())
                .childUserId(request.getChildUserId())
                .requestedByUserId(request.getRequestedByUserId())
                .groupId(request.getGroupId())
                .requestedByName(requestedByName)
                .childName(childName)
                .requestedLevel(request.getRequestedLevel())
                .status(request.getStatus())
                .requestReason(request.getRequestReason())
                .rejectionReason(request.getRejectionReason())
                .requestedAt(request.getRequestedAt())
                .respondedAt(request.getRespondedAt())
                .expiresAt(request.getExpiresAt())
                .revokedAt(request.getRevokedAt())
                .isExpired(isExpired)
                .canRevoke(canRevoke)
                .build();
    }
}
