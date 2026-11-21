require "test_helper"

class NotificationChannelReadinessTest < ActiveSupport::TestCase
  test "registry distinguishes internal synthetic and blocked outbound channels" do
    rows = NotificationChannelReadiness.catalog.index_by { |row| row.fetch(:channel) }
    assert_equal :internal_only, rows.fetch(:in_app).fetch(:mode)
    assert_equal :synthetic_only, rows.fetch(:simulation).fetch(:mode)
    %i[email sms push].each do |channel|
      assert_equal :external_disabled, rows.fetch(channel).fetch(:mode)
      assert_equal :prerequisites_unverified, rows.fetch(channel).fetch(:status)
      assert_equal 5, rows.fetch(channel).fetch(:unmet_requirements).size
    end
    assert rows.values.none? { |row| row.fetch(:external_send_allowed) }
  end

  test "each prerequisite is required and even complete evidence cannot send" do
    keys = NotificationChannelReadiness::REQUIREMENTS.keys
    evidence = keys.index_with { true }
    keys.each do |key|
      row = NotificationChannelReadiness.external(:email, evidence: evidence.merge(key => "true"))
      assert_equal :prerequisites_unverified, row.fetch(:status)
      assert_equal [NotificationChannelReadiness::REQUIREMENTS.fetch(key)], row.fetch(:unmet_requirements)
      refute row.fetch(:external_send_allowed)
    end
    row = NotificationChannelReadiness.external(:email, evidence: evidence)
    assert_equal :transport_not_implemented, row.fetch(:status)
    refute row.fetch(:external_send_allowed)
    assert_raises(ArgumentError) { NotificationChannelReadiness.external(:unknown) }
  end
end
