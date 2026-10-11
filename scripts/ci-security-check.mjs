import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const check=(condition,message)=>{if(!condition)throw new Error('R-Rent CI policy: '+message);};
const policy=JSON.parse(read('config/feature-registry.json'));
check(policy.no_auto_enable===true,'feature registry must remain default-off');
check(Array.isArray(policy.features)&&policy.features.length>10,'feature registry missing');
for(const feature of policy.features){
 check(feature.default===false,'feature '+feature.key+' must default false');
 check(Array.isArray(feature.requires)&&feature.requires.length>0,'feature '+feature.key+' missing dependencies');
}
const cfg=JSON.parse(read('cloudflare/rrent-edge/wrangler.jsonc'));
check(cfg.workers_dev===false&&!cfg.routes&&!cfg.route,'Worker must have no public production route');
check(cfg.preview_urls===false,'production preview URLs must be disabled');
check(cfg.vars.RR_PRIVATE_ACTIONS_ENABLED==='false','privileged production actions cannot activate');
check(cfg.env?.staging?.vars?.RR_PRIVATE_ACTIONS_ENABLED==='false','privileged staging actions cannot activate');
const worker=read('cloudflare/rrent-edge/src/index.js');
check(worker.includes('ctx.access.getIdentity()'),'Access runtime identity verification required');
check(worker.includes('CF_ACCESS_AUD')&&worker.includes('RR_STAFF_ALLOWLIST'),'AUD and approved staff allowlist required');
check(worker.includes('PRIVATE_ACTION_BLOCKED'),'private path gate missing');
const deployment=read('.github/workflows/rrent-cloudflare-deploy-staging.yml');
check(deployment.includes("github.ref == 'refs/heads/main'"),'staging deployment main-only');
check(deployment.includes('STAGE_RRENT_EDGE'),'manual confirmation required');
check(deployment.includes('environment: rrent-edge-staging'),'staging environment control required');
check(!deployment.includes('pull_request_target:'),'deploy workflow must not use pull_request_target');
check(!deployment.includes('deploy --env production'),'production Worker deployment forbidden');
const quality=read('.github/workflows/quality.yml');
check(quality.includes('pull_request:')&&quality.includes('branches: [main]'),'main PR quality gate required');
check(!quality.includes('pull_request_target:'),'PR workflow must not use pull_request_target');
check(!quality.includes('secrets.'),'PR quality workflow must not access deployment secrets');
check(quality.includes("github.event_name != 'pull_request'")&&quality.includes("github.ref == 'refs/heads/main'"),'self-hosted quality jobs must be limited to trusted main');
check(quality.includes('["self-hosted","linux","rrent-ci"]'),'trusted quality jobs must use dedicated Linux self-hosted label');
check(quality.includes("'ubuntu-latest'"),'untrusted PR quality checks must remain GitHub-hosted');
const accessCheck=read('.github/workflows/rrent-cloudflare-edge.yml');
check(accessCheck.includes("github.event_name != 'pull_request'")&&accessCheck.includes("github.ref == 'refs/heads/main'"),'Cloudflare edge PRs cannot use self-hosted runners');
check(accessCheck.includes('["self-hosted","linux","rrent-ci"]'),'Cloudflare edge trusted checks need rrent-ci runner');
check(accessCheck.includes("'ubuntu-latest'"),'Cloudflare edge PR checks require hosted fallback');
check(deployment.includes('runs-on: [self-hosted, linux, rrent-ci]'),'staging verify needs self-hosted CI runner');
check(deployment.includes('runs-on: [self-hosted, linux, rrent-deploy]'),'staging deployment needs isolated self-hosted deploy runner');
check(deployment.includes("if: ${{ github.ref == 'refs/heads/main' }}"),'staging verify must only check trusted main');
check(deployment.includes('node scripts/runner-preflight.mjs'),'staging verification/deployment must validate runner');
check(quality.includes('node scripts/runner-preflight.mjs'),'runner preflight must run before application tests');
const vercel=JSON.parse(read('vercel.json'));
check(vercel.rewrites.some(r=>r.source==='/api/v1/readiness'),'readiness endpoint required');
for(const p of ['.github/CODEOWNERS','.github/pull_request_template.md','docs/GITHUB_ACTIONS_PR_GOVERNANCE.md']){
 check(existsSync(p),'governance file missing: '+p);
}
console.log('PASS: security-default features, Access, staging, PR and governance boundaries');
