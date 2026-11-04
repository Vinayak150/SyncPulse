// Optional release acceptance; run with Playwright installed separately.
// TEST_BASE_URL=http://localhost:4111 npm run test:browser
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
(async()=>{
const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),timeout:25000,args:['--disable-background-networking','--disable-extensions']});
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4111/',page=await b.newPage({viewport:{width:1400,height:850}});
const errors=[],bad=[];let pass=0;
page.on('pageerror',e=>errors.push(e.message));
async function ck(n,fn){try{await fn();console.log('PASS FINAL-'+String(++pass).padStart(2,'0'),n)}catch(e){bad.push(n+': '+e.message);console.log('FAIL',n,e.message.slice(0,210))}}
const m=(score,status,obs)=>({id:'t:wta:final-audit',sport:'tennis',home:'Player A',away:'Player B',league:'Independent tournament',stage:'Round 2',status,providerStatus:status==='FINAL'?'Final':'In Progress',scoreText:score,startTime:new Date().toISOString(),updatedAt:null,events:[],observedAt:obs});
const catalog=(match,fetchAt)=>({sport:'tennis',status:'OK',matches:[match],source:{name:'Test provider',url:'https://www.espn.com/tennis/'},fetchedAt:fetchAt,message:'Controlled browser fixture. Not shown as an official live provider.'});
const ts1='2026-11-04T11:00:00.000Z',ts2='2026-11-04T11:15:00.000Z';
let version=0;const records=[catalog(m('6 / 3','LIVE',null),ts1),catalog(m('6 / 3','FINAL',null),ts2)];
await page.route('**/api/sports/matches?sport=tennis',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(records[Math.min(version++,records.length-1)])}));
await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelectorAll('.lc-match').length===1,{timeout:10000});
await ck('Clear three-step onboarding visible',async()=>{if(await page.locator('.lc-step').count()!==3)throw Error('Steps missing')});
await ck('Fixture card has no result or final-status spoiler',async()=>{const t=await page.locator('.lc-match').first().innerText();if(t.includes('6 / 3')||t.includes('FINAL'))throw Error(t)});
await page.locator('.lc-match').first().click();
await ck('Initial match remains shielded',async()=>{if(!(await page.locator('#lcVisibleScore').innerText()).includes('hidden'))throw Error('Score leaked')});
await ck('Initial status remains shielded',async()=>{if(!(await page.locator('#lcVisibleMatchStatus').innerText()).includes('protected'))throw Error('Status leaked')});
await page.locator('#lcReveal').click();
const tFirst=await page.locator('#lcSourceTime').innerText();
await ck('Initial reveal presents match score and status',async()=>{if((await page.locator('#lcVisibleScore').innerText())!=='6 / 3')throw Error('Score missing');if(!(await page.locator('#lcVisibleMatchStatus').innerText()).includes('In Progress'))throw Error('Status missing')});
await page.locator('#lcRefresh').click();await page.waitForFunction(()=>document.querySelector('#lcPending')?.textContent?.includes('1 source snapshot'),{timeout:12000});
await ck('Finished status stays shielded on fixture cards',async()=>{const t=await page.locator('.lc-match').first().innerText();if(t.includes('FINAL')||t.includes('Final'))throw Error(t)});
await ck('Finished status stays shielded in selected match details',async()=>{if((await page.locator('#lcSelected').innerText()).includes('Final'))throw Error('Status leaked')});
await ck('Finished status stays shielded in viewer status until reveal',async()=>{if(!(await page.locator('#lcVisibleMatchStatus').innerText()).includes('In Progress'))throw Error('Future leaked')});
await ck('Previously revealed snapshot time does not drift',async()=>{if((await page.locator('#lcSourceTime').innerText())!==tFirst)throw Error('Time drifted: '+tFirst)});
await page.locator('#lcReveal').click();
await ck('Final status appears after explicit reveal',async()=>{if(!(await page.locator('#lcVisibleMatchStatus').innerText()).includes('Final'))throw Error('Final not revealed')});
await ck('No browser exception',async()=>{if(errors.length)throw Error(errors.join('; '))});
const mobile=await b.newPage({viewport:{width:390,height:844},isMobile:true});
await mobile.goto(base,{waitUntil:'domcontentloaded'});
await ck('Mobile onboarding fits narrow width',async()=>{const x=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,steps:document.querySelectorAll('.lc-step').length}));if(x.scroll>x.width+5||x.steps!==3)throw Error(JSON.stringify(x))});
console.log('RELEASE_BROWSER',JSON.stringify({pass,failures:bad}));
await b.close();if(bad.length)process.exitCode=1;
})().catch(e=>{console.error('FINAL_FATAL',e.message);process.exitCode=1});
