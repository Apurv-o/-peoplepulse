-- =============================================================================
-- PeoplePulse — Seed Survey Questions & Sample Teams (Optional / Dev Setup)
-- =============================================================================

-- Seed Standard Pulse Survey Questions
insert into public.survey_questions (label, type, is_active) values
  ('Workload is manageable and sustainable', 'rating', true),
  ('I feel supported by my direct manager', 'rating', true),
  ('Team collaboration and communication are effective', 'rating', true),
  ('I feel motivated and engaged with my current goals', 'rating', true),
  ('My current stress level is manageable', 'rating', true)
on conflict do nothing;

-- Instructions for provisioning initial admin profile:
-- After creating an account via Supabase Auth (or Dashboard), run:
--
-- insert into public.profiles (id, name, email, role)
-- values ('<AUTH_USER_UUID>', 'System Administrator', 'admin@company.com', 'admin')
-- on conflict (id) do update set role = 'admin';
