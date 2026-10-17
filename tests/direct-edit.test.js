import test from 'node:test';
import assert from 'node:assert/strict';
import {generate, editFootprint, applyFootprints, area} from '../src/engine.js';
const site=[[0,0],[500,0],[500,400],[0,400]];
const input={type:'cottage1'};
test('direct footprint edits move, rotate, change area and retain units',()=>{
 const base=generate(site,input)[0],d=base.buildingDetails[0];
 const transform={center:d.center,length:12,depth:12,degrees:30};
 const edited=editFootprint(base,input,d.id,transform);
 assert.equal(edited.units,base.units);
 assert.ok(Math.abs(area(edited.buildings[0])-144)<1e-6);
 assert.ok(edited.gfa<base.gfa);
 const moved=editFootprint(edited,input,d.id,{...transform,center:[d.center[0]+1,d.center[1]+1]});
 assert.deepEqual(moved.buildingDetails[0].center,[d.center[0]+1,d.center[1]+1]);
 assert.deepEqual(applyFootprints(base,input,JSON.parse(JSON.stringify(moved.manualTransforms))).buildings,moved.buildings);
 assert.notDeepEqual(base.buildings,edited.buildings);
});
test('direct edits reject boundary, road, overlap and invalid dimensions without mutation',()=>{
 const base=generate(site,input)[0],d=base.buildingDetails[0],before=structuredClone(base);
 const t={center:d.center,length:12,depth:12,degrees:0};
 assert.throws(()=>editFootprint(base,input,d.id,{...t,center:[-100,-100]}),/setbacks/);
 assert.throws(()=>editFootprint(base,input,d.id,{...t,center:base.buildingDetails[1].center}),/overlaps/);
 const road=base.roads[0],center=road.slice(0,4).reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[1]/4],[0,0]);
 assert.throws(()=>editFootprint(base,input,d.id,{...t,center}),/overlaps/);
 assert.throws(()=>editFootprint(base,input,d.id,{...t,length:NaN}),/finite/);
 assert.throws(()=>editFootprint(base,{...input,maxCoverage:.001},d.id,t),/coverage/);
 assert.deepEqual(base,before);
});
