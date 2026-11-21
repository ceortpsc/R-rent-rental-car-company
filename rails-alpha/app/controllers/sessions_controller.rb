class SessionsController < ApplicationController
  rate_limit to: 10, within: 5.minutes, only: :create, with: -> { head :too_many_requests }

  def new
  end

  def create
    email = params[:email].to_s.strip.downcase
    password = params[:password].to_s
    staff = StaffUser.find_by(email: email, disabled: false, company_key: StaffUser::RENTAL_COMPANY_KEY) if email.bytesize <= 254 && password.bytesize <= 72
    if staff && %w[admin workflow_operator].include?(staff.role) && staff.authenticate(password)
      reset_session
      session[:staff_id] = staff.id
      session[:staff_fingerprint] = staff_fingerprint(staff)
      audit!("session.login", staff.id, actor: staff.id.to_s)
      redirect_to staff.role == "admin" ? "/ops" : "/work-queue", status: :see_other
    else
      flash.now[:alert] = "Email or password was not accepted."
      render :new, status: 422
    end
  end

  def destroy
    reset_session
    redirect_to "/login", status: :see_other
  end
end
