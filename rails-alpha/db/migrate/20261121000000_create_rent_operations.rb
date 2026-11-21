class CreateRentOperations < ActiveRecord::Migration[8.1]
  def change
    create_table :staff_users do |t|
      t.string :email, null: false, limit: 254
      t.string :password_digest, null: false
      t.string :role, null: false, limit: 32, default: "workflow_operator"
      t.boolean :disabled, null: false, default: false
      t.timestamps null: false
      t.index :email, unique: true
      t.check_constraint "role IN ('admin','workflow_operator')", name: "staff_users_role_allowed"
    end
    create_table :vehicles do |t|
      t.string :label, null: false, limit: 160
      t.integer :daily_rate_cents, null: false
      t.string :status, null: false, limit: 24, default: "available"
      t.timestamps null: false
      t.check_constraint "daily_rate_cents BETWEEN 100 AND 1000000", name: "vehicle_rate_bounds"
      t.check_constraint "status IN ('available','maintenance','retired')", name: "vehicle_status_allowed"
    end
    create_table :bookings do |t|
      t.references :vehicle, null: false, foreign_key: true
      t.string :reference, null: false, limit: 40
      t.string :renter_name, null: false, limit: 160
      t.string :renter_email, null: false, limit: 254
      t.datetime :pickup_at, null: false
      t.datetime :return_at, null: false
      t.string :pickup_location, null: false, limit: 160
      t.string :return_location, null: false, limit: 160
      t.string :status, null: false, limit: 24, default: "requested"
      t.integer :total_cents, null: false
      t.integer :deposit_cents, null: false, default: 5000
      t.timestamps null: false
      t.index :reference, unique: true
      t.index [:vehicle_id, :status, :pickup_at, :return_at], name: "booking_vehicle_window"
      t.check_constraint "return_at > pickup_at", name: "booking_return_after_pickup"
      t.check_constraint "total_cents >= 0 AND deposit_cents >= 0", name: "booking_nonnegative_cents"
      t.check_constraint "status IN ('requested','review','approved','canceled')", name: "booking_status_allowed"
    end
    create_table :maintenance_tasks do |t|
      t.references :vehicle, null: false, foreign_key: true
      t.text :description, null: false
      t.string :priority, null: false, limit: 16, default: "normal"
      t.string :status, null: false, limit: 24, default: "open"
      t.timestamps null: false
      t.check_constraint "priority IN ('low','normal','high','urgent','safety')", name: "maintenance_priority_allowed"
      t.check_constraint "status IN ('open','in_progress','resolved')", name: "maintenance_status_allowed"
    end
    create_table :workflow_events do |t|
      t.string :event_type, null: false, limit: 64
      t.bigint :subject_id, null: false
      t.string :source_key, null: false, limit: 200
      t.datetime :processed_at
      t.timestamps null: false
      t.index :source_key, unique: true
      t.index [:processed_at, :id], name: "workflow_events_pending_order"
      t.check_constraint "subject_id > 0", name: "workflow_event_positive_subject"
    end
    create_table :workflow_actions do |t|
      t.references :workflow_event, null: false, index: { unique: true }, foreign_key: true
      t.string :subject_type, null: false, limit: 30
      t.bigint :subject_id, null: false
      t.string :action_code, null: false, limit: 64
      t.datetime :completed_at
      t.timestamps null: false
      t.index [:completed_at, :id], name: "workflow_actions_open_order"
      t.check_constraint "subject_id > 0", name: "workflow_action_positive_subject"
      t.check_constraint "subject_type IN ('booking','maintenance','payment')", name: "workflow_action_subject_type_allowed"
    end
    create_table :audit_entries do |t|
      t.string :actor, null: false, limit: 120
      t.string :action, null: false, limit: 100
      t.string :target, null: false, limit: 120
      t.timestamps null: false
      t.index [:created_at, :id], name: "audit_entries_time_order"
    end
  end
end
