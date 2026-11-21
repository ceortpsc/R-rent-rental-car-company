class WorkflowEvent < ApplicationRecord
  has_many :in_app_notifications, dependent: :restrict_with_error
  has_one :workflow_action, dependent: :restrict_with_error
  validates :event_type, presence: true, length: { maximum: 64 }
  validates :source_key, presence: true, length: { maximum: 200 }
  validates :subject_id, numericality: { only_integer: true, greater_than: 0 }
  scope :pending, -> { where(processed_at: nil) }
end
