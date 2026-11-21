class OperationsController < ApplicationController
  before_action :require_admin!
  TRANSITIONS = {"requested"=>%w[review canceled], "review"=>%w[approved canceled],
    "approved"=>%w[canceled], "canceled"=>[]}.freeze

  def index
    @bookings = Booking.includes(:vehicle).order(id: :desc).limit(100)
    @vehicles = Vehicle.order(:id)
    @tasks = MaintenanceTask.includes(:vehicle).order(id: :desc).limit(100)
  end

  def booking_status
    booking = Booking.find(params[:id])
    next_status = params[:status].to_s
    Vehicle.transaction do
      # Take the write lock first so concurrent local writes do not both pass the overlap test.
      Vehicle.where(id: booking.vehicle_id).update_all("status = status")
      booking.reload
      prior = booking.status
      raise ArgumentError, "Invalid booking transition." unless TRANSITIONS.fetch(prior, []).include?(next_status)
      if next_status == "approved"
        raise ArgumentError, "Vehicle is not available for review approval." unless booking.vehicle.status == "available"
        if Booking.where(vehicle_id: booking.vehicle_id, status: "approved").where.not(id: booking.id)
          .where("pickup_at < ? AND return_at > ?", booking.return_at, booking.pickup_at).exists?
          raise ArgumentError, "This vehicle already has a conflicting approved request."
        end
      end
      booking.update!(status: next_status)
      Workflow.enqueue!(event_type: "booking.status", subject_id: booking.id, source_key: "booking:#{booking.id}:#{prior}:#{next_status}")
      audit!("booking.#{next_status}", booking.reference)
    end
    redirect_to "/ops", status: :see_other, notice: "Review state updated. No rental, charge or release was confirmed."
  rescue ArgumentError => e
    render plain: e.message, status: :conflict
  end
end
