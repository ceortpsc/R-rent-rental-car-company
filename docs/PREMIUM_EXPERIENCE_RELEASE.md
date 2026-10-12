# R-RENT Premium Web & Mobile Release

Brand: R-RENT Car Rental, division of RTPSC. Contact: 254-423-0594 · condre@rosstaxprepandbookkeeping.com. Public website: www.rtpscrentalcars.com.

## Public routes

- `/` luxury home and dated estimate entry
- `/fleet` seeded Trailblazer and Bronco Sport model listings
- `/book` provisional estimate calculator
- `/locations`, `/deals`, `/business`, `/contact` informational pages
- `/app` install-oriented responsive web experience with Home/Fleet/Quote/Trips/Account tabs
- All prior policy, help, signature-review, audit and launch routes retained.

## Release gates

No fabricated inventory or vehicle photography; never treat reference rates as final quotes. `/portal` and `/admin` remain closed. No card input, driver-license upload, identity processing, approved insurance coverage, binding e-sign or instant bookings are activated. No native App Store or Google Play build is included.

## Cloudflare/Vercel integration

Existing Vercel project: `r-rent-rental-cars` with the two registered custom domains. DNS authority is Cloudflare. Never alter MX/TXT records or nameservers when correcting website DNS. Verify Vercel recommended DNS targets and TLS issuance using the hosting account, then smoke test `/`, `/fleet`, `/book`, `/app`, `/locations`, `/deals`, `/business`, `/contact`. Do not treat Vercel project-domain `verified=true` as evidence DNS correctly resolves.

## PWA

The manifest and network-first service worker provide a mobile web shell; transactional API responses are explicitly excluded from caching. Service Worker install and native app store submissions are separate release verifications.
