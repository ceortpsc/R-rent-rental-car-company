class InspectionsController < ApplicationController
  before_action :require_admin!
  before_action :load_booking

  def show
    @inspection = Inspection.find_by(booking_id: @booking.id, stage: "pretrip")
    if !@inspection && !%w[review approved].include?(@booking.status)
      render plain: "Pre-trip attestation requires a booking in review or approved.", status: :conflict
      return
    end
    @inspection ||= Inspection.new
  end

  def create
    attrs = params.expect(inspection: [:odometer, :condition, :notes])
    Inspection.transaction do
      Vehicle.where(id: @booking.vehicle_id).update_all("status = status")
      @booking.reload
      unless %w[review approved].include?(@booking.status)
        raise ArgumentError, "Pre-trip attestation requires a booking in review or approved."
      end
      if Inspection.exists?(booking_id: @booking.id, stage: "pretrip")
        raise ArgumentError, "A pre-trip attestation already exists."
      end
      @inspection = Inspection.new(attrs.merge(booking: @booking, staff_user: current_staff, stage: "pretrip"))
      @inspection.save!
      audit!("inspection.pretrip_attested", @booking.reference)
    end
    redirect_to "/ops/bookings/#{@booking.id}/inspection", status: :see_other,
      notice: "Pre-trip attestation saved. It does not authorize vehicle release."
  rescue ActiveRecord::RecordInvalid => e
    @errors = e.record.errors.full_messages
    render :show, status: 422
  rescue ActiveRecord::RecordNotUnique
    render plain: "A pre-trip attestation already exists.", status: :conflict
  rescue ArgumentError => e
    render plain: e.message, status: :conflict
  end

  private

  def load_booking
    @booking = Booking.find(params[:id])
  end
end
