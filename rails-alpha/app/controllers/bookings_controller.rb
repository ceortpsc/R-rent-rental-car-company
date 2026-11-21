class BookingsController < ApplicationController
  rate_limit to: 30, within: 10.minutes, only: :create, with: -> { head :too_many_requests }
  LOCATIONS = ["Killeen · Central Texas", "Temple · Central Texas", "Copperas Cove · Central Texas"].freeze

  def new
    @booking = Booking.new
    @booking.vehicle_id = params[:vehicle_id] if params[:vehicle_id]
    prepare_form
  end

  def create
    attrs = params.expect(booking: [:vehicle_id, :renter_name, :renter_email, :pickup_at, :return_at,
      :pickup_location, :return_location])
    @booking = Booking.new(attrs.except(:pickup_at, :return_at))
    @pickup_input, @return_input = attrs.values_at(:pickup_at, :return_at)
    prepare_form
    unless %w[quote request].include?(params[:intent])
      raise ArgumentError, "Select Calculate estimate or Submit inquiry."
    end
    unless LOCATIONS.include?(attrs[:pickup_location]) && LOCATIONS.include?(attrs[:return_location])
      raise ArgumentError, "Select supported Central Texas pickup and return locations."
    end
    @booking.pickup_at = parse_local_time(@pickup_input)
    @booking.return_at = parse_local_time(@return_input)
    raise ArgumentError, "Choose a future pickup time." unless @booking.pickup_at.future?
    vehicle = Vehicle.find_by(id: @booking.vehicle_id, status: "available", is_demo: true)
    raise ArgumentError, "Select a preview vehicle currently listed." unless vehicle
    @quote = RentalQuote.call(vehicle: vehicle, pickup_at: @booking.pickup_at, return_at: @booking.return_at)
    return render(:new) if params[:intent] == "quote"

    unless @booking.renter_email.to_s.match?(/\A[^@\s]+@example\.(?:com|org|net)\z/i)
      raise ArgumentError, "Use a synthetic email at example.com, example.org or example.net in this alpha."
    end
    token = params[:request_token].to_s
    unless token.bytesize == @request_token.bytesize && ActiveSupport::SecurityUtils.secure_compare(token, @request_token)
      raise ArgumentError, "This form has expired. Review the details and submit again."
    end
    @booking.reference = "RR-" + OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base, token)[0, 24].upcase
    existing = Booking.find_by(reference: @booking.reference)
    return receipt_for(existing) if existing
    @booking.status = "requested"
    @booking.total_cents = @quote.fetch(:total_cents)
    @booking.deposit_cents = @quote.fetch(:deposit_cents)
    Booking.transaction do
      Vehicle.where(id: vehicle.id).update_all("status = status")
      raise ArgumentError, "Vehicle is no longer available." unless vehicle.reload.status == "available"
      if Booking.where(vehicle_id: vehicle.id, status: "approved")
        .where("pickup_at < ? AND return_at > ?", @booking.return_at, @booking.pickup_at).exists?
        raise ArgumentError, "These dates conflict with an approved request."
      end
      @booking.save!
      Workflow.enqueue!(event_type: "booking.requested", subject_id: @booking.id, source_key: "booking:#{@booking.id}:requested")
      audit!("booking.requested", @booking.reference)
    end
    receipt_for(@booking)
  rescue ActiveRecord::RecordNotUnique
    existing = Booking.find_by(reference: @booking.reference)
    raise unless existing
    receipt_for(existing)
  rescue ArgumentError, ActiveRecord::RecordInvalid => e
    @errors = e.is_a?(ActiveRecord::RecordInvalid) ? e.record.errors.full_messages : [e.message]
    render :new, status: 422
  end

  def show
    @booking = receipt_booking!
  end

  private

  def prepare_form
    @vehicles = Vehicle.where(status: "available", is_demo: true).order(:id)
    @locations = LOCATIONS
    @request_token = session[:request_token] ||= SecureRandom.hex(24)
  end

  def receipt_for(booking)
    session[:receipt_reference] = booking.reference
    session.delete(:request_token)
    redirect_to "/receipt", status: :see_other
  end

  def parse_local_time(value)
    str = value.to_s
    raise ArgumentError, "Enter Central Time dates and times." unless str.match?(/\A\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?\z/)
    date = DateTime.iso8601(str)
    utc = Time.utc(date.year, date.month, date.day, date.hour, date.min, date.sec)
    periods = Time.zone.tzinfo.periods_for_local(utc)
    raise ArgumentError, "Choose an unambiguous Central Time outside the daylight-saving change." unless periods.one?
    (utc - periods.first.observed_utc_offset).utc
  end
end
