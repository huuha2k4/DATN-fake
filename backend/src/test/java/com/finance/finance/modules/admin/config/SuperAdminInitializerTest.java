package com.finance.finance.modules.admin.config;

import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SuperAdminInitializerTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final SuperAdminInitializer initializer = new SuperAdminInitializer(users, encoder, mock(JdbcTemplate.class));

    @Test
    void startupPreservesExistingAdminWithoutBootstrapCredentials() {
        when(users.existsBySystemRoleAndDeletedAtIsNull(SystemRole.ADMIN)).thenReturn(true);

        initializer.run();

        verify(users).existsBySystemRoleAndDeletedAtIsNull(SystemRole.ADMIN);
        verifyNoMoreInteractions(users);
        verifyNoInteractions(encoder);
    }

    @Test
    void emptyInstallationFailsWithoutExplicitBootstrapCredentials() {
        ReflectionTestUtils.setField(initializer, "adminUsername", "");
        ReflectionTestUtils.setField(initializer, "adminEmail", "");
        ReflectionTestUtils.setField(initializer, "adminPassword", "");

        assertThatThrownBy(initializer::run).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SUPER_ADMIN_PASSWORD");
        verify(users, never()).save(any());
        verifyNoInteractions(encoder);
    }
}
