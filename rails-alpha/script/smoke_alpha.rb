#!/usr/bin/env ruby
# Exercise a real loopback Rails process and separate worker on disposable state.
require "socket"
require "net/http"
require "uri"
require "json"
require "tmpdir"
require "fileutils"
require "open3"
require "rbconfig"
require "timeout"
require "date"
require "bundler/setup"
require "nokogiri"

root=File.expand_path("..",__dir__)
Dir.mktmpdir("rrent-rails-smoke") do |tmp|
  %w[Gemfile Gemfile.lock Rakefile app bin config config.ru db lib public].each do |path|
    FileUtils.cp_r(File.join(root,path),tmp)
  end
  FileUtils.mkdir_p(File.join(tmp,"storage"))
  env={"RAILS_ENV"=>"development","DATABASE_URL"=>nil,"SECRET_KEY_BASE"=>nil,
    "RR_ENABLE_LIVE_PAYMENTS"=>nil,"RR_ENABLE_RELEASE"=>nil,"RR_ENABLE_EXTERNAL_DISPATCH"=>nil,
    "BUNDLE_GEMFILE"=>File.join(tmp,"Gemfile")}
  ruby=RbConfig.ruby
  command=lambda do |*parts|
    output,status=Open3.capture2e(env,ruby,"bin/rails",*parts,chdir:tmp)
    raise "Command failed (#{parts.first}): #{output}" unless status.success?
    output
  end
  command.call("db:prepare")
  socket=TCPServer.new("127.0.0.1",0)
  port=socket.addr[1]
  socket.close
  log=File.join(tmp,"server.log")
  pid=Process.spawn(env,ruby,"bin/rails","server","-b","127.0.0.1","-p",port.to_s,
    chdir:tmp,out:log,err:log)
  begin
    http=Net::HTTP.new("127.0.0.1",port,nil)
    http.open_timeout=2
    http.read_timeout=4
    Timeout.timeout(15) do
      loop do
        begin
          break if http.get("/ready").code=="200"
        rescue SystemCallError, Net::OpenTimeout
        end
        sleep 0.1
      end
    end
    raise "Programs not healthy" unless http.get("/programs").code=="200"
    raise "Queue not protected" unless http.get("/work-queue").code=="303"
    form=http.get("/bookings/new")
    raise "Inquiry not available" unless form.code=="200"
    doc=Nokogiri::HTML(form.body)
    csrf=doc.at_css('meta[name="csrf-token"]')["content"]
    nonce=doc.at_css('input[name="request_token"]')["value"]
    vehicle=doc.css('select[name="booking[vehicle_id]"] option').find { |n| /^[0-9]+$/.match?(n["value"].to_s) }["value"]
    cookie=form.get_fields("set-cookie").find { |s| s.start_with?("_rrent_rails_alpha=") }.split(";").first
    a=Date.today+17
    request=Net::HTTP::Post.new("/bookings",{"Cookie"=>cookie})
    request.set_form_data("authenticity_token"=>csrf,"request_token"=>nonce,"intent"=>"request",
      "booking[vehicle_id]"=>vehicle,"booking[renter_name]"=>"Synthetic Smoke","booking[renter_email]"=>"smoke@example.com",
      "booking[pickup_location]"=>"Killeen · Central Texas","booking[return_location]"=>"Temple · Central Texas",
      "booking[pickup_at]"=>"#{a}T12:00","booking[return_at]"=>"#{a+1}T12:00")
    response=http.request(request)
    raise "Booking not accepted (HTTP #{response.code})" unless response.code=="303" && URI(response["location"]).path=="/receipt"
    r1=JSON.parse(command.call("rrent:worker").lines.last)
    r2=JSON.parse(command.call("rrent:worker").lines.last)
    summary=JSON.parse(command.call("rrent:workflow_status").lines.last)
    raise "Workflow dedupe failed" unless r1["processed"]==1 && r2["processed"]==0 && summary=={
      "pending"=>0,"open"=>1,"completed"=>0,"external_dispatch"=>false}
    puts "Loopback OK: readiness, Programs, denied anonymous queue, synthetic request, worker 1→0, one open task."
  ensure
    Process.kill("TERM",pid) rescue nil
    Process.wait(pid) rescue nil
  end
end
