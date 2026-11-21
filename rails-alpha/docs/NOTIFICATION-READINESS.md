# Notification channel readiness

The Rails alpha distinguishes existing internal operations records, synthetic previews and outbound channels. Email, SMS and push are **disabled and not implemented**. The status registry is read-only, does not inspect credentials or contact providers, and cannot authorize or trigger any message. It never accepts claimed readiness from a request.

Before an independently approved implementation, require a verified provider and approved environment, verified sender, explicit destination and purpose authorization, channel-specific opt-in and withdrawal/suppression, and transactionally durable idempotency. Bind deduplication to the event, channel, destination and purpose; check suppression again before any send. Evaluate provider acceptance versus delivery as separate facts. Do not enable or claim a transport based on placeholder flags or configuration labels. Do not expose addresses, device tokens, credentials, message contents or keys in readiness output/logs.

The optional `notifications/channel_readiness` view partial is administrator-only and renders static readiness categories, not evidence of configuration. It can be included in an already-authorized notifications/admin view. It adds no route or endpoint. No real recipient data, external messages or account configuration were used.
