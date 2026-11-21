# Synthetic vehicles exist in development and isolated staging only. Tests create their own fixtures.
if Rails.env.development? || Rails.env.staging?
Vehicle.find_or_create_by!(label: "Chevrolet Trailblazer · Demo") do |v|
  v.daily_rate_cents = 5900
  v.status = "available"
  v.is_demo = true
end
Vehicle.find_or_create_by!(label: "Ford Bronco Sport · Demo") do |v|
  v.daily_rate_cents = 8999
  v.status = "available"
  v.is_demo = true
end

end
