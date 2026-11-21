# Transactional outbox. It creates internal review tasks and in-app notices only; never sends,
# charges, issues an agreement, or authorizes a vehicle handover.
class Workflow
  EVENT_ACTIONS = {
    "booking.requested" => %w[booking review_booking_request].freeze,
    "booking.status" => %w[booking review_booking_status].freeze,
    "maintenance.created" => %w[maintenance triage_maintenance].freeze,
    "maintenance.status" => %w[maintenance review_maintenance_status].freeze,
    "payment.exception" => %w[payment review_payment_exception].freeze
  }.freeze

  # Caller owns the enclosing business transaction. Use an opaque event key,
  # not personal information or a value reused across subject transitions.
  def self.enqueue!(event_type:, subject_id:, source_key:)
    raise ArgumentError, "Unsupported workflow event" unless EVENT_ACTIONS.key?(event_type)
    unless subject_id.is_a?(Integer) && subject_id.positive?
      raise ArgumentError, "Workflow subject must be a positive integer"
    end
    unless source_key.is_a?(String) && source_key.length.in?(1..200) && source_key.strip == source_key
      raise ArgumentError, "Use a nonempty workflow source key of at most 200 characters"
    end

    event = WorkflowEvent.create_or_find_by!(source_key: source_key) do |row|
      row.event_type = event_type
      row.subject_id = subject_id
    end
    unless event.event_type == event_type && event.subject_id == subject_id
      raise ArgumentError, "Workflow source key already describes a different event"
    end
    event
  end

  # PostgreSQL supports concurrent workers. SQLite is single consumer only.
  # Entire batch rolls back if an event/action cannot be processed.
  def self.drain!(limit: 50)
    raise ArgumentError, "Batch limit must be 1..500" unless limit.is_a?(Integer) && (1..500).cover?(limit)
    WorkflowEvent.transaction do
      events = WorkflowEvent.pending.order(:id).limit(limit)
      if WorkflowEvent.connection.adapter_name == "PostgreSQL"
        events = events.lock("FOR UPDATE SKIP LOCKED")
      end
      rows = events.to_a
      rows.each do |event|
        subject_type, action_code = EVENT_ACTIONS.fetch(event.event_type)
        action = WorkflowAction.create_or_find_by!(workflow_event_id: event.id) do |row|
          row.subject_type = subject_type
          row.subject_id = event.subject_id
          row.action_code = action_code
        end
        unless [action.subject_type, action.subject_id, action.action_code] == [subject_type, event.subject_id, action_code]
          raise ArgumentError, "Stored workflow action conflicts with its source event"
        end
        InAppNotification.deliver_from!(event)
        RequestResponseIntent.plan_from!(event, cutoff: RequestResponseIntent.configured_cutoff)
        event.update!(processed_at: Time.current)
      end
      rows.length
    end
  end
end
