require "test_helper"

class WorkflowTest < ActiveSupport::TestCase
  test "duplicate outbox identity is stable and rejects conflicting replay" do
    a=Workflow.enqueue!(event_type:"booking.requested",subject_id:12,source_key:"demo:req")
    b=Workflow.enqueue!(event_type:"booking.requested",subject_id:12,source_key:"demo:req")
    assert_equal a.id,b.id
    assert_raises(ArgumentError) do
      Workflow.enqueue!(event_type:"booking.requested",subject_id:13,source_key:"demo:req")
    end
    assert_equal 1,Workflow.drain!
    assert_equal 0,Workflow.drain!
    assert_equal "review_booking_request",WorkflowAction.last.action_code
  end

  test "drain failure does not advance processed state or create tasks" do
    Workflow.enqueue!(event_type:"booking.requested",subject_id:12,source_key:"demo:req")
    # Simulated unsupported legacy event tests rollback, never accepted by enqueue!.
    WorkflowEvent.create!(event_type:"legacy.unknown",subject_id:2,source_key:"demo:legacy")
    assert_raises(KeyError) { Workflow.drain! }
    assert_equal 0,WorkflowAction.count
    assert_equal 2,WorkflowEvent.pending.count
  end

  test "quote calculates integer cents with the local tax check still required" do
    v = Vehicle.new(daily_rate_cents:5900)
    a = Time.utc(2026,12,1)
    short=RentalQuote.call(vehicle:v,pickup_at:a,return_at:a+1.day)
    assert_equal 6490,short.fetch(:total_cents)
    assert_equal 5000,short.fetch(:deposit_cents)
    assert short.fetch(:local_tax_review_required)
    assert_equal "0.0625",RentalQuote.call(vehicle:v,pickup_at:a,return_at:a+31.days).fetch(:tax_rate)
    assert_raises(ArgumentError) {RentalQuote.call(vehicle:v,pickup_at:a,return_at:a+181.days)}
  end

  test "payment exception rule is internal only and has no ingress" do
    Workflow.enqueue!(event_type:"payment.exception",subject_id:7,source_key:"demo:payment:7")
    assert_equal 1,Workflow.drain!
    assert_equal "review_payment_exception",WorkflowAction.last.action_code
    refute Rails.application.routes.routes.any? { |r| r.path.spec.to_s.match?(/stripe|capture|release/) }
  end
end
