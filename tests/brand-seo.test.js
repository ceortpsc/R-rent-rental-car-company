import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const seo=read('seo.js'),app=read('app.js'),care=read('care.js'),index=read('index.html'),sign=read('sign.html'),sitemap=read('sitemap.xml'),icon=read('assets/r-rent-brand-icon.svg');
test('brand icon is an original accessible SVG used by public and signature pages',()=>{
 assert.match(icon,/<svg /);assert.match(icon,/viewBox="0 0 128 128"/);
 assert.match(icon,/<title/);assert.match(icon,/#BF9B56/);
 assert.ok(index.includes('/assets/r-rent-brand-icon.svg'));
 assert.ok(sign.includes('/assets/r-rent-brand-icon.svg'));
 assert.ok(app.includes('/assets/r-rent-brand-icon.svg'));
});
test('canonical and structured metadata target the requested production domain',()=>{
 assert.ok(seo.includes('const BASE="https://rtpscrentalcars.com"'));
 assert.ok(index.includes('rel="canonical" href="https://rtpscrentalcars.com/"'));
 assert.ok(sitemap.includes('https://rtpscrentalcars.com/fleet/trailblazer-2026'));
 assert.ok(sitemap.includes('https://rtpscrentalcars.com/fleet/bronco-sport-2026'));
 assert.ok(!sitemap.includes('r-rent-rental-cars.vercel.app'));
});
test('public pages and customer care share visible headings and subheadings',()=>{
 for(const url of ['/fleet','/book','/fees','/agreements','/requirements','/security','/about','/contact','/feedback','/reviews','/complaints','/disputes','/refund-policy','/privacy','/terms']){
   assert.ok(seo.includes('"'+url+'":{heading:'),'missing page heading '+url);
 }
 assert.match(app,/window\.RRentSEO\.copy/);
 assert.match(care,/window\.RRentSEO\.copy/);
 assert.ok(seo.includes('$89.99/day'));
 assert.ok(seo.includes('$59.00/day'));
 assert.ok(seo.includes('not yet active'));
});
