package com.finance.finance.modules.system.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "banks", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bank {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "short_name", length = 50)
    private String shortName;

    @Column(name = "bin", length = 10)
    private String bin;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "kind", nullable = false, length = 20)
    private String kind; // BANK or E_WALLET

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
