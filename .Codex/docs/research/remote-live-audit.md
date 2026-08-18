# Remote and live audit — sanitized summary

Status: production unavailable\
Audit date: 2026-08-18\
Live target: `https://moyoy.vercel.app/`

## Remote baseline

The configured GitHub origin is public and had no commit, branch, tag, or file at audit
time. The local project is an independent Git repository on `main`, and local commit
`c78be61` now establishes the audited code-only foundation. It has not been pushed; no
remote or deployment state was changed by this workflow. The incoming design bundle
remains ignored and untracked.

The observed empty remote is still not a recoverable application baseline. The local
commit provides a recoverable local code/documentation baseline only. Private source
assets must never be included merely to populate the remote, and any push remains a
separate human-authorized action.

## Live state

Network requests reached Vercel successfully, but the hostname returned a
deployment-level error:

- HTTP redirects to HTTPS with `308`;
- HTTPS returns `404`, `text/plain`, and `x-vercel-error: DEPLOYMENT_NOT_FOUND`;
- DNS and TLS succeeded;
- `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, and a missing route all resolved
  to the same platform-level failure.

This is not an application-route 404 and says nothing about the intended LP's rendering
quality. The project may have been removed, moved to another scope, or never attached to
this alias; the historical cause is unverified.

## What could not be audited

Because the audited live target served no application document, the following are **not
verified**:

- desktop, tablet, or mobile rendering;
- HTML semantics, title, description, canonical, Open Graph, structured data, robots,
  sitemap, or language metadata;
- application routes, scripts, styles, fonts, images, or framework output;
- browser console and subresource failures;
- keyboard, screen-reader, motion, form, and modal behavior;
- production security headers beyond Vercel's error response.

Browser-helper page creation timed out, so no viewport screenshot was acquired. Direct
HTTP evidence is sufficient to establish the deployment blocker; no visual or browser
gate is reported as passed.

## Error-response header observation

The Vercel error response included HSTS. CSP, nosniff, referrer, permissions, and
cross-origin policies were not present on that platform error response. Those absences
must not be attributed to the future application.

## Required recovery sequence

1. Preserve the committed local code-only baseline and keep private intake out of any
   future push.
2. Confirm the authorized Vercel team/scope, project, plan, and intended alias.
3. Configure protected Preview before exposing client material.
4. Deploy only after source/privacy, asset rights, and production build gates are
   satisfied and a human authorizes the consequential action.
5. Repeat live checks at 1440×900, 768×1024, and 390×844 after a real deployment.

Gate impact: live/SEO/runtime evidence is absent. Gate E is blocked.
