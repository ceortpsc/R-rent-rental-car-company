# Internal planning only. Never transmits, persists a destination, or treats a
# booking estimate as an issued quote. A future adapter must be independently
# verified and recheck recipient authorization and suppression before delivery.
class RequestResponsePolicy
  TEMPLATE_VERSION = "rrent-request-response-v1".freeze
  SOURCES = {
    received: { subject: "R-Rent received your rental request",
      body: "We received your rental request (reference %{reference}). This acknowledges receipt only. It does not confirm availability, approval, a reservation, a charge, or vehicle release. We will review your request before confirming next steps." }.freeze,
    quote_issued: { subject: "Your R-Rent quote is ready",
      body: "An authorized reviewer issued quote %{quote_reference} for rental request %{reference}. Review the issued quote through the approved R-Rent channel for the itemized amount, fees, validity, and next steps. A quote is not a confirmed reservation, authorization to charge, or vehicle release." }.freeze
  }.freeze
  ALLOWED_CHANNELS = %i[email sms push].freeze
  SYNTHETIC_ENDINGS = /@example\.(?:com|net|org)\z/i
  REFERENCE_PATTERN = /\A[A-Z0-9][A-Z0-9-]{2,39}\z/

  Result = Data.define(:state, :reason, :template, :idempotency_key, :external_send_allowed)

  # Call only from an internal worker with an immutable approved rollout time
  # and a canonical, DB-loaded event+booking. No pre-cutoff backfill.
  def self.evaluate(event:, booking:, channel:, cutoff:, now: Time.current)
    return blocked(:unsupported_channel) unless ALLOWED_CHANNELS.include?(channel)
    return blocked(:rollout_not_configured) unless time_value?(cutoff) && time_value?(now) && cutoff < now
    return blocked(:event_not_verified) unless event.is_a?(WorkflowEvent) && event.persisted? &&
      booking.is_a?(Booking) && booking.persisted?
    event = WorkflowEvent.find_by(id: event.id)
    booking = Booking.includes(:vehicle).find_by(id: booking.id)
    return blocked(:event_not_verified) unless event && booking && event.subject_id == booking.id
    return blocked(:historical_or_invalid_timestamp) unless event.created_at && booking.created_at &&
      event.created_at > cutoff && booking.created_at > cutoff &&
      event.created_at >= booking.created_at && event.created_at <= now && booking.created_at <= now
    return blocked(:synthetic_request) if booking.vehicle.is_demo? || booking.renter_email.to_s.match?(SYNTHETIC_ENDINGS)
    return blocked(:request_reference_invalid) unless REFERENCE_PATTERN.match?(booking.reference.to_s)
    return blocked(:request_no_longer_current) unless %w[requested review approved].include?(booking.status)

    if event.event_type == "booking.requested" && event.source_key == "booking:#{booking.id}:requested"
      # Restrict old queued records even when the caller accidentally supplies a
      # stale rollout date. This is a planning freshness limit, not a resend timer.
      return blocked(:stale_request) if event.created_at < now - 24.hours
      key = "rrent:booking:#{booking.id}:received:#{channel}"
      Result.new(state: :internal_candidate, reason: :no_external_transport,
        template: :received, idempotency_key: key.freeze, external_send_allowed: false)
    else
      # No supported model/event currently proves formal quote issuance. A
      # calculated amount or an approval/status transition is not enough.
      blocked(:no_verified_response_event)
    end
  end

  # Preview with synthetic references only. Actual quote issuance is not
  # implemented; this canned copy is not evidence of a quote.
  def self.preview(template)
    text = SOURCES.fetch(template)
    { template_version: TEMPLATE_VERSION, subject: text.fetch(:subject),
      body: format(text.fetch(:body), reference: "RR-DEMO-REQUEST", quote_reference: "RR-DEMO-QUOTE"),
      mode: :synthetic_preview, external_send_allowed: false }.freeze
  end

  def self.blocked(reason)
    Result.new(state: :suppressed, reason: reason, template: nil, idempotency_key: nil, external_send_allowed: false)
  end
  private_class_method :blocked

  def self.time_value?(value)
    value.is_a?(Time) || value.is_a?(ActiveSupport::TimeWithZone)
  end
  private_class_method :time_value?
end
