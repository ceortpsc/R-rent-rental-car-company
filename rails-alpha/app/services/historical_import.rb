require "digest"
require "json"
require "time"
require "date"

# Import already-minimized records, not arbitrary legacy provider exports.
# No relationships or callbacks to bookings, fleet, payments, outbox, or notices.
class HistoricalImport
  VERSION = 1
  MAX_ROWS = 1_000
  REQUIRED = %w[record_type source_id source_status].freeze
  OPTIONAL = %w[source_created_at quoted_total_cents currency parent_source_id base_revision].freeze
  ALL_FIELDS = (REQUIRED + OPTIONAL).freeze
  SOURCE_RE = /\A[a-z][a-z0-9_-]{0,63}\z/
  ID_RE = /\A[A-Za-z0-9][A-Za-z0-9._:-]{0,119}\z/
  STATUS_RE = %r{\A[A-Za-z][A-Za-z0-9 _./-]{0,63}\z}
  DATE_RE = /\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})\z/
  SENSITIVE_TOKEN = /\d{3}-\d{2}-\d{4}|(?:\A|[^0-9])\d{9,}(?:\z|[^0-9])/
  STORAGE_FAILURE = "Historical import storage failure; no row values were returned."

  def self.call(rows:, source_system:, dry_run: true)
    unless rows.is_a?(Array) && rows.size <= MAX_ROWS &&
      source_system.is_a?(String) && SOURCE_RE.match?(source_system) && [true, false].include?(dry_run)
      raise ArgumentError, "Invalid historical batch envelope"
    end
    new(rows, source_system, dry_run).call
  end

  def initialize(rows, source_system, dry_run)
    @rows, @source_system, @dry_run = rows, source_system, dry_run
    @counts = { input: rows.size, inserted: 0, would_insert: 0, unchanged: 0, quarantined: 0 }
    @quarantine = []
  end

  def call
    prepared = {}
    @rows.each_with_index do |row, index|
      attributes, code = parse(row)
      code ? quarantine(index, code) : prepared[index] = attributes
    end
    conflicts = prepared.values.group_by { |item| identity(item) }.select do |_key, items|
      items.map { |item| item.fetch(:payload_digest) }.uniq.length > 1
    end
    # Keep each explicit batch atomic on unexpected storage faults. Expected
    # invalid rows and collisions are classified and valid rows may commit.
    operation = lambda do
      seen = {}
      prepared.each do |index, attributes|
        key = identity(attributes)
        if conflicts.key?(key)
          quarantine(index, "batch_identity_conflict")
          next
        end
        existing = seen[key] || HistoricalRecord.find_by(**key)
        if existing
          existing.payload_digest == attributes.fetch(:payload_digest) ? @counts[:unchanged] += 1 : quarantine(index, "stored_identity_conflict")
        elsif @dry_run
          seen[key] = HistoricalRecord.new(attributes)
          @counts[:would_insert] += 1
        else
          record = HistoricalRecord.create_or_find_by!(**key) do |candidate|
            candidate.assign_attributes(attributes)
          end
          if record.payload_digest != attributes.fetch(:payload_digest)
            quarantine(index, "stored_identity_conflict")
          elsif record.previously_new_record?
            @counts[:inserted] += 1
          else
            @counts[:unchanged] += 1
          end
          seen[key] = record
        end
      end
    end
    runner = -> { @dry_run ? operation.call : HistoricalRecord.transaction { operation.call } }
    logger = HistoricalRecord.logger
    logger&.respond_to?(:silence) ? logger.silence { runner.call } : runner.call
    { schema_version: VERSION, dry_run: @dry_run, counts: @counts,
      quarantine: @quarantine.sort_by { |item| item.fetch(:line) } }
  rescue ActiveRecord::ActiveRecordError
    # Do not expose adapter errors, values, generated SQL or exception causes
    # to console/API logs, even if a database constraint unexpectedly rejects.
    raise RuntimeError, STORAGE_FAILURE, cause: nil
  end

  private

  def identity(attributes)
    attributes.slice(:source_system, :record_type, :source_id)
  end

  def quarantine(index, code)
    @counts[:quarantined] += 1
    @quarantine << { line: index + 1, code: code }
  end

  def parse(row)
    return [nil, "invalid_row"] unless row.is_a?(Hash) && row.keys.all? { |key| key.is_a?(String) }
    return [nil, "unexpected_fields"] unless (row.keys - ALL_FIELDS).empty?
    return [nil, "missing_required_field"] unless (REQUIRED - row.keys).empty?
    record_type, id, status = row.values_at(*REQUIRED)
    return [nil, "invalid_record_type"] unless HistoricalRecord::TYPES.include?(record_type)
    return [nil, "invalid_source_id"] unless safe_token?(id, ID_RE)
    return [nil, "invalid_source_status"] unless safe_token?(status, STATUS_RE) && status == status.strip
    parent = row["parent_source_id"]
    revision = row["base_revision"]
    if !parent.nil? || record_type == "quote"
      return [nil, "invalid_parent_source_id"] unless safe_token?(parent, ID_RE)
    end
    unless revision.nil? || (revision.is_a?(Integer) && (0..9_223_372_036_854_775_807).cover?(revision))
      return [nil, "invalid_base_revision"]
    end
    date = row["source_created_at"]
    if !date.nil? && !(date.is_a?(String) && DATE_RE.match?(date))
      return [nil, "invalid_timestamp"]
    end
    if date && (!Date.valid_date?(*date[0, 10].split("-").map(&:to_i)) || date[11, 2].to_i > 23 ||
        date[14, 2].to_i > 59 || date[17, 2].to_i > 59)
      return [nil, "invalid_timestamp"]
    end
    observed = date.nil? ? nil : Time.iso8601(date).utc
    cents, currency = row.values_at("quoted_total_cents", "currency")
    unless (cents.nil? && currency.nil?) ||
      (cents.is_a?(Integer) && (0..999_999_999_999).cover?(cents) && currency.is_a?(String) && /\A[A-Z]{3}\z/.match?(currency))
      return [nil, "invalid_quote_amount"]
    end
    # Canonical UTC to microsecond precision; optional absence and explicit null
    # are equivalent. Preserve the exact accepted source ID and status spelling.
    digest = Digest::SHA256.hexdigest(JSON.generate([VERSION, @source_system, record_type,
      id, status, observed&.iso8601(6), cents, currency, parent, revision]))
    [{ source_system: @source_system, record_type: record_type, source_id: id,
       source_status: status, source_created_at: observed, parent_source_id: parent, base_revision: revision,
       quoted_total_cents: cents,
       currency: currency, payload_digest: digest }, nil]
  rescue ArgumentError
    [nil, "invalid_timestamp"]
  end

  def safe_token?(value, pattern)
    value.is_a?(String) && value.ascii_only? && pattern.match?(value) && !SENSITIVE_TOKEN.match?(value)
  end
end
