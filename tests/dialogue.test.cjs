const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadDialogue(){
  const context=vm.createContext({
    portraits:['1','2','3'].map(id=>({dataset:{id,name:'멤버'+id},querySelector:()=>({src:''})})),
    document:{getElementById:()=>({})},lifeMenu:{addEventListener(){}},showCurrentScreen(){},
    isCut:()=>false
  });
  for(const file of ['stories.js','game.js','snapshots.js','stage.js']){
    vm.runInContext(readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  }
  const run=source=>vm.runInContext(source,context);
  run("game={player:'1',year:1,season:0,contacts:{},snapshot:{joker:'2',sender:'3',frame:0},log:[]};meet('2');meet('3');navigate=()=>{};");
  return run;
}

test('keep a spoken reply in one beat and the subsequent observation outside its bubble',()=>{
  const run=loadDialogue();
  assert.equal(run("sceneBeats({}, {result:{line:'많이 기다렸어? '.repeat(15),spoken:true,memory:'상대가 고개를 끄덕였다.'}}).map(b=>b.voice).join()"),'true,false');
  assert.equal(run("sceneBeats({setup:'집에 도착했다.',message:'내일은 무엇을 할까?',narrationOnly:true},{}).every(b=>!b.voice)"),true);
});

test('first private photo reveals the crop only after asking and leaves room for another reply',()=>{
  const run=loadDialogue();
  run("game.event={type:'photoNote',id:'3'};answer(0)");
  assert.equal(run('game.event.step'),1);
  assert.equal(run('game.snapshot.reply'),undefined);
  assert.equal(run('game.log.length'),0);
  assert.equal(run('snapshotScene(game.event).choices.length'),2);
  run("game.event=JSON.parse(JSON.stringify(game.event));snapshotAnswer(game.event,1)");
  assert.equal(run('game.snapshot.reply'),0);
  run("snapshotAnswer({type:'photoNote',id:'3'},1)");
  assert.equal(run('game.snapshot.reply'),1);
});

test('every chapter supplies its own readable beat and two complete consequences',()=>{
  const run=loadDialogue();
  const issues=run(`library.filter(chapter=>
    !chapter.message || chapter.choices.length!==2 ||
    chapter.choices.some(choice=>!choice.label || !choice.line) ||
    (chapter.group==='relationship'
      ? chapter.narrationOnly || chapter.message===chapter.setup
      : !chapter.narrationOnly)
  ).map(c=>c.title).join(', ')`);
  assert.equal(issues,'');
  assert.equal(run("JSON.stringify(Object.keys(relationshipVoices).sort())===JSON.stringify(library.filter(c=>c.group==='relationship').map(c=>c.title).sort())"),true);
});

test('legacy photo outcomes still read as observations when reopening a saved scene',()=>{
  const run=loadDialogue();
  assert.equal(run("sceneBeats(snapshotScene({type:'photoReunion'}),{type:'photoReunion',result:{spoken:true,label:'셋이 손잡고 같이 뛴다.',line:'이번엔 셋 다 흔들렸다.'}})[0].voice"),false);
});

test('attribute an interruption or a family reply to the person actually speaking',()=>{
  const run=loadDialogue();
  assert.equal(run("sceneSpeaker({type:'incident',route:'group',id:'2',other:'3'},{})"),'3');
  assert.equal(run("sceneSpeaker({type:'sportsLater',id:'1',kid:'3'},{})"),'3');
  assert.equal(run("sceneSpeaker({id:'2',result:{speaker:'3'}},{speaker:'2'})"),'3');
});
