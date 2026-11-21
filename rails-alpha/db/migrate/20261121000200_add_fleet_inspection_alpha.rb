class AddFleetInspectionAlpha < ActiveRecord::Migration[8.1]
  def change
    add_column :vehicles, :is_demo, :boolean, null: false, default: false
    create_table :inspections do |t|
      t.references :booking, null: false, foreign_key: true
      t.references :staff_user, null: false, foreign_key: true
      t.string :stage, null: false, limit: 16, default: "pretrip"
      t.integer :odometer, null: false
      t.string :condition, null: false, limit: 24
      t.text :notes, null: false, default: ""
      t.timestamps null: false
      t.index [:booking_id, :stage], unique: true
      t.check_constraint "stage = 'pretrip'", name: "inspection_stage_pretrip_only"
      t.check_constraint "odometer BETWEEN 0 AND 2000000", name: "inspection_odometer_bounds"
      t.check_constraint "condition IN ('satisfactory','concerns','unsafe')", name: "inspection_condition_allowed"
    end
  end
end
