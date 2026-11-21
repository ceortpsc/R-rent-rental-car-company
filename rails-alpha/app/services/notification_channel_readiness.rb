# Read-only planning registry. No credentials, adapters, writes, or external calls.
class NotificationChannelReadiness
  EXTERNAL_CHANNELS = {
    email: "Email",
    sms: "SMS",
    push: "Push"
  }.freeze
  REQUIREMENTS = {
    provider_verified: "Verified provider and approved configuration",
    sender_verified: "Verified sender identity",
    recipient_authorized: "Recipient and purpose authorization",
    opt_in_verified: "Documented channel-specific opt-in and withdrawal",
    idempotency_verified: "Durable idempotency and replay handling"
  }.freeze

  def self.catalog
    internal = { channel: :in_app, label: "In-app", mode: :internal_only, status: :internal_only,
      external_send_allowed: false, unmet_requirements: [] }.freeze
    synthetic = { channel: :simulation, label: "Synthetic preview", mode: :synthetic_only, status: :synthetic_only,
      external_send_allowed: false, unmet_requirements: [] }.freeze
    [internal, synthetic, *EXTERNAL_CHANNELS.keys.map { |channel| external(channel) }].freeze
  end

  # Explicit booleans describe evidence in offline tests/planning only.
  # Never populate them from a request, browser-provided consent, or flag alone.
  def self.external(channel, evidence: {})
    raise ArgumentError, "Unsupported external channel" unless EXTERNAL_CHANNELS.key?(channel)
    raise ArgumentError, "Evidence must be a hash" unless evidence.is_a?(Hash)
    missing = REQUIREMENTS.filter_map { |key, label| label unless evidence[key].equal?(true) }
    {
      channel: channel,
      label: EXTERNAL_CHANNELS.fetch(channel),
      mode: :external_disabled,
      status: missing.empty? ? :transport_not_implemented : :prerequisites_unverified,
      external_send_allowed: false,
      unmet_requirements: missing.freeze
    }.freeze
  end
end
