class PublicPagesController < ApplicationController
  def home
    @vehicles = Vehicle.where(status: "available", is_demo: true).order(:id)
  end

  def programs
  end

  def health
    render json: { status: "ok", environment: (Rails.env.staging? ? "synthetic-staging" : "local-alpha") }
  end

  def ready
    ActiveRecord::Base.connection_pool.with_connection { |db| db.select_value("SELECT 1") }
    render json: { status: "ready", scope: "database connectivity only" }
  rescue ActiveRecord::ActiveRecordError
    render json: { status: "unavailable" }, status: :service_unavailable
  end
end
