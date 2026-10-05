# APEX sharing service

The editor stays on public GitHub Pages. A separate public Sites Worker stores
immutable circuit snapshots in its provisioned R2 bucket (`BUCKET`). Source:
[`worker.js`](worker.js). No secrets are shipped to the browser.

- Site project: `appgprj_6ac3f2ba17548191aceb7fff9acedb03`
- URL: https://apex-circuit-sharing.art-zomorodian.chatgpt.site
- Hosting manifest: `{"project_id":"appgprj_6ac3f2ba17548191aceb7fff9acedb03","d1":null,"r2":"BUCKET"}`
- `POST /api/circuits`: `{track, image?: JPEG data URL}` → `{code, createdAt}`.
- `GET /api/circuits/:code`: schema 1 snapshot, or a 404 with a helpful message.
- Exactly 14 random decimal digits, stored as a string including leading zeros.
- Snapshots are immutable. Codes do not expire automatically.
- Maximum request size: 3 MB. Track JSON is limited to 200,000 characters;
  uploaded image data URLs to 2,800,000 characters. Arrays and coordinates are
  bounded. The editor sanitizes imported data before use.
- CORS allows the public editor origin and its default local development origins.
- A per-Worker upload throttle reduces rapid repeats; it is not a global quota.
- Anyone with a code can download that snapshot. This is public sharing, not
  private storage. Uploaded reference images are included only when selected.

Publish updates using the Sites skill and its source/packaging helper in the
isolated checkout under `artifacts/sharing-service`. Keep the same project ID
and audience. Copy `worker.js` to the selected checkout's `worker/index.js`;
build output is `dist/server/index.js` with `dist/.openai/hosting.json`.
Credentials must stay in session memory and be passed to the helper through
stdin. Do not add tokens or circuit snapshots to this repository.
