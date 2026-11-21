require "test_helper"
require "nokogiri"

class AlphaIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Rails.cache.clear
    @vehicle = Vehicle.create!(label: "Demo SUV", daily_rate_cents: 5900, status: "available", is_demo: true)
    @password = "synthetic-long-password"
  end

  def open_form(path)
    get path
    assert_response :success
    Nokogiri::HTML(response.body)
  end

  def token(doc)
    doc.at_css('meta[name="csrf-token"]')&.[]("content")
  end

  def request_token(doc)
    doc.at_css('input[name="request_token"]')&.[]("value")
  end

  def sample_booking
    a = 35.days.from_now.in_time_zone.change(hour: 12, min: 0)
    {vehicle_id: @vehicle.id,renter_name:"Synthetic Renter",renter_email:"renter@example.com",
      pickup_location:"Killeen · Central Texas",return_location:"Temple · Central Texas",
      pickup_at:a.strftime("%Y-%m-%dT%H:%M"),return_at:(a+1.day).strftime("%Y-%m-%dT%H:%M")}
  end

  def submit_inquiry(data=sample_booking)
    doc = open_form("/bookings/new")
    assert request_token(doc).present?
    post "/bookings", params: {booking:data,intent:"request",request_token:request_token(doc),authenticity_token:token(doc)}
    assert_response :see_other
    assert_equal "/receipt", URI(response.location).path
  end

  def sign_in(role)
    address = "#{role}@example.com"
    account = StaffUser.create!(email:address,role:role,password:@password)
    doc=open_form("/login")
    post "/session",params:{email:address,password:@password,authenticity_token:token(doc)}
    assert_response :see_other
    account
  end

  test "public page, programs, stylesheet, metadata and readiness" do
    assert_includes open_form("/").text, "R-RENT"
    assert_includes open_form("/programs").text, "R-Rent"
    assert_response :success
    get "/ready"
    assert_equal "ready", JSON.parse(response.body).fetch("status")
    assert_equal "no-store", response.headers["Cache-Control"]
    assert_equal "noindex, nofollow", response.headers["X-Robots-Tag"]
    get "/health"
    assert_equal "local-alpha", JSON.parse(response.body).fetch("environment")
  end

  test "quote does not persist and inquiry redirects to private session receipt" do
    doc=open_form("/bookings/new")
    assert_no_difference ["Booking.count","WorkflowEvent.count"] do
      post "/bookings",params:{booking:sample_booking,intent:"quote",request_token:request_token(doc),authenticity_token:token(doc)}
      assert_response :success
      assert_includes response.body, "Estimate only"
    end
    assert_difference ["Booking.count","WorkflowEvent.count","AuditEntry.count"] do
      submit_inquiry
    end
    follow_redirect!
    assert_includes response.body, Booking.last.reference
    refute_includes response.body, "renter@example.com"
    open_session do |stranger|
      stranger.get("/receipt")
      assert_equal 404, stranger.response.status
    end
  end

  test "invalid CSRF, locations and stale receipt submissions do not persist" do
    doc=open_form("/bookings/new")
    assert_no_difference "Booking.count" do
      post "/bookings",params:{booking:sample_booking,intent:"request",request_token:request_token(doc)}
      assert_response 422
      post "/bookings",params:{booking:sample_booking.merge(pickup_location:"Not in service area"),intent:"request",
        request_token:request_token(doc),authenticity_token:token(doc)}
      assert_response 422
      post "/bookings",params:{booking:sample_booking,intent:"request",request_token:"stale",authenticity_token:token(doc)}
      assert_response 422
    end
  end

  test "queue role works, administrative access blocked and completion idempotent" do
    submit_inquiry
    assert_equal 1, Workflow.drain!
    assert_equal 0, Workflow.drain!
    get "/work-queue"
    assert_response :see_other
    staff=sign_in("workflow_operator")
    get "/ops"
    assert_response :forbidden
    doc=open_form("/work-queue")
    refute_includes doc.text, "renter@example.com"
    refute_includes doc.text, "Synthetic Renter"
    assert_includes doc.text, "Review"
    id=WorkflowAction.last.id
    post "/work-queue/#{id}/complete"
    assert_response 422
    assert_difference "AuditEntry.where(action:'work_queue.completed').count", 1 do
      2.times do
        post "/work-queue/#{id}/complete", params:{authenticity_token:token(doc)}
        assert_response :see_other
      end
    end
    assert WorkflowAction.last.completed_at.present?
    staff.update!(disabled:true)
    get "/work-queue"
    assert_response :see_other
  end

  test "admin review prevents overlapping approval and maintenance safety blocks quote" do
    submit_inquiry
    submit_inquiry
    sign_in("admin")
    doc=open_form("/ops")
    a,b=Booking.order(:id).to_a
    [a,b].each do |record|
      post "/ops/bookings/#{record.id}/status",params:{status:"review",authenticity_token:token(doc)}
      assert_response :see_other
    end
    post "/ops/bookings/#{a.id}/status",params:{status:"approved",authenticity_token:token(doc)}
    assert_response :see_other
    post "/ops/bookings/#{b.id}/status",params:{status:"approved",authenticity_token:token(doc)}
    assert_response :conflict
    doc=open_form("/ops/maintenance/new")
    post "/ops/maintenance",params:{maintenance_task:{vehicle_id:@vehicle.id,priority:"safety",description:"Synthetic safety ticket"},
      authenticity_token:token(doc)}
    assert_response :see_other
    assert_equal "maintenance", @vehicle.reload.status
    task=MaintenanceTask.last
    post "/ops/maintenance/#{task.id}/status",params:{status:"resolved",authenticity_token:token(doc)}
    assert_response :see_other
    assert_equal "maintenance", @vehicle.reload.status
    assert_equal 7, Workflow.drain!
    assert_includes WorkflowAction.pluck(:action_code),"review_maintenance_status"
  end
end
