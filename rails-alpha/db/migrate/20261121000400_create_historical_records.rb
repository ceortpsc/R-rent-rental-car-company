class CreateHistoricalRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :historical_records do |t|
      t.string :source_system, limit: 64, null: false
      t.string :record_type, limit: 24, null: false
      t.string :source_id, limit: 120, null: false
      t.string :source_status, limit: 64, null: false
      t.string :parent_source_id, limit: 120
      t.bigint :base_revision
      t.datetime :source_created_at
      t.bigint :quoted_total_cents
      t.string :currency, limit: 3
      t.string :payload_digest, limit: 64, null: false
      t.timestamps
      t.index [:source_system, :record_type, :source_id], unique: true, name: "historical_records_source_identity"
      t.index [:record_type, :source_created_at], name: "historical_records_type_date"
      t.check_constraint "record_type IN ('submission','quote','rental_request')", name: "historical_record_type_allowed"
      t.check_constraint "base_revision IS NULL OR base_revision >= 0", name: "historical_record_nonnegative_revision"
      t.check_constraint "record_type <> 'quote' OR parent_source_id IS NOT NULL", name: "historical_quote_parent_identity"
      t.check_constraint <<~SQL.squish, name: "historical_record_money_pair"
        (quoted_total_cents IS NULL AND currency IS NULL) OR
        (quoted_total_cents IS NOT NULL AND quoted_total_cents >= 0 AND currency IS NOT NULL AND length(currency) = 3)
      SQL
    end
  end
end
