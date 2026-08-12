-- Switch billing provider from Creem to Whop
alter table profiles
  drop column if exists creem_subscription_id,
  drop column if exists creem_customer_id,
  add column if not exists whop_member_id text,
  add column if not exists whop_access_id text,
  add column if not exists whop_plan_id text,
  add column if not exists whop_manage_url text;
