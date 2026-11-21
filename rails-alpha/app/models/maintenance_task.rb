class MaintenanceTask < ApplicationRecord
  PRIORITIES = %w[low normal high urgent safety].freeze
  STATUSES = %w[open in_progress resolved].freeze
  belongs_to :vehicle
  validates :description, presence: true, length: { maximum: 2_000 }
  validates :priority, inclusion: { in: PRIORITIES }
  validates :status, inclusion: { in: STATUSES }
end
