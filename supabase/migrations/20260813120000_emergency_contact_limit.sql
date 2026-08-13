-- ============ EMERGENCY CONTACT LIMIT ============
-- Enforce the advertised maximum of five emergency contacts per customer
-- server-side, so the limit holds no matter which client writes the row.

CREATE OR REPLACE FUNCTION public.enforce_emergency_contact_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  contact_count integer;
BEGIN
  SELECT count(*) INTO contact_count
  FROM public.emergency_contacts
  WHERE user_id = NEW.user_id;

  IF contact_count >= 5 THEN
    RAISE EXCEPTION 'emergency_contact_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER emergency_contacts_limit
BEFORE INSERT ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.enforce_emergency_contact_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_emergency_contact_limit() FROM public, anon;
