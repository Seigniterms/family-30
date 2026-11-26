const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function runFamily(){
  const context=vm.createContext({
    portraits:['me','a','b','c'].map(id=>({dataset:{id,name:id},querySelector:()=>({src:''})})),
    document:{getElementById:()=>({addEventListener(){}})},showCurrentScreen(){}
  });
  const run=source=>vm.runInContext(source,context);
  for(const f of ['stories','game','life','plans','kin','meetup','snapshots','outreach','secrets']){
    vm.runInContext(readFileSync(path.join(__dirname,'..',f+'.js'),'utf8'),context,{filename:f+'.js'});
  }
  run(`game={player:'me',year:5,season:0,seed:27,contacts:{},marriages:[],children:[],townKids:[],townPairs:[],
      bonds:[],blocked:[],log:[],queue:[],diary:[]};for(const id of ['a','b','c'])meet(id);
    navigate=()=>{};const choose=i=>answerSecret(game.event,i);
    const next=()=>{game.event=null;if(++game.season===4){game.year++;game.season=0;}
      queueSecretSeason();game.event=game.queue.shift();};
    const pair=()=>game.townPairs.push({people:['a','b'],status:'연인',since:3});
    const wife=()=>{game.contacts.c.role='배우자';game.marriages.push({id:'c',end:null})};
    const load=()=>{game=JSON.parse(JSON.stringify(game))};`);
  return run;
}

test('exhibition can stay friendly and only an actually shared photo leads to a reflection',()=>{
  for(const post of [true,false]){
    const r=runFamily();r("pair();startSecretInvite('a');choose(1);load()");
    assert.equal(r('game.event.step'),'photo');
    assert.equal(r('secretScene(game.event).art'),'gallery');
    r(`choose(${post?0:1});load();next()`);
    assert.equal(r("game.event?.kind==='reflection'"),post);
    if(post){
      assert.equal(r('game.event.art'),'gallery');
      r('choose(1)');
      assert.equal(r('game.event.result.speaker'),'a');
      assert.equal(r("game.log.at(-1).present.join()"),'me,b,a');
      assert.equal(r("game.log.at(-1).others.join()"),'a');
    }
    assert.equal(r("game.contacts.a.role"),'지인');
    assert.equal(r("secretLinked('a','b')"),true);
  }
});

test('disclosure can be declined or deferred; a deferred promise comes back at the agreed time',()=>{
  const r=runFamily();
  r("pick=a=>a.includes('disclosure')?'disclosure':a.includes(true)?true:a[0];queueSecretSeason();game.event=game.queue.shift()");
  assert.equal(r('game.event.kind'),'disclosure');
  assert.ok(r("secretThread(game.event).crush"));
  r("choose(2);next()");
  assert.equal(r('game.event'),undefined);
  r('next()');assert.equal(r('game.event.kind'),'tickets');
  r('choose(2)');assert.equal(r('game.secretThreads[0].next'),null);
});

test('concealed meeting, posted photo and both partners’ decisions survive a reload',()=>{
  const r=runFamily();
  r("pair();game.townPairs[0].status='배우자';wife();pick=a=>a.includes(true)?true:a[0];startSecretInvite('a');choose(0);next()");
  assert.equal(r('game.event.kind'),'cups');
  r("choose(1);load();choose(0);next()");
  assert.equal(r('game.event.kind'),'reflection');
  r("choose(0);next()");
  assert.equal(r('secretScene(game.event).speaker'),'c');
  r("choose(0);load()");
  assert.equal(r('secretScene(game.event).speaker'),'a');
  r('choose(0);choose(0)');
  assert.equal(r("game.contacts.a.role"),'연인');
  assert.equal(r("game.contacts.c.role"),'옛 인연');
  assert.equal(r('game.townPairs[0].status'),'옛 배우자');
  assert.equal(r("game.log.filter(e=>e.effect==='split').map(e=>e.id).join()"),'c');
  assert.equal(r("game.log.filter(e=>e.effect==='date').length"),1);
});

test('NPC refusal leaves their existing relationship intact even when the player has broken up',()=>{
  const r=runFamily();
  r("pair();wife();const t=newSecret(secretCast('a'),'decision');game.event=secretEvent(t);choose(1);pick=a=>false;choose(0)");
  assert.equal(r("game.contacts.a.role"),'지인');
  assert.equal(r("secretLinked('a','b')"),true);
  assert.equal(r("game.log.find(e=>e.effect==='split').id"),'c');
});

test('cinema witness sees hands first, then gives only their observation; unobserved or expired evidence cannot play',()=>{
  const r=runFamily();
  r("pair();pick=a=>a.includes('cinema')?'cinema':a.includes(true)?true:a[0];queueSecretSeason();game.event=game.queue.shift()");
  assert.equal(r('game.event.kind'),'cinema');
  assert.match(r('secretScene(game.event).message'),/손을 잡고/);
  r('choose(1);load()');
  assert.equal(r("game.log.at(-1).present.join()"),'me,a,b');
  r('next()');assert.equal(r('game.event.askAboutMovie'),true);
  r('choose(1)');assert.match(r('game.event.result.line'),/손잡고 나오는 걸/);
  assert.equal(r("game.log.at(-1).present.join()"),'me,c');
  r("const fake=newSecret(secretCast('a'),'reflection');game.event=secretEvent(fake)");
  assert.equal(r('validSecretEvent(game.event)'),false);
});

test('single contacts, kin, minors, friendship boundaries, cut ties and changed partners prevent romantic invitations',()=>{
  const r=runFamily();
  assert.equal(r("canSecretInvite('a')"),false);
  r('pair()');assert.equal(r("canSecretInvite('a')"),true);
  r("game.contacts.a.friendsOnly=true");assert.equal(r("canSecretInvite('a')"),false);
  r("game.contacts.a.friendsOnly=false;game.children=[{id:'a',year:game.year,parents:['b'],placedAge:10}]");
  assert.equal(r("canSecretInvite('a')"),false);
  r("game.children[0].placedAge=20;game.children[0].parents=['me']");
  assert.equal(r("canSecretInvite('a')"),false);
  r("game.children=[];startSecretInvite('a');game.townPairs[0].end=tick()");
  assert.equal(r('validSecretEvent(game.event)'),false);
  r("choose(0)");assert.equal(r('game.event'),null);
  r("game.blocked=['a']");assert.equal(r("canSecretInvite('a')"),false);
});

test('a rejected date can lead to a voluntary group counteroffer and a real callback only on acceptance',()=>{
  for(const answer of [0,1]){
    const r=runFamily();
    r("pair();startSecretInvite('a');pick=a=>a.includes('offer')?'offer':false;choose(0);load()");
    assert.equal(r('game.event.step'),'groupOffer');
    assert.match(r('secretScene(game.event).message'),/c도 불러서 셋이/);
    assert.equal(r('game.contacts.a.outreach'),undefined);
    r(`choose(${answer});load();game.event=null;game.season=1;seasonOutreach();seasonOutreach()`);
    assert.equal(r('game.queue.length'),answer===0?1:0);
    assert.equal(r('game.contacts.a.friendsOnly'),true);
    if(answer===0){
      r('game.event=game.queue.shift()');
      assert.equal(r('game.event.sourcePeople.join()'),'me,a');
      assert.equal(r('game.event.guests.join()'),'c');
      assert.match(r('outreachScene(game.event).setup'),/상대가 먼저/);
      r('answer(0)');
      assert.equal(r("sharedBond('a','c').visits"),1);
      assert.equal(r("game.log.at(-1).others.join()"),'c');
    }
  }
});

test('a firm refusal stands; a stored invitation, a cut guest or a calendar clash cannot be overridden',()=>{
  const r=runFamily();
  r("pair();startSecretInvite('a');pick=a=>a.includes('stop')?'stop':false;choose(0)");
  assert.equal(r('game.event.step'),undefined);
  assert.equal(r('game.contacts.a.contactAfter'),18);
  for(const change of [
    "game.blocked.push('c')",
    "game.contacts.c.quietUntil=tick()+3",
    "game.diary.push({state:'booked',people:['c'],due:tick()+1})",
    "game.contacts.a.outreach={type:'outreach',id:'a',mode:'hello',due:tick()+3,until:tick()+3}"
  ]){
    const q=runFamily();
    q("pair();startSecretInvite('a');pick=a=>a.includes('offer')?'offer':false;choose(0)");
    q(change);
    assert.equal(q('secretScene(game.event).choices.length'),1);
    q('choose(0)');
    assert.equal(q("game.contacts.a.outreach?.mode==='group'"),false);
  }
  const q=runFamily();
  q("pair();startSecretInvite('a');pick=a=>a.includes('offer')?'offer':false;choose(0);choose(0);game.blocked.push('c');game.season=1;seasonOutreach()");
  assert.equal(q('game.queue.length'),0);
  assert.equal(q('game.contacts.a.outreach'),undefined);
});
