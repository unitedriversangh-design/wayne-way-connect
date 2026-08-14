-- ============ PHASE 5: AUTO SERVICE ============
INSERT INTO public.fare_configs (service_type, version, base_fare, per_km_rate, per_minute_rate, minimum_fare, currency, road_distance_factor, is_active, effective_from)
SELECT 'AUTO', 1, 30, 14, 1.5, 40, 'INR', 1.3, true, now()
WHERE NOT EXISTS (SELECT 1 FROM public.fare_configs WHERE service_type = 'AUTO');

INSERT INTO public.service_configs (service_type, is_enabled, initial_radius_km, radius_increment_km, maximum_radius_km, request_timeout_seconds, driver_response_seconds, location_stale_seconds, ride_otp_ttl_seconds, ride_otp_max_attempts, min_trip_distance_metres)
SELECT 'AUTO', true, 3, 2, 9, 180, 30, 120, 3600, 5, 300
WHERE NOT EXISTS (SELECT 1 FROM public.service_configs WHERE service_type = 'AUTO');

-- ============ ENUMS ============
CREATE TYPE public.operator_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','REJECTED');
CREATE TYPE public.operator_role AS ENUM ('OWNER','MANAGER','BOOKING_STAFF','ACCOUNTANT');
CREATE TYPE public.bus_status AS ENUM ('ACTIVE','INACTIVE','MAINTENANCE','SUSPENDED','ARCHIVED');
CREATE TYPE public.bus_driver_status AS ENUM ('PENDING','ACTIVE','INACTIVE','SUSPENDED');
CREATE TYPE public.document_status AS ENUM ('PENDING','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE public.bus_route_status AS ENUM ('DRAFT','ACTIVE','INACTIVE');
CREATE TYPE public.bus_schedule_status AS ENUM ('DRAFT','SCHEDULED','BOARDING','DEPARTED','COMPLETED','CANCELLED','SUSPENDED');
CREATE TYPE public.bus_seat_state AS ENUM ('AVAILABLE','HELD','BOOKED','BLOCKED','UNAVAILABLE');
CREATE TYPE public.bus_seat_type AS ENUM ('SEATER','SLEEPER_LOWER','SLEEPER_UPPER');
CREATE TYPE public.bus_booking_status AS ENUM ('DRAFT','SEAT_HELD','PAYMENT_PENDING','CONFIRMED','CANCEL_REQUESTED','CANCELLED','REFUND_PENDING','REFUNDED','PARTIALLY_REFUNDED','COMPLETED','NO_SHOW','EXPIRED');
CREATE TYPE public.bus_payment_status AS ENUM ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE public.boarding_status AS ENUM ('NOT_BOARDED','BOARDED','NO_SHOW','CANCELLED');
CREATE TYPE public.discount_status AS ENUM ('DRAFT','ACTIVE','EXPIRED','DISABLED');
CREATE TYPE public.settlement_status AS ENUM ('PENDING','PROCESSING','PAID','FAILED','ON_HOLD');
CREATE TYPE public.support_ticket_status AS ENUM ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED');

-- ============ OPERATORS ============
CREATE TABLE public.bus_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  business_name text NOT NULL,
  contact_person text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  address text,
  city text,
  state text,
  gst_number text,
  status public.operator_status NOT NULL DEFAULT 'PENDING',
  verification_notes text,
  verified_at timestamptz,
  suspended_at timestamptz,
  bank_account_name text,
  bank_account_last4 text,
  bank_ifsc text,
  commission_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bus_operators TO authenticated;
GRANT ALL ON public.bus_operators TO service_role;
ALTER TABLE public.bus_operators ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.operator_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.operator_role NOT NULL,
  full_name text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, user_id)
);
GRANT SELECT ON public.operator_staff TO authenticated;
GRANT ALL ON public.operator_staff TO service_role;
ALTER TABLE public.operator_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_operator_member(_operator_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operator_staff s
    WHERE s.operator_id = _operator_id AND s.user_id = _user_id AND s.is_active
  )
$$;
REVOKE ALL ON FUNCTION public.is_operator_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_operator_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.operator_role_of(_operator_id uuid, _user_id uuid)
RETURNS public.operator_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.role FROM public.operator_staff s
  WHERE s.operator_id = _operator_id AND s.user_id = _user_id AND s.is_active
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.operator_role_of(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.operator_role_of(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Members read their operator" ON public.bus_operators
  FOR SELECT TO authenticated USING (public.is_operator_member(id, auth.uid()));
CREATE POLICY "Members read staff of their operator" ON public.operator_staff
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

-- ============ BUSES & SEATS ============
CREATE TABLE public.buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text NOT NULL,
  bus_type text NOT NULL,
  is_ac boolean NOT NULL DEFAULT false,
  vehicle_category text,
  manufacturer_model text,
  seating_capacity integer NOT NULL CHECK (seating_capacity > 0 AND seating_capacity <= 120),
  amenities text[] NOT NULL DEFAULT '{}',
  status public.bus_status NOT NULL DEFAULT 'ACTIVE',
  assigned_driver_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX buses_operator_registration_key ON public.buses (operator_id, upper(registration_number));
GRANT SELECT ON public.buses TO authenticated;
GRANT SELECT ON public.buses TO anon;
GRANT ALL ON public.buses TO service_role;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their buses" ON public.buses
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.bus_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  deck integer NOT NULL DEFAULT 1,
  row_index integer NOT NULL,
  column_index integer NOT NULL,
  seat_type public.bus_seat_type NOT NULL DEFAULT 'SEATER',
  is_active boolean NOT NULL DEFAULT true,
  fare_multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bus_id, seat_code),
  UNIQUE (bus_id, deck, row_index, column_index)
);
GRANT SELECT ON public.bus_seats TO authenticated, anon;
GRANT ALL ON public.bus_seats TO service_role;
ALTER TABLE public.bus_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seats readable" ON public.bus_seats FOR SELECT TO authenticated, anon USING (true);

-- ============ DRIVERS ============
CREATE TABLE public.bus_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  photo_path text,
  licence_number text NOT NULL,
  licence_expiry date,
  document_status public.document_status NOT NULL DEFAULT 'PENDING',
  status public.bus_driver_status NOT NULL DEFAULT 'PENDING',
  assigned_bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, phone)
);
GRANT SELECT ON public.bus_drivers TO authenticated;
GRANT ALL ON public.bus_drivers TO service_role;
ALTER TABLE public.bus_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their drivers" ON public.bus_drivers
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

ALTER TABLE public.buses ADD CONSTRAINT buses_assigned_driver_fk
  FOREIGN KEY (assigned_driver_id) REFERENCES public.bus_drivers(id) ON DELETE SET NULL;

-- ============ STOPS & ROUTES ============
CREATE TABLE public.bus_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bus_stops TO authenticated, anon;
GRANT ALL ON public.bus_stops TO service_role;
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stops readable" ON public.bus_stops FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  distance_km numeric(8,2),
  estimated_duration_minutes integer,
  status public.bus_route_status NOT NULL DEFAULT 'DRAFT',
  base_fare numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bus_routes TO authenticated, anon;
GRANT ALL ON public.bus_routes TO service_role;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Routes readable" ON public.bus_routes FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.bus_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.bus_stops(id) ON DELETE RESTRICT,
  sequence integer NOT NULL,
  minutes_from_start integer NOT NULL DEFAULT 0,
  pickup_enabled boolean NOT NULL DEFAULT true,
  drop_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, sequence),
  UNIQUE (route_id, stop_id)
);
GRANT SELECT ON public.bus_route_stops TO authenticated, anon;
GRANT ALL ON public.bus_route_stops TO service_role;
ALTER TABLE public.bus_route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Route stops readable" ON public.bus_route_stops FOR SELECT TO authenticated, anon USING (true);

-- ============ SCHEDULES (TRIPS) ============
CREATE TABLE public.bus_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  bus_id uuid NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE RESTRICT,
  driver_id uuid REFERENCES public.bus_drivers(id) ON DELETE SET NULL,
  service_date date NOT NULL,
  departure_at timestamptz NOT NULL,
  arrival_estimate_at timestamptz NOT NULL,
  booking_closes_at timestamptz NOT NULL,
  base_fare numeric(10,2) NOT NULL CHECK (base_fare >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status public.bus_schedule_status NOT NULL DEFAULT 'DRAFT',
  total_seats integer NOT NULL DEFAULT 0,
  cancellation_policy text,
  cancelled_reason text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bus_schedules_search_idx ON public.bus_schedules (status, service_date);
GRANT SELECT ON public.bus_schedules TO authenticated, anon;
GRANT ALL ON public.bus_schedules TO service_role;
ALTER TABLE public.bus_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published schedules readable" ON public.bus_schedules
  FOR SELECT TO authenticated, anon
  USING (status IN ('SCHEDULED','BOARDING','DEPARTED','COMPLETED'));
CREATE POLICY "Members read their schedules" ON public.bus_schedules
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.bus_schedule_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.bus_schedules(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.bus_stops(id) ON DELETE RESTRICT,
  sequence integer NOT NULL,
  stop_name text NOT NULL,
  city text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  scheduled_at timestamptz NOT NULL,
  pickup_enabled boolean NOT NULL DEFAULT true,
  drop_enabled boolean NOT NULL DEFAULT true,
  UNIQUE (schedule_id, sequence)
);
GRANT SELECT ON public.bus_schedule_stops TO authenticated, anon;
GRANT ALL ON public.bus_schedule_stops TO service_role;
ALTER TABLE public.bus_schedule_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedule stops readable" ON public.bus_schedule_stops FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.bus_schedule_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.bus_schedules(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES public.bus_seats(id) ON DELETE RESTRICT,
  seat_code text NOT NULL,
  seat_type public.bus_seat_type NOT NULL,
  deck integer NOT NULL DEFAULT 1,
  row_index integer NOT NULL,
  column_index integer NOT NULL,
  fare numeric(10,2) NOT NULL CHECK (fare >= 0),
  state public.bus_seat_state NOT NULL DEFAULT 'AVAILABLE',
  block_reason text,
  hold_id uuid,
  hold_expires_at timestamptz,
  booking_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, seat_code)
);
GRANT SELECT ON public.bus_schedule_seats TO authenticated, anon;
GRANT ALL ON public.bus_schedule_seats TO service_role;
ALTER TABLE public.bus_schedule_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedule seats readable" ON public.bus_schedule_seats FOR SELECT TO authenticated, anon USING (true);

-- ============ DISCOUNTS ============
CREATE TABLE public.bus_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
  value numeric(10,2) NOT NULL CHECK (value > 0),
  min_booking_amount numeric(10,2) NOT NULL DEFAULT 0,
  max_discount_amount numeric(10,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  route_id uuid REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  usage_limit integer,
  per_user_limit integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  status public.discount_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, code)
);
GRANT SELECT ON public.bus_discounts TO authenticated;
GRANT ALL ON public.bus_discounts TO service_role;
ALTER TABLE public.bus_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their discounts" ON public.bus_discounts
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

-- ============ BOOKINGS ============
CREATE TABLE public.bus_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES public.bus_schedules(id) ON DELETE RESTRICT,
  boarding_stop_id uuid NOT NULL REFERENCES public.bus_schedule_stops(id) ON DELETE RESTRICT,
  dropping_stop_id uuid NOT NULL REFERENCES public.bus_schedule_stops(id) ON DELETE RESTRICT,
  seat_count integer NOT NULL CHECK (seat_count > 0),
  lead_passenger_name text NOT NULL,
  lead_passenger_phone text NOT NULL,
  lead_passenger_email text,
  fare_snapshot jsonb NOT NULL,
  seat_total numeric(10,2) NOT NULL,
  discount_code text,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status public.bus_booking_status NOT NULL DEFAULT 'DRAFT',
  payment_status public.bus_payment_status NOT NULL DEFAULT 'PENDING',
  payment_reference text UNIQUE,
  cancellation_reason text,
  cancellation_fee numeric(10,2) NOT NULL DEFAULT 0,
  refund_amount numeric(10,2) NOT NULL DEFAULT 0,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bus_bookings_customer_idx ON public.bus_bookings (customer_id, created_at DESC);
CREATE INDEX bus_bookings_operator_idx ON public.bus_bookings (operator_id, created_at DESC);
GRANT SELECT ON public.bus_bookings TO authenticated;
GRANT ALL ON public.bus_bookings TO service_role;
ALTER TABLE public.bus_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own bus bookings" ON public.bus_bookings
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Members read their bookings" ON public.bus_bookings
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

ALTER TABLE public.bus_schedule_seats ADD CONSTRAINT bus_schedule_seats_booking_fk
  FOREIGN KEY (booking_id) REFERENCES public.bus_bookings(id) ON DELETE SET NULL;

CREATE TABLE public.bus_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bus_bookings(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.bus_schedules(id) ON DELETE RESTRICT,
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE RESTRICT,
  seat_code text NOT NULL,
  full_name text NOT NULL,
  age integer CHECK (age IS NULL OR (age > 0 AND age < 120)),
  gender text CHECK (gender IS NULL OR gender IN ('MALE','FEMALE','OTHER')),
  is_lead boolean NOT NULL DEFAULT false,
  fare numeric(10,2) NOT NULL DEFAULT 0,
  boarding_status public.boarding_status NOT NULL DEFAULT 'NOT_BOARDED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, seat_code, booking_id)
);
GRANT SELECT ON public.bus_passengers TO authenticated;
GRANT ALL ON public.bus_passengers TO service_role;
ALTER TABLE public.bus_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own passengers" ON public.bus_passengers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bus_bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));
CREATE POLICY "Members read their passengers" ON public.bus_passengers
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

-- ============ LEDGER & SETTLEMENTS ============
CREATE TABLE public.bus_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  refund_adjustment numeric(12,2) NOT NULL DEFAULT 0,
  other_adjustment numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.settlement_status NOT NULL DEFAULT 'PENDING',
  reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, period_start, period_end)
);
GRANT SELECT ON public.bus_settlements TO authenticated;
GRANT ALL ON public.bus_settlements TO service_role;
ALTER TABLE public.bus_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their settlements" ON public.bus_settlements
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.bus_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bus_bookings(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.bus_schedules(id) ON DELETE SET NULL,
  settlement_id uuid REFERENCES public.bus_settlements(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('BOOKING','DISCOUNT','COMMISSION','TAX','REFUND','ADJUSTMENT')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bus_ledger_operator_idx ON public.bus_ledger_entries (operator_id, occurred_at DESC);
GRANT SELECT ON public.bus_ledger_entries TO authenticated;
GRANT ALL ON public.bus_ledger_entries TO service_role;
ALTER TABLE public.bus_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their ledger" ON public.bus_ledger_entries
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

-- ============ AUDIT, NOTIFICATIONS, SUPPORT ============
CREATE TABLE public.operator_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role public.operator_role,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  result text NOT NULL DEFAULT 'SUCCESS',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operator_audit_idx ON public.operator_audit_logs (operator_id, created_at DESC);
GRANT SELECT ON public.operator_audit_logs TO authenticated;
GRANT ALL ON public.operator_audit_logs TO service_role;
ALTER TABLE public.operator_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their audit log" ON public.operator_audit_logs
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.operator_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('BOOKINGS','TRIPS','FINANCE','SYSTEM')),
  title text NOT NULL,
  body text NOT NULL,
  link_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operator_notifications_idx ON public.operator_notifications (operator_id, created_at DESC);
GRANT SELECT ON public.operator_notifications TO authenticated;
GRANT ALL ON public.operator_notifications TO service_role;
ALTER TABLE public.operator_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their notifications" ON public.operator_notifications
  FOR SELECT TO authenticated USING (public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  operator_id uuid REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  booking_id uuid REFERENCES public.bus_bookings(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.bus_schedules(id) ON DELETE SET NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'OPEN',
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Members read operator tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (operator_id IS NOT NULL AND public.is_operator_member(operator_id, auth.uid()));

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_type text NOT NULL CHECK (author_type IN ('OPERATOR','CUSTOMER','SUPPORT','SYSTEM')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket participants read messages" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.created_by = auth.uid()
           OR (t.operator_id IS NOT NULL AND public.is_operator_member(t.operator_id, auth.uid())))
  ));

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER bus_operators_updated BEFORE UPDATE ON public.bus_operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER operator_staff_updated BEFORE UPDATE ON public.operator_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER buses_updated BEFORE UPDATE ON public.buses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_drivers_updated BEFORE UPDATE ON public.bus_drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_stops_updated BEFORE UPDATE ON public.bus_stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_routes_updated BEFORE UPDATE ON public.bus_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_schedules_updated BEFORE UPDATE ON public.bus_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_schedule_seats_updated BEFORE UPDATE ON public.bus_schedule_seats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_discounts_updated BEFORE UPDATE ON public.bus_discounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_bookings_updated BEFORE UPDATE ON public.bus_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_passengers_updated BEFORE UPDATE ON public.bus_passengers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bus_settlements_updated BEFORE UPDATE ON public.bus_settlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ATOMIC SEAT HOLD / RELEASE ============
CREATE OR REPLACE FUNCTION public.hold_bus_seats(_schedule_id uuid, _seat_codes text[], _hold_id uuid, _ttl_seconds integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  held integer;
BEGIN
  UPDATE public.bus_schedule_seats
     SET state = 'AVAILABLE', hold_id = NULL, hold_expires_at = NULL
   WHERE schedule_id = _schedule_id AND state = 'HELD' AND hold_expires_at < now();

  WITH target AS (
    SELECT id FROM public.bus_schedule_seats
     WHERE schedule_id = _schedule_id AND seat_code = ANY(_seat_codes) AND state = 'AVAILABLE'
     ORDER BY seat_code
     FOR UPDATE
  )
  UPDATE public.bus_schedule_seats s
     SET state = 'HELD', hold_id = _hold_id, hold_expires_at = now() + make_interval(secs => _ttl_seconds)
    FROM target
   WHERE s.id = target.id;

  GET DIAGNOSTICS held = ROW_COUNT;
  IF held <> array_length(_seat_codes, 1) THEN
    RAISE EXCEPTION 'SEAT_UNAVAILABLE';
  END IF;
  RETURN held;
END;
$$;
REVOKE ALL ON FUNCTION public.hold_bus_seats(uuid, text[], uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hold_bus_seats(uuid, text[], uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_expired_bus_holds()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE released integer;
BEGIN
  UPDATE public.bus_schedule_seats
     SET state = 'AVAILABLE', hold_id = NULL, hold_expires_at = NULL
   WHERE state = 'HELD' AND hold_expires_at < now();
  GET DIAGNOSTICS released = ROW_COUNT;

  UPDATE public.bus_bookings
     SET status = 'EXPIRED', updated_at = now()
   WHERE status IN ('DRAFT','SEAT_HELD','PAYMENT_PENDING') AND hold_expires_at IS NOT NULL AND hold_expires_at < now();
  RETURN released;
END;
$$;
REVOKE ALL ON FUNCTION public.release_expired_bus_holds() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_expired_bus_holds() TO service_role;