class MaintenanceTasksController < ApplicationController
  before_action :require_admin!

  def new
    @task = MaintenanceTask.new
    @vehicles = Vehicle.order(:id)
  end

  def create
    new
    return head :bad_request unless params[:maintenance_task].is_a?(ActionController::Parameters)
    attrs = params.require(:maintenance_task).permit(:vehicle_id, :priority, :description)
    @task.assign_attributes(attrs)
    MaintenanceTask.transaction do
      @task.status = "open"
      @task.save!
      @task.vehicle.update!(status: "maintenance") if @task.priority == "safety" && @task.vehicle.status != "retired"
      Workflow.enqueue!(event_type: "maintenance.created", subject_id: @task.id, source_key: "maintenance:#{@task.id}:created")
      audit!("maintenance.created", @task.id)
    end
    redirect_to "/ops", status: :see_other, notice: "Maintenance task saved."
  rescue ActiveRecord::RecordInvalid => e
    @errors = e.record.errors.full_messages
    render :new, status: 422
  end

  def status
    task = MaintenanceTask.find(params[:id])
    desired = params[:status].to_s
    raise ArgumentError, "Invalid maintenance state." unless %w[in_progress resolved].include?(desired)
    MaintenanceTask.transaction do
      MaintenanceTask.where(id: task.id).update_all("status = status")
      task.reload
      if task.status != desired
        raise ArgumentError, "Resolved work cannot be reopened. Create a new task instead." if task.status == "resolved"
        task.update!(status: desired)
        Workflow.enqueue!(event_type: "maintenance.status", subject_id: task.id, source_key: "maintenance:#{task.id}:#{desired}")
        audit!("maintenance.#{desired}", task.id)
      end
    end
    redirect_to "/ops", status: :see_other, notice: "Maintenance updated. Vehicle availability did not change."
  rescue ArgumentError => e
    render plain: e.message, status: :conflict
  end
end
