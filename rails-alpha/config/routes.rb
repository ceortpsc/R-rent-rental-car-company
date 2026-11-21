Rails.application.routes.draw do
  root "public_pages#home"
  get "programs", to: "public_pages#programs"
  get "health", to: "public_pages#health"
  get "ready", to: "public_pages#ready"
  get "bookings/new", to: "bookings#new", as: :new_booking
  post "bookings", to: "bookings#create", as: :bookings
  get "receipt", to: "bookings#show"
  get "receipt/notifications", to: "notifications#index", defaults: { notification_scope: "receipt" }, as: :receipt_notifications
  post "receipt/notifications/:id/read", to: "notifications#read", defaults: { notification_scope: "receipt" }, as: :read_receipt_notification
  get "inbox", to: "notifications#index", as: :staff_notifications
  post "inbox/:id/read", to: "notifications#read", as: :read_staff_notification
  get "login", to: "sessions#new"
  post "session", to: "sessions#create"
  post "logout", to: "sessions#destroy"
  get "ops", to: "operations#index"
  post "ops/bookings/:id/status", to: "operations#booking_status"
  get "ops/maintenance/new", to: "maintenance_tasks#new"
  post "ops/maintenance", to: "maintenance_tasks#create"
  post "ops/maintenance/:id/status", to: "maintenance_tasks#status"
  get "work-queue", to: "work_queue#index"
  post "work-queue/:id/complete", to: "work_queue#complete"
  get "ops/fleet", to: "fleet#index"
  post "ops/fleet", to: "fleet#create"
  post "ops/fleet/:id/status", to: "fleet#status"
  get "ops/bookings/:id/inspection", to: "inspections#show"
  post "ops/bookings/:id/inspection", to: "inspections#create"
  get "ops/reports", to: "reports#index"
  get "ops/reports/bookings.csv", to: "reports#bookings", format: false
end
