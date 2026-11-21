require "digest"
require "rack/auth/basic"

# An outer gate for the synthetic environment, including static files and staff sign-in.
class ReviewGate
  def initialize(app, digest)
    @app = app
    @auth = Rack::Auth::Basic.new(app, "R-Rent Synthetic Review") do |username, password|
      user_ok = ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(username.to_s),
        Digest::SHA256.hexdigest("rrent-review"))
      password_ok = ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(password.to_s), digest)
      user_ok & password_ok
    end
  end

  def call(env)
    return @app.call(env) if %w[GET HEAD].include?(env["REQUEST_METHOD"]) && env["PATH_INFO"] == "/health"
    status, headers, body = @auth.call(env)
    [status, headers.merge("cache-control" => "no-store", "x-robots-tag" => "noindex, nofollow"), body]
  end
end
