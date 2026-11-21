require "test_helper"
require "nokogiri"

class NotificationsTest < ActionDispatch::IntegrationTest
  PASSWORD = "synthetic-test-notification-password"

  setup do
    Rails.cache.clear
    @vehicle = Vehicle.create!(label: "Synthetic preview vehicle", daily_rate_cents: 5900,
      status: "available", is_demo: true)
  end

  def form(session, path)
    session.get(path)
    assert_equal 200, session.response.status, session.response.body[0, 400]
    Nokogiri::HTML(session.response.body)
  end

  def csrf(document)
    document.at_css('meta[name="csrf-token"]')&.[]("content")
  end

  def inquire(session, slug)
    parsed = form(session, "/bookings/new")
    pickup = 35.days.from_now.change(hour: 12, min: 0)
    data = {vehicle_id: @vehicle.id, renter_name: "Synthetic #{slug}", renter_email: "#{slug}@example.com",
      pickup_at: pickup.strftime("%Y-%m-%dT%H:%M"), return_at: (pickup + 1.day).strftime("%Y-%m-%dT%H:%M"),
      pickup_location: "Killeen · Central Texas", return_location: "Temple · Central Texas"}
    session.post "/bookings", params: {booking: data, intent: "request", authenticity_token: csrf(parsed),
      request_token: parsed.at_css('input[name="request_token"]')["value"]}
    assert_equal 303, session.response.status
    Booking.find_by!(renter_email: data[:renter_email])
  end

  def account(email, role: "workflow_operator", company: StaffUser::RENTAL_COMPANY_KEY)
    StaffUser.create!(email: "#{email}@example.com", role: role, company_key: company, password: PASSWORD)
  end

  def login(session, staff)
    login = form(session, "/login")
    session.post "/session", params: {email: staff.email, password: PASSWORD, authenticity_token: csrf(login)}
  end

  test "transactional workflow delivery deduplicates and rolls back notices" do
    subject = inquire(open_session, "inquiry")
    assert_equal 0, InAppNotification.count
    assert_equal 1, Workflow.drain!
    assert_equal 0, Workflow.drain!
    event = WorkflowEvent.find_by!(subject_id: subject.id)
    assert_equal %w[receipt staff], event.in_app_notifications.order(:audience).pluck(:audience)
    assert_equal [subject.id, nil], event.in_app_notifications.order(:audience).pluck(:booking_id)
    # Idempotency on process restart even if the work marker is reset.
    event.update!(processed_at: nil)
    assert_no_difference ["InAppNotification.count", "WorkflowAction.count"] do
      assert_equal 1, Workflow.drain!
    end

    inquire(open_session, "rollback")
    WorkflowEvent.create!(event_type: "legacy.unknown", subject_id: 99, source_key: "synthetic:bad")
    assert_no_difference ["InAppNotification.count", "WorkflowAction.count"] do
      assert_raises(KeyError) { Workflow.drain! }
    end
    assert_equal 2, WorkflowEvent.pending.count
  end

  test "customer inquiry inbox is exact receipt scoped and POST only" do
    one, two, stranger = open_session, open_session, open_session
    first = inquire(one, "first-customer")
    second = inquire(two, "second-customer")
    assert_includes form(one, "/receipt").text, "Open inquiry inbox"
    assert_includes form(one, "/receipt/notifications").text, "No notices on this page"
    Workflow.drain!
    own = InAppNotification.find_by!(audience: "receipt", booking_id: first.id)
    other = InAppNotification.find_by!(audience: "receipt", booking_id: second.id)
    html = form(one, "/receipt/notifications?booking_id=#{second.id}&notification_scope=staff")
    assert_includes html.text, "Rental inquiry received"
    assert_includes html.to_html, own.public_id
    refute_includes html.to_html, other.public_id
    refute_includes html.text, "first-customer@example.com"
    refute_includes html.text, first.reference
    assert_equal "no-store", one.response.headers["Cache-Control"]

    stranger.get "/receipt/notifications?booking_id=#{first.id}"
    assert_equal 404, stranger.response.status
    one.get "/receipt/notifications?before=#{other.public_id}"
    assert_equal 404, one.response.status
    one.post "/receipt/notifications/#{other.public_id}/read", params: {authenticity_token: csrf(html)}
    assert_equal 404, one.response.status
    one.get "/receipt/notifications/#{own.public_id}/read"
    assert_equal 404, one.response.status
    one.post "/receipt/notifications/#{own.public_id}/read"
    assert_equal 422, one.response.status

    assert_difference "InAppNotificationRead.count", 1 do
      2.times do
        one.post "/receipt/notifications/#{own.public_id}/read", params: {authenticity_token: csrf(html)}
        assert_equal 303, one.response.status
      end
    end
    assert_includes form(one, "/receipt/notifications?filter=unread").text, "No unread notices"
    assert_includes form(two, "/receipt/notifications?filter=unread").text, "Rental inquiry received"
  end

  test "staff access requires company and current role; read state is per staff member" do
    Workflow.enqueue!(event_type: "payment.exception", subject_id: 7, source_key: "synthetic:payment")
    Workflow.enqueue!(event_type: "maintenance.created", subject_id: 8, source_key: "synthetic:maintenance")
    assert_equal 2, Workflow.drain!
    general = InAppNotification.find_by!(audience: "staff")
    restricted = InAppNotification.find_by!(audience: "admin")

    admin, operator, stranger = open_session, open_session, open_session
    admin_account = account("alpha-admin", role: "admin")
    other_company = account("external", role: "admin", company: "other_company")
    login(stranger, other_company)
    assert_equal 422, stranger.response.status
    stranger.get "/inbox?notification_scope=receipt"
    assert_equal 303, stranger.response.status
    assert_match %r{/login\z}, stranger.response.location

    login(admin, admin_account)
    assert_equal 303, admin.response.status
    admin_html = form(admin, "/inbox")
    assert_includes admin_html.text, "Payment exception to review"
    assert_includes admin_html.text, "Maintenance task opened"
    login(operator, account("alpha-operator"))
    assert_equal 303, operator.response.status
    operator_html = form(operator, "/inbox")
    refute_includes operator_html.text, "Payment exception to review"
    refute_includes operator_html.to_html, restricted.public_id

    operator.post "/inbox/#{restricted.public_id}/read", params: {authenticity_token: csrf(operator_html)}
    assert_equal 404, operator.response.status
    assert_difference "InAppNotificationRead.count", 1 do
      admin.post "/inbox/#{general.public_id}/read", params: {authenticity_token: csrf(admin_html)}
      assert_equal 303, admin.response.status
    end
    refute_includes form(admin, "/inbox?filter=unread").text, "Maintenance task opened"
    assert_includes form(operator, "/inbox?filter=unread").text, "Maintenance task opened"
    admin_account.update!(role: "workflow_operator")
    refute_includes form(admin, "/inbox").text, "Payment exception to review"
    admin_account.update!(company_key: "other_company")
    admin.get "/inbox"
    assert_equal 303, admin.response.status
  end

  test "staff can page older notifications without an exposed sequential cursor" do
    operator = open_session
    login(operator, account("pager"))
    (NotificationsController::PAGE_SIZE + 1).times do |n|
      Workflow.enqueue!(event_type: "maintenance.status", subject_id: n + 1, source_key: "synthetic:page:#{n}")
    end
    Workflow.drain!
    page = form(operator, "/inbox")
    assert_equal NotificationsController::PAGE_SIZE, page.css(".notification-item").length
    older = page.css("a").find { |link| link.text == "Older notices" }
    assert_match(/before=[a-f0-9]{32}/, older["href"])
    assert_equal 1, form(operator, older["href"]).css(".notification-item").length
  end

  test "booking review event yields a private update without commitment copy" do
    customer, admin = open_session, open_session
    subject = inquire(customer, "reviewed")
    Workflow.drain!
    login(admin, account("review-admin", role: "admin"))
    html = form(admin, "/ops")
    admin.post "/ops/bookings/#{subject.id}/status", params: {status: "review", authenticity_token: csrf(html)}
    assert_equal 303, admin.response.status
    assert_equal 1, Workflow.drain!
    copy = form(customer, "/receipt/notifications").text
    assert_includes copy, "Rental inquiry status updated"
    assert_includes copy, "not vehicle release approval"
  end
end
