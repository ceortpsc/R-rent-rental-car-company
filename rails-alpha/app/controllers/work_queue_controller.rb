class WorkQueueController < ApplicationController
  before_action :require_staff!

  def index
    @status = params[:status] == "completed" ? "completed" : "open"
    scope = @status == "completed" ? WorkflowAction.where.not(completed_at: nil) : WorkflowAction.where(completed_at: nil)
    @actions = scope.order(id: :desc).limit(100)
  end

  def complete
    WorkflowAction.transaction do
      item = WorkflowAction.find(params[:id])
      if WorkflowAction.where(id: item.id, completed_at: nil).update_all(completed_at: Time.current) == 1
        audit!("work_queue.completed", item.id)
      end
    end
    redirect_to "/work-queue", status: :see_other, notice: "Task complete. No external action was sent."
  end
end
