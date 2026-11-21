class AddInAppNotifications < ActiveRecord::Migration[8.1]
  def change
    add_column :staff_users, :company_key, :string, limit: 32, null: false, default: "r_rent"

    create_table :in_app_notifications do |t|
      t.references :workflow_event, null: false, foreign_key: true
      t.references :booking, foreign_key: true
      t.string :company_key, limit: 32, null: false
      t.string :audience, limit: 24, null: false
      t.string :event_type, limit: 64, null: false
      t.string :public_id, limit: 32, null: false
      t.timestamps
      t.index [:workflow_event_id, :audience], unique: true, name: "in_app_notification_event_audience"
      t.index :public_id, unique: true
      t.index [:company_key, :audience, :booking_id, :id], name: "in_app_notification_inbox_scope"
      t.check_constraint <<~SQL.squish, name: "notification_audience_subject"
        (audience = 'receipt' AND booking_id IS NOT NULL AND event_type IN ('booking.requested','booking.status'))
        OR (audience = 'staff' AND booking_id IS NULL AND event_type IN
        ('booking.requested','booking.status','maintenance.created','maintenance.status'))
        OR (audience = 'admin' AND booking_id IS NULL AND event_type = 'payment.exception')
      SQL
      t.check_constraint "company_key = 'r_rent'", name: "notification_company_boundary"
    end

    create_table :in_app_notification_reads do |t|
      t.references :in_app_notification, null: false, foreign_key: true
      t.string :viewer_key, limit: 64, null: false
      t.datetime :read_at, null: false
      t.index [:in_app_notification_id, :viewer_key], unique: true, name: "in_app_notification_reader_once"
      t.index [:viewer_key, :in_app_notification_id], name: "in_app_notification_reader_lookup"
    end
  end
end
