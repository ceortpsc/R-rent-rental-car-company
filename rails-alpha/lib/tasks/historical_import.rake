# frozen_string_literal: true

require "json"

namespace :rrent do
  desc "Validate an authorized, minimized historical JSONL batch from stdin; writes require a production release"
  task historical_import: :environment do
    apply = ENV.fetch("RR_IMPORT_APPLY", "0")
    abort "Invalid batch mode" unless %w[0 1].include?(apply)
    if apply == "1" && (!Rails.env.production? || ENV["RR_IMPORT_OUTBOUND_PAUSED"] != "1")
      abort "Import writes require a reviewed production release with outbound dispatch paused"
    end

    source_system = ENV.fetch("RR_IMPORT_SOURCE", "")
    abort "Invalid source label" unless source_system.match?(/\A[a-z][a-z0-9_-]{1,47}\z/)
    rows = []
    while (line = STDIN.gets(16_385))
      abort "Batch contains an oversized or unterminated line" if line.bytesize > 16_384 || !line.end_with?("\n")
      abort "Batch exceeds 1,000 rows" if rows.length >= 1_000
      begin
        rows << JSON.parse(line, max_nesting: 4)
      rescue JSON::ParserError
        abort "Invalid JSON at row #{rows.length + 1}"
      end
    end
    abort "Empty batch" if rows.empty?

    result = HistoricalImport.call(rows: rows, source_system: source_system, dry_run: apply == "0")
    puts JSON.generate(result)
  end
end
