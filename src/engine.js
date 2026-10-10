import buffer from '@turf/buffer';
import { polygon } from '@turf/helpers';
import clipping from 'polygon-clipping';
export const TYPES={multifamily:{label:'Multifamily',width:120,depth:60,unit:850,floors:3,efficiency:.82},townhomes:{label:'Townhomes',width:100,depth:42,unit:1500,floors:2,efficiency:.9},affordable:{label:'Affordable housing',width:120,depth:60,unit:750,floors:3,efficiency:.82},cottages:{label:'Cottage cluster',width:28,depth:34,unit:900,floors:1,efficiency:.95},fuel:{label:'C-store / fuel',width:70,depth:55,unit:1000,floors:1,efficiency:1}};
export function area(r){return Math.abs(r.reduce((s,p,i)=>{let q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2)}
const multiArea=m=>m.reduce((s,p)=>s+area(p[0])-p.slice(1).reduce((a,r)=>a+area(r),0),0);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function validBoundary(r){if(r.length<3||r.some(p=>p.some(v=>!Number.isFinite(v)))||area(r)<10)return false;for(let i=0;i<r.length;i++){if(Math.hypot(r[i][0]-r[(i+1)%r.length][0],r[i][1]-r[(i+1)%r.length][1])<.01)return false;for(let j=i+1;j<r.length;j++){if(j===i+1||(i===0&&j===r.length-1))continue;let a=r[i],b=r[(i+1)%r.length],c=r[j],d=r[(j+1)%r.length];if(Math.max(a[0],b[0])>=Math.min(c[0],d[0])&&Math.max(c[0],d[0])>=Math.min(a[0],b[0])&&Math.max(a[1],b[1])>=Math.min(c[1],d[1])&&Math.max(c[1],d[1])>=Math.min(a[1],b[1])&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return false}}return true}
export function inset(r,feet){if(!validBoundary(r))throw Error('Trace a simple boundary with no crossings or duplicate vertices.');if(feet<=0)return [[ [...r,r[0]] ]];const k=1/364813;const feature=buffer(polygon([[...r,r[0]].map(([x,y])=>[x*k,y*k])]),-feet*.3048,{units:'meters',steps:8});if(!feature)return [];const coords=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;return coords.map(p=>p.map(r=>r.map(([x,y])=>[x/k,y/k])))}
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
export function fits(r,envelope){return multiArea(clipping.difference([[r]],envelope))<.01}
// All coordinates are local feet. A continuous access spine serves every parking aisle.
const numericKeys=['setback','floors','parkingRatio','maxCoverage','maxFar','maxDensity','openSpace','unitSize','efficiency','buildingDepth','maxLength','growth','stallWidth','stallDepth','aisleWidth'];
export function config(input={}) {
  const t=TYPES[input.type||'multifamily'];
  if(!t) throw Error('Unknown project type.');
  const c={type:'multifamily',setback:15,floors:3,parkingRatio:1.5,maxCoverage:40,maxFar:1.5,maxDensity:40,openSpace:20,unitSize:850,efficiency:.82,buildingDepth:t.depth,maxLength:360,growth:100,stallWidth:9,stallDepth:18,aisleWidth:24,...input};
  for(const k of numericKeys) if(!Number.isFinite(c[k])||c[k]<0) throw Error('Constraints must be finite nonnegative numbers.');
  if(c.unitSize<100||c.floors<1||c.floors>20||!Number.isInteger(c.floors)||c.efficiency<=0||c.efficiency>1||c.maxCoverage>100||c.openSpace>100||c.growth>100||c.buildingDepth<20||c.buildingDepth>150||c.maxLength<36||c.maxLength>1000||c.stallWidth<8||c.stallWidth>12||c.stallDepth<16||c.stallDepth>24||c.aisleWidth<20||c.aisleWidth>36) throw Error('Check building dimensions, floors, parking dimensions and percentages.');
  return c;
}
function boxOf(e){const p=e.flat(2);return p.length?{minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))}:null}
function maxSpan(x,y,h,side,max,e){let low=0,high=max;for(let i=0;i<14;i++){const mid=(low+high)/2;if(fits(rect(side>0?x:x-mid,y,mid,h),e))low=mid;else high=mid}return Math.floor(low*2)/2}
function spineRuns(x,b,c,e){let runs=[],start=null;for(let y=b.minY+1;y+12<=b.maxY;y+=12){let ok=fits(rect(x,y,c.aisleWidth,12),e);if(ok&&start===null)start=y;if(!ok&&start!==null){runs.push([start,y]);start=null}}if(start!==null)runs.push([start,b.minY+1+Math.floor((b.maxY-b.minY-1)/12)*12]);return runs.filter(([a,b])=>b-a>c.buildingDepth+6+c.stallDepth*2+c.aisleWidth+12)}
const worldRing=(r,a)=>r.map(p=>rotate(p,a));
export function reconfigure(site,input,model,edits={}){
  const c=config(input),envelope=inset(site,c.setback),a=model.degrees*Math.PI/180;
  const e=envelope.map(p=>p.map(r=>r.map(v=>rotate(v,-a)))),b=boxOf(e),siteArea=area(site);
  let buildings=[],parking=[],stallPolygons=[],aisles=[],buildingDetails=[],parkingDetails=[],units=0,gfa=0,footprint=0;
  const empty={degrees:model.degrees,buildings,parking,stallPolygons,aisles,buildingDetails,parkingDetails,units:0,stalls:0,gfa:0,coverage:0,siteArea,buildableArea:multiArea(envelope),envelope,model,edits,entry:null,roads:[],pavedArea:0};
  if(!b)return empty;
  const x=model.spineX,start=model.startY,end=model.endY,road=rect(x,start,c.aisleWidth,end-start);
  if(!fits(road,e))return empty;
  let paved=c.aisleWidth*(end-start),roadWorld=worldRing(road,a);
  const minLength=c.type==='cottages'?28:c.type==='fuel'?70:54,depth=c.buildingDepth,lotDepth=2*c.stallDepth+c.aisleWidth;
  const bayHeight=depth+6+lotDepth+12;
  // Roads may cross the setback, but always remain inside the traced property.
  const localSite=[[worldRing([...site,site[0]],-a)]];
  let entryLength=maxSpan(start,x,c.aisleWidth,-1,Math.max(0,start-boxOf(localSite).minY),localSite.map(p=>p.map(r=>r.map(([px,py])=>[py,px]))));
  // Calculate the access approach with the coordinates transposed for maxSpan.
  let entry=entryLength>.5?rect(x,start-entryLength,c.aisleWidth,entryLength):null;
  if(entry)paved+=area(entry);
  let budget=Math.min(siteArea*c.maxCoverage/100,siteArea*c.maxFar/c.floors);
  const densityLimit=Math.floor(siteArea/43560*c.maxDensity);
  for(let row=0,y=start+6;y+bayHeight<=end+.01;y+=bayHeight,row++){
    for(const side of [1,-1]){
      if(c.type==='fuel'&&buildings.length)continue;
      const anchor=side>0?x+c.aisleWidth:x;
      const available=maxSpan(anchor,y,depth+6+lotDepth,side,side>0?b.maxX-anchor:anchor-b.minX,e);
      if(available<minLength+12)continue;
      const maxLotWidth=Math.floor((available-6)/c.stallWidth)*c.stallWidth;
      const capacity=2*Math.floor(maxLotWidth/c.stallWidth);
      const remainingUnits=c.type==='fuel'?Infinity:Math.max(0,densityLimit-units);
      const parkingUnitCap=c.parkingRatio?Math.floor(capacity/c.parkingRatio):Infinity;
      let maxBuilding=Math.min(c.maxLength,available-12,(budget-footprint)/depth);
      if(c.type==='cottages')maxBuilding=Math.min(maxBuilding,28);
      if(c.type==='fuel')maxBuilding=Math.min(maxBuilding,100);
      if(c.type!=='fuel'&&c.type!=='cottages')maxBuilding=Math.min(maxBuilding,(Math.min(remainingUnits,parkingUnitCap)+.999)*c.unitSize/(depth*c.floors*c.efficiency));
      const id=`${row}:${side}`;
      const requested=edits[id]??Math.max(minLength,maxBuilding*c.growth/100);
      let length=c.type==='cottages'?Math.min(28,maxBuilding):c.type==='fuel'?Math.floor(Math.min(requested,maxBuilding)):Math.floor(Math.min(requested,maxBuilding)/3)*3;
      // Reduce growth when paving and open-space budgets, not just building coverage, bind.
      let n=0,needed=0,lotWidth=0,pad=null,building=null;
      for(;length>=minLength;length-=3){
        n=c.type==='fuel'?0:c.type==='cottages'?1:Math.floor(length*depth*c.floors*c.efficiency/c.unitSize);
        needed=c.type==='fuel'?12:Math.ceil(n*c.parkingRatio);
        const columns=Math.ceil(needed/2);
        lotWidth=Math.max(c.aisleWidth,columns*c.stallWidth);
        if(n===0&&c.type!=='fuel'||n>remainingUnits||needed>capacity)continue;
        const buildingX=side>0?anchor+6:anchor-6-length;
        building=rect(buildingX,y,length,depth);
        pad=rect(side>0?anchor:anchor-lotWidth,y+depth+6,lotWidth,lotDepth);
        if(!fits(building,e)||!fits(pad,e))continue;
        if(footprint+length*depth+paved+area(pad)>siteArea*(1-c.openSpace/100))continue;
        break;
      }
      if(length<minLength)continue;
      const px=pad[0][0],py=pad[0][1];
      const aisle=rect(px,py+c.stallDepth,lotWidth,c.aisleWidth);
      let spots=[];
      for(let j=0;j<needed;j++){
        const column=Math.floor(j/2),top=j%2===0;
        // Keep any spare half-stall at the far end; each counted stall has a footprint.
        const sx=side>0?px+column*c.stallWidth:px+lotWidth-(column+1)*c.stallWidth;
        spots.push(worldRing(rect(sx,top?py:py+c.stallDepth+c.aisleWidth,c.stallWidth,c.stallDepth),a));
      }
      buildings.push(worldRing(building,a));parking.push(worldRing(pad,a));aisles.push(worldRing(aisle,a));stallPolygons.push(...spots);
      const bx=building[0][0];
      const corridor=c.type==='multifamily'||c.type==='affordable'?worldRing(rect(bx,y+depth/2-3,length,6),a):null;
      buildingDetails.push({id,length,depth,minLength,maxLength:maxBuilding,units:n,floors:c.floors,origin:[bx,y],side,anchor,corridor,center:rotate([bx+length/2,y+depth/2],a),handle:rotate([side>0?bx+length:bx,y+depth/2],a)});
      parkingDetails.push({stalls:needed,center:rotate([px+lotWidth/2,py+lotDepth/2],a)});
      units+=n;gfa+=length*depth*c.floors;footprint+=length*depth;paved+=area(pad);
    }
  }
  return {...empty,buildings,parking,stallPolygons,aisles,buildingDetails,parkingDetails,roads:buildings.length?[roadWorld]:[],entry:buildings.length&&entry?worldRing(entry,a):null,units,stalls:stallPolygons.length,gfa,coverage:footprint/siteArea*100,pavedArea:buildings.length?paved:0};
}
export function generate(site,input={}){
  const c=config(input),envelope=inset(site,c.setback);
  if(area(site)>43560*100||site.length>100)throw Error('Use a study boundary smaller than 100 acres and 100 corners.');
  const scenarios=[];
  for(const degrees of [0,90,30,60]){
    const a=degrees*Math.PI/180,e=envelope.map(p=>p.map(r=>r.map(v=>rotate(v,-a)))),b=boxOf(e);
    let best=reconfigure(site,c,{degrees,spineX:0,startY:0,endY:0});
    if(b){
      const span=b.maxX-b.minX-c.aisleWidth-4;
      for(const fraction of [.5,.25,.75]){
        const x=b.minX+2+span*fraction;
        for(const [startY,endY] of spineRuns(x,b,c,e)){
          const candidate=reconfigure(site,c,{degrees,spineX:x,startY,endY});
          if(candidate.units>best.units||candidate.units===best.units&&candidate.gfa>best.gfa)best=candidate;
        }
      }
    }
    scenarios.push(best);
  }
  return scenarios.sort((a,b)=>b.units-a.units||b.gfa-a.gfa);
}
export function proforma(layout,input={}){let c={land:600000,hardCost:210,softPct:20,contingencyPct:8,rent:1800,vacancyPct:5,opexPct:35,capRate:5.5,loanPct:65,interestPct:7,annualRetailNoi:150000,...input};if(Object.values(c).some(v=>!Number.isFinite(v)||v<0)||c.capRate<=0||c.vacancyPct>100||c.opexPct>100||c.loanPct>100)throw Error('Check financial inputs; cap rate must be positive.');let hard=layout.gfa*c.hardCost+(layout.pavedArea??layout.parking.reduce((s,p)=>s+area(p),0))*12;let total=c.land+hard*(1+(c.softPct+c.contingencyPct)/100),noi=layout.units?layout.units*c.rent*12*(1-c.vacancyPct/100)*(1-c.opexPct/100):layout.buildings.length?c.annualRetailNoi:0;let value=noi/(c.capRate/100),loan=total*c.loanPct/100,debtService=loan*c.interestPct/100;return {hard,total,noi,value,profit:value-total,yield:total?noi/total*100:0,debtService,dscr:debtService?noi/debtService:null,equity:total-loan,cashOnCash:total>loan?(noi-debtService)/(total-loan)*100:0}}
