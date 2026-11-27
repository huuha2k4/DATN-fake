package com.finance.finance.modules.admin.service;

import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.admin.dto.request.AdminUpdateUserRequest;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceSingleAdminTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminService adminService;

    @Test
    void rejectsPromotingUserToAdmin() {
        UUID userId = UUID.randomUUID();
        User target = User.builder()
                .id(userId)
                .email("user@finora.test")
                .systemRole(SystemRole.USER)
                .build();
        when(userRepository.lockActiveRecord(userId)).thenReturn(Optional.of(target));

        AdminUpdateUserRequest req = new AdminUpdateUserRequest();
        req.setSystemRole(SystemRole.ADMIN);

        assertThatThrownBy(() -> adminService.updateUser(userId, req))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsDemotingSoleAdmin() {
        UUID adminId = UUID.randomUUID();
        User soleAdmin = User.builder()
                .id(adminId)
                .email("admin@finora.test")
                .systemRole(SystemRole.ADMIN)
                .build();
        when(userRepository.lockActiveRecord(adminId)).thenReturn(Optional.of(soleAdmin));

        AdminUpdateUserRequest req = new AdminUpdateUserRequest();
        req.setSystemRole(SystemRole.USER);

        assertThatThrownBy(() -> adminService.updateUser(adminId, req))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }
}
