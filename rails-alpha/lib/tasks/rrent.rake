require "io/console"
require "json"

namespace :rrent do
  desc "Create or rotate a local synthetic staff account: EMAIL=... ROLE=admin|workflow_operator"
  task provision: :environment do
    abort "Development only" unless Rails.env.development?
    email = ENV.fetch("EMAIL").strip.downcase
    role = ENV.fetch("ROLE", "workflow_operator")
    abort "Use a synthetic email at example.com, example.org or example.net" unless email.match?(/\A[^@\s]+@example\.(com|org|net)\z/)
    abort "Unknown role" unless StaffUser::ROLES.include?(role)
    abort "An interactive terminal is required" unless $stdin.tty?
    print "New password (16–72 bytes): "
    password = $stdin.noecho(&:gets)&.chomp.to_s
    puts
    print "Repeat password: "
    repeat = $stdin.noecho(&:gets)&.chomp.to_s
    puts
    abort "Invalid or mismatched password" unless password == repeat && (16..72).cover?(password.bytesize)
    StaffUser.transaction do
      staff = StaffUser.find_or_initialize_by(email: email)
      abort "Refusing to change the role of an existing account" if staff.persisted? && staff.role != role
      staff.update!(role: role, disabled: false, password: password)
      AuditEntry.create!(actor: "local-provisioning", action: "staff.provisioned", target: staff.id.to_s)
    end
    puts "Local synthetic staff account provisioned."
  end

  desc "Disable local synthetic staff access by EMAIL"
  task disable: :environment do
    abort "Development only" unless Rails.env.development?
    StaffUser.transaction do
      staff = StaffUser.find_by!(email: ENV.fetch("EMAIL").strip.downcase)
      staff.update!(disabled: true)
      AuditEntry.create!(actor: "local-provisioning", action: "staff.disabled", target: staff.id.to_s)
    end
    puts "Local staff access disabled."
  end

  desc "Drain internal workflow events (one SQLite consumer, optional CONTINUOUS=1)"
  task worker: :environment do
    limit = Integer(ENV.fetch("BATCH_SIZE", "50"), 10)
    continuous = ENV["CONTINUOUS"] == "1"
    interval = Integer(ENV.fetch("INTERVAL_SECONDS", "5"), 10)
    abort "INTERVAL_SECONDS must be 1..3600" unless (1..3600).cover?(interval)
    loop do
      puts JSON.generate(processed: Workflow.drain!(limit: limit), external_dispatch: false)
      break unless continuous
      sleep interval
    end
  rescue Interrupt
    warn "Worker stopped."
  rescue StandardError => e
    warn "Worker stopped; review database, pending event and sanitized error class: #{e.class}"
    exit 1
  end

  desc "Show internal workflow counts only"
  task workflow_status: :environment do
    puts JSON.generate(pending: WorkflowEvent.pending.count, open: WorkflowAction.open.count,
      completed: WorkflowAction.where.not(completed_at: nil).count, external_dispatch: false)
  end
end
