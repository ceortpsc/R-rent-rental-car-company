require_relative "../staging/review_gate"

host = ENV["RENDER_EXTERNAL_HOSTNAME"].to_s
review_digest = ENV["RR_REVIEW_SHA256"].to_s
signing_key = ENV["SECRET_KEY_BASE"].to_s
review_username = ENV["RR_PREVIEW_STAFF_USERNAME"].to_s
unless review_username.empty? || review_username.match?(/\A[a-z][a-z0-9_]{2,39}\z/)
  abort "Invalid synthetic preview staff username."
end
unless ENV["RR_SYNTHETIC_STAGING"] == "1" &&
       host.match?(/\A[a-z0-9][a-z0-9-]*\.onrender\.com\z/) &&
       review_digest.match?(/\A[0-9a-f]{64}\z/) &&
       signing_key.match?(/\A[0-9a-f]{128}\z/)
  abort "Remote staging is gated: synthetic opt-in, exact Render hostname, review digest and signing key are required."
end

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.active_record.dump_schema_after_migration = false
  config.consider_all_requests_local = false
  config.hosts = [host]
  config.assume_ssl = true
  config.force_ssl = true
  config.log_level = :warn
  config.log_tags = []
  config.x.preview_staff_username = review_username.presence
  config.middleware.insert_before 0, ReviewGate, review_digest
end
