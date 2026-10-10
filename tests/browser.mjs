import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}});let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.APP_URL||'http://localhost:5173/');await page.locator('.option').first().waitFor();assert.equal(await page.locator('.option').count(),4);assert.ok(Number(await page.locator('.big-metric strong').textContent())>0);await page.screenshot({path:'/tmp/clutch-desktop.png',fullPage:true});
// Live growth must affect both geometry and counts, without pressing Generate.
const fullUnits=Number(await page.locator('.big-metric strong').textContent());
const fullStalls=await page.locator('.stall').count();assert.ok(fullStalls>0);
await page.locator('#growth').fill('45');
await page.waitForFunction(n=>Number(document.querySelector('.big-metric strong').textContent)<n,fullUnits);
assert.ok(await page.locator('.stall').count()<fullStalls);
await page.locator('#growth').fill('100');
await page.waitForFunction(n=>Number(document.querySelector('.big-metric strong').textContent)===n,fullUnits);
// Individual slider and SVG drag both shrink buildings and their parking.
await page.locator('#selected-length').fill('90');
assert.ok(Number(await page.locator('.big-metric strong').textContent())<fullUnits);
let editedUnits=Number(await page.locator('.big-metric strong').textContent());
const handle=await page.locator('.resize-handle').boundingBox();
const roof=await page.locator('.selected-building').boundingBox();
await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
await page.mouse.move(roof.x+roof.width/2,roof.y+roof.height/2,{steps:5});await page.mouse.up();
assert.ok(Number(await page.locator('.big-metric strong').textContent())<editedUnits);
const editedTotal=Number(await page.locator('.big-metric strong').textContent());
let editedSave=page.waitForEvent('download');await page.locator('#save').click();let ed=await editedSave;await ed.saveAs('/tmp/clutch-edited-project.json');
await page.locator('#demo').click();await page.locator('#open').setInputFiles('/tmp/clutch-edited-project.json');
await page.waitForFunction(n=>Number(document.querySelector('.big-metric strong').textContent)===n,editedTotal);
await page.locator('#irregular').click();assert.ok(await page.locator('.stall').count()>0);await page.locator('#demo').click();
await page.locator('#setback').fill('1000');await page.locator('#generate').click();assert.match(await page.locator('#message').textContent(),/No complete/);await page.locator('#setback').fill('15');await page.locator('#generate').click();
let save=page.waitForEvent('download');await page.locator('#save').click();let d=await save;await d.saveAs('/tmp/clutch-project.json');await page.locator('#open').setInputFiles('/tmp/clutch-project.json');await page.waitForTimeout(200);assert.equal(await page.locator('.option').count(),4);
let csv=page.waitForEvent('download');await page.locator('#export-csv').click();let cd=await csv;await cd.saveAs('/tmp/clutch-yield.csv');assert.match(await fs.readFile('/tmp/clutch-yield.csv','utf8'),/orientation_degrees,units/);
const png=await page.screenshot();await page.locator('#upload').setInputFiles({name:'survey.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Reference loaded'));await page.locator('#generate').click();assert.match(await page.locator('#message').textContent(),/Calibrate/);
await page.locator('#calibrate').click();page.once('dialog',d=>d.accept('500'));let box=await page.locator('#canvas').boundingBox();await page.mouse.click(box.x+100,box.y+100);await page.mouse.click(box.x+400,box.y+100);await page.locator('#trace').click();for(let [x,y] of [[100,80],[450,80],[450,350],[100,350]])await page.mouse.click(box.x+x,box.y+y);await page.locator('#close').click();await page.locator('#generate').click();assert.equal(await page.locator('.option').count(),4);
// Minimal valid PDF with a measured rectangular survey reference.
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>'];const stream='20 20 570 750 re S';objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});let xref=Buffer.byteLength(pdf);pdf+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await page.locator('#upload').setInputFiles({name:'survey.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Reference loaded'),{timeout:20000});assert.match(await page.locator('#file-status').textContent(),/survey.pdf/);
await page.setViewportSize({width:390,height:844});await page.locator('#demo').click();await page.screenshot({path:'/tmp/clutch-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.deepEqual(errors,[]);console.log('PASS: live building/parking expansion, individual slider, SVG drag, edited project restore, irregular site, demo, constraints, save/load, CSV, image upload, scale, trace, PDF upload, responsive viewport; no browser errors.');await browser.close();
