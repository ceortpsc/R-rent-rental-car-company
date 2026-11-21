require_relative "boot"
require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module RrentRails
  class Application < Rails::Application
    config.load_defaults 8.1
    config.time_zone = "Central Time (US & Canada)"
    config.active_record.default_timezone = :utc
    config.public_file_server.enabled = true
    config.cache_store = :memory_store
    config.session_store :cookie_store, key: "_rrent_rails_alpha", same_site: :lax,
      secure: Rails.env.staging?, httponly: true, expire_after: 14_400
    config.filter_parameters += %i[password renter_name renter_email request_token]
    config.action_controller.allow_forgery_protection = true
    config.action_controller.forgery_protection_origin_check = true
    config.autoload_lib(ignore: %w[assets tasks]) if File.directory?(File.expand_path("../lib", __dir__))
  end
end
