class InAppNotificationRead < ApplicationRecord
  belongs_to :in_app_notification
  validates :viewer_key, format: { with: /\A(?:staff|receipt):[1-9][0-9]*\z/ }
  validates :read_at, presence: true
  validate :verify_viewer_type

  private

  def verify_viewer_type
    return unless in_app_notification
    if in_app_notification.audience == "receipt"
      errors.add(:viewer_key, "must match the receipt") unless viewer_key == "receipt:#{in_app_notification.booking_id}"
    else
      errors.add(:viewer_key, "must be staff") unless viewer_key.to_s.start_with?("staff:")
    end
  end
end
