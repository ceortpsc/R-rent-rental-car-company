class Inspection < ApplicationRecord
  CONDITIONS = %w[satisfactory concerns unsafe].freeze
  belongs_to :booking
  belongs_to :staff_user
  validates :stage, inclusion: { in: ["pretrip"] }
  validates :odometer, numericality: { only_integer: true, in: 0..2_000_000 }
  validates :condition, inclusion: { in: CONDITIONS }
  validates :notes, length: { maximum: 1_000 }
  validates :notes, presence: true, unless: -> { condition == "satisfactory" }
end
