class HistoricalRecord < ApplicationRecord
  TYPES = %w[submission quote rental_request].freeze
  attr_readonly :source_system, :record_type, :source_id, :source_status, :source_created_at, :parent_source_id, :base_revision,
    :quoted_total_cents, :currency, :payload_digest
  validates :source_system, format: { with: /\A[a-z][a-z0-9_-]{0,63}\z/ }
  validates :record_type, inclusion: { in: TYPES }
  validates :source_id, length: { in: 1..120 }
  validates :source_status, length: { in: 1..64 }
  validates :payload_digest, format: { with: /\A[0-9a-f]{64}\z/ }
end
