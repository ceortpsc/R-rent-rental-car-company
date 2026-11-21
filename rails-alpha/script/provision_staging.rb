abort "Staging only." unless Rails.env.staging?
digest = ENV["RR_PREVIEW_STAFF_BCRYPT"].to_s
# A separate high-entropy credential for a synthetic admin; never accepts real email or identity data.
abort "Invalid preview account digest." unless digest.match?(/\A\$2[aby]\$1[0-5]\$[.\/a-zA-Z0-9]{53}\z/)
staff = StaffUser.find_or_initialize_by(email: StaffUser::SYNTHETIC_PREVIEW_ADMIN_EMAIL)
abort "Unexpected existing staging role." if staff.persisted? && staff.role != "admin"
staff.assign_attributes(password_digest: digest, role: "admin", disabled: false)
staff.save! if staff.changed?
