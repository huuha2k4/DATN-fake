package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.SpendRequestStatus;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.dto.request.ApproveSpendRequestRequest;
import com.finance.finance.modules.group.dto.request.RejectSpendRequestRequest;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.repository.ChildChoreRepository;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChildManagementServiceAuthorizationTest {

    @Mock ChildSpendRequestRepository spendRequestRepository;
    @Mock ChildChoreRepository choreRepository;
    @Mock ChildWalletRepository walletRepository;
    @Mock GroupMemberRepository groupMemberRepository;
    @Mock GroupRepository groupRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock AccountRepository accountRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock GroupFundRepository groupFundRepository;
    @Mock GroupExpenseRepository groupExpenseRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;

    @InjectMocks ChildManagementService service;

    @Test
    void approveRejectsWalletFromAnotherGroupBeforeAnyFinancialWrite() {
        Fixture fixture = fixture();
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(fixture.requestedGroupId, fixture.userId)).thenReturn(true);
        when(spendRequestRepository.findById(fixture.requestId)).thenReturn(Optional.of(fixture.request));
        when(walletRepository.findById(fixture.walletId)).thenReturn(Optional.of(fixture.foreignWallet));

        assertThrows(ResourceNotFoundException.class, () -> service.approveSpendRequest(
                fixture.requestedGroupId,
                fixture.walletId,
                fixture.requestId,
                new ApproveSpendRequestRequest(null, "PERSONAL_ACCOUNT", UUID.randomUUID()),
                fixture.userId));

        assertEquals(SpendRequestStatus.PENDING, fixture.request.getStatus());
        assertEquals(new BigDecimal("500.00"), fixture.foreignWallet.getBalance());
        verify(accountRepository, never()).save(any());
        verify(walletRepository, never()).save(any());
        verify(spendRequestRepository, never()).save(any());
    }

    @Test
    void rejectRejectsWalletFromAnotherGroupBeforeChangingRequestStatus() {
        Fixture fixture = fixture();
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(fixture.requestedGroupId, fixture.userId)).thenReturn(true);
        when(spendRequestRepository.findById(fixture.requestId)).thenReturn(Optional.of(fixture.request));
        when(walletRepository.findById(fixture.walletId)).thenReturn(Optional.of(fixture.foreignWallet));

        assertThrows(ResourceNotFoundException.class, () -> service.rejectSpendRequest(
                fixture.requestedGroupId,
                fixture.walletId,
                fixture.requestId,
                new RejectSpendRequestRequest("not allowed"),
                fixture.userId));

        assertEquals(SpendRequestStatus.PENDING, fixture.request.getStatus());
        verify(walletRepository, never()).save(any());
        verify(spendRequestRepository, never()).save(any());
    }

    private Fixture fixture() {
        UUID requestedGroupId = UUID.randomUUID();
        UUID foreignGroupId = UUID.randomUUID();
        UUID walletId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ChildWallet wallet = ChildWallet.builder()
                .id(walletId)
                .groupId(foreignGroupId)
                .balance(new BigDecimal("500.00"))
                .build();
        ChildSpendRequest request = ChildSpendRequest.builder()
                .id(requestId)
                .walletId(walletId)
                .amount(new BigDecimal("100.00"))
                .categoryId(UUID.randomUUID())
                .description("[MONEY_REQUEST] school supplies")
                .status(SpendRequestStatus.PENDING)
                .build();
        return new Fixture(requestedGroupId, walletId, requestId, userId, wallet, request);
    }

    private record Fixture(
            UUID requestedGroupId,
            UUID walletId,
            UUID requestId,
            UUID userId,
            ChildWallet foreignWallet,
            ChildSpendRequest request) {
    }
}
