class FleetController < ApplicationController
  before_action :require_admin!

  def index
    @vehicle ||= Vehicle.new
    @vehicles = Vehicle.order(id: :desc).limit(100)
  end

  def create
    attrs = params.expect(vehicle: [:label, :daily_rate_cents])
    @vehicle = Vehicle.new(attrs.merge(is_demo: true, status: "maintenance"))
    Vehicle.transaction do
      @vehicle.save!
      audit!("fleet.synthetic_created", @vehicle.id)
    end
    redirect_to "/ops/fleet", status: :see_other, notice: "Synthetic vehicle added on maintenance hold."
  rescue ActiveRecord::RecordInvalid => e
    @errors = e.record.errors.full_messages
    index
    render :index, status: 422
  end

  def status
    desired = params[:status]
    return head :bad_request unless Vehicle::STATUSES.include?(desired)
    vehicle = Vehicle.find(params[:id])
    Vehicle.transaction do
      # Write before evaluating safety state; serializes fleet transitions in SQLite.
      Vehicle.where(id: vehicle.id).update_all("status = status")
      vehicle.reload
      if desired == "available" && MaintenanceTask.where(vehicle_id: vehicle.id, priority: "safety").where.not(status: "resolved").exists?
        raise ArgumentError, "Unresolved safety work blocks availability."
      end
      if desired != vehicle.status
        vehicle.update!(status: desired)
        audit!("fleet.#{desired}", vehicle.id)
      end
    end
    redirect_to "/ops/fleet", status: :see_other, notice: "Fleet status saved. No vehicle release was authorized."
  rescue ArgumentError => e
    render plain: e.message, status: :conflict
  end
end
