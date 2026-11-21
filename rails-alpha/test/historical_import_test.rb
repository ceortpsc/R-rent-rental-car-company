require "test_helper"

class HistoricalImportTest < ActiveSupport::TestCase
  def sample(type, id, **options)
    { "record_type" => type, "source_id" => id, "source_status" => "REQUESTED" }.merge(options.transform_keys(&:to_s))
  end

  def apply(rows, source: "legacy_rent", dry_run: false)
    HistoricalImport.call(rows: rows, source_system: source, dry_run: dry_run)
  end

  test "default dry run leaves data unchanged and classifies duplicate source identities" do
    row = sample("rental_request", "DEMO-01")
    report = HistoricalImport.call(rows: [row, row], source_system: "legacy_rent")
    assert report[:dry_run]
    assert_equal({ input: 2, inserted: 0, would_insert: 1, unchanged: 1, quarantined: 0 }, report[:counts])
    assert_equal 0, HistoricalRecord.count
  end

  test "applies independent types per explicit source, preserves lineage and exact raw status, never replays" do
    request = sample("rental_request", "DEMO-01", source_status: "ACCEPTED_PENDING_REVIEW")
    quote = sample("quote", "DEMO-EVENT-1", source_status: "QUOTED", parent_source_id: "DEMO-01",
      base_revision: 2, quoted_total_cents: 5300, currency: "USD", source_created_at: "2026-01-01T10:00:00-06:00")
    submission = sample("submission", "DEMO-01", source_status: "DRAFT")
    initial_side_effects = [Booking.count, WorkflowEvent.count, WorkflowAction.count, InAppNotification.count, AuditEntry.count]
    assert_equal 3, apply([request, quote, submission])[:counts][:inserted]
    assert_equal 3, apply([request, quote, submission])[:counts][:unchanged]
    assert_equal 1, apply([request], source: "independent_rent_source")[:counts][:inserted]
    assert_equal initial_side_effects, [Booking.count, WorkflowEvent.count, WorkflowAction.count, InAppNotification.count, AuditEntry.count]
    record = HistoricalRecord.find_by!(record_type: "quote")
    assert_equal ["DEMO-01", 2, "QUOTED", 5300, "USD"], record.attributes.values_at("parent_source_id", "base_revision", "source_status", "quoted_total_cents", "currency")
    assert_equal "2026-01-01T16:00:00Z", record.source_created_at.utc.iso8601
    assert_equal 1, apply([quote.merge("source_created_at" => "2026-01-01T16:00:00Z")])[:counts][:unchanged]
  end

  test "conflicting incoming rows are both quarantined; stored rows are never overwritten" do
    a = sample("rental_request", "DEMO-01")
    b = a.merge("source_status" => "CANCELLED")
    assert_equal %w[batch_identity_conflict batch_identity_conflict], apply([a, b])[:quarantine].pluck(:code)
    assert_equal 0, HistoricalRecord.count
    assert_equal 1, apply([a])[:counts][:inserted]
    assert_equal [{ line: 1, code: "stored_identity_conflict" }], apply([b])[:quarantine]
    assert_equal "REQUESTED", HistoricalRecord.sole.source_status
  end

  test "malformed and unapproved fields return only fixed codes, no payload" do
    rows = [
      sample("quote", "DEMO-QUOTE"),
      sample("rental_request", "DEMO-01", renter_email: "synthetic-private@example.com"),
      sample("rental_request", "123-45-6789"),
      sample("rental_request", "DEMO-02", source_status: "secret@example.com"),
      sample("rental_request", "DEMO-03", source_created_at: "2026-02-30T10:00:00Z"),
      sample("quote", "DEMO-Q2", parent_source_id: "DEMO-R1", quoted_total_cents: 5300),
      sample("quote", "DEMO-Q3", parent_source_id: "DEMO-R2", base_revision: -1),
      sample("rental_request", "DEMO-04")
    ]
    report = apply(rows)
    assert_equal({ input: 8, inserted: 1, would_insert: 0, unchanged: 0, quarantined: 7 }, report[:counts])
    assert_equal %w[invalid_parent_source_id unexpected_fields invalid_source_id invalid_source_status invalid_timestamp invalid_quote_amount invalid_base_revision], report[:quarantine].pluck(:code)
    refute_match(/private|secret@example|123-45-6789|DEMO-/, JSON.generate(report))
  end

  test "invalid envelopes redact caller values and refuse implicit writes" do
    error = assert_raises(ArgumentError) { apply([], source: "private@example.com") }
    assert_equal "Invalid historical batch envelope", error.message
    assert_raises(ArgumentError) { HistoricalImport.call(rows: [], source_system: "legacy", dry_run: "false") }
    assert_raises(ArgumentError) { HistoricalImport.call(rows: Array.new(1001), source_system: "legacy") }
  end
end
