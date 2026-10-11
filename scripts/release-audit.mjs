// R-Rent launch source-only audit. No network, database, finance, or provider actions.
import {readFileSync,existsSync} from 'node:fs';
import {LAUNCH_MODULES,validateManifest,evaluateLaunch} from '../lib/launch-registry.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const v=JSON.parse(read('vercel.json'));
const contract=JSON.parse(read('openapi.json'));
const features=JSON.parse(read('config/feature-registry.json'));
const manifest=JSON.parse(read('config/release-manifest.json'));
const checks=[
 ['launch_registry_unique_and_valid',validateManifest()&&LAUNCH_MODULES.length===17],
 ['public_dashboard_route',v.rewrites.some(x=>x.source==='/launch'&&x.destination==='/launch.html')],
 ['read_only_api_route',v.rewrites.some(x=>x.source==='/api/v1/launch'&&x.destination==='/api/v1/health?mode=launch')],
 ['openapi_3_1_launch_endpoint',contract.openapi==='3.1.0'&&Boolean(contract.paths['/api/v1/launch']?.get)],
 ['default_off_feature_flags',features.no_auto_enable===true&&features.features.every(x=>x.default===false)],
 ['no_production_release_authorization',manifest.release_authorized===false&&manifest.production_sensitive_actions_enabled===false],
 ['governance_and_evidence_log',existsSync(new URL('../docs/LAUNCH_COMPLIANCE_LOG_2026-10-11.md',import.meta.url))],
 ['security_and_retention_policy',existsSync(new URL('../docs/security/CYBERSECURITY_PROGRAM.md',import.meta.url))&&existsSync(new URL('../docs/security/DATA_HANDLING_AND_DISPOSAL.md',import.meta.url))],
 ['stripe_paypal_evidence_mandated',LAUNCH_MODULES.filter(x=>['stripe','paypal'].includes(x.id)).every(x=>x.evidence?.length>0)],
 ['release_and_esign_fail_closed',LAUNCH_MODULES.filter(x=>['dispatch','esign'].includes(x.id)).every(x=>x.evidence?.length>0)],
 ['unverified_status_visible',read('launch.html').includes('NOT A PRODUCTION AUTHORIZATION')&&read('launch.js').includes('NOT_CERTIFIED_FOR_FULL_TRANSACTIONS')]
];
const result=evaluateLaunch({generatedAt:new Date().toISOString()});
const report={
 report_type:'SOURCE_GOVERNANCE_CHECK_NOT_EXTERNAL_CERTIFICATION',
 source_checks:checks.map(([check,pass])=>({check,pass})),
 source_passed:checks.filter(x=>x[1]).length,
 source_total:checks.length,
 production_approved:false,
 release_status:result.release_status,
 restricted_activated:0,
 complete:checks.every(x=>x[1]),
 operational_provider_evidence:'NOT_RETRIEVED_BY_THIS_SCRIPT'
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(!report.complete)process.exitCode=1;
