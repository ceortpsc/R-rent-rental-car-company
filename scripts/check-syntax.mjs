import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dirs=['lib','api','tests'],scripts=['app.js','api-ui.js'];
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())walk(p);else if(item.name.endsWith('.js')||item.name.endsWith('.mjs'))scripts.push(p);}}
for(const dir of dirs)walk(dir);
let failures=0;for(const file of scripts){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){failures++;console.error('FAIL',file,r.stderr);}else console.log('PASS',file);}
console.log(scripts.length+' syntax files checked; failures='+failures);
if(failures)process.exit(1);
