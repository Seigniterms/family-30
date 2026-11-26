const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadTown(){
  const context=vm.createContext({
    portraits:['me','a','b'].map(id=>({dataset:{id,name:id},querySelector:()=>({src:''})})),
    document:{getElementById:()=>({addEventListener(){}})},showCurrentScreen(){}
  });
  const run=source=>vm.runInContext(source,context);
  for(const file of ['stories.js','game.js','life.js','plans.js','snapshots.js','kin.js','meetup.js','incidents.js','stage.js']){
    vm.runInContext(readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  }
  run(`game={player:'me',year:5,season:0,seed:17,contacts:{},marriages:[],children:[],townKids:[],townPairs:[],
    bonds:[],blocked:[],feuds:[],keepsakes:[],log:[],queue:[],echoes:[],diary:[]};meet('a');meet('b');navigate=()=>{};`);
  return run;
}

test('private incidents after a friendship choice keep the connection and never book a date',()=>{
  const run=loadTown();
  run("chooseFriendship('a')");
  for(const code of ['mic','bag','train','blackout']){
    for(const choice of [0,1]){
      run(`game.event={type:'incident',code:'${code}',id:'a',other:'b'};handleIncident(game.event,0);`);
      assert.equal(run("incidentScene(game.event).choices[0].effect"),'friend');
      run(`handleIncident(game.event,${choice})`);
      assert.ok(run('game.log.at(-1).label'));
      assert.equal(run('game.echoes.at(-1).romantic'),false);
    }
  }
  assert.equal(run('game.contacts.a.trust'),4);
  assert.equal(run('game.contacts.a.affection'),0);
  assert.equal(run('game.contacts.a.promise'),false);
  run("handleIncident({type:'incident',id:'b',other:'a',code:'bag',route:'pair'},0)");
  assert.equal(run('game.contacts.b.plan'),'dinnerDate');
  assert.equal(run('game.echoes.at(-1).romantic'),true);
});

test('legacy private romantic mail is cleared while group mail, friendly mail and completed memories survive',()=>{
  const run=loadTown();
  run(`const old={type:'echo',kind:'incident',id:'a',guests:[]};
    game.echoes=[old,{...old,guests:['b']},{...old,romantic:false},{...old,id:'b'}];
    game.reunions=[{kind:'date',id:'a'},{kind:'rival',id:'a',target:'me',winner:'a',choice:1},{kind:'argument',id:'a'}];
    game.queue=[{type:'reunionMail',id:'a',memoryThread:game.reunions[0]}];
    game.event={...old};game.contacts.a.friendsOnly=true;
    game=JSON.parse(JSON.stringify(game));pruneFriendshipThreads();pruneFriendshipThreads();`);
  assert.equal(run('game.echoes.length'),3);
  assert.equal(run('game.reunions.map(m=>m.kind).join()'),'argument');
  assert.equal(run('game.queue.length'),0);
  assert.equal(run('game.event'),null);
  run("game.event={...old,result:{line:'이미 읽은 답장'}};pruneFriendshipThreads()");
  assert.equal(run('game.event.result.line'),'이미 읽은 답장');
});

test('former partners who reconciled choose to sit together once and do not replay the old fight',()=>{
  const run=loadTown();
  run(`game.townPairs=[{people:['a','b'],end:5}];
    const outing=guests=>({guests,social:meetupSituation(guests)});
    game.event=outing(['a','b']);`);
  assert.equal(run('game.event.social.kind'),'grudge');
  run("settleMeetup(game.event,0);game.season=2;game=JSON.parse(JSON.stringify(game));game.event=outing(['b','a'])");
  assert.equal(run('game.event.social.kind'),'peace');
  run("settleMeetup(game.event,1);pick=list=>list.includes('grudge')?'grudge':list[0]");
  assert.equal(run("meetupSituation(['a','b'])"),null);
  run("game.feuds=[['b','a']]");
  assert.equal(run("meetupSituation(['a','b']).kind"),'grudge');
});

test('NPC decisions respond to events after the relationship began and allow either independent outcome',()=>{
  const run=loadTown();
  run("const pair={people:['a','b'],startVisits:1,partWays:true};bond('a','b');pick=list=>list.at(-1)");
  assert.equal(run('townDecision(pair).split'),true);
  run("bond('a','b')");
  assert.equal(run('townDecision(pair).split'),false);
  run("pick=list=>list[0]");
  assert.equal(run('townDecision(pair).split'),true);
  run("pair.partWays=false;game.feuds=[['b','a']];pick=list=>list.at(-1)");
  assert.equal(run('townDecision(pair).split'),true);
  run("pick=list=>list[0]");
  assert.equal(run('townDecision(pair).split'),false);
});

test('a promised photo meeting takes priority over a casual follow-up',()=>{
  const run=loadTown();
  run("game.queue=[{id:'a',type:'photoPromise'}];addEcho('b','incident','안녕','안부');game.echoes[0].due=tick();seasonalEncounter()");
  assert.equal(run('game.event.type'),'photoPromise');
  assert.equal(run('game.echoes.length'),1);
});
