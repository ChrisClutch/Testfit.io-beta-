# Cloudflare deployment

Target: the existing `testfit-io-beta` static-assets Worker. `wrangler.jsonc` contains the Worker name, compatibility date `2026-10-12` (matching the existing dashboard), and `./dist` asset directory. There is no backend entry point, account ID, token, new domain or preview configuration.

After this configuration is published to the feature branch, the intended production build settings are:

- Production branch: `feature/clutch-propdev-v2`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The previously supplied full deploy command with `--assets ./dist --name testfit-io-beta --compatibility-date 2026-10-12` also agrees with this configuration. Do not change the command to `wrangler preview` for a production deployment.

Cloudflare's documented branch flow: set the production branch in Settings > Builds; a push to that branch runs the build and deploy commands. Saved build settings apply to the next build and retries. Sources checked October 17, 2026:

- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

The inspected official pages do not establish the exact branch-selection controls in the current New deployment dialog. The user's last manual build explicitly selected `main` and built version 0.2.0. Do not assume that retrying that build switches it to the feature branch. Prefer the documented push-triggered production build after confirming the saved branch setting.

Chris authorized pushing this configuration on October 17, 2026; a push can trigger production. The other Worker connected to this repository (`clutch-re-development-feasibiity`) is outside this configuration's target; do not change its settings or permissions as part of this fix.

Validation: `npm run build` passed. Wrangler 4.151.1 `deploy --dry-run` passed, reading six files from `dist` and exiting without uploading. Temporary npm cache, Wrangler logs and configuration storage were redirected to `/tmp` because the executor's default home paths are unavailable. This verifies local packaging/configuration, not account permissions or a successful live deployment. Deployment success must be checked separately after the authorized push.
