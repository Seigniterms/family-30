const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadEnding(){
  const storage=new Map(), rendered=[];
  const element=()=>({append(){},set textContent(value){rendered.push(value);}});
  const context=vm.createContext({
    portraits:['나','친구','짝','아이','이웃'].map((name,i)=>({
      dataset:{id:String(i+1),name},querySelector:()=>({src:''})
    })),
    document:{getElementById:element,createElement:element},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}
  });
  const run=code=>vm.runInContext(code,context);
  for(const file of ['stories.js','game.js','life.js','plans.js','kin.js','credits.js']){
    run(readFileSync(path.join(__dirname,'..',file),'utf8'));
  }
  run(`game={runId:'first',player:'1',year:20,season:2,log:[],blocked:[],bonds:[],watching:['2'],
    contacts:{'2':{role:'친구'},'3':{role:'배우자'}},marriages:[{id:'3',start:2,end:null}],
    children:[{id:'4',parents:['1'],year:1}],townKids:[],townPairs:[],
    club:{goal:'한 지붕 작업실',completed:true,visits:5,guests:{'2':4},tracks:{'미술':3}},
    townNews:[
      {when:3,people:['2','5'],text:'만나기 시작했다.'},
      {when:6,people:['2','5'],text:'결혼했다.'},
      {when:72,people:['4','5'],text:'가정을 꾸렸다.'}
    ]}`);
  return {run,rendered};
}

test('family and social accomplishments survive together under a family ending',()=>{
  const {run}=loadEnding();
  assert.equal(run('ending(game).title'),'나란히 걸어온 계절');
  assert.equal(run('ending(game).threads.map(t=>t.title).join("/")'),'가족/결혼/토요일마다 만난 사이/한 지붕 작업실');
  assert.match(run('ending(game).threads[2].line'),/4번/);
  run("game.blocked.push('2')");
  assert.equal(run("ending(game).threads.some(t=>t.title==='토요일마다 만난 사이')"),false);
});

test('watched people and descendants recall dated events once, with cut participants excluded',()=>{
  const {run}=loadEnding();
  assert.equal(run('communityCredits(creditCast()).map(c=>c.events.map(n=>n.when).join()).join("/")'),'3,6/72');
  run("game.blocked.push('5')");
  assert.equal(run('communityCredits(creditCast()).length'),0);
  run('game.blocked=[];game.watching=[];game.children=[]');
  assert.equal(run('communityCredits(creditCast())[0].title'),'동네에서 이어진 인연 · 친구');
});

test('reopening an archived run preserves ending achievements and community stories alongside older albums',()=>{
  const {run,rendered}=loadEnding();
  run("localStorage.setItem('family30.albums',JSON.stringify([{id:'legacy',player:'1',title:'옛 사진',scenes:[]}]))");
  run("archiveRun();archiveRun();");
  assert.equal(run("storedList('family30.albums').length"),2);
  run("game.runId='second';game.watching=[];game.townNews=[];game.children=[];albumLife(document.createElement('section'))");
  assert(rendered.some(text=>text.includes('한 지붕 작업실 · 우리 모임의 목표를 달성했다.')));
  assert(rendered.includes('소식을 챙긴 사람 · 친구'));
  assert(rendered.includes('우리 집의 다음 세대 · 아이'));
  assert(rendered.includes('19년 차 봄 · 아이 · 이웃 — 가정을 꾸렸다.'));
  assert(rendered.some(text=>text.includes('옛 사진')));
});
