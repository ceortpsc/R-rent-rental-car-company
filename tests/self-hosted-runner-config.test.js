import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('trusted main quality gates target the dedicated self-hosted CI labels',()=>{
  const w=load('.github/workflows/quality.yml');
  assert.match(w,/runs-on:\s*\$\{\{/);
  assert.match(w,/self-hosted/);
  assert.match(w,/rrent-ci/);
  assert.match(w,/github\.event_name != 'pull_request'/);
  assert.match(w,/github\.ref == 'refs\/heads\/main'/);
  assert.match(w,/ubuntu-latest/);
  assert.doesNotMatch(w,/pull_request_target:/);
  assert.doesNotMatch(w,/secrets\./);
  assert.match(w,/node scripts\/runner-preflight\.mjs/);
  assert.match(w,/npm run ci:security/);
});
test('Cloudflare edge PRs remain isolated and staging tasks are self-hosted',()=>{
  const review=load('.github/workflows/rrent-cloudflare-edge.yml');
  const deploy=load('.github/workflows/rrent-cloudflare-deploy-staging.yml');
  assert.match(review,/rrent-ci/);
  assert.match(review,/ubuntu-latest/);
  assert.match(review,/github\.event_name != 'pull_request'/);
  assert.match(deploy,/runs-on: \[self-hosted, linux, rrent-ci\]/);
  assert.match(deploy,/runs-on: \[self-hosted, linux, rrent-deploy\]/);
  assert.match(deploy,/environment: rrent-edge-staging/);
  assert.match(deploy,/STAGE_RRENT_EDGE/);
  assert.match(deploy,/node scripts\/runner-preflight\.mjs/);
  assert.match(deploy,/if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}/);
  assert.doesNotMatch(deploy,/pull_request_target:/);
  assert.doesNotMatch(deploy,/deploy --env production/);
});
test('runner preflight enforces repository, protected branch and no PR on privileged host',()=>{
  const p=load('scripts/runner-preflight.mjs');
  for(const v of ['GITHUB_REPOSITORY','ceortpsc/R-rent-rental-car-company','GITHUB_REF','GITHUB_EVENT_NAME','RUNNER_ENVIRONMENT','RUNNER_TEMP','RUNNER_OS'])assert.ok(p.includes(v),v);
  assert.match(p,/evt==='pull_request'/);
  assert.match(p,/ref!=='refs\/heads\/main'/);
});
test('no self-hosted credential injection in public pull request workflow',()=>{
  const y=load('.github/workflows/quality.yml');
  assert.doesNotMatch(y,/CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(y,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(y,/STRIPE_SECRET_KEY/);
});
