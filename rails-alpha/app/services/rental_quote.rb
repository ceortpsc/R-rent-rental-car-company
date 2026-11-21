class RentalQuote
  DEPOSIT_CENTS = 5_000
  SECONDS_PER_DAY = 86_400

  # Non-binding estimate; local taxes are deliberately unresolved.
  # https://comptroller.texas.gov/taxes/publications/96-143/collection.php
  def self.call(vehicle:, pickup_at:, return_at:)
    unless pickup_at.respond_to?(:to_time) && return_at.respond_to?(:to_time) &&
           !pickup_at.is_a?(String) && !return_at.is_a?(String) &&
           return_at.to_time > pickup_at.to_time
      raise ArgumentError, "Provide parsed timestamps with return after pickup"
    end
    days = ((return_at.to_time.to_r - pickup_at.to_time.to_r) / SECONDS_PER_DAY).ceil
    raise ArgumentError, "Rental duration above 180 days requires manual review" if days > 180
    daily = vehicle.daily_rate_cents
    raise ArgumentError, "Invalid vehicle daily rate" unless daily.is_a?(Integer) && (100..1_000_000).cover?(daily)

    rate = days <= 30 ? Rational(1, 10) : Rational(1, 16)
    subtotal = days * daily
    tax = (subtotal * rate).round
    {
      days: days, daily_rate_cents: daily, subtotal_cents: subtotal,
      state_rental_tax_cents: tax, local_tax_cents: 0, total_cents: subtotal + tax,
      deposit_cents: DEPOSIT_CENTS, tax_rate: days <= 30 ? "0.10" : "0.0625",
      local_tax_review_required: true
    }
  end
end
