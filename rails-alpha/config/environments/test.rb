Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.hosts = []
  # Test actions use real forgery checks; integration helpers obtain a token.
end
