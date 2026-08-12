-- ============ ENUMS ============
CREATE TYPE public.service_type AS ENUM ('BIKE', 'AUTO', 'CAB');

CREATE TYPE public.driver_account_status AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

CREATE TYPE public.driver_availability_status AS ENUM ('OFFLINE', 'ONLINE', 'BUSY');

CREATE TYPE public.booking_status AS ENUM (
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'READY_TO_START',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_DRIVER',
  'DRIVER_REJECTED',
  'NO_DRIVER_FOUND',
  'EXPIRED',
  'FAILED'
);

CREATE TYPE public.ride_request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

CREATE TYPE public.ride_actor_type AS ENUM ('CUSTOMER', 'DRIVER', 'SYSTEM');

-- ============ DRIVER PROFILES ============
CREATE TABLE public.driver_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  photo_path text,
  country_code text NOT NULL DEFAULT '+91',
  phone_number text,
  status public.driver_account_status NOT NULL DEFAULT 'PENDING',
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.driver_profiles TO authenticated;
GRANT ALL ON public.driver_profiles TO service_role;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own driver profile select" ON public.driver_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own driver profile insert" ON public.driver_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own driver profile update" ON public.driver_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER driver_profiles_updated BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DRIVER VEHICLES ============
CREATE TABLE public.driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type public.service_type NOT NULL DEFAULT 'BIKE',
  make_model text NOT NULL,
  registration_number text NOT NULL,
  colour text,
  is_active boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX driver_vehicles_driver_idx ON public.driver_vehicles (driver_id, service_type, is_active);

GRANT SELECT, INSERT, UPDATE ON public.driver_vehicles TO authenticated;
GRANT ALL ON public.driver_vehicles TO service_role;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vehicles select" ON public.driver_vehicles
  FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "own vehicles insert" ON public.driver_vehicles
  FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "own vehicles update" ON public.driver_vehicles
  FOR UPDATE TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

CREATE TRIGGER driver_vehicles_updated BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FARE CONFIGURATION ============
CREATE TABLE public.fare_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type public.service_type NOT NULL,
  version integer NOT NULL,
  base_fare numeric(10,2) NOT NULL,
  per_km_rate numeric(10,2) NOT NULL,
  per_minute_rate numeric(10,2) NOT NULL,
  minimum_fare numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  road_distance_factor numeric(4,2) NOT NULL DEFAULT 1.30,
  is_active boolean NOT NULL DEFAULT false,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_type, version)
);

CREATE UNIQUE INDEX fare_configs_one_active ON public.fare_configs (service_type) WHERE is_active;

GRANT SELECT ON public.fare_configs TO authenticated;
GRANT ALL ON public.fare_configs TO service_role;
ALTER TABLE public.fare_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fare configs readable" ON public.fare_configs
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER fare_configs_updated BEFORE UPDATE ON public.fare_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SERVICE / MATCHING CONFIGURATION ============
CREATE TABLE public.service_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type public.service_type NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  initial_radius_km numeric(6,2) NOT NULL DEFAULT 2.0,
  radius_increment_km numeric(6,2) NOT NULL DEFAULT 2.0,
  maximum_radius_km numeric(6,2) NOT NULL DEFAULT 8.0,
  request_timeout_seconds integer NOT NULL DEFAULT 180,
  driver_response_seconds integer NOT NULL DEFAULT 30,
  location_stale_seconds integer NOT NULL DEFAULT 120,
  ride_otp_ttl_seconds integer NOT NULL DEFAULT 900,
  ride_otp_max_attempts integer NOT NULL DEFAULT 5,
  min_trip_distance_metres integer NOT NULL DEFAULT 150,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_configs TO authenticated;
GRANT ALL ON public.service_configs TO service_role;
ALTER TABLE public.service_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service configs readable" ON public.service_configs
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER service_configs_updated BEFORE UPDATE ON public.service_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DRIVER AVAILABILITY ============
CREATE TABLE public.driver_availability (
  driver_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type public.service_type NOT NULL DEFAULT 'BIKE',
  status public.driver_availability_status NOT NULL DEFAULT 'OFFLINE',
  latitude double precision,
  longitude double precision,
  location_updated_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_booking_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX driver_availability_matching_idx
  ON public.driver_availability (service_type, status, location_updated_at);

GRANT SELECT ON public.driver_availability TO authenticated;
GRANT ALL ON public.driver_availability TO service_role;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own availability select" ON public.driver_availability
  FOR SELECT TO authenticated USING (driver_id = auth.uid());

CREATE TRIGGER driver_availability_updated BEFORE UPDATE ON public.driver_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.driver_vehicles(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL DEFAULT 'BIKE',
  status public.booking_status NOT NULL DEFAULT 'REQUESTED',
  idempotency_key text,

  pickup_latitude double precision NOT NULL,
  pickup_longitude double precision NOT NULL,
  pickup_address text NOT NULL,
  pickup_source text NOT NULL DEFAULT 'MANUAL',
  pickup_captured_at timestamptz NOT NULL DEFAULT now(),

  destination_latitude double precision NOT NULL,
  destination_longitude double precision NOT NULL,
  destination_address text NOT NULL,
  destination_captured_at timestamptz NOT NULL DEFAULT now(),

  route_source text NOT NULL DEFAULT 'HAVERSINE_FALLBACK',
  estimated_distance_metres integer NOT NULL,
  estimated_duration_seconds integer NOT NULL,
  final_distance_metres integer,
  final_duration_seconds integer,

  fare_snapshot jsonb NOT NULL,
  estimated_fare numeric(10,2) NOT NULL,
  final_fare numeric(10,2),
  currency text NOT NULL DEFAULT 'INR',
  fare_config_version integer NOT NULL,

  search_radius_km numeric(6,2),
  ride_otp_hash text,
  ride_otp_expires_at timestamptz,
  ride_otp_attempts integer NOT NULL DEFAULT 0,

  cancellation_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  search_started_at timestamptz,
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bookings_customer_idx ON public.bookings (customer_id, created_at DESC);
CREATE INDEX bookings_driver_idx ON public.bookings (driver_id, created_at DESC);
CREATE INDEX bookings_status_idx ON public.bookings (status, service_type);
CREATE UNIQUE INDEX bookings_idempotency_idx
  ON public.bookings (customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bookings select" ON public.bookings
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR driver_id = auth.uid());

CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.driver_availability
  ADD CONSTRAINT driver_availability_current_booking_fkey
  FOREIGN KEY (current_booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- ============ DRIVER RIDE REQUESTS ============
CREATE TABLE public.booking_driver_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.ride_request_status NOT NULL DEFAULT 'PENDING',
  distance_to_pickup_km numeric(6,2),
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, driver_id)
);

CREATE INDEX booking_driver_requests_driver_idx
  ON public.booking_driver_requests (driver_id, status, expires_at DESC);

GRANT SELECT ON public.booking_driver_requests TO authenticated;
GRANT ALL ON public.booking_driver_requests TO service_role;
ALTER TABLE public.booking_driver_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ride requests select" ON public.booking_driver_requests
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_driver_requests.booking_id AND b.customer_id = auth.uid()
    )
  );

CREATE TRIGGER booking_driver_requests_updated BEFORE UPDATE ON public.booking_driver_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RIDE EVENTS (immutable) ============
CREATE TABLE public.ride_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type public.ride_actor_type NOT NULL DEFAULT 'SYSTEM',
  actor_id uuid,
  from_status public.booking_status,
  to_status public.booking_status,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ride_events_booking_idx ON public.ride_events (booking_id, created_at);

GRANT SELECT ON public.ride_events TO authenticated;
GRANT ALL ON public.ride_events TO service_role;
ALTER TABLE public.ride_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ride events select" ON public.ride_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = ride_events.booking_id
        AND (b.customer_id = auth.uid() OR b.driver_id = auth.uid())
    )
  );

-- ============ RIDE LOCATION TRACE ============
CREATE TABLE public.ride_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy_metres numeric(8,2),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ride_locations_booking_idx ON public.ride_locations (booking_id, recorded_at DESC);

GRANT SELECT ON public.ride_locations TO authenticated;
GRANT ALL ON public.ride_locations TO service_role;
ALTER TABLE public.ride_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ride locations select" ON public.ride_locations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = ride_locations.booking_id
        AND (b.customer_id = auth.uid() OR b.driver_id = auth.uid())
    )
  );

-- ============ INITIAL CONFIGURATION ============
INSERT INTO public.fare_configs
  (service_type, version, base_fare, per_km_rate, per_minute_rate, minimum_fare, currency, road_distance_factor, is_active)
VALUES
  ('BIKE', 1, 15.00, 6.50, 1.00, 25.00, 'INR', 1.30, true);

INSERT INTO public.service_configs
  (service_type, is_enabled, initial_radius_km, radius_increment_km, maximum_radius_km,
   request_timeout_seconds, driver_response_seconds, location_stale_seconds,
   ride_otp_ttl_seconds, ride_otp_max_attempts, min_trip_distance_metres)
VALUES
  ('BIKE', true, 2.0, 2.0, 8.0, 180, 30, 120, 900, 5, 150);
