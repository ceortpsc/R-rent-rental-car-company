require "csv"

class ReportsController < ApplicationController
  before_action :require_admin!
  MAX_ROWS = 1_000

  def index
  end

  def bookings
    records = Booking.includes(:vehicle).order(id: :desc).limit(MAX_ROWS + 1).to_a
    if records.length > MAX_ROWS
      render plain: "Register exceeds the alpha export limit of 1,000 rows; no partial export was issued.", status: 422
      return
    end

    # Data minimization: names, email addresses and pickup/return locations are omitted.
    data = CSV.generate(force_quotes: true) do |csv|
      csv << %w[booking_reference vehicle status pickup_utc return_utc total_cents deposit_cents]
      records.each do |row|
        csv << [row.reference, row.vehicle.label, row.status, row.pickup_at.utc.iso8601, row.return_at.utc.iso8601,
          row.total_cents, row.deposit_cents].map { |value| safe_cell(value) }
      end
    end
    audit!("report.booking_register_exported", "count:#{records.length}")
    response.headers["X-Content-Type-Options"] = "nosniff"
    send_data data, filename: "rrent-booking-register.csv", type: "text/csv; charset=utf-8", disposition: "attachment"
    response.headers["Cache-Control"] = "private, no-store"
  end

  private

  def safe_cell(value)
    return value unless value.is_a?(String)
    # Quote delimiters with CSV; neutralize commands even after invisible characters.
    value.match?(/\A(?:[[:space:]\p{Cf}]*[=+\-@]|[\t\r\n])/) ? "'#{value}" : value
  end
end
