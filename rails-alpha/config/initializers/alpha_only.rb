unless Rails.env.development? || Rails.env.test? || Rails.env.staging?
  raise "Unsupported environment for R-Rent Rails alpha"
end
if %w[RR_ENABLE_LIVE_PAYMENTS RR_ENABLE_RELEASE RR_ENABLE_EXTERNAL_DISPATCH RR_ENABLE_EMAIL RR_ENABLE_SMS RR_ENABLE_PUSH].any? { |k| ENV[k].to_s.downcase == "true" }
  raise "Money movement, vehicle release and external dispatch are disabled for the Rails alpha"
end
if ENV["DATABASE_URL"].present?
  raise "The Rails alpha only uses isolated local SQLite databases"
end
