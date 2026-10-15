# LIM Research Source Discovery / Original-PDF Read Contract v1

**Status:** implemented in LIM source code, mounted fail-closed, and disabled by default. No production source key, Research credential, researcher JWT, or database credential is included in this repository.

This is a server-to-server retrieval contract for the independently operated LIM Research service. It is deliberately separate from the existing push/ACK contract at `POST /api/integrations/lim/reports`.

## Scope and data boundary

The configured source scope is exactly one event code:

- `LIM_RESEARCH_SOURCE_EVENT_CODE`

The event code is server configuration, not a caller-selected scope. The source never exposes these fields through this contract:

- session identifiers
- participant name, phone, or researcher identity
- report snapshot JSON or care text
- encrypted payload, object-storage key, or storage URL
- operational database credentials

The list contains one independent item per archived original-PDF revision. An item is identified by the immutable tuple:

```text
archiveId + revision + pdfSha256
```

## Enablement configuration

All four server-only configuration values are required. Otherwise handlers respond with generic `404 {"error":"not_found"}` and never invoke archive access.

| Name | Required format | Purpose |
|---|---|---|
| `LIM_RESEARCH_SOURCE_ENABLED` | exact text `true` | Explicit feature gate; default is disabled. |
| `LIM_RESEARCH_SOURCE_EVENT_CODE` | non-empty event code | Fixed QA/review event scope. |
| `LIM_RESEARCH_SOURCE_KEY_ID` | `[A-Za-z0-9_-]{1,64}` | Identifies a narrowly scoped source key. |
| `LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64` | canonical base64, decoded length ≥32 bytes | HMAC key. The decoded bytes—not the base64 characters—are used for HMAC. |

A short-lived QA key and QA-only event code must be used for the first integration. No key is added to source control or client code.

## Endpoint 1: discover archived original PDFs

```http
GET /api/integrations/lim/archives?cursor=<opaque>&limit=<1..50>
```

### Request headers

| Header | Required value |
|---|---|
| `X-LIM-Source-Key-Id` | Configured key ID. |
| `X-LIM-Source-Timestamp` | Unix seconds, within ±300 seconds. |
| `X-LIM-Source-Nonce` | UUID v4. |
| `X-LIM-Source-Metadata` | `base64url(UTF8(JSON))`, no padding. |
| `X-LIM-Source-Signature` | Lowercase hexadecimal HMAC-SHA-256. |

### Signed list metadata

```json
{
  "contractVersion": 1,
  "purpose": "discover",
  "eventCode": "<fixed-QA-event-code>",
  "cursor": "<opaque-optional>",
  "limit": 25
}
```

Only `contractVersion`, `purpose`, `eventCode`, optional `cursor`, and optional `limit` are accepted.

### Query binding

The canonical request path excludes the query string, so the source applies these additional checks **before querying LIM archives**:

1. only `cursor` and `limit` are permitted query keys;
2. each key may appear at most once;
3. any query value must be a scalar string;
4. query `cursor` must be exactly equal to the signed metadata `cursor`;
5. query `limit` must be exactly equal to decimal `String(metadata.limit)`;
6. a field absent from signed metadata must be absent from query;
7. any mismatch, repeated key, arbitrary event code, malformed cursor, or extra key returns generic 404.

The opaque response cursor encodes only `{version:1,eventCode,afterId}`. Research must treat it as opaque.

### List response body

```json
{
  "contractVersion": 1,
  "eventCode": "<fixed-QA-event-code>",
  "items": [
    {
      "archiveId": "<uuid>",
      "revision": 3,
      "eventCode": "<fixed-QA-event-code>",
      "templateVersion": "<frozen-template-version>",
      "pdfSha256": "<64-lowercase-hex>",
      "size": 123456,
      "archivedAt": "2026-10-15T20:00:00.000Z"
    }
  ],
  "nextCursor": "<opaque-or-null>"
}
```

The result body is signed as raw bytes; `nextCursor` is therefore integrity-protected.

## Endpoint 2: retrieve an original PDF

```http
GET /api/integrations/lim/archives/<archiveId>/original.pdf
```

This endpoint rejects **every** query parameter.

### Signed PDF metadata

```json
{
  "contractVersion": 1,
  "purpose": "read-original-pdf",
  "eventCode": "<fixed-QA-event-code>",
  "archiveId": "<uuid>",
  "revision": 3,
  "pdfSha256": "<64-lowercase-hex>"
}
```

Before returning raw bytes, LIM verifies that the archived original PDF exists and matches the configured event, archive ID, revision, SHA-256, stored size, and frozen template version. It also verifies the existing archive ciphertext integrity before bytes reach this contract. Maximum PDF response size is **15 MiB**.

Successful body:

```http
Content-Type: application/pdf
Cache-Control: no-store
```

The body is the original PDF raw bytes only—no JSON envelope is mixed into the PDF.

## Canonical request signature

All fields are UTF-8. Join the following rows with LF (`\n`), with **no terminal LF**:

```text
LIM_RESEARCH_SOURCE_V1
GET
<path-without-query>
<keyId>
<unix-seconds>
<nonce-uuid-v4>
<metadata-base64url>
```

Allowed `path-without-query` values:

```text
/api/integrations/lim/archives
/api/integrations/lim/archives/<archiveId>/original.pdf
```

Compute:

```text
lowercase_hex(HMAC-SHA-256(decoded-source-key, canonical-request))
```

## Signed response headers

Every successful list/PDF response includes:

| Header | Value |
|---|---|
| `X-LIM-Source-Metadata` | `base64url(UTF8(JSON response metadata))` |
| `X-LIM-Response-Signature` | Lowercase hexadecimal HMAC-SHA-256 |
| `Cache-Control` | `no-store` |

List response metadata:

```json
{
  "contractVersion": 1,
  "purpose": "discover",
  "eventCode": "<fixed-QA-event-code>"
}
```

PDF response metadata:

```json
{
  "contractVersion": 1,
  "purpose": "read-original-pdf",
  "eventCode": "<fixed-QA-event-code>",
  "archiveId": "<uuid>",
  "revision": 3,
  "templateVersion": "<frozen-template-version>",
  "size": 123456,
  "pdfSha256": "<64-lowercase-hex>"
}
```

Canonical response uses UTF-8/LF/no terminal LF:

```text
LIM_RESEARCH_SOURCE_RESPONSE_V1
<requestNonce>
<httpStatus>
<responseMetadata-base64url>
sha256(rawResponseBytes)
```

Compute:

```text
lowercase_hex(HMAC-SHA-256(decoded-source-key, canonical-response))
```

Research must verify the signature on the exact raw response bytes, then match `archiveId`, `revision`, `eventCode`, `templateVersion`, `pdfSha256`, and size before committing its own durable ledger claim/receipt.

## Reconciliation strategy

LIM does not persist a Research outbox or delivery status in its operational database. The independent Research ledger is the durable receipt/claim authority.

Each Research sweep starts again at cursor zero and walks all eligible archived PDF rows in LIM’s stable internal primary-key order, scoped to one event. It must not rely on `createdAt`, `archivedAt`, or an ever-advancing permanent cursor: a late archive could otherwise be missed if insertion ordering or timing differs. Repeated full sweeps are safe because Research deduplicates by `(archiveId, revision, pdfSha256)`.

The source only lists rows where `pdfStatus="archived"`, and each `sessionId + reportRevision` is immutable and uniquely archived in LIM.

## Error behavior

- Disabled source, bad/missing HMAC, stale timestamp, wrong event, malformed metadata, query mismatch, unknown archive, or revision/hash mismatch: generic `404 {"error":"not_found"}`.
- Temporary source/storage failure after successful authentication: `503 {"error":"source_unavailable"}`.
- No redirect is accepted or emitted.

## QA rollout boundary

1. Configure a QA-only event code and one narrowly scoped, short-lived source key.
2. Create only a synthetic LIM test participant/report through the actual approved report/PDF archive flow.
3. Research runs discovery, persists its own claim/receipt, reads the matching PDF, and feeds its existing receiver/OCR path.
4. Compare synthetic `archiveId/revision/hash/size`, Research receipt, SQL ledger state, and research XLSX output.
5. Disable the source key after the limited test and review results before broader access.
