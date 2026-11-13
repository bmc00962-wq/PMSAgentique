-- F1: a row-level "any active member" UPDATE rule on tenants also authorised
-- plan_id, status, slug, custom_domain and deleted_at. Narrow it to owner/admin
-- roles AND restrict the writable columns at the privilege layer.

DROP POLICY IF EXISTS "update_member_tenants" ON tenants;

CREATE POLICY "update_admin_tenants" ON tenants FOR UPDATE
  TO authenticated
  USING (has_tenant_role(id, ARRAY['owner','admin']))
  WITH CHECK (has_tenant_role(id, ARRAY['owner','admin']));

REVOKE UPDATE ON tenants FROM authenticated;
GRANT UPDATE (slug, company_name, contact_email, custom_domain, onboarding_completed, updated_at)
  ON tenants TO authenticated;

-- Platform administrators still need to move status / plan. Column grants apply
-- to the role, not the policy, so route those through definer functions.
CREATE OR REPLACE FUNCTION admin_set_tenant_status(p_tenant uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('active','suspended','closed') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  UPDATE tenants SET status = p_status, updated_at = now() WHERE id = p_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_tenant_plan(p_tenant uuid, p_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_plan NOT IN ('trial','starter','growth','enterprise') THEN
    RAISE EXCEPTION 'invalid plan' USING ERRCODE = '22023';
  END IF;
  UPDATE tenants SET plan_id = p_plan, updated_at = now() WHERE id = p_tenant;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_set_tenant_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_set_tenant_plan(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_tenant_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_tenant_plan(uuid, text) TO authenticated;
