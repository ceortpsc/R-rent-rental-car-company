class NotificationsController < ApplicationController
  PAGE_SIZE = 40

  before_action :load_audience

  def index
    @unread_only = params[:filter] == "unread"
    scope = @visible
    if @unread_only
      scope = scope.where.not(id: InAppNotificationRead.where(viewer_key: @viewer_key).select(:in_app_notification_id))
    end
    if params[:before].present?
      before = @visible.find_by!(public_id: params[:before].to_s)
      scope = scope.where("in_app_notifications.id < ?", before.id)
    end
    rows = scope.order(id: :desc).limit(PAGE_SIZE + 1).to_a
    @notifications = rows.first(PAGE_SIZE)
    @next_cursor = @notifications.last.public_id if rows.length > PAGE_SIZE
    @read_ids = InAppNotificationRead.where(viewer_key: @viewer_key, in_app_notification_id: @notifications.map(&:id))
      .pluck(:in_app_notification_id).to_set
  end

  def read
    item = @visible.find_by!(public_id: params[:id].to_s)
    InAppNotificationRead.create_or_find_by!(in_app_notification_id: item.id, viewer_key: @viewer_key) do |row|
      row.read_at = Time.current
    end
    redirect_to @inbox_path, status: :see_other, notice: "Notice marked as read."
  end

  private

  def load_audience
    scope = InAppNotification.where(company_key: InAppNotification::COMPANY_KEY)
    @receipt_inbox = request.path_parameters[:notification_scope] == "receipt"
    if @receipt_inbox
      booking = receipt_booking!
      @visible = scope.where(audience: "receipt", booking_id: booking.id)
      @viewer_key = "receipt:#{booking.id}"
      @inbox_path = receipt_notifications_path
    else
      require_staff!
      return if performed?
      audiences = current_staff.role == "admin" ? %w[staff admin] : %w[staff]
      @visible = scope.where(audience: audiences)
      @viewer_key = "staff:#{current_staff.id}"
      @inbox_path = staff_notifications_path
    end
  end
end
