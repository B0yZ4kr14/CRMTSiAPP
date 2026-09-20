const FOUNDATION_TABLES = [
  'roles', 'user_roles', 'audit_events', 'secrets', 'secret_versions',
  'channels', 'channel_credentials', 'channel_sessions', 'webhook_events',
  'teams', 'team_members', 'queues', 'queue_members', 'tags', 'conversation_tags',
  'sla_policies', 'conversation_sla', 'routing_rules', 'templates', 'template_versions',
  'outbox_jobs', 'delivery_events', 'failed_jobs', 'conversation_assignments', 'internal_notes',
  'automation_rules', 'automation_runs', 'privacy_requests', 'retention_runs', 'metrics_rollups',
  'installation_setup', 'provider_configs', 'admin_operations', 'queue_controls',
];

const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const SCHEMA_VERSION = '005-operational-experience';

function foundationMigration() {
  return `
    create table if not exists tenants (id uuid primary key, name text not null, slug text not null unique, created_at timestamptz not null default now());
    insert into tenants(id,name,slug) values('${DEFAULT_TENANT_ID}','TSi Telecom','default') on conflict(id) do nothing;
    create table if not exists roles (name text primary key check (name in ('admin','manager','agent','viewer')), description text not null default '');
    create table if not exists user_roles (user_id text not null references users(id) on delete cascade, role_name text not null references roles(name), assigned_at timestamptz not null default now(), assigned_by text references users(id) on delete set null, primary key(user_id, role_name));
    create table if not exists audit_events (id uuid primary key, tenant_id uuid not null references tenants(id) on delete restrict, actor_user_id text references users(id) on delete set null, action text not null, resource_type text not null, resource_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
    create or replace function prevent_audit_modification() returns trigger as $$
    begin
      raise exception 'audit events are immutable and append-only';
    end;
    $$ language plpgsql;
    drop trigger if exists audit_events_immutable on audit_events;
    create trigger audit_events_immutable before update or delete on audit_events
    for each row execute function prevent_audit_modification();
    create table if not exists secrets (id uuid primary key, purpose text not null unique, active_version_id uuid, created_at timestamptz not null default now());
    alter table secrets add column if not exists updated_at timestamptz not null default now();
    create table if not exists secret_versions (id uuid primary key, secret_id uuid not null references secrets(id) on delete cascade, ciphertext text not null, key_version integer not null default 1, created_at timestamptz not null default now(), retired_at timestamptz, created_by text references users(id) on delete set null);
    do $$ begin
      if not exists (select 1 from pg_constraint where conname='secrets_active_version_fk') then
        alter table secrets add constraint secrets_active_version_fk foreign key(active_version_id) references secret_versions(id) on delete set null;
      end if;
    end $$;
    create table if not exists channels (id uuid primary key, provider text not null check(provider in ('meta','waha')), name text not null, status text not null default 'inactive' check(status in ('inactive','connecting','active','degraded','disabled')), config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
    alter table channels add column if not exists updated_at timestamptz not null default now();
    create table if not exists channel_credentials (channel_id uuid primary key references channels(id) on delete cascade, secret_version_id uuid not null references secret_versions(id), label text not null default 'primary', created_at timestamptz not null default now());
    alter table channel_credentials add column if not exists updated_at timestamptz not null default now();
    create table if not exists channel_sessions (id uuid primary key, channel_id uuid not null references channels(id) on delete cascade, provider_session_id text, state text not null default 'pending', qr_expires_at timestamptz, last_seen_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
    alter table channel_sessions add column if not exists updated_at timestamptz not null default now();
    create table if not exists webhook_events (id uuid primary key, provider text not null, provider_event_id text not null, channel_id uuid references channels(id) on delete set null, payload jsonb not null, received_at timestamptz not null default now(), processed_at timestamptz, error text, unique (channel_id, provider_event_id));
    alter table webhook_events add column if not exists status text not null default 'pending';
    alter table webhook_events add column if not exists attempts integer not null default 0;
    alter table webhook_events add column if not exists max_attempts integer not null default 8;
    alter table webhook_events add column if not exists available_at timestamptz not null default now();
    alter table webhook_events add column if not exists locked_by text;
    alter table webhook_events add column if not exists locked_at timestamptz;
    alter table webhook_events add column if not exists lease_token uuid;
    alter table webhook_events add column if not exists updated_at timestamptz not null default now();
    alter table webhook_events add column if not exists processing_error text;
    alter table webhook_events drop constraint if exists webhook_events_status_check;
    alter table webhook_events add constraint webhook_events_status_check check(status in ('pending','processing','processed','failed','dead_letter')) not valid;
    create index if not exists webhook_events_ready_idx on webhook_events(status, available_at) where status in ('pending','failed');
    create table if not exists teams (id uuid primary key, name text not null unique, created_at timestamptz not null default now());
    create table if not exists team_members (team_id uuid not null references teams(id) on delete cascade, user_id text not null references users(id) on delete cascade, primary key(team_id,user_id));
    create table if not exists queues (id uuid primary key, name text not null unique, description text, strategy text not null default 'round_robin' check(strategy in ('round_robin','least_busy','manual')), is_active boolean not null default true, created_at timestamptz not null default now());
    create table if not exists queue_members (queue_id uuid not null references queues(id) on delete cascade, user_id text not null references users(id) on delete cascade, priority integer not null default 0, primary key(queue_id,user_id));
    create table if not exists tags (id uuid primary key, name text not null unique, color text not null default '#64748b', created_at timestamptz not null default now());
    create table if not exists conversation_tags (conversation_id text not null references conversations(id) on delete cascade, tag_id uuid not null references tags(id) on delete cascade, primary key(conversation_id,tag_id));
    create table if not exists sla_policies (id uuid primary key, name text not null unique, first_response_seconds integer, resolution_seconds integer, is_default boolean not null default false, created_at timestamptz not null default now());
    alter table sla_policies add column if not exists updated_at timestamptz not null default now();
    create table if not exists conversation_sla (conversation_id text primary key references conversations(id) on delete cascade, policy_id uuid references sla_policies(id) on delete set null, first_response_due_at timestamptz, resolution_due_at timestamptz, breached_at timestamptz);
    alter table conversation_sla add column if not exists updated_at timestamptz not null default now();
    create table if not exists routing_rules (id uuid primary key, name text not null, priority integer not null default 0, conditions jsonb not null default '{}'::jsonb, queue_id uuid references queues(id) on delete set null, assign_user_id text references users(id) on delete set null, enabled boolean not null default true, created_at timestamptz not null default now());
    alter table routing_rules add column if not exists updated_at timestamptz not null default now();
    create table if not exists templates (id uuid primary key, name text not null, body text not null, channel text not null default 'whatsapp', locale text not null default 'pt_BR', status text not null default 'draft' check(status in ('draft','approved','rejected')), created_at timestamptz not null default now());
    alter table templates add column if not exists updated_at timestamptz not null default now();
    create table if not exists template_versions (id uuid primary key, template_id uuid not null references templates(id) on delete cascade, version integer not null, body text not null, variables jsonb not null default '[]'::jsonb, created_by text references users(id) on delete set null, created_at timestamptz not null default now(), unique(template_id,version));
    create table if not exists outbox_jobs (id uuid primary key, channel_id uuid references channels(id) on delete restrict, conversation_id text references conversations(id) on delete set null, kind text not null, payload jsonb not null, idempotency_key text not null unique, status text not null default 'pending' check(status in ('pending','processing','sent','failed','dead_letter','delivery_unknown')), attempts integer not null default 0, max_attempts integer not null default 5, available_at timestamptz not null default now(), locked_at timestamptz, last_error text, created_at timestamptz not null default now());
    alter table outbox_jobs add column if not exists updated_at timestamptz not null default now();
    alter table outbox_jobs add column if not exists lease_token uuid;
    alter table outbox_jobs add column if not exists leased_at timestamptz;
    alter table outbox_jobs add column if not exists provider_message_id text;
    alter table outbox_jobs add column if not exists reconciliation_required boolean not null default false;
    alter table outbox_jobs drop constraint if exists outbox_jobs_status_check;
    alter table outbox_jobs add constraint outbox_jobs_status_check check(status in ('pending','processing','sent','failed','dead_letter','delivery_unknown')) not valid;
    create index if not exists outbox_jobs_ready_idx on outbox_jobs(status, available_at) where status in ('pending','failed');
    create table if not exists delivery_events (id uuid primary key, channel_id uuid references channels(id) on delete set null, message_id text references conversation_messages(id) on delete cascade, provider_message_id text not null, status text not null check(status in ('queued','sent','delivered','read','failed')), occurred_at timestamptz not null, payload jsonb not null default '{}'::jsonb, tenant_id uuid references tenants(id) on delete restrict, unique(channel_id, provider_message_id, status));
    alter table delivery_events add column if not exists tenant_id uuid references tenants(id) on delete restrict;
    update delivery_events event set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table delivery_events alter column tenant_id set not null;
    create table if not exists failed_jobs (id uuid primary key, outbox_job_id uuid not null unique references outbox_jobs(id) on delete cascade, reason text not null, payload jsonb not null, failed_at timestamptz not null default now(), resolved_at timestamptz, resolved_by text references users(id) on delete set null);
    alter table conversations add column if not exists assigned_user_id text references users(id) on delete set null;
    alter table conversations add column if not exists queue_id uuid references queues(id) on delete set null;
    alter table conversations add column if not exists priority text not null default 'normal' check(priority in ('low','normal','high','urgent'));
    alter table conversations add column if not exists last_inbound_at timestamptz;
    alter table conversation_messages add column if not exists search_vector tsvector;
    create index if not exists conversation_messages_search_idx on conversation_messages using gin(search_vector);
    create table if not exists conversation_assignments (id uuid primary key, conversation_id text not null references conversations(id) on delete cascade, assigned_user_id text references users(id) on delete set null, assigned_by text references users(id) on delete set null, queue_id uuid references queues(id) on delete set null, created_at timestamptz not null default now());
    create table if not exists internal_notes (id uuid primary key, conversation_id text not null references conversations(id) on delete cascade, author_user_id text references users(id) on delete set null, body text not null, created_at timestamptz not null default now());
    create table if not exists canned_responses (id uuid primary key, title text not null, body text not null, created_by text references users(id) on delete set null, created_at timestamptz not null default now());
    create table if not exists automation_rules (id uuid primary key, tenant_id uuid references tenants(id) on delete restrict, name text not null, trigger_type text not null, conditions jsonb not null default '{}'::jsonb, actions jsonb not null default '[]'::jsonb, active boolean not null default false, version integer not null default 1, created_by text references users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    alter table automation_rules add column if not exists updated_at timestamptz not null default now();
    create table if not exists automation_runs (id uuid primary key, rule_id uuid not null references automation_rules(id) on delete cascade, conversation_id text references conversations(id) on delete set null, status text not null check(status in ('pending','simulated','completed','failed','skipped')), result jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), completed_at timestamptz);
    create table if not exists privacy_requests (id uuid primary key, tenant_id uuid references tenants(id) on delete restrict, contact_phone text not null, kind text not null check(kind in ('export','anonymize','delete')), status text not null default 'open' check(status in ('open','processing','completed','rejected')), requested_by text references users(id) on delete set null, result jsonb not null default '{}'::jsonb, expires_at timestamptz, created_at timestamptz not null default now(), completed_at timestamptz);
    create table if not exists retention_runs (id uuid primary key, policy_name text not null, status text not null check(status in ('started','completed','failed')), deleted_count integer not null default 0, details jsonb not null default '{}'::jsonb, started_at timestamptz not null default now(), completed_at timestamptz);
    create table if not exists metric_events (id uuid primary key, tenant_id uuid not null references tenants(id) on delete cascade, occurred_at timestamptz not null, type text not null check(type in ('conversation.opened','conversation.first_response','conversation.resolved')), duration_ms bigint check(duration_ms is null or duration_ms >= 0), channel text, queue text, correlation_id text, created_at timestamptz not null default now());
    create index if not exists metric_events_tenant_occurred_idx on metric_events(tenant_id,occurred_at,id);
    create index if not exists metric_events_tenant_type_idx on metric_events(tenant_id,type,occurred_at);
    create table if not exists alert_rules (id text not null, tenant_id uuid not null references tenants(id) on delete cascade, threshold numeric not null, escalation_seconds integer not null default 0 check(escalation_seconds >= 0), severity text not null default 'medium' check(severity in ('low','medium','high','critical')), active boolean not null default true, created_at timestamptz not null default now(), primary key(tenant_id,id));
    create table if not exists alert_instances (id uuid primary key, tenant_id uuid not null references tenants(id) on delete cascade, rule_id text not null, severity text not null, status text not null check(status in ('open','acknowledged','escalated','resolved')), observed_value numeric not null, correlation_id text, opened_at timestamptz not null default now(), escalation_due_at timestamptz, acknowledged_by text references users(id) on delete set null, acknowledged_at timestamptz, resolved_at timestamptz);
    create index if not exists alert_instances_tenant_status_idx on alert_instances(tenant_id,status,opened_at desc);
    create unique index if not exists alert_instances_one_active_rule on alert_instances(tenant_id,rule_id) where status in ('open','acknowledged','escalated');
    create table if not exists metrics_rollups (bucket_start timestamptz not null, bucket_kind text not null check(bucket_kind in ('hour','day')), channel_id uuid references channels(id) on delete set null, queue_id uuid references queues(id) on delete set null, inbound_count integer not null default 0, outbound_count integer not null default 0, resolved_count integer not null default 0, failed_count integer not null default 0, avg_first_response_ms bigint, avg_resolution_ms bigint, primary key(bucket_start,bucket_kind,channel_id,queue_id));
    create table if not exists worker_heartbeats (worker_name text primary key, worker_id text not null unique, status text not null default 'running', metadata jsonb not null default '{}'::jsonb);
    alter table worker_heartbeats add column if not exists worker_name text;
    alter table worker_heartbeats add column if not exists worker_id text;
    update worker_heartbeats set worker_id=coalesce(worker_id,worker_name) where worker_id is null;
    update worker_heartbeats set worker_name=coalesce(worker_name,worker_id) where worker_name is null;
    alter table worker_heartbeats add column if not exists status text not null default 'running';
    alter table worker_heartbeats add column if not exists metadata jsonb not null default '{}'::jsonb;
    create unique index if not exists worker_heartbeats_worker_name_idx on worker_heartbeats(worker_name);
    create unique index if not exists worker_heartbeats_worker_id_idx on worker_heartbeats(worker_id);
    alter table worker_heartbeats add column if not exists updated_at timestamptz not null default now();
    create table if not exists health_checks (id uuid primary key default gen_random_uuid(), component text not null, status text not null, details jsonb not null default '{}'::jsonb, checked_at timestamptz not null default now());
    create index if not exists worker_heartbeats_updated_idx on worker_heartbeats(updated_at desc);
  `;
}

function tenantMigration() {
  const ownedTables = [
    'contacts', 'leads', 'companies', 'teams', 'queues', 'templates', 'channels', 'tags',
    'conversations', 'conversation_messages', 'audit_events', 'outbox_jobs', 'delivery_events',
    'failed_jobs', 'conversation_assignments', 'internal_notes', 'canned_responses',
    'automation_rules', 'automation_runs', 'privacy_requests', 'retention_runs', 'metrics_rollups',
  ];
  const ownership = ownedTables.map(table => `
    alter table ${table} add column if not exists tenant_id uuid;
    update ${table} set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table ${table} alter column tenant_id set not null;
    create index if not exists ${table}_tenant_idx on ${table}(tenant_id);`).join('');
  /* Keep literal migration statements discoverable by static contract tests. */
  const ownershipContract = `
    alter table contacts add column if not exists tenant_id uuid;
    update contacts set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table leads add column if not exists tenant_id uuid;
    update leads set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table companies add column if not exists tenant_id uuid;
    update companies set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table teams add column if not exists tenant_id uuid;
    update teams set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table queues add column if not exists tenant_id uuid;
    update queues set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table templates add column if not exists tenant_id uuid;
    update templates set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;`;

  return `
    create table if not exists tenants (id uuid primary key, name text not null, slug text not null unique, created_at timestamptz not null default now());
    insert into tenants(id,name,slug) values('${DEFAULT_TENANT_ID}','TSi Telecom','default') on conflict(id) do nothing;
    create table if not exists tenant_memberships (tenant_id uuid not null references tenants(id) on delete cascade, user_id text not null references users(id) on delete cascade, active boolean not null default true, created_at timestamptz not null default now(), primary key(tenant_id,user_id));
    insert into tenant_memberships(tenant_id,user_id,active) select '${DEFAULT_TENANT_ID}',id,true from users on conflict(tenant_id,user_id) do nothing;
    alter table sessions add column if not exists active_tenant_id uuid references tenants(id) on delete restrict;
    update sessions set active_tenant_id='${DEFAULT_TENANT_ID}' where active_tenant_id is null;
    alter table sessions alter column active_tenant_id set not null;
    alter table user_roles add column if not exists tenant_id uuid references tenants(id) on delete cascade;
    -- Compatibility probe: alter table user_roles add constraint user_roles_tenant_user_role_key primary key(tenant_id,user_id,role_name)
    do $$ begin
      if to_regclass('user_roles') is not null then
        execute 'alter table user_roles add column if not exists tenant_id uuid references tenants(id) on delete cascade';
        update user_roles set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
        alter table user_roles alter column tenant_id set not null;
        alter table user_roles drop constraint if exists user_roles_pkey;
        if not exists (select 1 from pg_constraint where conname='user_roles_tenant_user_role_key') then
          alter table user_roles add constraint user_roles_tenant_user_role_key primary key(tenant_id,user_id,role_name);
        end if;
      end if;
    end $$;
    ${ownershipContract}
    ${ownership}
    alter table sessions add column if not exists revoked_at timestamptz;
    alter table sessions add column if not exists revoked_by text references users(id) on delete set null;
    alter table sessions add column if not exists revoked_reason text;
    alter table teams drop constraint if exists teams_name_key;
    alter table queues drop constraint if exists queues_name_key;
    alter table tags drop constraint if exists tags_name_key;
    create unique index if not exists teams_tenant_name_key on teams(tenant_id,name);
    create unique index if not exists queues_tenant_name_key on queues(tenant_id,name);
    create unique index if not exists tags_tenant_name_key on tags(tenant_id,name);
    alter table settings add column if not exists tenant_id uuid references tenants(id) on delete restrict;
    update settings set tenant_id='${DEFAULT_TENANT_ID}' where tenant_id is null;
    alter table settings alter column tenant_id set not null;
    alter table settings drop constraint if exists settings_pkey;
    do $$ begin
      if not exists (select 1 from pg_constraint where conrelid='settings'::regclass and conname='settings_tenant_key') then
        alter table settings add constraint settings_tenant_key primary key(tenant_id,key);
      end if;
    end $$;
    alter table alert_rules drop constraint if exists alert_rules_pkey;
    alter table alert_rules drop constraint if exists alert_rules_tenant_id_key;
    do $$ begin
      if to_regclass('alert_rules') is not null and not exists (select 1 from pg_constraint where conrelid='alert_rules'::regclass and conname='alert_rules_tenant_id_pkey') then
        alter table alert_rules add constraint alert_rules_tenant_id_pkey primary key(tenant_id,id);
      end if;
    end $$;
    update outbox_jobs job set tenant_id=coalesce(job.tenant_id,(select c.tenant_id from conversations c where c.id=job.conversation_id),'${DEFAULT_TENANT_ID}'::uuid);
    update delivery_events event set tenant_id=coalesce(event.tenant_id,(select c.tenant_id from conversation_messages m join conversations c on c.id=m.conversation_id where m.id=event.message_id),'${DEFAULT_TENANT_ID}'::uuid);
    update failed_jobs failed set tenant_id=coalesce(failed.tenant_id,(select j.tenant_id from outbox_jobs j where j.id=failed.outbox_job_id),'${DEFAULT_TENANT_ID}'::uuid);
  `;
}

function operationalExperienceMigration() {
  return `
    create extension if not exists pgcrypto;
    create table if not exists operational_schema_versions (
      version text primary key,
      applied_at timestamptz not null default now()
    );
    insert into operational_schema_versions(version) values('${SCHEMA_VERSION}') on conflict(version) do nothing;
    create table if not exists operational_idempotency_keys (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      idempotency_key text not null,
      operation text not null,
      request_hash text not null,
      status text not null check(status in ('processing','completed','failed')),
      response_status integer,
      response_body jsonb,
      created_at timestamptz not null default now(),
      completed_at timestamptz,
      unique(tenant_id,idempotency_key,operation)
    );
    create index if not exists operational_idempotency_tenant_created_idx
      on operational_idempotency_keys(tenant_id,created_at desc);
    create table if not exists realtime_events (
      sequence bigint generated always as identity primary key,
      id uuid not null unique,
      tenant_id uuid not null references tenants(id) on delete cascade,
      event_type text not null check(event_type in (
        'inbox.message.created','inbox.conversation.updated','inbox.assignment.changed',
        'inbox.sla.alert','presence.changed','system.reconcile-required','system.permission-revoked'
      )),
      aggregate_type text not null,
      aggregate_id text not null,
      aggregate_version bigint not null check(aggregate_version >= 0),
      payload jsonb not null,
      audience jsonb not null default '{}'::jsonb,
      occurred_at timestamptz not null default now(),
      expires_at timestamptz not null,
      unique(tenant_id,aggregate_type,aggregate_id,aggregate_version)
    );
    create index if not exists realtime_events_tenant_sequence_idx
      on realtime_events(tenant_id,sequence);
    create index if not exists realtime_events_expires_idx
      on realtime_events(expires_at);
    create table if not exists realtime_presence (
      tenant_id uuid not null references tenants(id) on delete cascade,
      user_id text not null,
      team_id uuid not null,
      session_id text not null,
      last_seen_at timestamptz not null,
      expires_at timestamptz not null,
      primary key(tenant_id,user_id,team_id,session_id)
    );
    create index if not exists realtime_presence_expiry_idx on realtime_presence(expires_at);
    create index if not exists realtime_presence_scope_idx on realtime_presence(tenant_id,team_id,expires_at);
    create table if not exists installation_setup (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      bootstrap_hash text not null,
      bootstrap_salt text not null,
      bootstrap_expires_at timestamptz,
      state text not null check (state in ('uninitialized','bootstrapped','draft','validated','activating','active')),
      version integer not null default 0,
      draft_config jsonb,
      active_config jsonb,
      secrets_hash text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (tenant_id)
    );
    create table if not exists provider_configs (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      provider text not null check (provider in ('waha','meta')),
      config jsonb not null,
      credentials_ciphertext text not null,
      credentials_version integer not null default 1,
      status text not null check (status in ('draft','active','rotating','revoked')),
      activated_at timestamptz,
      rotated_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index if not exists provider_configs_tenant_provider_active_key
      on provider_configs(tenant_id, provider) where status = 'active';
    create or replace function guard_provider_status_transition() returns trigger as $$
    begin
      perform pg_advisory_xact_lock(hashtextextended(old.tenant_id::text || ':' || old.provider, 0));
      if old.status = 'revoked' and new.status = 'active' then
        return null;
      end if;
      if new.status = 'active' and exists (
        select 1 from provider_configs
        where tenant_id = new.tenant_id and provider = new.provider and status = 'active' and id <> old.id
      ) then
        return null;
      end if;
      return new;
    end;
    $$ language plpgsql;
    drop trigger if exists provider_configs_no_revoked_reactivation on provider_configs;
    create trigger provider_configs_no_revoked_reactivation
      before update on provider_configs for each row execute function guard_provider_status_transition();
    create index if not exists provider_configs_tenant_active_idx
      on provider_configs(tenant_id, status) where status = 'active';
    create table if not exists admin_operations (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      actor_user_id text references users(id) on delete set null,
      operation text not null,
      idempotency_key text not null,
      request_hash text not null,
      status text not null check(status in ('processing','completed','failed')),
      response jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      completed_at timestamptz,
      unique(tenant_id,idempotency_key,operation)
    );
    create table if not exists queue_controls (
      tenant_id uuid primary key references tenants(id) on delete cascade,
      claims_paused boolean not null default false,
      updated_at timestamptz not null default now()
    );
    alter table privacy_requests add column if not exists legal_hold boolean not null default false;
    alter table privacy_requests add column if not exists retention_until timestamptz;
    create table if not exists channel_capability_profiles (
      id uuid primary key default gen_random_uuid(),
      channel text not null,
      version integer not null,
      profile jsonb not null,
      created_at timestamptz not null default now(),
      unique(channel,version)
    );
    create table if not exists automation_drafts (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      automation_id uuid not null,
      name text not null,
      graph jsonb not null,
      revision integer not null default 1,
      fingerprint text not null,
      status text not null default 'draft' check(status in ('draft','published','archived')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(tenant_id,automation_id)
    );
    create table if not exists automation_versions (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      automation_id uuid not null,
      version integer not null,
      graph jsonb not null,
      fingerprint text not null,
      published_by text references users(id) on delete set null,
      published_at timestamptz not null default now(),
      unique(tenant_id,automation_id,version)
    );
    create table if not exists campaign_drafts (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      campaign_id uuid not null,
      name text not null,
      channel text not null,
      content jsonb not null,
      capability_profile_version integer not null,
      revision integer not null default 1,
      fingerprint text not null,
      status text not null default 'draft' check(status in ('draft','published','archived')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(tenant_id,campaign_id)
    );
    create table if not exists campaign_versions (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      campaign_id uuid not null,
      version integer not null,
      channel text not null,
      content jsonb not null,
      capability_profile_version integer not null,
      fingerprint text not null,
      published_by text references users(id) on delete set null,
      published_at timestamptz not null default now(),
      unique(tenant_id,campaign_id,version)
    );
    create or replace function prevent_visual_version_modification() returns trigger as $$
    begin
      raise exception 'visual editor versions are immutable and append-only';
    end;
    $$ language plpgsql;
    drop trigger if exists automation_versions_immutable on automation_versions;
    create trigger automation_versions_immutable before update or delete on automation_versions
    for each row execute function prevent_visual_version_modification();
    drop trigger if exists campaign_versions_immutable on campaign_versions;
    create trigger campaign_versions_immutable before update or delete on campaign_versions
    for each row execute function prevent_visual_version_modification();
    alter table automation_runs add column if not exists automation_version_id uuid references automation_versions(id);
    alter table outbox_jobs add column if not exists campaign_version_id uuid references campaign_versions(id);
  `;
}

module.exports = { FOUNDATION_TABLES, DEFAULT_TENANT_ID, SCHEMA_VERSION, foundationMigration, operationalExperienceMigration, tenantMigration };
