class Vehicle < ApplicationRecord
  STATUSES = %w[available maintenance retired].freeze
  has_many :bookings, dependent: :restrict_with_error
  has_many :maintenance_tasks, dependent: :restrict_with_error
  validates :label, presence: true, length: { maximum: 160 }
  validates :daily_rate_cents, numericality: { only_integer: true, in: 100..1_000_000 }
  validates :status, inclusion: { in: STATUSES }
end
