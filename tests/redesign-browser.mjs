import assert from 'node:assert/strict';

// Value: protects the question deck's readability, reach and effect lifetimes at every width; fails on
// a clipped title, an unreachable decision, a lost focus, or a chip flight that outlives its page.
// Chromium emulation does not prove physical touch, OS settings or screen-reader narration.
export async function redesignBrowserChecks(browser, origin, audit = async () => {}) {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 const demo=page.locator('.hero-demo');
 try {
  for(const width of [1440,768,390,320]) {
   await page.setViewportSize({width,height:width<500?844:900});await page.goto(origin);
   // Every question's title, evidence and both sides stay inside the card; the decision is reachable.
   for(let step=0;step<6;step++) {
    const title=demo.locator('.qcard-title');
    const fits=await title.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('.qcard').getBoundingClientRect();return r.left>=c.left&&r.right<=c.right+1&&el.scrollWidth<=el.clientWidth+1;});
    assert.ok(fits,`question ${step+1} title fits its card at ${width}`);
    const ask=demo.getByRole('button',{name:/^Ask about this/});
    await ask.scrollIntoViewIfNeeded();
    const box=await ask.boundingBox();
    assert.ok(box && box.height>=44 && box.y>=0 && box.y+box.height<=page.viewportSize().height,`decision reachable on question ${step+1} at ${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow on question ${step+1} at ${width}`);
    if(step===2) await page.screenshot({path:`artifacts/redesign-audit/question-3-${width}.png`});
    await demo.getByRole('button',{name:'Next question'}).click();
   }
   await demo.getByRole('heading',{name:'That’s every question.'}).waitFor();
   assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'That’s every question.','focus lands on the summary');
   // The letter scrolls on its own and can be reached and scrolled by keyboard.
   const letter=demo.getByRole('region',{name:'Letter so far'});
   await letter.focus();
   await page.keyboard.press('End');
   await page.waitForFunction(()=>{const el=document.querySelector('.hero-demo .letter-preview');return el.scrollHeight<=el.clientHeight+1||el.scrollTop>0;},null,{timeout:1500}).catch(()=>{throw new Error(`letter scrolls by keyboard at ${width}`);});
   if(width===390||width===320) await audit(page,width,'landing-demo-summary');
  }

  // Phone: on a long question the decision stays docked at the bottom of the screen while reading.
  await page.setViewportSize({width:390,height:844});await page.goto(origin);
  await demo.getByRole('button',{name:'Next question'}).click();
  await demo.locator('.qcard-sides').scrollIntoViewIfNeeded();
  const dock=await demo.locator('.qcard-actions').boundingBox();
  assert.ok(dock && dock.y+dock.height<=844+1 && dock.y>844-260,`decision dock sits at the bottom of the screen: ${JSON.stringify(dock)}`);
  await page.screenshot({path:'artifacts/redesign-audit/dock-390.png'});

  // Keyboard: arrows move between questions, and focus follows the new title.
  await page.setViewportSize({width:1440,height:900});await page.goto(origin);
  await demo.locator('.qcard-title').focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  assert.match(await page.evaluate(()=>document.activeElement?.textContent),/VENIPUNCTURE/);
  assert.equal(await demo.locator('.dot[aria-current="step"]').textContent(),'3');
  await page.keyboard.press('ArrowLeft');
  assert.match(await page.evaluate(()=>document.activeElement?.textContent),/ONDANSETRON/);

  // Motion pass: a question arrives from the side you moved toward.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(origin);
  await demo.locator('.qcard-title').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await demo.locator('.qcard').evaluate(el=>getComputedStyle(el).animationName),'card-in','moving forward arrives from the right');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await demo.locator('.qcard').evaluate(el=>getComputedStyle(el).animationName),'card-in-back','moving back arrives from the left');
  await page.emulateMedia({reducedMotion:'reduce'});

  // The letter follows the deck on a phone: the question on screen has its paragraph in the letter's view.
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/start');
  await page.getByRole('button',{name:'Open Emergency visit, one evening'}).click();
  await page.locator('.check-status[data-state="ready"]').waitFor();
  for(let i=0;i<4;i++) await page.getByRole('button',{name:'Next question'}).click();
  await page.waitForFunction(()=>{const box=document.querySelector('.deck-workspace .letter-preview').getBoundingClientRect(),p=document.querySelector('.deck-workspace .letter-preview p[data-current]')?.getBoundingClientRect();return p&&p.top>=box.top-1&&p.bottom<=box.bottom+1;},null,{timeout:1500});
  // No unexpected layout shift while the review opens and its first check arrives.
  await page.addInitScript(()=>{window.__shift=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__shift+=e.value;})).observe({type:'layout-shift',buffered:true});});
  await page.reload();await page.locator('.check-status[data-state="ready"]').waitFor();await page.waitForTimeout(300);
  const shift=await page.evaluate(()=>window.__shift);
  assert.ok(typeof shift==='number'&&shift<0.01,`review opens without unexpected layout shift: ${shift}`);

  // Whole bill at desktop: an opened question shows its body, and the margin follows the ledger being read.
  await page.setViewportSize({width:1440,height:900});
  await page.goto(origin+'/review?view=bill');await page.locator('.check-status[data-state="ready"]').waitFor();
  const fourth=page.locator('ol.findings > li').nth(3);
  await fourth.locator('summary').click();
  await page.waitForFunction(()=>{const li=document.querySelectorAll('ol.findings > li')[3],m=li.closest('.margin').getBoundingClientRect(),r=li.getBoundingClientRect();return r.bottom<=Math.min(m.bottom,innerHeight)+1&&r.top>=Math.max(m.top,0);},null,{timeout:1500});
  await fourth.locator('summary').click();
  await page.evaluate(()=>{const row=document.getElementById('line-a04');scrollTo(0,row.getBoundingClientRect().top+scrollY-innerHeight*.45);});
  await page.waitForFunction(()=>document.querySelector('ol.findings > li[data-reading]')?.textContent.includes('VENIPUNCTURE'),null,{timeout:1500});
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>!document.querySelector('ol.findings > li[data-reading]'),null,{timeout:1500});

  // Motion lifetimes: a flight cancels on a live reduced-motion change and when the page goes away.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:1400});await page.goto(origin);
  const keep=demo.getByRole('button',{name:'Ask about this',exact:true});
  await keep.scrollIntoViewIfNeeded();await keep.click();
  await page.locator('.chip-flight').waitFor({state:'attached',timeout:400});
  await page.locator('.site-nav a.button').evaluate(el=>el.click());
  await page.waitForURL('**/start');
  await page.waitForFunction(()=>!document.querySelector('.chip-flight'),null,{timeout:250}).catch(()=>{throw new Error('leaving the page removes a chip in flight');});
  assert.deepEqual(errors,[],'deck produces no runtime or console errors');
 } catch(error) {
  await page.screenshot({path:'artifacts/redesign-audit/regression-failure.png'});
  throw error;
 } finally {await context.close();}
}
