package com.finance.finance.modules.group;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@EnabledIfEnvironmentVariable(named = "FINORA_GROUP_MIGRATION_DB", matches = "finance_v71_fixture(_[0-9]+)?")
class GroupFinanceLegacyMigrationTest {
    @Test
    void upgradesPopulatedV71PreservingFinancialHistoryAndRefusesDuplicateSplits() {
        var url = "jdbc:postgresql://127.0.0.1:" + Integer.parseInt(System.getenv("DB_PORT")) + "/" + System.getenv("FINORA_GROUP_MIGRATION_DB");
        var password = System.getenv("DB_PASSWORD");
        var config = Flyway.configure().dataSource(url, "postgres", password)
                .defaultSchema("core").locations("classpath:db/migration");
        config.target("71").load().migrate();
        var db = new JdbcTemplate(new DriverManagerDataSource(url, "postgres", password));
        UUID owner = db.queryForObject("insert into core.users(email) values ('group-v71-owner@example.test') returning id", UUID.class);
        UUID other = db.queryForObject("insert into core.users(email) values ('group-v71-member@example.test') returning id", UUID.class);
        UUID account = db.queryForObject("""
                insert into core.accounts(user_id,name,currency_code,initial_balance,balance)
                values (?,'Legacy wallet','VND',1000000,700000) returning id
                """, UUID.class, owner);
        UUID group = db.queryForObject("""
                insert into core.groups(name,group_type,owner_id,base_currency)
                values ('Legacy family','FAMILY',?,'VND') returning id
                """, UUID.class, owner);
        db.update("insert into core.group_members(group_id,user_id,role) values (?,?,'OWNER'), (?,?,'MEMBER')", group, owner, group, other);
        UUID fund = db.queryForObject("insert into core.group_funds(group_id,currency,balance) values (?,'VND',150000) returning id", UUID.class, group);
        UUID contributionTransaction = historicTransaction(db, owner, account, "EXPENSE", 200000);
        db.update("""
                insert into core.group_fund_contributions(fund_id,contributor_user_id,source_account_id,personal_transaction_id,amount)
                values (?,?,?,?,200000)
                """, fund, owner, account, contributionTransaction);
        UUID sharedFundExpense = expense(db, group, owner, "GROUP_FUND");
        UUID personalExpense = expense(db, group, owner, "PERSONAL_ACCOUNT");
        db.update("insert into core.group_expense_splits(expense_id,user_id,amount) values (?,?,50000),(?,?,50000)",
                sharedFundExpense, other, personalExpense, other);
        db.update("""
                insert into core.child_wallets(group_id,child_name,date_of_birth,balance,currency,privacy_level)
                values (?,'Legacy child','2017-01-01',45000,'VND','PARENT_SUPERVISED')
                """, group);
        for (String status : new String[]{"PENDING", "REJECTED", "CONFIRMED"}) {
            UUID withdrawal = historicTransaction(db, owner, account, "EXPENSE", 25000);
            db.update("""
                    insert into core.group_settlements(group_id,from_user_id,to_user_id,amount,currency,
                    settlement_date,status,from_account_id,outgoing_transaction_id)
                    values (?,?,?,25000,'VND',current_date,?,?,?)
                    """, group, owner, other, status, account, withdrawal);
        }
        UUID duplicate = db.queryForObject("insert into core.group_expense_splits(expense_id,user_id,amount) values (?,?,50000) returning id",
                UUID.class, personalExpense, other);
        assertThatThrownBy(() -> config.target("72").load().migrate()).isInstanceOf(FlywayException.class)
                .hasStackTraceContaining("uq_group_expense_split_member");
        assertThat(db.queryForObject("select count(*) from core.group_expense_splits where expense_id=?", Long.class, personalExpense)).isEqualTo(2);
        // Remove only the deliberate duplicate in this synthetic test fixture.
        db.update("delete from core.group_expense_splits where id=?", duplicate);
        var before = snapshot(db, group, account, fund);
        config.target("74").load().migrate();
        assertThat(snapshot(db, group, account, fund)).isEqualTo(before);
        assertThat(db.queryForObject("select financial_purpose from core.group_expenses where id=?", String.class, sharedFundExpense)).isEqualTo("FUND_EXPENSE");
        assertThat(db.queryForObject("select financial_purpose from core.group_expenses where id=?", String.class, personalExpense)).isEqualTo("MEMBER_SPLIT");
        assertThat(db.queryForObject("select status from core.group_fund_contributions where fund_id=?", String.class, fund)).isEqualTo("CONFIRMED");
        assertThat(db.queryForObject("select allow_member_splits from core.group_finance_configs where group_id=?", Boolean.class, group)).isFalse();
        assertThat(db.queryForObject("select count(*) from core.personal_report_entries where user_id=?", Long.class, owner)).isZero();
        assertThat(db.queryForObject("select sum(amount) from core.personal_report_entries where user_id=?", java.math.BigDecimal.class, other))
                .isEqualByComparingTo("50000");
    }

    private UUID historicTransaction(JdbcTemplate db, UUID owner, UUID account, String type, int amount) {
        return db.queryForObject("""
                insert into core.transactions(user_id,account_id,category_id,type,amount,currency_code,exchange_rate,
                base_amount,occurred_at,occurred_date,description_raw,is_excluded_from_report)
                values (?,?,(select id from core.categories where code='OTHER_EXPENSE'),?,?,'VND',1,?,now(),current_date,
                'Legacy group wallet entry',false) returning id
                """, UUID.class, owner, account, type, amount, amount);
    }

    private UUID expense(JdbcTemplate db, UUID group, UUID actor, String source) {
        return db.queryForObject("""
                insert into core.group_expenses(group_id,description,amount,currency,paid_by_user_id,
                split_method,expense_date,created_by_user_id,payment_source)
                values (?,'Legacy expense',50000,'VND',?,'EXACT',current_date,?,?) returning id
                """, UUID.class, group, actor, actor, source);
    }

    private java.util.Map<String, Object> snapshot(JdbcTemplate db, UUID group, UUID account, UUID fund) {
        return db.queryForMap("""
                select
                (select count(*) from core.groups where id=?) as groups,
                (select count(*) from core.group_members where group_id=?) as members,
                (select balance from core.accounts where id=?) as wallet,
                (select balance from core.group_funds where id=?) as fund,
                (select sum(amount) from core.group_fund_contributions where fund_id=?) as contributions,
                (select sum(amount) from core.group_expenses where group_id=?) as expenses,
                (select sum(s.amount) from core.group_expense_splits s join core.group_expenses e on e.id=s.expense_id where e.group_id=?) as splits,
                (select string_agg(status,',' order by status) from core.group_settlements where group_id=?) as settlements,
                (select sum(balance) from core.child_wallets where group_id=?) as child_balance,
                (select sum(amount) from core.transactions where account_id=?) as wallet_movements
                """, group, group, account, fund, fund, group, group, group, group, account);
    }
}
