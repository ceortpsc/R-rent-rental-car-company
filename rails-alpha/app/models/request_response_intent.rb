require "time"

class RequestResponseIntent < ApplicationRecord
  belongs_to :workflow_event
  validates :channel, inclusion: { in: %w[email] }
  validates :template, inclusion: { in: %w[received] }

  # Internal candidates only. No provider, recipient address, generated body,
  # sent/delivered status, or side effect is stored here.
  def self.plan_from!(event, cutoff:, now: Time.current)
    return unless cutoff && event.event_type == "booking.requested"
    booking = Booking.find_by(id: event.subject_id)
    policy = RequestResponsePolicy.evaluate(event: event, booking: booking, channel: :email, cutoff: cutoff, now: now)
    return unless policy.state == :internal_candidate && !policy.external_send_allowed
    row = create_or_find_by!(idempotency_key: policy.idempotency_key) do |record|
      record.assign_attributes(workflow_event: event, channel: "email", template: policy.template.to_s,
        template_version: RequestResponsePolicy::TEMPLATE_VERSION)
    end
    unless [row.workflow_event_id, row.channel, row.template] == [event.id, "email", policy.template.to_s]
      raise ArgumentError, "Mismatched request response intent"
    end
    row
  end

  def self.configured_cutoff
    # No default, clock-derived fallback or interpolation. A future production
    # release must supply the exact owner-approved rollout timestamp.
    # Deliberately cannot be enabled on this alpha's preview runtime.
    return unless Rails.env.production?
    value = ENV["RR_INTERNAL_RESPONSE_CUTOFF"].to_s
    return unless value.match?(/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\z/)
    Time.iso8601(value)
  rescue ArgumentError
    nil
  end
end
