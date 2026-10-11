// Run locally or in CI. No secret values ever printed.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);
const mode=args[0]||'check';
const environment=args[1]||'staging';
if(!['check','deploy'].includes(mode)||!['staging','production'].includes(environment)){
 console.error('Usage: node scripts/cloudflare-preflight.mjs [check|deploy] [staging|production]');
 process.exit(2);
}
let config;try{config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));}catch{
 console.error('Invalid wrangler.jsonc');process.exit(2);
}
const checks=[
 ['Cloudflare Worker name',/^r-rent-edge(?:-[a-z-]+)?$/.test(config.name||'')],
 ['Entrypoint exists',config.main==='./workers/edge.js'],
 ['Worker runtime date',/^\d{4}-\d{2}-\d{2}$/.test(config.compatibility_date||'')],
 ['Worker environments',!!config.env?.staging?.name&&!!config.env?.production?.name],
 ['No broad site takeover',!config.routes&&!config.route&&!config.env?.staging?.routes&&!config.env?.production?.routes],
 ['Explicit public scope',config.env?.production?.vars?.RR_ENVIRONMENT==='production'],
 ['Worker has no access tokens in config',!/api[_-]?token|service[_-]?role|private[_-]?key|password|secret/i.test(JSON.stringify(config))]
];
let failed=0;for(const [label,ok] of checks){if(!ok){console.error('FAIL:',label);failed++;}else console.log('PASS:',label);}
if(mode==='deploy'){
 const hasToken=Boolean(process.env.CLOUDFLARE_API_TOKEN&&process.env.CLOUDFLARE_API_TOKEN.length>20);
 const hasAccount=Boolean(process.env.CLOUDFLARE_ACCOUNT_ID&&/^[a-f\d]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID));
 if(!hasToken){failed++;console.error('MISSING: CLOUDFLARE_API_TOKEN (provide through a trusted shell/CI secret)');}
 if(!hasAccount){failed++;console.error('MISSING: CLOUDFLARE_ACCOUNT_ID (verified Cloudflare account)');}
}
if(failed){console.error('Cloudflare Wrangler preflight blocked; no deployment attempted.');process.exit(2);}
console.log('Preflight passed for '+environment+'; this does not verify Cloudflare authorization or live DNS.');
