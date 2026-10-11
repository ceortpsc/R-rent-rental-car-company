import os from 'node:os';
import {existsSync} from 'node:fs';
const inActions=process.env.GITHUB_ACTIONS==='true';
const mode=process.env.RUNNER_ENVIRONMENT||'LOCAL';
const major=Number(process.versions.node.split('.')[0]);
console.log(JSON.stringify({node_major:major,os:os.platform(),arch:os.arch(),runner_environment:mode,in_github_actions:inActions},null,2));
if(major!==22)throw new Error('R-Rent CI needs Node.js 22');
if(inActions){
 if(process.env.GITHUB_REPOSITORY!=='ceortpsc/R-rent-rental-car-company')throw new Error('Unexpected runner repository');
 if(mode!=='self-hosted' && process.env.GITHUB_EVENT_NAME!=='pull_request' && process.env.GITHUB_REF==='refs/heads/main')throw new Error('Trusted main jobs must use a self-hosted runner');
 if(mode==='self-hosted'){
  const ref=process.env.GITHUB_REF||'',evt=process.env.GITHUB_EVENT_NAME||'';
  if(evt==='pull_request')throw new Error('Pull request code must not execute on a self-hosted runner');
  if(ref!=='refs/heads/main')throw new Error('Unexpected self-hosted branch');
  if(process.env.RUNNER_OS!=='Linux')throw new Error('R-Rent self-hosted jobs require Linux');
  if(!process.env.RUNNER_TEMP||!existsSync(process.env.RUNNER_TEMP))throw new Error('Runner temp directory unavailable');
 }
}
console.log('PASS runner runtime and trusted repository baseline');
