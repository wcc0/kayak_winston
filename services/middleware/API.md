# Middleware API Specification

This document describes the REST-based middleware service used to interface front-end producers and back-end Kafka consumers.

Base URL: `/` (FastAPI)

Common HTTP responses
- 200 OK: success
- 202 Accepted: message accepted for async processing
- 400 Bad Request: validation error; response includes `error` field
- 502 Bad Gateway: downstream error (Kafka or DB unreachable)
- 500 Internal Server Error: unexpected server error

Endpoints

1) POST /ingest
- Purpose: Accept a single supplier record (JSON) or an array of records and publish each to Kafka topic `raw_supplier_feeds`.
- Request body: single object or array of objects. Each record contains supplier fields (e.g., `listing_id`, `date`, `price`, `availability`, `amenities`, `neighbourhood`).
- Response: 202 Accepted with JSON: `{ "accepted": n, "rejected": m, "details": [...] }`.
- Errors: 400 if payload invalid; 502 if Kafka unreachable (with `error` message).

2) POST /produce-row
- Purpose: Publish a single normalized row directly to a target topic (useful for manual tests).
- Request body: `{ "topic": "deals.normalized", "payload": { ... } }`.
- Response: 200 OK `{ "status": "ok", "topic": "..." }` or 502 on failure.

3) POST /upload-csv
- Purpose: Accept multipart CSV upload or `url` to CSV file. The middleware will stream rows (optionally via Kafka Connect FileStreamSource) to `raw_supplier_feeds`.
- Request body (multipart/form-data): `file` or JSON `{ "url": "https://.../slice.csv" }`.
- Response: 202 Accepted `{ "message": "ingestion started", "job_id": "..." }`.

4) GET /status
- Purpose: Returns service health and Kafka connectivity info.
- Response: 200 OK `{ "service": "ok", "kafka": { "connected": true/false, "brokers": [...] } }`.

5) GET /health
- Purpose: Simple health check.
- Response: 200 OK `{ "status": "ok" }`.

Failure semantics & retries
- On Kafka unavailability, the middleware returns 502 with an `error` message and retries asynchronously if configured (background job). For critical paths, clients should consider exponential backoff.
- Validation errors return 400 with details about invalid fields.

Security
- Intended to run on trusted internal network; authentication (e.g., API keys or mTLS) can be added via headers. For MVP no auth is enforced.

Notes
- The middleware is intentionally lightweight and acts as a REST->Kafka bridge for CSV/JSON ingestion.
- For local testing without Kafka, the middleware supports a `DIRECT_OUTPUT_URL` to forward normalized rows to an HTTP endpoint.
