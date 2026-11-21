require "uri"

module StagingPersistence
  CHANNELS = %w[
    RR_ENABLE_LIVE_PAYMENTS RR_ENABLE_RELEASE RR_ENABLE_EXTERNAL_DISPATCH
    RR_ENABLE_EMAIL RR_ENABLE_SMS RR_ENABLE_PUSH
  ].freeze
  STAGING_KEYS = %w[RR_STAGING_DB RR_STAGING_DATABASE_URL RR_STAGING_DB_HOST RR_STAGING_DB_NAME RR_STAGING_DB_SSLMODE].freeze
  OVERRIDES = %w[
    DATABASE_URL PRIMARY_DATABASE_URL PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER
    PGPASSWORD PGPASSFILE PGSERVICE PGSERVICEFILE PGOPTIONS PGSSLMODE PGSSLROOTCERT
  ].freeze

  def self.present_env?(key)
    # Even whitespace counts: Rails' implicit connection merging must not see it.
    !ENV[key].to_s.empty?
  end

  def self.validate!(rails_environment)
    unless %w[development test staging].include?(rails_environment.to_s)
      raise "Unsupported environment for R-Rent Rails alpha"
    end
    if CHANNELS.any? { |key| !%w[0 false].include?(ENV[key].to_s.downcase) && present_env?(key) }
      raise "Money movement, vehicle release and external dispatch are disabled for the Rails alpha"
    end
    if OVERRIDES.any? { |key| present_env?(key) }
      raise "Implicit database connection overrides are disabled for the Rails alpha"
    end
    if rails_environment.to_s != "staging"
      raise "PostgreSQL settings are permitted only in synthetic staging" if STAGING_KEYS.any? { |key| present_env?(key) }
      return
    end
    mode = ENV.fetch("RR_STAGING_DB", "")
    case mode
    when "", "sqlite"
      if STAGING_KEYS.drop(1).any? { |key| present_env?(key) }
        raise "PostgreSQL settings require RR_STAGING_DB=postgresql"
      end
    when "postgresql"
      raise "PostgreSQL requires synthetic staging opt-in" unless ENV["RR_SYNTHETIC_STAGING"] == "1"
      postgresql_config!
    else
      raise "Unsupported staging database mode"
    end
  end

  def self.postgresql_config!
    sslmode = ENV.fetch("RR_STAGING_DB_SSLMODE", "require")
    invalid! unless %w[require verify-full].include?(sslmode)
    raw = ENV.fetch("RR_STAGING_DATABASE_URL", "")
    invalid! unless raw.bytesize.between?(1, 4096) && raw == raw.strip
    url = URI.parse(raw)
    invalid! unless %w[postgres postgresql].include?(url.scheme) && url.hostname && !url.opaque && !url.fragment
    host = ENV.fetch("RR_STAGING_DB_HOST", "")
    name = ENV.fetch("RR_STAGING_DB_NAME", "")
    hostname_pattern = /\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\z/
    invalid! unless host.bytesize <= 253 && host.match?(hostname_pattern) && url.hostname == host
    invalid! unless name.match?(/\A[a-z][a-z0-9_]{0,62}\z/) && url.path == "/#{name}"
    invalid! if %w[postgres template0 template1].include?(name)
    invalid! unless url.port.nil? || (1..65535).cover?(url.port)
    # Accept only the matching conventional TLS query, never caller-controlled
    # hostaddr/service/options or another libpq override hidden in a URL.
    invalid! unless url.query.nil? || url.query == "sslmode=#{sslmode}"
    user = URI::DEFAULT_PARSER.unescape(url.user.to_s)
    password = URI::DEFAULT_PARSER.unescape(url.password.to_s)
    invalid! unless user.match?(/\A[a-zA-Z_][a-zA-Z0-9_]{0,62}\z/) && user != "postgres"
    invalid! if password.empty? || password.match?(/[[:cntrl:]]/)

    config = { "adapter" => "postgresql", "host" => host, "port" => url.port || 5432,
      "database" => name, "username" => user, "password" => password,
      "pool" => 5, "connect_timeout" => 5, "sslmode" => sslmode, "gssencmode" => "disable",
      "schema_search_path" => "public", "encoding" => "unicode" }
    if sslmode == "verify-full"
      # Use the system CA bundle rather than weakening transport or relying on a
      # per-user libpq file. Use libpq's system CA setting for portability.
      config["sslrootcert"] = "system"
    end
    config
  rescue URI::Error, ArgumentError
    invalid!
  end

  def self.invalid!
    # Never print a URI or partial credentials in an exception or startup log.
    raise "Invalid dedicated PostgreSQL staging configuration", cause: nil
  end
  private_class_method :invalid!
end
