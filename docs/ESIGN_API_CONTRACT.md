# R-Rent Sign API v0.3

\`GET /api/v1/envelopes\`: public-safe template registry; tells clients external delivery and signing are disabled.

\`POST /api/v1/envelopes?action=draft\`: JSON internal envelope creation. Requires HTTPS with same origin, Supabase authentication with AAL2 (MFA), allowed staff role, a dedicated database and \`RR_ENABLE_ENVELOPES=true\`; writes DRAFT only. If no prerequisites, returns 503.

Body:
\`\`\`json
{
  "title":"Approved rental contract packet",
  "documents":["RR-001","RR-003","RR-006","RR-009"],
  "recipients":[{"name":"Authorized reviewer","email":"reviewer@example.com","role":"COMPANY_APPROVER","order":1},{"name":"Renter","email":"renter@example.com","role":"RENTER","order":2}],
  "expires_in_days":7
}
\`\`\`

\`POST /api/v1/envelopes?action=issue\`: 503 until secure consent, provider notifications and auditing are available.

No public endpoint receives actual drawn signatures. Do **not** rely on \`GET /api/v1/envelopes\` to establish an executed agreement. Envelope status must only reflect persisted verified events.
