import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileReadings,closeReading,standaloneBookState} from '../reading-workspace.mjs';

test('every displayed book or lateral has exactly one visible closeable tab',()=>{
 assert.deepEqual(reconcileReadings(['hume','xr'],'kant'),['hume','xr','kant']);
 assert.deepEqual(reconcileReadings(['kant','kant'],'kant'),['kant']);
 assert.deepEqual(reconcileReadings([],'kant',false),[]);
});
test('closing a lateral always leaves a registered reading, including direct links',()=>{
 assert.deepEqual(closeReading(['xr'],'xr','xr','kant'),{opened:['kant'],destination:'kant'});
 assert.deepEqual(closeReading(['hume','xr'],'xr','xr','kant'),{opened:['hume'],destination:'hume'});
 assert.deepEqual(closeReading(['kant','hume','xr'],'xr','xr','kant'),{opened:['kant','hume'],destination:'hume'});
});
test('closing a background reading never moves the active reader',()=>{
 assert.deepEqual(closeReading(['kant','hume','xr'],'hume','xr'),{opened:['kant','xr'],destination:'xr'});
 assert.deepEqual(closeReading(['kant','xr'],'xr','kant','hume'),{opened:['kant'],destination:'kant'});
});
test('closing the last ordinary book returns to the shelf',()=>{
 assert.deepEqual(closeReading(['kant'],'kant','kant'),{opened:[],destination:''});
});
test('leaving a comparison preserves book position and drops comparison selections',()=>{
 const saved={workId:'kant',unitId:'CH_KPR_03',rawUnitId:'',referenceId:'CH_KPR_03:AS1',routeMode:'incoming',connectionId:'xr',connectionReferenceId:'XR:AS1',connectionSelection:{reference_id:'HUME:AS1'},connectionBooks:{hume:{unitId:'CH_THN_02'}}};
 const single=standaloneBookState('kant',saved);
 assert.equal(single.workId,'kant');assert.equal(single.unitId,'CH_KPR_03');assert.equal(single.referenceId,'CH_KPR_03:AS1');
 assert.equal(single.connectionId,'');assert.equal(single.connectionReferenceId,'');assert.equal(single.connectionSelection,null);
 assert.equal(single.connectionBooks,undefined);assert.equal(saved.connectionId,'xr');
 const other=standaloneBookState('hume',saved.connectionBooks.hume);assert.equal(other.unitId,'CH_THN_02');assert.equal(other.workId,'hume');
});
