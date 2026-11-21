class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
  helper_method :current_staff
  before_action :protect_private_cache

  rescue_from ActionController::InvalidAuthenticityToken do
    render plain: "Invalid or stale form token. Reload the page and try again.", status: 422
  end
  rescue_from ActiveRecord::RecordNotFound do
    render plain: "Not found", status: 404
  end

  private

  def current_staff
    return @current_staff if defined?(@current_staff)
    return @current_staff = nil unless session[:staff_id]
    staff = StaffUser.find_by(id: session[:staff_id], disabled: false, company_key: StaffUser::RENTAL_COMPANY_KEY)
    fingerprint = session[:staff_fingerprint].to_s
    @current_staff = if staff && fingerprint.bytesize == 64 &&
      ActiveSupport::SecurityUtils.secure_compare(fingerprint, staff_fingerprint(staff))
        staff
      end
  end

  def receipt_booking!
    reference = session[:receipt_reference]
    raise ActiveRecord::RecordNotFound unless reference.is_a?(String) && reference.present?
    Booking.find_by!(reference: reference)
  end

  def staff_fingerprint(staff)
    OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base,
      "staff-session:#{staff.id}:#{staff.password_digest}")
  end

  def require_staff!
    return if current_staff && %w[admin workflow_operator].include?(current_staff.role)
    redirect_to "/login", status: :see_other
  end

  def require_admin!
    return require_staff! unless current_staff
    head :forbidden unless current_staff.role == "admin"
  end

  def protect_private_cache
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] =
      "default-src 'none'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"
  end

  def audit!(action, target, actor: current_staff&.id&.to_s || "public")
    AuditEntry.create!(actor: actor, action: action, target: target.to_s)
  end
end
