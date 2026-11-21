class AddRequestResponseIntents < ActiveRecord::Migration[8.1]
  def change
    create_table :request_response_intents do |t|
      t.belongs_to :workflow_event, null: false, foreign_key: true
      t.string :channel, limit: 12, null: false
      t.string :template, limit: 24, null: false
      t.string :template_version, limit: 48, null: false
      t.string :idempotency_key, limit: 120, null: false
      t.timestamps
    end
    add_index :request_response_intents, :idempotency_key, unique: true
    add_index :request_response_intents, %i[workflow_event_id channel], unique: true,
      name: "unique_response_intent_per_event_channel"
  end
end
