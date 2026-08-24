# Nodestream Rep Desk

Internal portal for Account Executives — dashboard, the three interactive selling tools, and reference material in one place.

## What's inside

```
nodestream-repdesk/
├── index.html        # the portal shell (dashboard, nav)
├── portal.js         # navigation + dashboard logic
└── tools/
    ├── discovery.html      # Discovery & Qualification scorecard
    ├── configurator.html   # Deal Configurator / ROI calculator
    └── quote.pdf           # Fillable GPUaaS quote template
```

Everything is static — no backend, no build step. The tools load inside the portal as embedded frames.

## Run it locally

Open a terminal in this folder and run any static server, e.g.:

```
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. (Opening `index.html` directly with `file://` will not load the embedded tools — browsers block frame loading over `file://`. Use a server.)

## Deploy it for the team

Any static host works. Two quick options:

- **Netlify:** drag this folder onto app.netlify.com/drop. Live in seconds.
- **Vercel:** `vercel` from this folder, or import the folder in the dashboard.
- **Internal server / SharePoint / S3:** upload the folder, point at `index.html`.

## IMPORTANT — access control (read before deploying)

This portal contains **internal economics**: the Deal Configurator shows cost basis, blended cost, and margin, and the dashboard shows pipeline figures. **None of this should be publicly reachable.** The site has no built-in login — access control is the host's job:

- **Netlify:** enable *Site protection → Password* (or Identity/SSO on paid tiers).
- **Vercel:** enable *Deployment Protection* (password or SSO).
- **Internal:** put it behind your VPN / SSO / IP allowlist.

Do not deploy to a public URL without one of the above.

## Before external use

Every number in here — pipeline, KPIs, rate-card rates, cost basis, persona pricing comps — is **illustrative / observed, not a rate card**. Confirm live figures with the HPC Division before anything leaves the building. The customer-facing quote (tools/quote.pdf) is the only asset designed to go to a client, and even that needs real rates filled in per deal.

## Customizing

- **Dashboard data** (KPIs, pipeline, tasks, rep name): edit the JSON in the `<script id="portal-data">` block at the bottom of `index.html`.
- **Reference links** (Playbook & Docs tab): edit the `refs` array in `portal.js` — replace the placeholder `#` links with your live Google Drive URLs.
- **Updating a tool:** replace the file in `tools/`. The portal always loads the current version.
