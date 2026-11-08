# R-RENT Rental Counter Workflow

Select an exact agreement, bind its renter and vehicle, inspect physical condition, preserve SHA-256 evidence and an optional private photo, review renter/company signatures, verify Stripe payment and open controlled dispatch. A counter case is keyed by agreement ID, so re-opening does not create another rental. An active rental amendment does not restart the original trip.

The new counter API is protected by authenticated executive-management allowlists. Photos are stored privately and accessed through a short-lived signed URL. Inspection updates use conditional atomic transactions and stable client request IDs. Contract, card payment, fleet allocation and trip release remain independent services and must meet live evidence, insurance, payments and MFA controls. No synthetic execution or payments are claimed.

Endpoints: GET/POST /api/rental/counter; GET /api/rental/counter/:id; POST /api/rental/counter/:id/inspection; GET /api/rental/counter/:id/photo; GET /api/rental/counter/:id/readiness.

Production blockers: missing Stripe keys, operations configuration, signed webhook evidence and independent operational release controls. Final activation must occur in ops/dispatch and is not supported by the counter itself.
