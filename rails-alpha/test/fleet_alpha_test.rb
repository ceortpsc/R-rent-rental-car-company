require "test_helper"
require "nokogiri"
require "csv"

class FleetAlphaTest < ActionDispatch::IntegrationTest
  def page(path)
    get path
    assert_response :success
    Nokogiri::HTML(response.body).at_css('meta[name="csrf-token"]')['content']
  end

  def sign_in(role)
    StaffUser.create!(email: "#{role}@example.com", role: role, password: "long-synthetic-password")
    token = page("/login")
    post "/session", params: {email: "#{role}@example.com", password: "long-synthetic-password", authenticity_token: token}
    assert_response :see_other
  end

  def booking(vehicle, status: "review")
    Booking.create!(vehicle: vehicle, renter_name: "Omit me", renter_email: "p@example.com",
      pickup_location: "Secret start", return_location: "Secret end", pickup_at: Time.current+1.day,
      return_at: Time.current+2.days, total_cents: 1000, status: status)
  end

  test "admin fleet hold creates synthetic vehicle and enforces safety block" do
    sign_in("admin")
    token = page("/ops/fleet")
    post "/ops/fleet", params: {vehicle:{label:"Synthetic", daily_rate_cents:"4500"},authenticity_token:token}
    assert_response :see_other
    v = Vehicle.find_by!(label:"Synthetic")
    assert v.is_demo
    assert_equal "maintenance", v.status
    t = MaintenanceTask.create!(vehicle:v,description:"Synthetic",priority:"safety",status:"open")
    post "/ops/fleet/#{v.id}/status",params:{status:"available",authenticity_token:token}
    assert_response :conflict
    assert_equal "maintenance", v.reload.status
    t.update!(status:"resolved")
    post "/ops/fleet/#{v.id}/status",params:{status:"available",authenticity_token:token}
    assert_response :see_other
    assert_equal "available", v.reload.status
  end

  test "inspect valid state only, one attestation and constrained fields" do
    sign_in("admin")
    v = Vehicle.create!(label:"Synthetic",daily_rate_cents:4000)
    b = booking(v, status:"requested")
    get "/ops/bookings/#{b.id}/inspection"
    assert_response :conflict
    b.update!(status:"review")
    path = "/ops/bookings/#{b.id}/inspection"
    token = page(path)
    post path,params:{inspection:{condition:"unsafe",odometer:"-1"},authenticity_token:token}
    assert_response 422
    assert_equal 0, Inspection.count
    post path,params:{inspection:{condition:"unsafe",odometer:"1500",notes:"Synthetic concern"},authenticity_token:token}
    assert_response :see_other
    assert_equal "pretrip", Inspection.last.stage
    assert_equal 1500, Inspection.last.odometer
    post path,params:{inspection:{condition:"satisfactory",odometer:"1600"},authenticity_token:token}
    assert_response :conflict
    assert_equal 1, Inspection.count
  end

  test "reports private exports sanitized CSV and denies workflow operator" do
    sign_in("workflow_operator")
    get "/ops/reports/bookings.csv"
    assert_response :forbidden
  end

  test "admin CSV mitigates formula prefixes and omits renter details" do
    sign_in("admin")
    v = Vehicle.create!(label:"  =1+1",daily_rate_cents:4000)
    booking(v)
    page("/ops/reports")
    get "/ops/reports/bookings.csv"
    assert_response :success
    assert_includes response.headers["Cache-Control"], "no-store"
    assert_match(/attachment/,response.headers["Content-Disposition"])
    assert_equal "'  =1+1", CSV.parse(response.body,headers:true)[0]["vehicle"]
    refute_includes response.body,"p@example.com"
    refute_includes response.body,"Secret start"
    assert AuditEntry.exists?(action:"report.booking_register_exported")
  end
end
