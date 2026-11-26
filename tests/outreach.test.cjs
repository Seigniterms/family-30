const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function town(){
  const context=vm.createContext({
    portraits:['나','히히','우주','크림','유유','도리'].map((name,i)=>({dataset:{id:String(i+1),name},querySelector:()=>({src:''})})),
    document:{getElementById:()=>({addEventListener(){}})},showCurrentScreen(){}
  });
  const run=code=>vm.runInContext(code,context);
  for(const file of ['stories','game','meetup','life','kin','plans','snapshots','outreach','secrets','incidents','stage'])
    run(fs.readFileSync(path.join(__dirname,'..',file+'.js'),'utf8'));
  run(`game={player:'1',year:1,season:0,seed:12,contacts:{},marriages:[],children:[],townKids:[],townPairs:[],
    bonds:[],log:[],queue:[],echoes:[],diary:[],blocked:[],watching:[],feuds:[],reunions:[],
    club:{visits:0,tracks:{},guests:{},goal:'골목 야식회'}};
    meet('2');meet('3');let buttons=[],message='';menu=()=>{buttons=[]};menuButton=(label,fn)=>buttons.push({label,fn});
    node=(tag,text)=>{message=text;return {}};closeMenu=()=>{};persist=()=>{};renderStage=()=>{};
    navigate=()=>{};remember('2','우리 사진을 고른 날','서로 같은 사진을 골랐다.','photo',['3']);
    game.weekend={when:0,taken:false,plans:['dinner','trip'],rosters:[['3'],['2','4']],people:['2','3','4'],directInvite:{i:0,id:'2'}};`);
  return run;
}

test('post-scene photo, encore video and recipe receive their specific answer once after reload',()=>{
  for(const [type,activity,keyword] of [['photoReunion','','사진'],['encore','','목소리'],['outingDay','dinner','국물']]){
    const run=town();
    run(`const e={type:'${type}',activity:'${activity}',id:'2',result:{}};resultOutreach(e).open();`);
    assert.equal(run('resultOutreach(e)'),null);
    run('game=JSON.parse(JSON.stringify(game));game.season=1;seasonOutreach();seasonOutreach();');
    assert.equal(run('game.queue.length'),1);
    assert.ok(run('outreachScene(game.queue[0]).message').includes(keyword));
    run('game.event=game.queue.shift();answer(0);answer(0)');
    assert.equal(run("game.log.filter(x=>x.effect==='outreach').length"),1);
  }
});

test('a direct invite takes the guest out of the competing roster and waits for their answer',()=>{
  const run=town();
  assert.ok(!run("weekendRoster(game.weekend,1).includes('2')"));
  run("pick=list=>list[0];reserve(0,['2']);buttons[0].fn()");
  assert.equal(run('game.event'),undefined);
  assert.equal(run('game.weekend.taken'),false);
  assert.equal(run('buttons[0].label'),'약속 장소로 가기');
  run("buttons[0].fn()");
  assert.equal(run('game.event.type'),'outingDay');assert.equal(run('game.event.activity'),'dinner');
  assert.equal(run('game.event.guests.join()'),'2');
});

test('decline, group and friendship persist across attempts and do not silently start a date',()=>{
  for(const decision of ['later','group','friends']){
    const run=town();run(`pick=list=>list.includes('${decision}')?'${decision}':list[0];reserve(0,['2'],true)`);
    assert.equal(run('game.weekend.taken'),false);assert.equal(run('canOutreach("2")'),false);
    run("reserve(0,['2'],true);game=JSON.parse(JSON.stringify(game))");
    assert.equal(run('game.event'),undefined);
    if(decision==='friends')assert.equal(run('game.contacts["2"].friendsOnly'),true);
    if(decision==='group')assert.equal(run('game.contacts["2"].outreach.guests.length'),1);
    if(decision==='later')assert.equal(run('game.contacts["2"].contactAfter'),2);
  }
});

test('counterproposal calls back on the agreed date only when accepted',()=>{
  for(const index of [0,1]){
    const run=town();run("pick=list=>list.at(-1);game.contacts['2'].trust=-1;reserve(0,['2'],true)");
    assert.equal(run("game.contacts['2'].alternate.due"),2);
    run(`buttons[${index}].fn();game=JSON.parse(JSON.stringify(game));game.season=1;seasonOutreach()`);
    assert.equal(run('game.queue.length'),0);
    run('game.season=2;seasonOutreach()');
    assert.equal(run('game.queue.length'),index===0?1:0);
    if(index===0)assert.equal(run('game.queue[0].rescheduled'),true);
  }
});

test('a third-party commitment routes a private invitation to the secret story; friends stay friends',()=>{
  for(const route of ['weekend','message']){
    const run=town();
    run("game.contacts['3'].role='연인'");
    if(route==='weekend')run("reserve(0,['2'],true)");
    else run("outreachMenu('2');buttons.find(b=>b.label.includes('따로')).fn()");
    assert.equal(run('game.event.type'),'secret');assert.equal(run('game.event.kind'),'tickets');
    assert.equal(run('game.weekend.taken'),route==='weekend');
  }
  const run=town();run("game.contacts['2'].friendsOnly=true;reserve(0,['2'],true)");
  assert.equal(run('game.event'),undefined);assert.equal(run('game.weekend.taken'),false);
});

test('old NPC partnerships involving my spouse stay visible without converting to an additional marriage',()=>{
  const run=town();
  run("game.marriages=[{id:'2',end:null}];game.year=3;game.townPairs=[{people:['2','3'],since:0,status:'연인',decision:1}];progressTown()");
  assert.equal(run('game.townPairs[0].status'),'연인');
  run("game.townPairs=[];game.season=1;progressTown()");
  assert.ok(!run("game.townPairs.some(p=>p.people.includes('2'))"));
});
