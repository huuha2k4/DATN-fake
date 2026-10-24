package com.finance.finance.modules.user.repository;

import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmailAndDeletedAtIsNull(String email);
    
    Optional<User> findByUsernameAndDeletedAtIsNull(String username);
    
    Optional<User> findByPhoneAndDeletedAtIsNull(String phone);
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmailAndDeletedAtIsNull(String email);
    
    boolean existsByUsernameAndDeletedAtIsNull(String username);
    
    boolean existsByPhoneAndDeletedAtIsNull(String phone);
    
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findActiveUserByEmail(@Param("email") String email);
    
    @Query("SELECT u FROM User u WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findActiveUserByUsername(@Param("username") String username);
    
    @Query("SELECT u FROM User u WHERE (u.email = :login OR u.username = :login) AND u.deletedAt IS NULL")
    Optional<User> findActiveUserByEmailOrUsername(@Param("login") String login);
    
    @Query("SELECT u FROM User u WHERE u.id = :id AND u.deletedAt IS NULL")
    Optional<User> findActiveUserById(@Param("id") UUID id);
    
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.userStatus = :status AND u.deletedAt IS NULL")
    Optional<User> findByEmailAndStatus(@Param("email") String email, @Param("status") UserStatus status);
}
