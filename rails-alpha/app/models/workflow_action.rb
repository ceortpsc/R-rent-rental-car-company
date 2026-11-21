class WorkflowAction < ApplicationRecord
  belongs_to :workflow_event
  validates :subject_type, inclusion: { in: %w[booking maintenance payment] }
  validates :subject_id, numericality: { only_integer: true, greater_than: 0 }
  validates :action_code, presence: true, length: { maximum: 64 }
  scope :open, -> { where(completed_at: nil) }
end
