class SessionsController < ApplicationController
  rate_limit to: 10, within: 5.minutes, only: :create, with: -> { head :too_many_requests }

  helper_method :preview_username_signin?

  def new
  end

  def create
    identifier = params.fetch(:email, "").to_s.strip.downcase
    return reject_signin if identifier.bytesize > 254
    if preview_username_signin?
      return reject_signin unless identifier == Rails.configuration.x.preview_staff_username
      identifier = StaffUser::SYNTHETIC_PREVIEW_ADMIN_EMAIL
    end
    password = params[:password].to_s
    staff = StaffUser.find_by(email: identifier, disabled: false, company_key: StaffUser::RENTAL_COMPANY_KEY) if password.bytesize <= 72
    if staff && %w[admin workflow_operator].include?(staff.role) && staff.authenticate(password)
      reset_session
      session[:staff_id] = staff.id
      session[:staff_fingerprint] = staff_fingerprint(staff)
      audit!("session.login", staff.id, actor: staff.id.to_s)
      redirect_to staff.role == "admin" ? "/ops" : "/work-queue", status: :see_other
    else
      reject_signin
    end
  end

  def destroy
    reset_session
    redirect_to "/login", status: :see_other
  end
  private

  def preview_username_signin?
    Rails.env.staging? && Rails.configuration.x.preview_staff_username.present?
  end

  def reject_signin
    flash.now[:alert] = "Sign-in details were not accepted."
    render :new, status: :unprocessable_content
  end
end
