require "uri"

class StaffUser < ApplicationRecord
  RENTAL_COMPANY_KEY = "r_rent".freeze
  ROLES = %w[admin workflow_operator].freeze
  normalizes :email, with: ->(email) { email.strip.downcase }
  has_secure_password
  validates :email, presence: true, uniqueness: true, length: { maximum: 254 }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :company_key, format: { with: /\A[a-z][a-z0-9_]{0,31}\z/ }
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: 12 }, if: -> { password.present? }
end
