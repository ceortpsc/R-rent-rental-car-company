class AuditEntry < ApplicationRecord
  validates :actor, presence: true, length: { maximum: 120 }
  validates :action, presence: true, length: { maximum: 100 }
  validates :target, presence: true, length: { maximum: 120 }
end
