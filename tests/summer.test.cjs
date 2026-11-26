const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');

function load(storage=new Map()){
  const names=['나','민민','히히','우주','씽씽','유유'];
  const context=vm.createContext({
    crypto:webcrypto,document:{getElementById:()=>({})},
    portraits:names.map((name,i)=>({dataset:{id:String(i+1),name},querySelector:()=>({src:''})})),
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}
  });
  const run=code=>vm.runInContext(code,context);
  for(const file of ['stories.js','game.js','life.js','plans.js','kin.js','meetup.js','snapshots.js'])
    run(readFileSync(path.join(__dirname,'..',file),'utf8'));
  run('navigate=()=>{}; const buttons=[]; menu=()=>{buttons.length=0;};menuButton=(label,fn)=>buttons.push({label,fn});node=()=>({});');
  return run;
}

test('six voluntary summer promises return to the same people after saving',()=>{
  const titles=new Set();
  for(const id of ['3','4','5'])for(const reply of [0,1]){
    const storage=new Map(),run=load(storage);
    run(`startRun('1');meet('${id}');game.season=1;
      game.snapshot={sender:'${id}',joker:'2',frame:0,reply:${reply}};
      game.event={type:'photoReunion',id:'${id}'};answer(2);game.event=null;persist();`);
    const restored=load(storage);
    restored('game.season=2;seasonSnapshot();seasonSnapshot()');
    assert.equal(restored("game.queue.filter(e=>e.type==='photoPromise').length"),1);
    assert.equal(restored("game.queue[0].id"),id);
    assert.equal(restored("game.queue[0].guests.length"),reply);
    titles.add(restored('snapshotScene(game.queue[0]).title'));
  }
  assert.equal(titles.size,6);
});

test('a group promise waits one season for a resting guest, and passing on the promise schedules nothing',()=>{
  const run=load();
  run("startRun('1');game.season=1;game.snapshot.frame=0;game.snapshot.reply=1;const e={type:'photoReunion',id:game.snapshot.sender};snapshotAnswer(e,0)");
  assert.equal(run('game.snapshot.promiseDue'),undefined);
  run('snapshotAnswer(e,2);game.contacts[game.snapshot.joker].quietUntil=3;game.season=2;seasonSnapshot()');
  assert.equal(run('game.queue.length'),0);
  run('game.season=3;seasonSnapshot()');
  assert.equal(run("game.queue.filter(e=>e.type==='photoPromise').length"),1);
});

test('first hosting chooses a goal once, while older saves keep their chosen goal',()=>{
  const storage=new Map(),run=load(storage);
  run("startRun('1');game.season=2;hosts()");
  assert.equal(run('buttons.length'),3);
  run('buttons[2].fn()');
  assert.equal(run('game.club.goal'),'골목 야식회');
  assert.equal(run('game.weekend.plans[0]'),'dinner');
  run("delete game.club.firstHostSeason;persist()");
  const restored=load(storage);
  restored('initLife();hosts()');
  assert.equal(restored('buttons.length'),2);
  assert.equal(restored('game.club.goal'),'골목 야식회');
});
