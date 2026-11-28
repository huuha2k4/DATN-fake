\set ON_ERROR_STOP on
select current_database() in ('finance_test', 'finance_final_clean') as fixture_db \gset
\if :fixture_db
\else
  \echo 'This fixture is only for the isolated finance acceptance database.'
  \quit 1
\endif

begin;
insert into core.users(email, full_name, password_hash, system_role, user_status, email_verified, email_verified_at)
select fixture.email, fixture.name, admin.password_hash, 'USER', 'ACTIVE', true, now()
from core.users admin
cross join (values ('finance-owner@example.test', 'Finance Owner'), ('finance-member@example.test', 'Finance Member')) fixture(email, name)
where admin.email = 'test-admin@example.invalid'
  and not exists (select 1 from core.users existing where existing.email=fixture.email);

select id as owner_id from core.users where email='finance-owner@example.test' \gset
select id as member_id from core.users where email='finance-member@example.test' \gset

insert into core.accounts(user_id, name, currency_code, account_type, initial_balance, balance)
select u.id, U&'V\00ED nghi\1EC7m thu', 'VND', 'CASH', 1000000, 1000000
from core.users u where u.id in (:'owner_id', :'member_id')
  and not exists (select 1 from core.accounts a where a.user_id=u.id and a.name=U&'V\00ED nghi\1EC7m thu');

insert into core.groups(name, group_type, owner_id, base_currency)
values (U&'Ph\00F2ng tr\1ECD nghi\1EC7m thu', 'ROOMMATE', :'owner_id', 'VND') returning id as group_id \gset
insert into core.group_members(group_id,user_id,role) values (:'group_id',:'owner_id','OWNER'), (:'group_id',:'member_id','MEMBER');
insert into core.group_funds(group_id,currency,balance) values (:'group_id','VND',0);
insert into core.group_finance_configs(group_id,allow_member_splits,allow_debt_simplification) values (:'group_id',true,true);
commit;
select :'group_id';
