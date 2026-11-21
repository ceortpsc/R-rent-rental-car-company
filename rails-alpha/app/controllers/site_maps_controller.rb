require "set"

class SiteMapsController < ApplicationController
  # Curated route metadata only. The map never loads rows, personal fields, or exports.
  MODULES = {
    public: ["Public rental journey", "Browse listings, understand the process, then estimate or submit an inquiry."],
    receipt: ["Your receipt and notices", "These links require the receipt from your current browser session."],
    staff: ["Staff workflow", "Sign-in provides only the links your assigned role can use."],
    admin: ["Operations administration", "Manage fleet, maintenance, review, inspections and reporting. Relevant record pages provide the actions."],
    diagnostics: ["Stage diagnostics", "Service and database readiness checks, not evidence of production availability."]
  }.freeze

  # Columns: audience, verb, route pattern, action, outcome, optional safe GET landing page.
  ENTRIES = [
    [:public, "GET", "/", "Browse vehicle listings", "Read listed inventory; no date-specific availability promise.", "/"],
    [:public, "GET", "/programs", "Read Programs & Process", "See inquiry options, review stages and important restrictions.", "/programs"],
    [:public, "GET", "/bookings/new", "Open rental inquiry", "Start a form for a listed vehicle and requested dates.", "/bookings/new"],
    [:public, "POST", "/bookings", "Review estimate or submit inquiry", "Calculate a preview or store an inquiry for review. No payment or confirmed rental.", nil],
    [:public, "GET", "/site-map", "Open this sitemap", "See route metadata and permitted navigation.", "/site-map"],
    [:public, "GET", "/login", "Open staff sign-in", "Authentication is needed before protected actions.", "/login"],
    [:public, "POST", "/session", "Sign in", "Establish a staff session only after credentials are accepted.", nil],
    [:receipt, "GET", "/receipt", "Open your receipt", "Read your own session-linked inquiry reference and recorded status.", "/receipt"],
    [:receipt, "GET", "/receipt/notifications", "Read your notices", "See notices associated with the receipt for this session.", "/receipt/notifications"],
    [:receipt, "POST", "/receipt/notifications/:id/read", "Mark your notice as read", "Update read state on an authorized notice only.", nil],
    [:staff, "GET", "/inbox", "Open staff inbox", "Read notices visible to your assigned staff role.", "/inbox"],
    [:staff, "POST", "/inbox/:id/read", "Mark staff notice as read", "Update your read state on a visible notice.", nil],
    [:staff, "GET", "/work-queue", "Open workflow queue", "Browse open or completed internal tasks.", "/work-queue"],
    [:staff, "POST", "/work-queue/:id/complete", "Mark work item complete", "Record internal completion only. No external action is sent.", nil],
    [:staff, "POST", "/logout", "Sign out", "End the current session.", nil],
    [:admin, "GET", "/ops", "Open operations", "Review rental requests, fleet and maintenance records.", "/ops"],
    [:admin, "POST", "/ops/bookings/:id/status", "Change review status", "Apply an allowed review transition where prerequisites pass; no vehicle release.", nil],
    [:admin, "GET", "/ops/maintenance/new", "Open maintenance form", "Prepare a maintenance task for an existing fleet record.", "/ops/maintenance/new"],
    [:admin, "POST", "/ops/maintenance", "Create maintenance task", "Store a task. A safety task may take a vehicle out of availability.", nil],
    [:admin, "POST", "/ops/maintenance/:id/status", "Update maintenance status", "Record progress or resolution without returning the vehicle to service automatically.", nil],
    [:admin, "GET", "/ops/fleet", "Open fleet registry", "Review fleet records and their current recorded status.", "/ops/fleet"],
    [:admin, "POST", "/ops/fleet", "Add fleet record", "Register a fleet record; server validation applies.", nil],
    [:admin, "POST", "/ops/fleet/:id/status", "Update fleet status", "Apply a supported status subject to operational constraints.", nil],
    [:admin, "GET", "/ops/bookings/:id/inspection", "Review trip inspections", "Open the inspection page for an authorized booking from Operations.", nil],
    [:admin, "POST", "/ops/bookings/:id/inspection", "Record trip inspection", "Record supported pickup or return inspection details.", nil],
    [:admin, "GET", "/ops/reports", "Open reports", "Read report summaries; navigate here before exporting.", "/ops/reports"],
    [:admin, "GET", "/ops/reports/bookings.csv", "Export bookings CSV", "Download records from the authorized Reports page. No direct export link here.", nil],
    [:diagnostics, "GET", "/health", "Read service health", "Read local service status only.", "/health"],
    [:diagnostics, "GET", "/ready", "Read database readiness", "Check database connectivity only.", "/ready"]
  ].map(&:freeze).freeze

  def show
    @audiences = %i[public diagnostics]
    if receipt_available?
      @audiences.insert(1, :receipt)
    end
    if current_staff
      @audiences.insert(-2, :staff)
      @audiences.insert(-2, :admin) if current_staff.role == "admin"
    end
    # Ignore framework-internal routes; expose only listed, actually registered actions.
    actual = Rails.application.routes.routes.map do |route|
      [route.verb, route.path.spec.to_s.delete_suffix("(.:format)")]
    end.to_set
    @query = params[:q].is_a?(String) ? params[:q].first(80).strip : ""
    @modules = MODULES.slice(*@audiences)
    @entries = ENTRIES.select { |entry| @audiences.include?(entry[0]) && actual.include?([entry[1], entry[2]]) }
    @indexed_entries = @entries.select { |entry| @query.blank? || entry[1, 4].join(" ").downcase.include?(@query.downcase) }
  end

  private

  def receipt_available?
    receipt_booking!
    true
  rescue ActiveRecord::RecordNotFound
    false
  end
end
