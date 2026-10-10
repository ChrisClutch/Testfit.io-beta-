import {test} from 'node:test';import assert from 'node:assert/strict';import {area,inset,generate,fits,proforma,validBoundary} from '../src/engine.js';
const site=[[0,0],[500,0],[500,400],[0,400]];
test('area and inward setback are measured in feet',()=>{assert.equal(area(site),200000);let e=inset(site,20);assert.ok(Math.abs(area(e[0][0])-460*360)<200)});
test('all buildings and parking fit concave site with constraints',()=>{let s=[[0,0],[500,0],[500,200],[250,200],[250,450],[0,450]];let layouts=generate(s,{maxDensity:30,maxCoverage:30,maxFar:1});assert.ok(layouts.some(l=>l.units>0));for(let l of layouts){assert.ok(l.coverage<=30);assert.ok(l.gfa/l.siteArea<=1);assert.ok(l.units/(l.siteArea/43560)<=30);for(let p of [...l.buildings,...l.parking])assert.ok(fits(p,l.envelope))}});
test('invalid and unusable sites',()=>{assert.equal(validBoundary([[0,0],[100,100],[0,100],[100,0]]),false);assert.throws(()=>generate(site,{unitSize:0}));assert.equal(generate([[0,0],[10,0],[10,10],[0,10]],{setback:20})[0].units,0)});
test('parking requirements are met',()=>{for(let l of generate(site,{parkingRatio:2}))assert.ok(l.stalls>=l.units*2)});
test('proforma computes transparent NOI and value',()=>{let l={units:10,gfa:10000,parking:[],buildings:[site]};let p=proforma(l,{rent:1000,vacancyPct:0,opexPct:0,capRate:6});assert.equal(p.noi,120000);assert.equal(p.value,2000000);assert.throws(()=>proforma(l,{capRate:0}))});

test('separated collinear edges remain a valid boundary',()=>assert.ok(validBoundary([[0,0],[100,0],[100,100],[200,100],[200,0],[300,0],[300,200],[0,200]])));
