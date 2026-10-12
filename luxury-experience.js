(function () {
  'use strict';
  var logo = '/assets/r-rent-brand-icon.svg';
  var phone = '254-423-0594';
  var email = 'condre@rosstaxprepandbookkeeping.com';
  function link(href, label, classes) { return '<a href="' + href + '" class="' + (classes || 'lux-link') + '">' + label + '</a>'; }
  function vehicleTile(name, rate, image, slug, description) {
    return '<article class="lux-car-card"><div class="lux-car-visual">' +
      (image ? '<img src="' + image + '" alt="Concept depiction of ' + name + ', not the actual rental vehicle" loading="lazy">' :
        '<div class="lux-placeholder" aria-label="Vehicle photograph pending verification">R-RENT<span>Authentic vehicle image pending</span></div>') +
      '<span class="lux-media-note">Vehicle image ' + (image ? 'is an illustration' : 'pending verification') + '</span></div>' +
      '<div class="lux-car-body"><div class="lux-mini-label">2026 · Compact SUV · Reference listing</div><h3>' + name + '</h3>' +
      '<p>' + description + '</p><div class="lux-car-bottom"><strong>' + rate + '<small> / day reference</small></strong>' +
      link(slug, 'Explore vehicle →', 'lux-btn lux-btn-outline') + '</div>' +
      '<p class="lux-small">Availability and final rate require manual confirmation.</p></div></article>';
  }
  function quickQuote() {
    return '<form class="lux-search" id="lux-quick-quote">' +
      '<div class="lux-search-top"><strong>Plan your rental</strong><span>Transparent estimates · No payment collected</span></div>' +
      '<div class="lux-search-grid"><label>Pickup area<select aria-label="Pickup area"><option>Killeen / Central Texas (service area)</option></select></label>' +
      '<label>Pickup date & time<input type="datetime-local" id="lux-start" required></label>' +
      '<label>Return date & time<input type="datetime-local" id="lux-end" required></label>' +
      '<label>Vehicle<select id="lux-vehicle"><option value="trail">Chevrolet Trailblazer</option><option value="bronco">Ford Bronco Sport — inquiry only</option></select></label>' +
      '<button class="lux-btn lux-btn-gold" type="submit">Get my estimate ↗</button></div>' +
      '<p id="lux-quick-error" class="lux-small" role="status">Final availability and a binding rental agreement are not provided by this search.</p></form>';
  }
  function home() {
    return '<section class="lux-hero"><div class="wrap lux-hero-grid"><div class="lux-hero-copy">' +
      '<p class="lux-kicker">R-RENT CAR RENTAL · A DIVISION OF RTPSC</p>' +
      '<h1>Move Further.<br><em>Go Greater.</em></h1>' +
      '<p class="lux-lede">A higher standard for your next journey. Discover thoughtfully presented vehicle options, transparent estimates, and a customer-first rental experience.</p>' +
      '<div class="lux-hero-cta">' + link('/fleet','Explore our fleet →','lux-btn lux-btn-gold') +
      link('/book','Get a quote','lux-btn lux-btn-light') + '</div>' +
      '<p class="lux-hero-meta">TEXAS ROOTED <span>✦</span> PEOPLE · PLACES · POSSIBILITIES</p></div>' +
      '<div class="lux-hero-art"><img src="/assets/trailblazer-2026-concept.svg" alt="Illustrative vehicle concept for the R-RENT brand">' +
      '<div class="lux-art-caption">ILLUSTRATIVE VEHICLE CONCEPT · NOT ACTUAL FLEET PHOTOGRAPHY</div></div></div></section>' +
      '<div class="wrap lux-overlap">' + quickQuote() + '</div>' +
      '<section class="lux-advantages"><div class="wrap lux-advantages-grid">' +
      '<div><span>♜</span><strong>Reliable approach</strong><small>Human-reviewed rental requirements</small></div>' +
      '<div><span>◇</span><strong>Premium experience</strong><small>Clear, approachable service</small></div>' +
      '<div><span>♧</span><strong>Customer focused</strong><small>Helpful support before pickup</small></div>' +
      '<div><span>◎</span><strong>Room to grow</strong><small>Texas rooted, building for what is next</small></div></div></section>' +
      '<section class="lux-section lux-fleet-section"><div class="wrap"><div class="lux-section-head"><div><p class="lux-kicker">EXPLORE OUR FLEET</p><h2>The perfect ride for your journey.</h2>' +
      '<p>Current reference listings are presented below. Real-time inventory and instant reservations are not yet activated.</p></div>' +
      link('/fleet','See all details →','lux-text-link')+'</div><div class="lux-car-grid">' +
      vehicleTile('Chevrolet Trailblazer','$59.00','/assets/trailblazer-2026-concept.svg','/fleet/trailblazer-2026','Compact SUV · Automatic · Everyday comfort with city-friendly versatility.') +
      vehicleTile('Ford Bronco Sport Big Bend','Quote required',null,'/fleet/bronco-sport-2026','Compact 4×4 SUV · Automatic · Adventure-ready model details.') +
      '</div><div class="lux-category-strip"><div><b>SUVs</b><small>Flexible travel</small></div><div><b>Premium</b><small>Designed to impress</small></div><div><b>Business</b><small>Professional journeys</small></div><div><b>Family</b><small>Room for the road</small></div></div></div></section>' +
      '<section class="lux-section lux-process"><div class="wrap"><p class="lux-kicker">HOW IT WORKS</p><h2>Four steps to the open road.</h2>' +
      '<div class="lux-steps"><div><i>01</i><h3>Explore</h3><p>Browse vehicle details and reference rates.</p></div><div><i>02</i><h3>Estimate</h3><p>Choose your rental dates and review a nonbinding estimate.</p></div><div><i>03</i><h3>Verify</h3><p>Confirm driver eligibility, coverage, and the rental agreement with staff.</p></div><div><i>04</i><h3>Drive</h3><p>Pickup follows verified availability, authorization, and payment.</p></div></div></div></section>' +
      '<section class="lux-app-promo"><div class="wrap lux-app-promo-grid"><div><p class="lux-kicker">THE R-RENT MOBILE EXPERIENCE</p><h2>Your next ride.<br>Right in your hands.</h2><p>Browse the fleet, calculate quotes and find support on a mobile-first interface.</p>' +
      link('/app','Explore mobile app →','lux-btn lux-btn-gold')+'</div><div class="lux-phone-preview"><div class="lux-phone-top"><img src="' + logo + '" alt=""><strong>R-RENT</strong></div><h3>Move Further.<br>Go Greater.</h3><div class="lux-phone-car"><img src="/assets/trailblazer-2026-concept.svg" alt="Illustrative compact SUV"></div><p>THE ROAD IS CALLING</p><div class="lux-phone-tabs">⌂ &nbsp; ⌕ &nbsp; ▤ &nbsp; ♙</div></div></div></section>' +
      '<section class="lux-section lux-concierge"><div class="wrap lux-concierge-grid"><div><p class="lux-kicker">MORE THAN A RENTAL</p><h2>We are here to help you go further.</h2><p>Reach the team for vehicle questions, pickup planning and direct support.</p></div><div class="lux-contact-actions">' +
      link('tel:+12544230594','☎ 254-423-0594','lux-btn lux-btn-gold') +
      link('mailto:' + email,'✉ Email R-RENT','lux-btn lux-btn-outline')+'</div></div></section>';
  }
  function fleet() {
    return '<section class="lux-pagehero"><div class="wrap"><p class="lux-kicker">OUR VEHICLES</p><h1>Find your perfect ride.</h1><p>Browse the current R-RENT model listings with transparent availability disclosures.</p></div></section>' +
      '<section class="lux-section"><div class="wrap"><div class="lux-fleet-tools"><div><strong>2 reference listings</strong><p>No live inventory feed or confirmed booking inventory</p></div>' +
      link('/book','Build a rental estimate →','lux-btn lux-btn-gold')+'</div><div class="lux-car-grid">' +
      vehicleTile('2026 Chevrolet Trailblazer','$59.00','/assets/trailblazer-2026-concept.svg','/fleet/trailblazer-2026','Five-seat compact SUV · Automatic transmission · Specifications subject to vehicle confirmation.') +
      vehicleTile('2026 Ford Bronco Sport Big Bend','Quote required',null,'/fleet/bronco-sport-2026','Five-seat compact 4×4 SUV · Automatic transmission · Reference rate pending approval.') +
      '</div><div class="notice"><strong>Important:</strong> The listings and visual concepts do not confirm a car is available on your selected dates. We do not collect a deposit or confirm a rental on this public page.</div></div></section>';
  }
  function simpleHero(tag, title, subtitle) {
    return '<section class="lux-pagehero"><div class="wrap"><p class="lux-kicker">' + tag + '</p><h1>' + title + '</h1><p>' + subtitle + '</p></div></section>';
  }
  function page(path) {
    if (path === '/locations') return simpleHero('WHERE WE SERVE','Texas rooted.','R-RENT is preparing service in Killeen and the Central Texas area. Confirm all pickup locations and service arrangements directly with our team.') +
      '<section class="lux-section"><div class="wrap lux-info-grid"><article class="lux-info-card"><span class="lux-kicker">PRIMARY MARKET</span><h2>Killeen · Central Texas</h2><p>Service-area inquiries are welcome. Airport delivery and additional locations are not advertised as available until confirmed.</p>' +
      link('tel:+12544230594','Call for location options','lux-btn lux-btn-gold')+'</article><article class="lux-info-card"><span class="lux-kicker">EXPANSION</span><h2>Nationwide ambition.</h2><p>Our brand is designed to grow. Nationwide fleet access is not yet an operational offering.</p></article></div></section>';
    if (path === '/business') return simpleHero('R-RENT FOR BUSINESS','Business travel, elevated.','A professional rental experience designed for work, teams and extended travel planning.') +
      '<section class="lux-section"><div class="wrap lux-info-grid"><article class="lux-info-card"><h2>Business inquiries</h2><p>Discuss planned trips, vehicle needs, billing questions and company requirements with the R-RENT team.</p>' + link('mailto:' + email + '?subject=R-RENT%20Business%20Rental%20Inquiry','Request a business quote →','lux-btn lux-btn-gold')+'</article><article class="lux-info-card"><h2>Enterprise readiness</h2><p>Corporate billing, managed accounts, negotiated rates and approvals will be published only after service activation.</p>' + link('/requirements','View driver requirements →','lux-btn lux-btn-outline')+'</article></div></section>';
    if (path === '/deals') return simpleHero('OFFERS & SEASONAL TRAVEL','More journey. More possibility.','We will publish verified promotions and rates when approved.') +
      '<section class="lux-section"><div class="wrap lux-info-grid"><article class="lux-info-card"><h2>Transparent rates first.</h2><p>There are no active advertised promo codes or discounts at this time. Explore reference rates or request an individualized quote.</p>' + link('/book','Calculate an estimate →','lux-btn lux-btn-gold')+'</article><article class="lux-info-card"><h2>Talk to the team.</h2><p>Ask about planned travel and whether an approved offer applies to your requested dates.</p>' + link('tel:+12544230594','Call R-RENT','lux-btn lux-btn-outline')+'</article></div></section>';
    if (path === '/app') return mobileApp();
    return home();
  }
  function mobileApp() {
    return '<section class="lux-pagehero lux-app-pagehead"><div class="wrap"><p class="lux-kicker">R-RENT MOBILE EXPERIENCE</p><h1>Go greater. Anywhere.</h1><p>A mobile-friendly web app for fleet exploration, quotes and information. Secure booking and account features are not live yet.</p></div></section>' +
      '<section class="lux-mobile-shell"><div class="lux-mobile-brand"><img src="' + logo + '" alt=""><div><strong>R-RENT</strong><small>MOVE FURTHER. GO GREATER.</small></div></div>' +
      '<div class="lux-mobile-content" id="lux-mobile-content"><p class="lux-kicker">WELCOME TO R-RENT</p><h2>Your next journey starts here.</h2>' +
      '<div class="lux-mobile-showcase"><img src="/assets/trailblazer-2026-concept.svg" alt="Illustrative compact SUV"></div>' +
      '<div class="lux-mobile-panel"><strong>Explore the R-RENT fleet</strong><p>See model information, prices and availability requirements.</p>' + link('/fleet','Browse vehicles →','lux-btn lux-btn-gold')+'</div><div class="lux-mobile-panel"><strong>Need a quote?</strong><p>View a nonbinding rental estimate using your dates.</p>' + link('/book','Get estimate →','lux-btn lux-btn-outline')+'</div></div>' +
      '<nav class="lux-mobile-nav" aria-label="Mobile quick navigation">' +
      '<button type="button" data-lux-tab="home" class="selected">⌂<span>Home</span></button>' +
      '<button type="button" data-lux-tab="fleet">⌕<span>Fleet</span></button>' +
      '<button type="button" data-lux-tab="quote">▣<span>Quote</span></button>' +
      '<button type="button" data-lux-tab="trips">▤<span>Trips</span></button>' +
      '<button type="button" data-lux-tab="account">♙<span>Account</span></button></nav></section>' +
      '<div class="wrap lux-app-footnote"><p>Browser-based mobile experience. Not an App Store or Google Play release. No reservation, payment or customer account is created from the mobile interface.</p></div>';
  }
  var tabContent = {
    home: '<p class="lux-kicker">WELCOME TO R-RENT</p><h2>Your next journey starts here.</h2><div class="lux-mobile-showcase"><img src="/assets/trailblazer-2026-concept.svg" alt="Illustrative compact SUV"></div><div class="lux-mobile-panel"><strong>Explore the fleet</strong><p>Two model listings and transparent reference pricing.</p>' + link('/fleet','Browse vehicles →','lux-btn lux-btn-gold') + '</div>',
    fleet: '<p class="lux-kicker">DISCOVER</p><h2>Our fleet.</h2><div class="lux-mobile-panel"><strong>Chevrolet Trailblazer</strong><p>From $59/day reference rate. Availability requires confirmation.</p>' + link('/fleet/trailblazer-2026','Vehicle details →','lux-btn lux-btn-gold') + '</div><div class="lux-mobile-panel"><strong>Ford Bronco Sport</strong><p>Quote required. Authentic images pending.</p>' + link('/fleet/bronco-sport-2026','Vehicle details →','lux-btn lux-btn-outline') + '</div>',
    quote: '<p class="lux-kicker">PLAN AHEAD</p><h2>Get a transparent estimate.</h2><div class="lux-mobile-panel"><p>Choose rental dates and see a provisional calculation. No reservation is made.</p>' + link('/book','Open quote calculator →','lux-btn lux-btn-gold') + '</div>',
    trips: '<p class="lux-kicker">MY TRIPS</p><h2>Reservation management.</h2><div class="lux-mobile-panel"><p>Your confirmed trips will appear here when authenticated booking services have been independently commissioned.</p><strong>Reservations not activated</strong></div>',
    account: '<p class="lux-kicker">MY ACCOUNT</p><h2>Member center.</h2><div class="lux-mobile-panel"><p>Customer sign-in, rewards, documents and payment methods are securely gated pending backend release.</p>' + link('/security','View security status →','lux-btn lux-btn-outline') + '</div><div class="lux-mobile-panel"><strong>Need help?</strong><p>' + phone + '</p>' + link('tel:+12544230594','Call support →','lux-btn lux-btn-gold') + '</div>'
  };
  function mount(path) {
    var form = document.getElementById('lux-quick-quote');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      var start = document.getElementById('lux-start').value;
      var end = document.getElementById('lux-end').value;
      var vehicle = document.getElementById('lux-vehicle').value;
      var box = document.getElementById('lux-quick-error');
      if (!start || !end || new Date(end).getTime() <= new Date(start).getTime()) {
        box.textContent = 'Select a pickup time and a later return time.';
        return;
      }
      location.assign('/book?vehicle=' + encodeURIComponent(vehicle) + '&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end));
    });
    var buttons = document.querySelectorAll('[data-lux-tab]');
    var panel = document.getElementById('lux-mobile-content');
    if (panel) buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.toggle('selected', b === button); });
        panel.innerHTML = tabContent[button.getAttribute('data-lux-tab')] || tabContent.home;
      });
    });
  }
  window.RRentLuxury = { home: home, fleet: fleet, page: page, mount: mount };
  if ('serviceWorker' in navigator) window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () { /* Network-only fallback is expected. */ });
  });
})();
