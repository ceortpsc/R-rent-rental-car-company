require "uri"

require "securerandom"

class Booking < ApplicationRecord
  STATUSES = %w[requested review approved canceled].freeze
  belongs_to :vehicle
  before_validation :assign_reference, on: :create
  normalizes :renter_email, with: ->(email) { email.strip.downcase }
  validates :reference, presence: true, uniqueness: true, length: { maximum: 40 }
  validates :renter_name, presence: true, length: { maximum: 160 }
  validates :renter_email, presence: true, length: { maximum: 254 }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :pickup_at, :return_at, presence: true
  validates :pickup_location, :return_location, presence: true, length: { maximum: 160 }
  validates :status, inclusion: { in: STATUSES }
  validates :total_cents, :deposit_cents, numericality: { only_integer: true, in: 0..250_000_000 }
  validate :verify_chronology

  private

  def assign_reference
    self.reference ||= "RR-#{SecureRandom.hex(10).upcase}"
  end

  def verify_chronology
    if pickup_at && return_at && return_at <= pickup_at
      errors.add(:return_at, "must follow pickup")
    end
  end
end
