// Local UI regression only. Auth responses below are explicit test doubles.
import http from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import handler from '../api/v1/manage.js';
import {managementDescriptor} from '../lib/management-policy.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const routing=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8'));
const proofs=await mkdtemp(resolve(tmpdir(),'rrent-management-browser-'));
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/api/v1/manage')return handler(req,res);const name=(routing.rewrites.find(rule=>rule.source===path)?.destination||path).slice(1);const data=await readFile(resolve(root,name));res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.RR_BROWSER_EXECUTABLE_PATH,args:process.env.RR_BROWSER_SINGLE_PROCESS==='true'?['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']:[]});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(origin+'/management');await page.getByText('Management is locked while',{exact:false}).waitFor();if(await page.locator('#sign-in').isVisible())throw Error('locked login visible');
await page.screenshot({path:resolve(proofs,'management-locked.png'),fullPage:true});
await page.getByRole('link',{name:'staff privacy and access notice',exact:true}).click();
await page.getByRole('heading',{name:'Staff privacy and access notice',exact:true}).waitFor();
await page.getByRole('heading',{name:'Retention and privacy requests',exact:true}).waitFor();
await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('staff notice mobile overflow');
await page.getByRole('link',{name:'Return to management',exact:true}).click();
await page.getByText('Management is locked while',{exact:false}).waitFor();
await page.goto(origin+'/staff-privacy.html');await page.getByRole('heading',{name:'Staff privacy and access notice',exact:true}).waitFor();
await page.goto(origin+'/management');await page.setViewportSize({width:1440,height:1000});
let signedIn=false,mfa=false;const calls=[];const factor='33333333-3333-4333-8333-333333333333';
await page.route('**/api/v1/manage?*',async route=>{const req=route.request(),action=new URL(req.url()).searchParams.get('action');calls.push(action);let data={},status=200;
if(action==='status')data={approved_for_management:true};
if(action==='session'){if(!signedIn){status=401;data={error:'session_denied'};}else data={authenticated:true,user:{id:'11111111-1111-4111-8111-111111111111',email:'manager@example.invalid'},aal:mfa?'aal2':'aal1',factors:[{id:factor,type:'totp',status:'verified'}],pending_invitation:false,management:mfa?managementDescriptor({role:'RENTAL_MANAGER',aal:'aal2',active:true}):null,assignable_roles:[]};}
if(action==='refresh'&&!signedIn){status=401;data={error:'session_denied'};}
if(action==='login'){const body=req.postDataJSON();if(body.role||body.tenant)throw Error('browser supplied authority');signedIn=true;data={authenticated:true,mfa_required:true};}
if(action==='mfa-verify'){mfa=true;data={mfa_verified:true};}
if(action==='logout'){signedIn=false;mfa=false;data={signed_out:true};}
await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});});
await page.reload();await page.locator('#login').waitFor({state:'visible'});await page.locator('#login input[name=email]').fill('manager@example.invalid');await page.locator('#login input[name=password]').fill('browser-test-password');await page.locator('#login button').click();await page.locator('#verify-mfa').waitFor({state:'visible'});
if(await page.locator('#workspace').isVisible())throw Error('first factor entered workspace');await page.locator('#verify-mfa input[name=code]').fill('123456');await page.locator('#verify-mfa button').click();await page.locator('#workspace').waitFor({state:'visible'});
for(const id of ['team-tools','proposal-tools','approval-tools','audit-tools'])if(await page.locator('#'+id).isVisible())throw Error('manager IAM tools visible');
await page.screenshot({path:resolve(proofs,'management-manager.png'),fullPage:true});
await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow');
if(await page.evaluate(()=>localStorage.length+sessionStorage.length)!==0)throw Error('browser storage used');
await page.locator('#logout').click();await page.locator('#sign-in').waitFor({state:'visible'});if(await page.locator('#workspace').isVisible())throw Error('workspace remained after logout');if(errors.length)throw Error(errors.join('\n'));
console.log(JSON.stringify({checks:['staff notice direct and clean URL routes','staff notice accessible before sign-in and mobile layout','locked deployment','password login to MFA gate','MFA to assigned manager view','IAM controls denied','mobile layout','no browser token storage','logout clears workspace'],pageErrors:errors,calls}));await browser.close();server.close();
