require "test_helper"
require "nokogiri"

class SiteMapTest < ActionDispatch::IntegrationTest
  setup { Rails.cache.clear }

  test "public map exposes safe links and never protected route metadata" do
    get "/site-map"
    assert_response :success
    assert_includes response.headers["Cache-Control"], "no-store"
    assert_select "a[href='/bookings/new']", minimum: 1
    assert_select "a[href='/programs']", minimum: 1
    %w[/receipt /inbox /work-queue /ops /ops/reports/bookings.csv].each do |path|
      assert_select "a[href='#{path}']", count: 0
      assert_select "code", text: path, count: 0
    end
    assert_select "form[action='/bookings']", count: 0
    assert_select "code", text: "/bookings", count: 1
  end

  test "index searches role-scoped route metadata only" do
    get "/site-map", params: { q: "BOOKINGS" }
    assert_response :success
    assert_select ".map-table code", text: "/bookings", count: 1
    assert_select ".map-table code", text: "/health", count: 0
    get "/site-map", params: { q: "/ops/fleet" }
    assert_response :success
    assert_includes response.body, "No matching routes for your current access."
  end

  test "workflow operator sees only the shared staff links" do
    sign_in("workflow_operator")
    get "/site-map"
    assert_response :success
    assert_select "a[href='/work-queue']", minimum: 1
    assert_select "a[href='/inbox']", minimum: 1
    assert_select "code", text: "/ops", count: 0
    assert_select "a[href='/receipt']", count: 0
  end

  test "administrator sees module links but not direct record actions or exports" do
    sign_in("admin")
    get "/site-map"
    assert_response :success
    %w[/ops /ops/fleet /ops/reports /ops/maintenance/new].each do |path|
      assert_select "a[href='#{path}']", minimum: 1
    end
    assert_select "code", text: "/ops/reports/bookings.csv", count: 1
    assert_select "a[href='/ops/reports/bookings.csv']", count: 0
    assert_select "code", text: "/ops/bookings/:id/inspection", count: 2
    assert_select "a[href*=':id']", count: 0
  end

  test "valid receipt session exposes receipt navigation but not renter or reference data" do
    vehicle = Vehicle.create!(label: "Synthetic map SUV", daily_rate_cents: 4900, status: "available", is_demo: true)
    pickup = 35.days.from_now.in_time_zone.change(hour: 12, min: 0)
    get "/bookings/new"
    form = Nokogiri::HTML(response.body)
    post "/bookings", params: {
      intent: "request", authenticity_token: form.at_css('meta[name="csrf-token"]')["content"],
      request_token: form.at_css('input[name="request_token"]')["value"],
      booking: { vehicle_id: vehicle.id, renter_name: "Sample Map Renter", renter_email: "map-renter@example.com",
        pickup_location: "Killeen · Central Texas", return_location: "Temple · Central Texas",
        pickup_at: pickup.strftime("%Y-%m-%dT%H:%M"), return_at: (pickup + 1.day).strftime("%Y-%m-%dT%H:%M") }
    }
    assert_response :see_other
    reference = Booking.find_by!(renter_email: "map-renter@example.com").reference
    get "/site-map"
    assert_response :success
    assert_select "a[href='/receipt']", minimum: 1
    assert_select "a[href='/receipt/notifications']", minimum: 1
    assert_select "a[href='/inbox']", count: 0
    refute_includes response.body, reference
    refute_includes response.body, "Sample Map Renter"
    refute_includes response.body, "map-renter@example.com"
  end

  test "catalog metadata matches registered methods and paths" do
    registered = Rails.application.routes.routes.map { |route| [route.verb, route.path.spec.to_s.delete_suffix("(.:format)")] }
    SiteMapsController::ENTRIES.each do |_audience, verb, path, _label, _result, link|
      assert_includes registered, [verb, path]
      assert_equal "GET", verb if link
    end
  end

  private

  def sign_in(role)
    password = "synthetic-long-password"
    staff = StaffUser.create!(email: "map-#{role}@example.com", role: role, password: password)
    get "/login"
    assert_response :success
    token = Nokogiri::HTML(response.body).at_css('meta[name="csrf-token"]')["content"]
    post "/session", params: { email: staff.email, password: password, authenticity_token: token }
    assert_response :see_other
  end
end
