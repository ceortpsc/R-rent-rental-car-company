require "test_helper"

class RequestResponsePolicyTest < ActiveSupport::TestCase
  setup do
    @instant = Time.current.change(usec: 0)
    @vehicle = Vehicle.create!(label: "Policy fixture", daily_rate_cents: 4200, is_demo: false)
    # Reserved .test host isolates this synthetic fixture from any real destination.
    @booking = Booking.create!(vehicle: @vehicle, renter_name: "Policy fixture",
      renter_email: "fixture@rental.test", pickup_location: "Synthetic location",
      return_location: "Synthetic location", pickup_at: @instant + 2.days,
      return_at: @instant + 3.days, total_cents: 4200, created_at: @instant - 2.minutes)
    @event = WorkflowEvent.create!(event_type: "booking.requested", subject_id: @booking.id,
      source_key: "booking:#{@booking.id}:requested", created_at: @instant - 1.minute)
  end

  def decide(event: @event, booking: @booking, channel: :email, cutoff: @instant - 1.hour)
    RequestResponsePolicy.evaluate(event: event, booking: booking, channel: channel, cutoff: cutoff, now: @instant)
  end

  test "receipt candidate is internal-only with stable per-channel dedupe key" do
    result = decide
    assert_equal :internal_candidate, result.state
    assert_equal :received, result.template
    refute result.external_send_allowed
    assert_equal result.idempotency_key, decide.idempotency_key
    refute_equal result.idempotency_key, decide(channel: :sms).idempotency_key
    refute_includes result.idempotency_key, @booking.renter_email
  end

  test "durable internal candidate is idempotent and does not store renter content" do
    args = { cutoff: @instant - 1.hour, now: @instant }
    assert_difference "RequestResponseIntent.count", 1 do
      a = RequestResponseIntent.plan_from!(@event, **args)
      b = RequestResponseIntent.plan_from!(@event, **args)
      assert_equal a.id, b.id
      assert_equal "received", a.template
      refute_includes a.attributes.values, @booking.renter_email
      refute_includes a.attributes.values, @booking.renter_name
    end
    assert_nil RequestResponseIntent.plan_from!(@event, cutoff: @instant - 30.seconds, now: @instant)
    assert_nil RequestResponseIntent.configured_cutoff
  end

  test "no cutoff, historical, synthetic, stale and mismatched requests are suppressed" do
    assert_equal :rollout_not_configured, decide(cutoff: nil).reason
    assert_equal :historical_or_invalid_timestamp, decide(cutoff: @instant - 90.seconds).reason
    assert_equal :unsupported_channel, decide(channel: :fax).reason
    assert_equal :event_not_verified, decide(event: WorkflowEvent.new).reason
    @vehicle.update!(is_demo: true)
    assert_equal :synthetic_request, decide(booking: @booking.reload).reason
    @vehicle.update!(is_demo: false)
    @booking.update!(renter_email: "synthetic@example.net")
    assert_equal :synthetic_request, decide.reason
    @booking.update!(renter_email: "fixture@rental.test", created_at: @instant - 26.hours)
    @event.update!(created_at: @instant - 25.hours)
    assert_equal :stale_request, decide(booking: @booking.reload, cutoff: @instant - 30.hours).reason
  end

  test "paid-like amounts, approval and quote-looking text never establish issuance" do
    @booking.update!(status: "approved", total_cents: 99999)
    @event.update!(event_type: "booking.status")
    result = decide
    assert_equal :no_verified_response_event, result.reason
    refute result.external_send_allowed
    assert_nil result.template
    receipt = RequestResponsePolicy.preview(:received)
    quote = RequestResponsePolicy.preview(:quote_issued)
    assert_includes receipt.fetch(:body), "does not confirm"
    assert_includes quote.fetch(:body), "authorized reviewer issued"
    assert_equal :synthetic_preview, quote.fetch(:mode)
    refute quote.fetch(:external_send_allowed)
  end
end
