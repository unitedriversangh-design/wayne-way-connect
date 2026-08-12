# WayneWay Connect

WAYNEWAY MASTER SPECIFICATION

Consolidated: Phase 0 (Business), Phase 1 (Architecture), Phase 2 (UI/UX), Phase 3 (Customer Account System)Version 0.1 | Status: Foundation Document | Priority: Correctness > Security > Reliability > Simplicity > Scalability > Speed

BRAND & SCOPE

Name: WayneWay (exact spelling always — never "Wayne Way", "Wayneway", etc.) Category: Multimodal Indian mobility & travel marketplace. Initial services: 🏍️ Bike, 🛺 Auto, 🚌 Bus Future services (NOT built now): AC Cab, Train, Hotel, Flight, Rental, Travel Packages, Airport Transfer, Logistics Core value: "Simple travel booking from one platform." Simplicity-first UX; complexity lives in backend/admin. Market: India, one configurable launch city (Country → State → City → Zone → Service Area). No permanent hard-coding of one city — must support multi-city with independent service enablement (e.g., City A: Bike+Auto; City B: Bike+Auto+Bus; City C: Bus only).

PHASE 0 — BUSINESS FOUNDATION

Core Rule

Never skip/simplify/assume business rules. Undefined values become configurable settings, not hard-coded. No fake integrations, payments, GPS, or verification claims. Every decision must be documented. No future-phase functionality built early.

Actors

Customer: register, login, search, book, pay, track, cancel, refund request, rate, support.

Bike Driver / Auto Driver: share one driver ecosystem — vehicle/service type determines the service, not separate accounts. Capabilities: register, submit docs, verification, online/offline, accept/reject requests, navigate, start/complete trip, earnings, ratings.

Bus Operator: register, verify, add buses/routes/stops, create schedules, configure seats, set fares, manage bookings/passengers, view revenue/settlements. Sub-roles: Owner, Manager, Staff, Accountant.

Admin: controls users, drivers, operators, vehicles, services, cities, pricing, commission, bookings, payments, refunds, settlements, offers, support, safety, reports, system settings.

Support Agent: role-based permissions only — never inherits full Admin access.

Business & Revenue Model

Marketplace model — WayneWay doesn't own vehicles; partners provide service. WayneWay provides tech, acquisition, booking, payment, support, tracking, settlement, ratings. Revenue types (all configurable by service/city/partner/vehicle/booking type): percentage commission, fixed platform fee, or hybrid — for Bike, Auto, and Bus independently. Never hard-code one permanent commission %.

Terminology (precise, non-negotiable):

Gross Booking Value — total customer value pre-deduction

Platform Revenue — WayneWay's share per applicable rule

Partner Gross Earnings — partner's pre-deduction share

Refund — money returned to customer

Settlement — money payable to partner

Net Platform Revenue — platform revenue after costs

Never call Gross Booking Value "profit."

Pricing Principles

Configurable (not hard-coded): per-km rate, base fare, minimum fare, waiting charge, cancellation charge, platform fee, bus commission. Future pricing engine components: base fare, distance fare, time fare, minimum fare, waiting fee, surge, platform fee, taxes, discounts, cancellation charges. Phase 0 only defines rules — doesn't build the engine.

Service Lifecycles

Bike/Auto (ride-based): SEARCH → FARE ESTIMATE → BOOKING REQUEST → DRIVER MATCHING → DRIVER ACCEPTS → DRIVER ARRIVES → TRIP START → IN PROGRESS → TRIP COMPLETE → PAYMENT/SETTLEMENT → RATING. Must be distinct service types with explicit states — never vague states like "active"/"done".

Bus (schedule-based): SEARCH ROUTE → SELECT DATE → AVAILABLE TRIPS → SELECT BUS → SELECT SEAT → PASSENGER DETAILS → PAYMENT → TICKET CONFIRMATION → TRAVEL. Supports routes, stops, boarding/dropping points, schedules, seat inventory, fare, passenger list, cancellation, refund, operator settlement.

Booking Identity & States

Unique booking ID format: WAYNE-XXXXXX (non-sequential/non-predictable public IDs to avoid exposing booking info).

Ride states: SEARCHED, REQUESTED, MATCHING, DRIVER_ASSIGNED, DRIVER_ACCEPTED, DRIVER_ARRIVING, DRIVER_ARRIVED, STARTED, IN_PROGRESS, COMPLETED, CANCELLED, REFUND_PENDING, REFUNDED, FAILED. Bus states: AVAILABLE, HELD, PAYMENT_PENDING, CONFIRMED, CANCELLED, REFUND_PENDING, REFUNDED, COMPLETED.

Payments

Always server-verified — never trust frontend success, client-side prices, or client-side payment status. Must support: creation, verification, webhooks, idempotency, failed/duplicate payments, refunds (full/partial), reconciliation, settlement. No real payment gateway connected in Phase 0.

Cancellation

Service-specific, config-driven (never hard-code percentages without business approval):

Bike/Auto: before acceptance / after acceptance / after arrival / after trip start.

Bus: time-based tiers (e.g., >X hrs, X–Y hrs, <Y hrs, after departure).

Partner Verification

Driver data: name, mobile, photo, vehicle info, license, permits, bank/settlement info, verification status. Bus operator: business name, contact, business docs, permits, bus info, bank info, authorized rep. States: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED, DEACTIVATED. Uploading a document ≠ verified.

Customer Trust & Safety

Customers see: driver name/photo, vehicle type/details, verification info, estimated fare, booking ID, trip status, support option. Sensitive partner info stays hidden. Safety foundation (defined now, built later): SOS, emergency contact, trip sharing, driver ID, ride OTP, incident reporting, safety complaints, admin incident management — a core requirement, not optional.

Support

Categories: booking, payment, driver, bus, cancellation, refund, lost item, safety, account, technical. Each ticket: ID, user, related booking, category, description, status, assigned agent, resolution, timestamps, audit history.

Data & Financial Principles

Separate: identity, partner, vehicle, service, booking, financial, communication data — never mix financial transactions into general user profiles. Financial ledger flow: BOOKING → CUSTOMER PAYMENT → PLATFORM FEE → PARTNER AMOUNT → REFUND/ADJUSTMENT → FINAL SETTLEMENT. Every change auditable — never overwrite financial values; use transaction/adjustment records.

Roles & Permissions

Roles: Customer, Driver, Bus Operator Owner/Manager/Staff, Accountant, Support Agent, Admin, Super Admin. Never a single admin=true flag for the whole back office — full RBAC required.

Security & Privacy Foundations

Security: secure auth, OTP protection, rate limiting, RBAC, secure sessions, sensitive-data protection, audit logs, webhook verification, idempotency, input validation, server-side authorization, account deletion process. Privacy: define collection purpose, minimization, consent, access/correction/deletion rights, retention, privacy policy, third-party disclosure, location handling — per applicable Indian data-protection norms. Location data: define when collected, why, who can access, retention, when live tracking stops, and what customers/drivers can each see — no continuous tracking without legitimate purpose.

Notifications

Categories: TRANSACTIONAL (OTP, booking, payment, cancellation, refund, trip updates), OPERATIONAL (driver assigned/arriving, bus departure), MARKETING (offers/promos — separately controllable/opt-out).

Journeys (summary)

Customer: Open → Location → Destination → Select Service → View Options/Price → Book → Pay → Confirmation → Travel → Complete → Receipt → Rate.

Driver: Register → Submit Docs → Verify → Approve → Go Online → Receive Request → Accept → Navigate → Arrive → Start → Complete → Earnings → Settlement.

Bus Operator: Register → Verify → Add Bus/Route/Stops → Create Schedule → Configure Seats → Set Price → Publish → Receive Bookings → Manage Passengers → Complete Trip → Settlement.

Metrics & KPIs

Marketplace: total bookings, GBV, platform revenue, partner earnings, cancellation rate, refunds. Customer: new/active/repeat customers, avg booking value, CAC, LTV. Driver: active drivers, acceptance rate, cancellation rate, completed rides, rating, earnings. Bus: seats available/sold, occupancy, revenue/trip, cancellations. Launch KPI categories: Supply, Demand, Quality, Financial. No fake guaranteed targets — all configurable.

Phase 0 Out of Scope

No real: ride matching, GPS tracking, payment gateway, bus booking, driver onboarding, SMS/WhatsApp, maps, train/hotel/flight integration, AI travel assistant. Conceptual definition only.

Phase 0 Critical Rules

No permanent hard-coding of: commission %, platform fee, cancellation fee, minimum fare, per-km rate, city, service availability, operating zone, coupon value, refund %, partner status, service status.

No fake data presented as real — dev/test data must be labeled DEMO/TEST/MOCK.

No premature complexity — customer sees only: "Where are you going?" [From][To][🏍️Bike][🛺Auto][🚌Bus].

Version control: 0.1 → 0.2 (approved change) → 0.3 (additional req) → 1.0 (production-ready). Never silently modify locked rules.

Phase 0 Exit Gate

Not complete until: all documents exist; all critical rules defined (revenue, pricing, cancellation, refund, roles, permissions, safety, privacy, security, city/zone model, booking states, financial terms); Bike+Auto+Bus locked as initial scope; future services separated; Phase 1 requirements generated; no critical ambiguity remains. If incomplete, mark INCOMPLETE and list missing items explicitly — never claim false completion.

PHASE 1 — TECHNICAL ARCHITECTURE

Objective & Principles

Build the complete secure, scalable technical foundation (not business features) across: client apps, backend API, database, auth/authz, service/booking/financial/notification/location/file/support/analytics/security/monitoring/testing/deployment architecture.

Non-negotiable principles: security-first; server is authoritative for permissions/price/booking/payment/status/commission/refund/settlement; modular (Bike/Auto/Bus independent modules on shared infra); extensible for future services; configuration-driven business rules; auditable; idempotent (payment, booking confirmation, state transitions); observable; testable; no fake production behavior(payment/GPS/availability/inventory/government verification must be real or clearly absent).

High-Level Architecture

Modular Monolith with clear domain boundaries (not premature microservices), extractable later if needed. Domains: API/Gateway → Identity&Auth, Users, Partners, Vehicles, Mobility(Bike/Auto/future Cab), Bus, Booking, Pricing, Payments, Ledger, Commission, Settlement, Notifications, Location, Support, Reviews, Promotions, Analytics, Audit.

Client Applications

Four interfaces: Customer App (Web/iOS/Android, shared business logic where practical), single unified Driver App (one account can hold multiple vehicle types — no separate Bike/Auto driver apps), Bus Operator Portal (web, roles: Owner/Manager/Staff/Accountant), Admin Panel (separate, protected, roles: Super Admin/Admin/Ops/Finance/Support/Safety/Verification — least-privilege).

Frontend Foundations

Reusable component library (buttons, inputs, cards, modals, sheets, tabs, nav, tables, badges, alerts, toasts, loading/empty/error states, confirmation dialogs) — no duplicated UI. Responsive across mobile/tablet/desktop (customer-web mobile-first; admin/operator desktop-first but responsive). Centralized design tokens (typography, spacing, radius, shadow, icons, breakpoints, animation, a11y states) — no hard-coded per-screen styles. Accessibility built-in (keyboard nav, focus states, labels, contrast, touch targets, form feedback) — not a cosmetic afterthought.

API Architecture

Versioned (/api/v1/...) covering auth, users, drivers, vehicles, operators, buses, routes, bookings, payments, refunds, commissions, settlements, notifications, support, reviews, promotions, admin. No direct DB table exposure — business/domain logic only. Consistent response format (success: status/data/correlation-id; error: code/message/correlation-id/validation details) — never expose stack traces, DB errors, secrets, or internals. v1 contracts preserved; new versions coexist as needed.

Database

Relational DB for transactional data — referential integrity, transactions, indexing, constraints, auditability; no critical relationships stored only as unstructured JSON. Core entity groups: Identity (users, profiles, sessions, devices); Partners (drivers, driver_documents, driver_services, operators, operator_members/documents); Vehicles (vehicles, vehicle_documents, vehicle_service_types); Geography (countries, states, cities, zones, service_areas, locations); Mobility (ride_requests, driver_availability, driver_locations, ride_events); Bus (buses, bus_layouts, bus_seats, routes, route_stops, trips, trip_seats); Booking (bookings, booking_items, booking_events, passengers); Financial (payment_orders, payments, refunds, commissions, ledger_accounts, ledger_entries, settlements, settlement_items); Customer (saved_places, emergency_contacts, wallets, wallet_transactions, reviews); Promotions (coupons, coupon_rules, coupon_redemptions); Communication (notifications, notification_templates, support_tickets, support_messages); Security (audit_logs, security_events); Analytics (business_events). Consistent naming convention (no mixing userId/user_id/UserID), proper PK/FK/unique/check/not-null constraints and indexes. Soft-delete for transactional records (active/inactive/deleted/archived states) — financial/audit records retained per policy. Timestamps: store UTC internally, display in Asia/Kolkata for India. Public IDs shouldn't expose internal sequence numbers.

Auth & Authorization

Unified auth: mobile OTP, optional email/password, social login (future), sessions, device management, logout, token refresh, account recovery — via provider abstraction (no hard SMS-vendor lock-in). RBAC roles: CUSTOMER, DRIVER, OPERATOR_OWNER/MANAGER/STAFF, ACCOUNTANT, SUPPORT_AGENT, ADMIN, SUPER_ADMIN. Every protected endpoint checks authorization server-side. Session security: secure tokens, expiry, refresh, logout, revocation, device visibility, suspicious-session handling. OTP: provider abstraction, expiry, attempt limits, resend cooldown, rate limiting, hashed/protected storage (never plaintext persistent), audit events. Passwords (if used): never plaintext, modern hashing, rate-limited login, secure reset.

Domain Models

Driver ≠ User — relationship: User → DriverProfile → {Services, Vehicles, Documents}. Vehicle: generic fields supporting Bike/Auto/future Cab without redesign (ID, owner, type, registration, make/model, color, status, verification, documents). Service Type abstraction: current BIKE/AUTO/BUS, future CAB/TRAIN/HOTEL/FLIGHT — addable without rewriting unrelated modules. City/Zone: Country → State → City → Zone → Service Area, each service independently enable/disable per area.

Pricing & Commission

Pricing abstraction spans service/city/zone/partner/vehicle/base/distance/time/minimum/waiting/platform-fee/tax/discount/surge — architecture only in Phase 1, not the full engine. Commission is independent from pricing(fare ≠ commission) — rules by service/city/partner/effective-date/percentage/fixed/status.

Booking Architecture

Generic booking domain: ID, customer, service type, provider, status, price snapshot (historical price never silently changes after confirmation), payment status, cancellation status, timestamps. Explicit state machine (REQUESTED→MATCHING→ASSIGNED→ACCEPTED→ARRIVING→ARRIVED→STARTED→IN_PROGRESS→COMPLETED, plus controlled cancellation/failure states) — no arbitrary client-driven transitions. Domain events:USER_REGISTERED, DRIVER_APPROVED, RIDE_REQUESTED/ASSIGNED/ACCEPTED/STARTED/COMPLETED, BOOKING_CANCELLED, PAYMENT_CREATED/CONFIRMED, REFUND_CREATED — trigger notifications/analytics/settlement/support/audit.Idempotency required for: booking creation, payment creation/confirmation, refund creation, settlement creation — duplicate requests must never double-charge or double-book.

Financial Architecture

PaymentProvider interface abstraction (not tied to one vendor). States: CREATED, PENDING, AUTHORIZED, CAPTURED, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED. Ledger: proper transaction-record system — never just user.balance = 500. Tracks customer money, platform revenue, partner payable, refunds, adjustments, settlements — every movement traceable. Refunds: separate entities from payments — full/partial, reason, status, original/refund references, timestamps. Settlement: separate from booking — Booking → Financial transaction → Partner payable → Settlement batch → Settlement item → Partner payout.

Bus Architecture

Separate entities: Bus, Bus Layout, Seat, Route, Stop, Trip, Trip Schedule, Trip Seat Inventory, Passenger, Bus Booking — a bus is not a trip; a route is not a booking. Seat inventory: must prevent double-selling via transactional protection (DB-level constraints, not just app logic).

Location, Notification, File Architecture

Driver status: OFFLINE/ONLINE/BUSY/SUSPENDED (not a boolean). MapProvider abstraction for geocoding/reverse-geocoding/routing/distance/ETA — not hard-wired to one vendor. Structured location data (pickup, drop, driver location, service zone, saved place) — coordinates, not just address text. Live tracking only for authorized parties; never publicly exposed. NotificationProvider abstraction across PUSH/SMS/EMAIL/WHATSAPP with templates — no hard-coded message text in business logic. File storage: secure abstraction for partner documents — metadata + secure reference stored, not raw binaries in relational rows where avoidable. Access-controlled retrieval, signed URLs, permission checks, type/size validation, malware-scan strategy — no publicly guessable document URLs.

Reviews, Coupons, Wallet, Support, Audit

Reviews tied to completed eligible bookings only (no reviewing without valid interaction). Coupon system: code, dates, service, city, min value, max discount, usage limits, eligibility, status — data/service boundaries defined in Phase 1, full engine later. Wallet: transaction-history based (not a raw numeric field), auditable movements. Support: SupportTicket/Message/Attachment/Assignment with statuses OPEN→ASSIGNED→IN_PROGRESS→WAITING_FOR_USER→RESOLVED→CLOSED. Audit log: actor, action, entity, entity ID, timestamp, metadata, correlation ID — for commission changes, driver approval, suspensions, refunds, settlements, pricing changes, booking-state changes; no unnecessary sensitive data logged.

Analytics, Errors, Logging

Event-based analytics (APP_OPENED, SEARCH_STARTED, BOOKING_CREATED, PAYMENT_SUCCESS/FAILED, RIDE_COMPLETED, etc.) derived from reliable backend events, not just frontend clicks. Standard error categories: VALIDATION_ERROR, AUTHENTICATION_ERROR, AUTHORIZATION_ERROR, NOT_FOUND, CONFLICT, RATE_LIMITED, PAYMENT_ERROR, BOOKING_ERROR, SERVICE_UNAVAILABLE, INTERNAL_ERROR. Structured logs (timestamp, severity, module, request ID, user ID, error code, context) — never log passwords, OTPs, payment secrets, auth tokens, unnecessary PII. Correlation IDs trace requests across services end-to-end.

Operational Foundations

Rate limiting on OTP request/verify, login, password reset, booking creation, coupon redemption, support endpoints. Caching for stable data only (service/city config, static content, reference data) — never rapidly-changing transactional data incorrectly cached. Background job/queue architecture for notifications, emails, SMS, analytics, document processing, settlement, reports — critical requests shouldn't block on slow external calls. Search: clean interfaces for city/location/route/service now; hotels/flights/trains later — no premature giant universal search. Config separated from code (env, DB, API endpoints, feature flags, business config, providers) — secrets never committed. Environments: LOCAL/DEV/STAGING/PRODUCTION — never mix production credentials/data into lower environments. Feature flags: BIKE_ENABLED, AUTO_ENABLED, BUS_ENABLED, etc. — server-controlled for staged rollout. DB migrations: versioned, reproducible, reviewable, reversible where practical — no manual production schema changes. Backup/recovery: automated backups, retention, recovery procedure, DR plan, restore testing (untested backup = unreliable). CI/CD: Code→Lint→TypeCheck→UnitTests→Build→SecurityChecks→DeployStaging→IntegrationTests→Approval→Production — no unvetted auto-deploys. Code quality: formatting, linting, type safety, naming conventions, modularity, review, no duplicated critical logic, no dead code, no committed secrets. Testing levels: unit, integration, API, database, e2e, security, load — isolated test data, never targeting production accidentally. Monitoring: API latency, error rate, DB performance, queue failures, payment/booking/matching/notification failures, server health, storage, provider health. Alerts for critical failure spikes routed to ops channels.

Security Architecture

Defense in depth: HTTPS, secure headers, input validation, output encoding, auth, authz, rate limiting, secret management, encryption where appropriate, secure file handling, audit logging, dependency scanning, vulnerability management. OWASP-class protections: broken access control, injection, auth failures, misconfig, vulnerable deps, sensitive data exposure, SSRF, XSS, CSRF, insecure uploads — frontend validation is never treated as security. Data access rule: every access verifies requester owns/may access that specific resource (Customer A can't reach Customer B's booking by changing an ID; same for drivers/operators). Admin permissions remain role-limited even internally.Financial security: server calculates/validates all amounts — never trust client-supplied amount, commission, refund, or settlement values. Concurrency: DB transactions, row/version locking, idempotency, state validation for simultaneous seat/ride-accept/state-transition requests. API security: every protected call resolves User→Role→Resource→Permission server-side (e.g., "can this driver update this specific ride at this state?"). Admin security: strong auth, RBAC, session timeout, audit logs, confirmation on sensitive actions, MFA-ready architecture. Sensitive actions (refund approval, commission changes, partner suspension, pricing/settlement changes) must be auditable and may require elevated authorization.

Documentation & Deliverables (Phase 1)

Produce: System Architecture, DB Schema/ER diagram, API Architecture/Contracts (OpenAPI-style), Auth/Authz Architecture, Permission Matrix, Domain Model, Booking/Payment State Machines, Financial Model, Event Model, Notification/Location/File Architecture, Security Architecture, Deployment/CI-CD, Testing/Monitoring/DR Strategy, Environment Strategy, Phase 2 Technical Requirements. Domain ownership map (Identity, Partner, Vehicle, Mobility, Bus, Booking, Finance, Communication) with no circular dependencies — cross-domain communication via defined interfaces/events only. External provider interfaces: PaymentProvider, MapProvider, OTPProvider, SMSProvider, EmailProvider, PushProvider, FileStorageProvider — vendor-swappable.

Phase 1 Must NOT Build

Complete booking engines, real payments, real matching/GPS/tracking, production SMS/WhatsApp, train/hotel/flight booking, AI assistant, full loyalty system — architecture only.

Phase 1 Exit Gate

Complete only when architecture, DB model, domain boundaries, API contracts, auth/authz, financial/booking/bus/location/notification/security/deployment/testing/monitoring/backup architecture are documented and Phase 2 requirements are ready with no critical ambiguity. Otherwise: PHASE 1 INCOMPLETE + explicit missing-item list.

PHASE 2 — UI/UX SYSTEM

Objective

Complete, production-quality, original design system (not copying Uber/Ola/Rapido/RedBus/MakeMyTrip) — simple, fast, trustworthy, premium, mobile-first, India-ready, internationally scalable. Same design language across Customer Mobile/Web, Driver Mobile, Bus Operator Portal, Admin Dashboard, adapted per platform.

Design System (build before screens)

Centralized: logo placement, typography hierarchy, spacing, radius, cards, shadows, icons, navigation (bottom/top), modals, sheets, toasts, alerts, dialogs, dropdowns, tabs, chips, badges, search/location fields, date/time/seat selectors, maps, loading/empty/error/success/disabled states, skeleton loaders — all reusable, no per-screen hard-coding.

Responsive Rules

Must work at all breakpoints (small/standard/large phones; tablet portrait/landscape; desktop 1280/1440/1920+) without horizontal overflow, broken cards, text clipping, overlap, off-screen buttons, or broken nav. Web ≠ stretched mobile UI.

Customer App — Full Screen Inventory (100 screens)

Auth/Entry: Splash, 3 Onboarding screens, Login (mobile+country code), OTP (with resend/countdown/change-number), Create Profile, Location/Notification permission explainers.

Home: header (avatar/greeting/notifications), search card ("Where are you going?" From/To), service selector (Bike/Auto/Bus), quick actions (Home/Work/Recent), sections (recent searches, popular routes, offers, nearby transport, help), bottom nav (Home/Bookings/Offers/Profile).

Location: Location Search, From/To screens, Map Picker (pin/search/confirm), Adjust Pickup, Recent Locations.

Results: Bike/Auto/Bus results — reusable cards showing service type, price, ETA, availability, CTA (mock/demo data only, clearly labeled, never fake real-time).

Bike/Auto booking: Ride Details, Fare Breakdown (base/distance/time/platform fee/tax/discount/total), Driver Matching animation, Driver Found (photo/name/rating/vehicle/ETA), Booking Confirmation.

Live ride: Live Tracking (map + driver/vehicle/ETA/pickup/destination + call/message/share/SOS), Driver Arriving/Arrived, Trip Start OTP, Trip In Progress, Trip Completed (fare/receipt/rating CTA).

Bus booking: Search (From/To/Date/Passengers), Results (operator/bus/AC/departure/arrival/duration/price/seats/amenities), Details, Seat Selection (occupied/available/selected/gender restrictions/sleeper-seater/berth), Boarding/Dropping Point, Passenger Details, Fare Breakdown, Review, Payment, Confirmation (Ticket ID/PNR/bus/seat/points/date/time), digital Ticket UI, Trip Reminder.

Payment UI only (no logic): Method selection (UPI/Card/NetBanking/Wallet), Processing, Success, Failed, Pending, Retry, Cancelled — each state has clear explanation + next action.

Bookings: My Bookings (Upcoming/Completed/Cancelled tabs), Booking Card/Details, Ride/Bus Ticket Details, Cancel Booking + Confirmation, Refund Status/Details.

Rating: star rating + category scores (behaviour/vehicle/cleanliness/safety), written review, report issue.

Notifications: list by category (booking/payment/offers/travel/security/support), detail view.

Offers: Home, Details, Coupon Apply/Applied/Invalid/Expired.

Wallet: Balance (available/refund/promo credits), Transactions, Transaction Details.

Profile: Profile, Edit, Photo, Saved Places (add/edit), Emergency Contacts (add), Language, Notification/Privacy/Security/App Settings.

Help: Help Center (by category), FAQ, Support Ticket (create/details), Support Chat UI, Report Safety Issue.

Legal: Terms, Privacy Policy, Cancellation Policy, Partner Info, About WayneWay.

Account: Logout Confirmation, Account Deactivation, Account Deletion (with confirmation).

Bottom nav: Home / Bookings / Offers / Profile. Every screen answers "Where am I / what can I do / what happens next" with one obvious primary CTA and a clear back path. Booking flow: Home→From→To→Service→Results→Review→Payment→Confirmation, no unnecessary steps.

Driver App (32 screens)

Splash, Login, OTP, Profile Setup, Document Upload, Verification Pending/Approved/Rejected, Home (prominent ONLINE/OFFLINE toggle), Ride Request card (pickup/destination/distance/estimated earning + Accept/Reject with an unmistakable decision UI), Navigation to Pickup, Arrived, Start Trip, OTP Verification, Trip In Progress, Complete Trip, Earnings + Details, Trip History, Ratings, Documents, Vehicle, Profile, Notifications, Support, Safety/SOS, Settings, Logout.

Bus Operator Portal (31 screens, desktop-first)

Login, OTP, Dashboard, Company Profile, Staff Management, Bus List/Add/Edit/Details, Vehicle Documents, Driver List/Add, Routes/Create Route, Stops, Schedule/Create Trip, Seat Layout, Pricing, Amenities, Bookings/Details, Passenger List, Cancellation, Refund Status, Revenue, Settlement, Reports, Notifications, Support, Settings. Sidebar: Dashboard/Buses/Drivers/Routes/Schedules/Bookings/Passengers/Revenue/Settlements/Reports/Support/Settings.

Admin Panel

Nav: Dashboard, Users, Drivers, Vehicles, Operators, Buses, Routes, Trips, Bookings, Payments, Refunds, Commission, Settlements, Offers, Coupons, Notifications, Support, Safety, Fraud, Reports, Analytics, Settings. Dashboard cards: bookings, active rides, revenue, drivers online, bus bookings, cancellations, refunds, open tickets — demo data clearly marked, no misleading fake analytics.

Cross-Cutting UI Requirements

States (every component): default, hover, pressed, focused, disabled, loading, success, warning, error, empty — with human copy (e.g., "You don't have any bookings yet," "No rides found," "Something went wrong" + retry), never raw technical errors (no "500 Internal Server Error"). Loading: skeleton loaders over blank screens/spinners where practical.Accessibility: large touch targets, readable type, strong contrast, screen-reader labels, keyboard nav (web), focus states, accessible forms — never color-only status signaling. Localization: i18n-ready (English + Hindi initially, extensible), no hard-coded strings, room for longer translated text. Currency: ₹ INR initially, not hard-coded into reusable components — future-currency-ready. Maps: reusable components (pickup/destination/driver/route/current-location/picker) with zoom/search/markers/route/info card. Motion: subtle, purposeful (transitions, loading, confirmation, matching, sheets, success/error feedback), respects reduced-motion settings. Trust/Safety UI: driver identity/rating/vehicle, operator info, fare, cancellation info, booking ID, support access, SOS (accessible but accidental-activation-protected), emergency contact, trip share, report issue, trip OTP — pricing never hidden. Mock data rule: realistic dev-only mock data structured for later API replacement — never presented as real bookings/drivers/payments/availability.

Phase 2 Boundary

UI/UX only — no real payment processing, OTP service, GPS tracking, driver matching, booking transactions, settlements, refunds, bus inventory, or external API integrations. UI must be fully ready to receive those systems later.

Phase 2 Exit Checklist (abbreviated)

No missing/dead-end screens; consistent buttons/spacing/typography; no horizontal overflow; full responsive coverage (mobile/tablet/desktop); all state variants implemented; accessibility & localization considered; currency abstracted; future-service-ready; all four flows (Customer/Driver/Operator/Admin) complete with valid back/cancel/exit paths; map/seat/payment/safety/support/legal/account-deletion UI prepared; tokens centralized; components reusable; no Phase 3+ business logic introduced.

PHASE 3 — CUSTOMER ACCOUNT SYSTEM

Scope

Build complete customer identity/account system only — no Bike/Auto/Bus booking, payments, or driver matching yet (Phase 4+). Must reuse/extend existing Phase 1/2 architecture (inspect before building — no duplicate User models, auth systems, API clients, design systems, DB connections, or notification systems). Account architecture must remain compatible with future Driver/Operator/Admin roles without granting customers cross-role access.

Authentication

Primary: Mobile + OTP. Flow: Open → Login/Signup → Enter mobile → Validate → Send OTP → Verify OTP → Create/retrieve account → Secure session → App. Phone handling: default India (+91), validated format, architecture supports future countries — store country_code, phone_number, normalized_phone, phone_verified_at consistently.OTP system: cryptographically secure, short expiry, one-time-use, attempt limits, resend cooldown/max resends, rate limiting, server-side-only verification — never expose/log OTP in responses or logs, prefer hashed storage. Lifecycle: REQUESTED→SENT→PENDING→VERIFIED/EXPIRED/BLOCKED. OTP UX: 6-digit auto-advance/paste-friendly input, resend timer, change-number option, generic error messages (never reveal the correct OTP or leak security detail). Server enforces all cooldowns/limits regardless of client timer. Email (optional): add/verify separately — unverified email never treated as verified. Google/Apple Sign-In: server-side token verification only (never trust client-supplied identity data), safe account linking, duplicate-account prevention, Apple private-relay email support. Account linking:one customer can hold Mobile+Email+Google+Apple identities merged into a single verified account — never silently duplicate profiles.

Data Model

Entities: User, CustomerProfile, UserIdentity, UserSession, UserDevice, PhoneVerification, EmailVerification, EmergencyContact, SavedPlace, ConsentRecord, NotificationPreference, SecurityEvent, AuditLog. User: id, role, status (ACTIVE/SUSPENDED/DEACTIVATED/PENDING/DELETED), timestamps, verification timestamps, soft-delete field.Profile fields: first/last/display name, photo, phone, email, DOB (only if genuinely required), language, country, gender (only if genuinely required) — minimal collection principle.

Account Features

Profile photo: upload/preview/replace/remove with size/type validation, image processing, secure storage — never trust file extension alone, block executables. Emergency contact: name, relationship, mobile — add/edit/delete (foundation only; SOS functionality itself is Phase 14, not built here). Saved places: label (Home/Work/Other), address, lat/long, place identifier — add/edit/delete, prevent inappropriate duplicates. Sessions: secure tokens, expiry, refresh, server-side invalidation, logout, logout-all-devices, session listing, suspicious-session foundation — never rely on client-only token deletion. Device management: device_id, platform, name, app_version, last_active_at, IP metadata where appropriate — customer sees "Your devices" with logout option; no unnecessary sensitive exposure. Account recovery: verified identity only (mobile OTP primary, verified email optional) — never recover based on name/photo/booking ID/other soft PII.Account deletion: confirmation flow → identity verification → confirm → deactivation/deletion process → session invalidation; personal data separated from legally-required financial/audit records so required records can be retained without keeping unnecessary personal data. Data export: authenticated "download my data" foundation for customer-owned data only — never exposes other customers' data. Notification preferences: categories (booking, promotional, security, account) — security notifications not silently disableable if required for account safety; multi-channel-ready (push/SMS/email/WhatsApp), full engine is a later phase. Consent: versioned Terms/Privacy acceptance records (document+version+accepted_at+user_id) — not just a boolean flag. Language: English/Hindi initially, i18n-ready architecture, no hard-coded UI strings.

Security Requirements

Rate limiting (OTP request/verify/resend, OAuth attempts, sensitive profile changes, deletion/export requests), brute-force protection, secure token generation, session expiration, authorization middleware, input/output validation, CSRF/XSS/injection protection, secure headers/cookies, audit logs. Never trust from frontend: user_id, role, verification status, payment status, admin status — backend is always authoritative. Security events tracked:LOGIN_SUCCESS/FAILED, OTP_REQUESTED/FAILED/EXPIRED/RATE_LIMITED, NEW_DEVICE, SESSION_REVOKED, ACCOUNT_LOCKED/DELETED, PROFILE/EMAIL/PHONE_CHANGED — foundation for future risk scoring, not aggressive auto-banning on weak signals. Phone/email change: always requires re-verification of the new value before updating; audit event + security notification logged. Suspension: backend-enforced — sessions invalidated per policy, normal functionality blocked, cannot be bypassed from frontend.

API Surface (representative, reuse existing conventions where they differ)

POST /auth/request-otp, /auth/verify-otp, /auth/resend-otp, /auth/logout, /auth/logout-all, /auth/google, /auth/apple GET/PATCH /me; POST/DELETE /me/photo; GET/POST/PATCH/DELETE /me/emergency-contact; GET/POST/PATCH/DELETE /me/saved-places/:id; GET /me/sessions, DELETE /me/sessions/:id, POST /me/sessions/revoke-all; GET/PATCH /me/notification-preferences; GET/POST /me/consents; POST /me/data-export; POST /me/delete-account. Rule: every /me endpoint derives identity from the authenticated session — never accepts a client-supplied userId as authoritative.

Frontend Routes

/login /verify-otp /home /profile /profile/edit /profile/security /profile/devices /profile/emergency-contact /profile/saved-places /profile/notifications /profile/privacy /profile/terms /profile/delete — auth guards redirect unauthenticated users to login and return them post-login; suspended/deactivated users blocked from normal functionality.

Testing & Ownership Enforcement

Explicit security tests required: Customer A cannot access/modify Customer B's data, own user_id, own role, own phone/email verified flags, admin/driver APIs; expired/used/wrong OTP fails; OTP attempt limits enforced; expired/revoked sessions fail; logout-all invalidates everything; duplicate account creation prevented (race-condition safe — concurrent OTP verifications must not create two accounts). Edge cases to cover: app closed mid-OTP, network loss, late/expired OTP, stale OTP reuse, duplicate phone/email, already-linked Google/Apple, multi-device login/logout, suspension mid-session, interrupted profile/photo update, duplicate saved location, invalid coordinates, repeated deletion/export requests. Test levels: unit (validation, OTP lifecycle, session, ownership), integration (signup/login/logout, multi-device, verification flows, profile CRUD, deletion, export), security (as above).

Never (Phase 3 absolute rules)

Expose OTP/tokens/secrets; trust client role/user-id/verification state; return stack traces; store unneeded sensitive data; use insecure randomness; bypass server authorization; embed secrets in frontend/Git; fake OTP verification, authentication, profile updates, or sessions; show "Coming Soon" placeholders where real Phase 3 functionality is required — a button either works for real or isn't shown.

Environment & Docs

All secrets via env vars (DATABASE_URL, OTP/Google/Apple/Storage credentials, session secrets) — .env.examplewith placeholders only, real secrets never committed. API docs per endpoint: method, auth, request/response schema, errors, authorization, rate limits.

Phase 3 Completion Standard

Not "complete" because UI renders. Requires DB + Backend + API + AuthN + AuthZ + Frontend + Security + Validation + Error Handling + Tests + Docs all implemented and connected, verified by: type-check, lint, unit/integration/security tests, build, manual auth-flow review, manual responsive review, and confirmation that no Phase 1/2 functionality broke. Fix all failures — never disable tests or strip functionality to pass. Any requirement blocked by a missing external credential must have the correct integration architecture built anyway, with the exact required env var/config clearly flagged — never fake successful authentication.

Final Customer Flow (Phase 3 outcome)

Open WayneWay → Login → Mobile OTP → Account → Home → Profile → Security → Devices → Emergency Contact → Saved Places → Notifications → Privacy → Delete Account → Logout. Booking (Bike/Auto/Bus) begins in Phase 4 — intentionally excluded here so the identity system stays clean and booking can attach to it properly later.

GLOBAL CROSS-PHASE RULES (apply everywhere)

Nothing legally/commercially fixed gets hard-coded — it becomes admin-configurable.

No fake integrations, payments, GPS, availability, or verification presented as real, ever — dev/test data always labeled.

Server is always the source of truth for price, permissions, booking state, payment state, partner status, commission, refund, settlement.

Every financial movement is traceable via transaction/ledger records — never overwritten in place.

Every phase has an explicit exit checklist; a phase is never declared complete while items remain unmet — mark INCOMPLETE and list gaps instead of pretending otherwise.

Do not build ahead into future phases; do not silently drop or simplify required scope from the current phase.

Brand name is always exactly WayneWay.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wayne-way-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/085a09ad-cd48-4e2c-96ef-cdc28c5bcff7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
