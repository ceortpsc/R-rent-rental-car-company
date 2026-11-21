# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_21_000300) do
  create_table "audit_entries", force: :cascade do |t|
    t.string "actor", limit: 120, null: false
    t.string "action", limit: 100, null: false
    t.string "target", limit: 120, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at", "id"], name: "audit_entries_time_order"
  end

  create_table "bookings", force: :cascade do |t|
    t.integer "vehicle_id", null: false
    t.string "reference", limit: 40, null: false
    t.string "renter_name", limit: 160, null: false
    t.string "renter_email", limit: 254, null: false
    t.datetime "pickup_at", null: false
    t.datetime "return_at", null: false
    t.string "pickup_location", limit: 160, null: false
    t.string "return_location", limit: 160, null: false
    t.string "status", limit: 24, default: "requested", null: false
    t.integer "total_cents", null: false
    t.integer "deposit_cents", default: 5000, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["reference"], name: "index_bookings_on_reference", unique: true
    t.index ["vehicle_id", "status", "pickup_at", "return_at"], name: "booking_vehicle_window"
    t.index ["vehicle_id"], name: "index_bookings_on_vehicle_id"
    t.check_constraint "return_at > pickup_at", name: "booking_return_after_pickup"
    t.check_constraint "status IN ('requested','review','approved','canceled')", name: "booking_status_allowed"
    t.check_constraint "total_cents >= 0 AND deposit_cents >= 0", name: "booking_nonnegative_cents"
  end

  create_table "in_app_notification_reads", force: :cascade do |t|
    t.integer "in_app_notification_id", null: false
    t.string "viewer_key", limit: 64, null: false
    t.datetime "read_at", null: false
    t.index ["in_app_notification_id", "viewer_key"], name: "in_app_notification_reader_once", unique: true
    t.index ["in_app_notification_id"], name: "index_in_app_notification_reads_on_in_app_notification_id"
    t.index ["viewer_key", "in_app_notification_id"], name: "in_app_notification_reader_lookup"
  end

  create_table "in_app_notifications", force: :cascade do |t|
    t.integer "workflow_event_id", null: false
    t.integer "booking_id"
    t.string "company_key", limit: 32, null: false
    t.string "audience", limit: 24, null: false
    t.string "event_type", limit: 64, null: false
    t.string "public_id", limit: 32, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_in_app_notifications_on_booking_id"
    t.index ["company_key", "audience", "booking_id", "id"], name: "in_app_notification_inbox_scope"
    t.index ["public_id"], name: "index_in_app_notifications_on_public_id", unique: true
    t.index ["workflow_event_id", "audience"], name: "in_app_notification_event_audience", unique: true
    t.index ["workflow_event_id"], name: "index_in_app_notifications_on_workflow_event_id"
    t.check_constraint "(audience = 'receipt' AND booking_id IS NOT NULL AND event_type IN ('booking.requested','booking.status')) OR (audience = 'staff' AND booking_id IS NULL AND event_type IN ('booking.requested','booking.status','maintenance.created','maintenance.status')) OR (audience = 'admin' AND booking_id IS NULL AND event_type = 'payment.exception')", name: "notification_audience_subject"
    t.check_constraint "company_key = 'r_rent'", name: "notification_company_boundary"
  end

  create_table "inspections", force: :cascade do |t|
    t.integer "booking_id", null: false
    t.integer "staff_user_id", null: false
    t.string "stage", limit: 16, default: "pretrip", null: false
    t.integer "odometer", null: false
    t.string "condition", limit: 24, null: false
    t.text "notes", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id", "stage"], name: "index_inspections_on_booking_id_and_stage", unique: true
    t.index ["booking_id"], name: "index_inspections_on_booking_id"
    t.index ["staff_user_id"], name: "index_inspections_on_staff_user_id"
    t.check_constraint "condition IN ('satisfactory','concerns','unsafe')", name: "inspection_condition_allowed"
    t.check_constraint "odometer BETWEEN 0 AND 2000000", name: "inspection_odometer_bounds"
    t.check_constraint "stage = 'pretrip'", name: "inspection_stage_pretrip_only"
  end

  create_table "maintenance_tasks", force: :cascade do |t|
    t.integer "vehicle_id", null: false
    t.text "description", null: false
    t.string "priority", limit: 16, default: "normal", null: false
    t.string "status", limit: 24, default: "open", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["vehicle_id"], name: "index_maintenance_tasks_on_vehicle_id"
    t.check_constraint "priority IN ('low','normal','high','urgent','safety')", name: "maintenance_priority_allowed"
    t.check_constraint "status IN ('open','in_progress','resolved')", name: "maintenance_status_allowed"
  end

  create_table "staff_users", force: :cascade do |t|
    t.string "email", limit: 254, null: false
    t.string "password_digest", null: false
    t.string "role", limit: 32, default: "workflow_operator", null: false
    t.boolean "disabled", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "company_key", limit: 32, default: "r_rent", null: false
    t.index ["email"], name: "index_staff_users_on_email", unique: true
    t.check_constraint "role IN ('admin','workflow_operator')", name: "staff_users_role_allowed"
  end

  create_table "vehicles", force: :cascade do |t|
    t.string "label", limit: 160, null: false
    t.integer "daily_rate_cents", null: false
    t.string "status", limit: 24, default: "available", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "is_demo", default: false, null: false
    t.check_constraint "daily_rate_cents BETWEEN 100 AND 1000000", name: "vehicle_rate_bounds"
    t.check_constraint "status IN ('available','maintenance','retired')", name: "vehicle_status_allowed"
  end

  create_table "workflow_actions", force: :cascade do |t|
    t.integer "workflow_event_id", null: false
    t.string "subject_type", limit: 30, null: false
    t.bigint "subject_id", null: false
    t.string "action_code", limit: 64, null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["completed_at", "id"], name: "workflow_actions_open_order"
    t.index ["workflow_event_id"], name: "index_workflow_actions_on_workflow_event_id", unique: true
    t.check_constraint "subject_id > 0", name: "workflow_action_positive_subject"
    t.check_constraint "subject_type IN ('booking','maintenance','payment')", name: "workflow_action_subject_type_allowed"
  end

  create_table "workflow_events", force: :cascade do |t|
    t.string "event_type", limit: 64, null: false
    t.bigint "subject_id", null: false
    t.string "source_key", limit: 200, null: false
    t.datetime "processed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["processed_at", "id"], name: "workflow_events_pending_order"
    t.index ["source_key"], name: "index_workflow_events_on_source_key", unique: true
    t.check_constraint "subject_id > 0", name: "workflow_event_positive_subject"
  end

  add_foreign_key "bookings", "vehicles"
  add_foreign_key "in_app_notification_reads", "in_app_notifications"
  add_foreign_key "in_app_notifications", "bookings"
  add_foreign_key "in_app_notifications", "workflow_events"
  add_foreign_key "inspections", "bookings"
  add_foreign_key "inspections", "staff_users"
  add_foreign_key "maintenance_tasks", "vehicles"
  add_foreign_key "workflow_actions", "workflow_events"
end
