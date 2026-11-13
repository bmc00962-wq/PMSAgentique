-- F4: the self-update policy on user_profiles covered every column, including
-- the email that identifies the account in the admin directory. Only username
-- is user content.
REVOKE UPDATE ON user_profiles FROM authenticated;
GRANT UPDATE (username, updated_at) ON user_profiles TO authenticated;

-- F4: canonical form for the identifier used to look accounts up.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_lower_key
  ON user_profiles (lower(email)) WHERE email IS NOT NULL;

-- F5 / F10 / F11: the unauthenticated role held full DML on these tables.
REVOKE ALL ON platform_admins FROM anon;
REVOKE ALL ON user_profiles FROM anon;
REVOKE ALL ON tasks FROM anon;

-- F12: TRUNCATE, TRIGGER and REFERENCES are not row-level-security gated and
-- no application path needs them.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
