class InAppNotification < ApplicationRecord
  COMPANY_KEY = StaffUser::RENTAL_COMPANY_KEY

  COPY = {
    ["staff", "booking.requested"] => ["New rental inquiry", "Review the new request in the work queue."],
    ["staff", "booking.status"] => ["Rental review updated", "A rental inquiry changed review state. Check the work queue."],
    ["staff", "maintenance.created"] => ["Maintenance task opened", "Triage the new maintenance task in the work queue."],
    ["staff", "maintenance.status"] => ["Maintenance review updated", "A maintenance task changed state. Check the work queue."],
    ["admin", "payment.exception"] => ["Payment exception to review", "Review the task internally. No charge, settlement or refund was recorded by this notice."],
    ["receipt", "booking.requested"] => ["Rental inquiry received", "Your inquiry is awaiting review. This is not a reservation or payment confirmation."],
    ["receipt", "booking.status"] => ["Rental inquiry status updated", "Open your request receipt to view its current review status. This is not vehicle release approval."]
  }.freeze

  belongs_to :workflow_event
  belongs_to :booking, optional: true
  has_many :in_app_notification_reads, dependent: :delete_all
  validates :company_key, inclusion: { in: [COMPANY_KEY] }
  validates :public_id, format: { with: /\A[0-9a-f]{32}\z/ }
  validates :audience, inclusion: { in: %w[staff admin receipt] }
  validate :verify_policy

  def self.deliver_from!(event)
    staff_audience = event.event_type == "payment.exception" ? "admin" : "staff"
    record_delivery!(event, staff_audience)
    if event.event_type.in?(%w[booking.requested booking.status]) && Booking.exists?(event.subject_id)
      record_delivery!(event, "receipt", event.subject_id)
    end
  end

  def self.record_delivery!(event, audience, booking_id = nil)
    row = create_or_find_by!(workflow_event_id: event.id, audience: audience) do |delivery|
      delivery.assign_attributes(company_key: COMPANY_KEY, event_type: event.event_type,
        booking_id: booking_id, public_id: SecureRandom.hex(16))
    end
    unless [row.company_key, row.event_type, row.booking_id] == [COMPANY_KEY, event.event_type, booking_id]
      raise ArgumentError, "Stored notification conflicts with its source event"
    end
    row
  end
  private_class_method :record_delivery!

  def message
    COPY.fetch([audience, event_type])
  end

  private

  def verify_policy
    errors.add(:audience, "does not match the event") unless COPY.key?([audience, event_type])
    if audience == "receipt"
      errors.add(:booking, "must match source inquiry") unless booking_id && booking_id == workflow_event&.subject_id
    else
      errors.add(:booking, "must not be set for staff notices") if booking_id
    end
    errors.add(:event_type, "must match source event") unless event_type == workflow_event&.event_type
  end
end
