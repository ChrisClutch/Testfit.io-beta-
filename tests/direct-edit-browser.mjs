import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.env.APP_URL||'http://localhost:5173?legacy=1');
 await page.locator('.option').first().waitFor();
 await page.locator('#edit-boundary').click();
 assert.equal(await page.locator('.edge-measurement').count(),4);
 const before=await page.locator('#boundary-measurements').textContent();
 const corner=page.locator('[data-vertex="0"]');await corner.scrollIntoViewIfNeeded();
 const box=await corner.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+25,box.y+box.height/2+20,{steps:3});
 assert.notEqual(await page.locator('#boundary-measurements').textContent(),before);
 assert.equal(await page.locator('.building-pad').count(),0);
 await page.mouse.up();
 await page.locator('#edit-boundary').click();
 await page.locator('#type').selectOption('cottage1');
 await page.locator('#footprint-length').fill('12');await page.locator('#footprint-depth').fill('12');
 await page.locator('#footprint-angle').fill('30');await page.locator('#apply-footprint').click();
 assert.match(await page.locator('#message').textContent(),/Footprint updated/);
 const building=page.locator('.selected-building');await building.scrollIntoViewIfNeeded();
 const prior=await building.getAttribute('points'),b=await building.boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
 await page.mouse.move(b.x+b.width/2+2,b.y+b.height/2+2,{steps:2});await page.mouse.up();
 const moved=await building.getAttribute('points');assert.notEqual(moved,prior);
 await page.locator('#footprint-length').fill('1000');await page.locator('#apply-footprint').click();
 assert.match(await page.locator('#message').textContent(),/setbacks|overlaps/);
 assert.equal(await building.getAttribute('points'),moved);
 const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();
 const download=await downloadPromise,path=await download.path();
 await page.locator('#open').setInputFiles(path);
 await page.waitForFunction(points=>document.querySelector('.selected-building')?.getAttribute('points')===points,moved);
 // Simulate clipboard image delivered by browser paste; no clipboard read permission required.
 await page.locator('#site-title').click();
 await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;
   const blob=await new Promise(resolve=>canvas.toBlob(resolve));
   const data=new DataTransfer();data.items.add(new File([blob],'pasted-site.png',{type:'image/png'}));
   document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
 });
 await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('pasted-site.png'));
 assert.match(await page.locator('#message').textContent(),/Calibrate/);
 assert.equal(await page.locator('.site').count(),0);
 assert.deepEqual(errors,[]);
 console.log('Direct editing browser checks passed: live edge/area during drag, footprint resize/rotation/movement/rejection, persistence, image paste.');
} finally {await browser.close();}
