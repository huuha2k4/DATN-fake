package com.finance.finance.modules.admin.monitoring;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.DriverManager;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FINORA_PHASE3_MIGRATION_DB", matches = "finora_phase3_migration")
class OperationMetricsMigrationTest {
    @Test
    void upgradesV70WithHistoricalReceiptWithoutBackfill() throws Exception {
        String url = "jdbc:postgresql://127.0.0.1:" + Integer.parseInt(System.getenv("DB_PORT"))
                + "/finora_phase3_migration";
        String password = System.getenv("DB_PASSWORD");
        var config = Flyway.configure().dataSource(url, "postgres", password)
                .defaultSchema("core").locations("classpath:db/migration");
        config.target("70").load().migrate();

        try (var connection = DriverManager.getConnection(url, "postgres", password);
             var statement = connection.createStatement()) {
            try (var rows = statement.executeQuery("SELECT to_regclass('ops.service_request_metrics')")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isNull();
            }
            UUID user;
            try (var rows = statement.executeQuery("""
                    INSERT INTO core.users(email,full_name)
                    VALUES ('phase3-v70@example.test','Historical fixture') RETURNING id
                    """)) {
                assertThat(rows.next()).isTrue();
                user = rows.getObject(1, UUID.class);
            }
            UUID receipt;
            try (var insert = connection.prepareStatement("""
                    INSERT INTO core.receipts(user_id, merchant_name, confidence)
                    VALUES (?, 'Historical fixture', 0) RETURNING id
                    """)) {
                insert.setObject(1, user);
                try (var rows = insert.executeQuery()) {
                    assertThat(rows.next()).isTrue();
                    receipt = rows.getObject(1, UUID.class);
                }
            }
            config.target("71").load().migrate();
            try (var result = statement.executeQuery("SELECT count(*) FROM ops.service_request_metrics")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getLong(1)).isZero();
            }
            try (var read = connection.prepareStatement("SELECT confidence FROM core.receipts WHERE id = ?")) {
                read.setObject(1, receipt);
                try (var result = read.executeQuery()) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getBigDecimal(1)).isZero();
                }
            }
        }
    }
}
