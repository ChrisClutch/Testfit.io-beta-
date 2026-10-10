import {test} from 'node:test';import assert from 'node:assert/strict';import {area,inset,generate,fits,proforma,validBoundary} from '../src/engine.js';
const site=[[0,0],[500,0],[500,400],[0,400]];
test('area and inward setback are measured in feet',()=>{assert.equal(area(site),200000);let e=inset(site,20);assert.ok(Math.abs(area(e[0][0])-460*360)<200)});
test('all buildings and parking fit concave site with constraints',()=>{let s=[[0,0],[500,0],[500,200],[250,200],[250,450],[0,450]];let layouts=generate(s,{maxDensity:30,maxCoverage:30,maxFar:1});assert.ok(layouts.some(l=>l.units>0));for(let l of layouts){assert.ok(l.coverage<=30);assert.ok(l.gfa/l.siteArea<=1);assert.ok(l.units/(l.siteArea/43560)<=30);for(let p of [...l.buildings,...l.parking])assert.ok(fits(p,l.envelope))}});
test('invalid and unusable sites',()=>{assert.equal(validBoundary([[0,0],[100,100],[0,100],[100,0]]),false);assert.throws(()=>generate(site,{unitSize:0}));assert.equal(generate([[0,0],[10,0],[10,10],[0,10]],{setback:20})[0].units,0)});
test('parking requirements are met',()=>{for(let l of generate(site,{parkingRatio:2}))assert.ok(l.stalls>=l.units*2)});
test('proforma computes transparent NOI and value',()=>{let l={units:10,gfa:10000,parking:[],buildings:[site]};let p=proforma(l,{rent:1000,vacancyPct:0,opexPct:0,capRate:6});assert.equal(p.noi,120000);assert.equal(p.value,2000000);assert.throws(()=>proforma(l,{capRate:0}))});

test('separated collinear edges remain a valid boundary',()=>assert.ok(validBoundary([[0,0],[100,0],[100,100],[200,100],[200,0],[300,0],[300,200],[0,200]])));

test('buildings and lots expand together and every reported stall is drawn',()=>{
 const full=generate(site,{growth:100})[0],small=generate(site,{growth:45})[0];
 assert.ok(full.units>small.units);assert.ok(full.stalls>small.stalls);assert.equal(full.stalls,full.stallPolygons.length);
 assert.ok(full.buildingDetails.some(b=>b.length>120));
 for(const p of full.stallPolygons)assert.ok(fits(p,full.parking.map(r=>[r])));
});
test('every parking aisle joins the continuous spine without building overlap',()=>{
 const l=generate(site,{})[0];assert.ok(l.roads.length===1);const drive=l.roads[0];
 for(const aisle of l.aisles){
  assert.ok(aisle.some(p=>drive.some((v,i)=>i<4&&Math.abs((drive[(i+1)%4][0]-v[0])*(p[1]-v[1])-(drive[(i+1)%4][1]-v[1])*(p[0]-v[0]))<.001)));
 }
 const occupied=[...l.buildings,...l.parking,...l.roads];
 for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++)assert.ok(intersectionArea(occupied[i],occupied[j])<.01);
 assert.ok(l.entry);assert.ok(fits(l.entry,[[[...site,site[0]]]]));
});
import clipping from 'polygon-clipping';
const intersectionArea=(a,b)=>clipping.intersection([[a]],[[b]]).reduce((s,p)=>s+area(p[0]),0);
import {reconfigure,TYPES} from '../src/engine.js';
test('individual building edits recalculate parking and yield without moving the spine',()=>{
 const original=generate(site,{})[0],d=original.buildingDetails[0];
 const resized=reconfigure(site,{},original.model,{[d.id]:Math.floor(d.length*.6)});
 assert.ok(resized.units<original.units);assert.ok(resized.stalls<original.stalls);assert.deepEqual(resized.roads,original.roads);
 assert.ok(resized.stalls>=resized.units*1.5);
 for(const r of [...resized.buildings,...resized.parking])assert.ok(fits(r,resized.envelope));
});
test('open-space budget includes connected drive paving; all presets remain usable',()=>{
 for(const type of Object.keys(TYPES)){
  const t=TYPES[type],l=generate(site,{type,buildingDepth:t.depth,unitSize:t.unit,floors:t.floors,efficiency:t.efficiency})[0];
  assert.ok(l.buildings.length>0,type);
  assert.ok(l.buildings.reduce((s,r)=>s+area(r),0)+l.pavedArea<=l.siteArea*.8+.01);
 }
});
test('narrow wedge and disconnected buildable regions never create disconnected parking',()=>{
 const tricky=[[0,0],[700,0],[500,90],[380,90],[380,600],[0,400]];
 for(const l of generate(tricky,{})){
  for(const r of [...l.buildings,...l.parking,...l.roads])assert.ok(fits(r,l.envelope));
  const occupied=[...l.buildings,...l.parking,...l.roads];
  for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++)assert.ok(intersectionArea(occupied[i],occupied[j])<.01);
 }
});
