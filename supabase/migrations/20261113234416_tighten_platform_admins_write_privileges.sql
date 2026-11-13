-- F5 follow-up: nothing in the application writes platform_admins through the
-- Data API; membership is granted out of band. Leave only SELECT.
REVOKE INSERT, UPDATE, DELETE ON platform_admins FROM authenticated;
