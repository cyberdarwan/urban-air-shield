<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git Workflow Policy

1. Always work on and push to the `dev` branch by default (`git checkout dev && git push -u origin dev`).
2. NEVER push directly to `main` or merge `dev` into `main` unless explicitly instructed by the user to deploy/promote to `main` in that message.
3. Always run `npm run build` and verify zero errors before committing or pushing to `dev`.

