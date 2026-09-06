-- =============================================================================
-- Migration 032: PulseAgent Activity & Audit Logging Schema
-- Supports Agentic AI Operations, Tool Audit Trail, and Autonomous Actions
-- =============================================================================

create table if not exists public.agent_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  goal text not null,
  tool text not null,
  status text not null default 'completed' check (status in ('started', 'completed', 'failed', 'adapted', 'blocked')),
  input_sanitized jsonb default '{}'::jsonb,
  outcome text,
  adaptation_details jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.agent_activity_logs enable row level security;

-- Policies: Only organization admins/owners may view agent audit logs
create policy "agent_activity_admin_select"
  on public.agent_activity_logs
  for select
  using (
    public.is_org_admin(organization_id)
  );

create policy "agent_activity_admin_insert"
  on public.agent_activity_logs
  for insert
  with check (
    public.is_org_admin(organization_id)
  );

-- Indexes for efficient lookups
create index if not exists idx_agent_activity_org_time on public.agent_activity_logs(organization_id, created_at desc);

grant select, insert on public.agent_activity_logs to authenticated;
