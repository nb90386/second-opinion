# Development contract
Read docs/BRIEF.md and DESIGN.md. Preserve user edits. Use current framework documentation (Context7 library resolution then docs; installed Next docs under node_modules/next/dist/docs are an offline fallback with the retrieval failure recorded).
Use Claude for implementation, then Codex independently. Run npm run typecheck, npm run lint, npm test, npm run build, npm run test:browser, npm run test:a11y. Unavailable checks are not passed. Inspect screenshots, keyboard focus, touch targets and reduced motion. No generic card grids, glass, decorative motion or dependencies without a user benefit.
No global installation, user-config changes, secrets, commits, deployment or Forge agent execution. Optional integration guides do not provision services or install SDKs.
