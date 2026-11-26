// Pick a social situation once, when the guests arrive. Reloading keeps the cast and outcome.
function meetupSituation(guests){
  const memory=pendingReunions().find(m=>guests.includes(m.id));
  if(memory){
    game.reunions=game.reunions.filter(m=>m!==memory);
    return {kind:'reunion',speaker:memory.id,memoryThread:memory};
  }
  if(guests.length===1){
    const c=game.contacts[guests[0]];
    const fight=tick()>(game.calmThrough ?? -1) && (c.trust<0 || c.needsMeeting || pick([false,false,false,true]));
    return {kind:fight?'argument':'date',speaker:guests[0]};
  }
  if(tick()<=(game.calmThrough ?? -1))return null;
  const pairs=[];
  for(let i=0;i<guests.length;i++)for(const b of guests.slice(i+1))pairs.push([guests[i],b]);
  function reconciled([a,b]){
    const since=sharedBond(a,b)?.reconciledAt;
    return since!=null && since>=(formerCouple(a,b)?.end ?? 0) && !ongoingFeud(a,b);
  }
  const strained=pairs.find(([a,b])=>ongoingFeud(a,b)) ||
    pairs.find(pair=>formerCouple(...pair) && !reconciled(pair));
  if(strained)return {kind:'grudge',speaker:strained[0],other:strained[1],former:!!formerCouple(...strained)};
  const healing=pairs.find(pair=>reconciled(pair) && sharedBond(...pair).reunionPending);
  if(healing)return {kind:'peace',speaker:healing[0],other:healing[1]};
  const roll=pick(['rival','grudge','regular','regular']);
  if(roll==='regular')return null;
  if(roll==='grudge'){
    const uneasy=pairs.filter(pair=>!reconciled(pair));
    if(!uneasy.length)return null;
    const [speaker,other]=pick(uneasy);
    return {kind:roll,speaker,other};
  }
  const target=guests.length>2?pick(guests):game.player;
  const candidates=guests.filter(id=>id!==target && !closeKin(id,target) &&
    (target!==game.player || !game.contacts[id].friendsOnly));
  if(candidates.length<2)return null;
  const suitors=candidates.sort((a,b)=>interest(b)-interest(a));
  function interest(id){
    if(target===game.player)return (partner(game.contacts[id])?10:0)+(game.contacts[id].affection || 0);
    return (game.townPairs || []).some(p=>!p.end && p.people.includes(id) && p.people.includes(target))?10:0;
  }
  // The invited member gets a say even when two guests both express interest.
  const preferred=interest(suitors[0])>interest(suitors[1])?suitors[0]:pick([suitors[0],suitors[1],null]);
  return {kind:roll,speaker:suitors[0],other:suitors[1],target,preferred};
}
function meetupScene(e){
  const s=e.social,name=id=>kinPerson(id).name;
  const opt=(label,line)=>({label,line});
  switch(s.kind){
    case 'reunion':return reunionScene(s.memoryThread);
    case 'date':return {title:'기울어진 케이크',message:'너 주려고 케이크 사 왔는데… 상자 열어 봐. 딸기가 다 한쪽으로 몰렸어.',choices:[
      opt('케이크랑 같이 고개 기울여 볼까?','둘이 케이크 쪽으로 고개를 기울였다. 웃음이 터질 때 셔터가 눌렸다.'),
      opt('폰을 덮고 한입 같이 먹는다.','폰을 내려놓자 상대도 안심한 듯 포크를 꺼냈다. 마지막 딸기를 반씩 나눠 먹었다.')]};
    case 'argument':return {title:'비 오는 대벙',setup:'밖에는 비가 쏟아진다. 나는 막차를 확인하고 출입문 옆 우산을 집으려 한다.',message:'지금 가려고? 난 오늘 네 얼굴 보고 얘기 좀 하고 싶었는데.',choices:[
      opt('잠깐 앉아서 끝까지 듣는다.','막차까지 몇 분 남았는지 같이 확인했다. 둘이 우산을 쓰고 정류장까지 걸으며 얘기했다.'),
      opt('막차 놓치면 어떻게 가. 나 먼저 갈게.','급히 가게를 나왔다. 문에 비친 상대의 손에 내 우산이 들려 있었다.')]};
    case 'peace':return {title:'이번엔 나란히',setup:name(s.speaker)+' 옆자리에 '+name(s.other)+'의 가방이 놓여 있다.',message:'오늘은 자리 안 바꿔 줘도 돼. 지난번에 얘기하고 나서 우리가 먼저 같이 앉자고 했어.',choices:[
      opt('그럼 셋이 여기 앉을까?','셋이 한 테이블에서 메뉴를 골랐다. 지난번에 사이에 두었던 빈 의자는 가방 자리가 됐다.'),
      opt('알겠어. 편하게 얘기해.','두 사람이 먼저 서로에게 물을 따라 줬다. 나는 다른 테이블에도 인사하러 갔다.')]};
    case 'grudge':return {title:'누가 이 사람 불렀어?',message:name(s.other)+'도 왔네. 나 자리 좀 바꿔 줄래? '+(s.former?'헤어지고 아직 제대로 얘기도 못 해 봤어.':'오늘은 둘이 같이 앉기 좀 불편해.'),choices:[
      opt('둘의 말을 차례로 들어 본다.','각자 불편했던 점을 얘기할 시간을 줬다. 두 사람은 오늘 한 테이블에 앉아 보기로 했다.'),
      opt('오늘은 자리를 따로 잡는다.','테이블을 갈랐다. 모임은 이어졌지만 둘은 끝내 눈을 마주치지 않았다.')]};
    default:{
      const target=s.target===game.player?'네':name(s.target)+' 바로';
      return {title:'비워 둔 옆자리',message:target+' 옆에 앉으려고 했는데, '+name(s.other)+'도 같은 의자를 잡았어. 우리 어떡하지?',choices:[
        opt(name(s.speaker)+'에게 먼저 얘기할 시간을 준다.','먼저 마음을 꺼낼 시간이 생겼다. 다른 한 사람은 조용히 자리를 비켰다.'),
        opt(s.target===game.player?name(s.other)+' 옆에 앉고 싶다고 말한다.':name(s.target)+'에게 누구랑 있고 싶은지 묻는다.',
          s.target!==game.player && !s.preferred?name(s.target)+'는 오늘 다 같이 놀고 싶다고 했다. 두 사람은 의자를 조금씩 뒤로 뺐다.':name(s.target===game.player?s.other:s.preferred)+' 옆자리에 의자가 놓였다. 기다리던 사람의 표정이 풀렸다.'),
        opt('자리 경쟁은 여기까지. 다 같이 앉자.','둥글게 상을 붙였다. 누구도 오늘 당장 대답을 정하지 않아도 됐다.')]};
    }
  }
}
function settleMeetup(e,index){
  if(e.social.kind==='reunion'){finishReunion(e,index);return;}
  const s=e.social,{title,choices}=meetupScene(e),action=choices[index];
  if(!action)return;
  const c=meet(s.speaker);
  const adjust=(id,delta)=>{const p=meet(id);p.affection=Math.max(0,p.affection+delta);};
  if(s.kind==='date')adjust(s.speaker,index===0 && !c.friendsOnly?2:0);
  if(s.kind==='argument'){
    c.trust=(c.trust || 0)+(index===0?1:-1);
    if(index===1){adjust(s.speaker,-2);c.quietUntil=tick()+2;}
  }
  if(s.kind==='grudge'){
    game.feuds=(game.feuds || []).filter(pair=>!(pair.includes(s.speaker) && pair.includes(s.other)));
    if(index===0){
      bond(s.speaker,s.other);
      const link=sharedBond(s.speaker,s.other);
      link.reconciledAt=tick();link.reunionPending=true;
    }
    else game.feuds.push([s.speaker,s.other]);
  }
  if(s.kind==='peace'){
    const link=sharedBond(s.speaker,s.other);
    if(link)link.reunionPending=false;
  }
  if(s.kind==='rival' && index<2){
    const winner=index===0?s.speaker:s.target===game.player?s.other:s.preferred;
    if(s.target===game.player)adjust(winner,2);else if(winner)bond(winner,s.target);
  }
  remember(s.speaker,title,action.line,'meetup',e.guests.filter(id=>id!==s.speaker));
  if(s.kind==='grudge'){
    const msg=index===0?'그때 자리 만들어 줘서 고마워. 우리 둘이 따로 얘기도 했어.':'다음에는 누가 오는지 먼저 말해 줘. 나도 마음의 준비는 하고 싶어.';
    addEcho(s.speaker,'meetup',msg,'번개가 끝난 뒤',[s.other]);
  }
  game.log.at(-1).label=action.label;
  saveReunion(e,index);
  if(['argument','grudge','rival'].includes(s.kind))game.calmThrough=tick()+1;
  c.last=action.line;s.resolved=true;s.choice=index;s.line=action.line;
  if(s.kind==='argument' && index===1){
    e.result={label:action.label,line:action.line,memory:action.line};
  }
  page=0;lastBeat=null;navigate(e);
}

function pruneFriendshipThreads(){
  const isFriend=id=>!!game.contacts[id]?.friendsOnly;
  const romanticMemory=m=>m && isFriend(m.id) && (m.kind==='date' ||
    (m.kind==='rival' && m.target===game.player && m.winner===m.id && m.choice!==2));
  function stale(e){
    if(e.type==='reunionMail')return romanticMemory(e.memoryThread);
    if(e.type!=='echo' || e.kind!=='incident' || !isFriend(e.id))return false;
    // Before the marker was stored, every private incident used the romantic script.
    return e.romantic ?? !e.guests?.length;
  }
  game.echoes=(game.echoes || []).filter(e=>!stale(e));
  game.reunions=(game.reunions || []).filter(m=>!romanticMemory(m));
  if(game.queue)game.queue=game.queue.filter(e=>!stale(e));
  const e=game.event;
  if(!e || e.result)return;
  if(stale(e))game.event=null;
  else if(e.social && !e.social.resolved && (romanticMemory(e.social.memoryThread) ||
    (e.social.kind==='date' && isFriend(e.social.speaker))))delete e.social;
}
function pendingReunions(){
  return (game.reunions || []).filter(m=>tick()>m.when && !quietContact(m.id) && !m.people.some(isCut));
}
function saveReunion(e,index){
  const s=e.social;
  if(!['date','argument','rival'].includes(s.kind))return;
  const winner=index===0?s.speaker:s.target===game.player?s.other:s.preferred;
  const witness=e.guests.find(id=>![s.speaker,s.other,s.target].includes(id));
  const id=s.kind!=='rival'?s.speaker:(index===2 && witness?witness:(winner || s.other));
  const key=tick()+'-'+s.kind+'-'+id;
  (game.reunions ||= []).push({key,id,when:tick(),kind:s.kind,choice:index,winner:index===2?null:winner,
    people:[...new Set([game.player,...e.guests])],target:s.target});
  game.log.at(-1).thread=key;
}
function reunionScene(m,mail=false){
  let title,message,labels,lines;
  if(m.kind==='date'){
    title=m.choice===0?'기울어진 케이크 사진':'다시 가져온 케이크';
    message=m.choice===0?'이 사진 봐. 케이크는 넘어가는데 우리는 되게 신나 보여.':'지난번에 기울어진 케이크 기억해? 오늘은 오는 길에 상자를 꼭 붙들고 왔어.';
    labels=['그날 얘기를 꺼낸다.','우리끼리 웃고 넘긴다.'];
    lines=['케이크를 고르느라 가게 앞을 두 번 돌았다는 얘기를 처음 들었다.','눈이 마주치자 굳이 설명할 필요가 없었다.'];
  }else if(m.kind==='argument'){
    title=m.choice===1?'두고 간 우산':'같은 우산 아래';
    message=m.choice===1?'지난번 비 오던 날 두고 간 네 우산이야. 돌려주려고 챙겨 왔어.':'오늘도 비네. 지난번처럼 같이 걸어갈래?';
    labels=m.choice===1?['그날 먼저 가서 미안해.','우산만 받고 인사한다.']:['우산을 함께 편다.','오늘은 여기서 인사한다.'];
    lines=m.choice===1?[meet(m.id).trust<0?'상대는 오늘은 인사만 하고 싶다고 했다. 우산을 받아 들고 각자 걸었다.':'상대도 그날 말투가 마음에 걸렸다며 사과했다. 우리는 우산을 접고 한참 얘기했다.','우산을 돌려받았다. 서로 고개만 살짝 숙였다.']:['빗소리를 들으며 지난번 다 못한 얘기를 마쳤다.','서로의 우산을 펴고 갈림길에서 손을 흔들었다.'];
  }else{
    title='그날의 옆자리';
    const target=m.target===game.player?'네':kinPerson(m.target).name+' 바로';
    if(m.choice===2)message='지난번에 상 붙여서 다 같이 앉았잖아. 나 그날 마음이 편했어. 오늘도 그럴까?';
    else if(m.choice===0)message='지난번에 내가 먼저 얘기할 수 있게 기다려 줬잖아. 덕분에 하고 싶은 말 했어.';
    else if(m.winner)message=m.id===m.winner?'지난번에 '+target+' 옆에 앉았을 때 말 한마디도 못 했어. 좋아서 그랬어.':'지난번에 자리 비우고 혼자 가서 미안해. 오늘은 같이 놀고 싶어.';
    else message='오늘은 자리 안 맡아 놨어. 지난번처럼 다 같이 앉을까?';
    labels=['옆에 자리를 내준다.','다 같이 앉자고 손짓한다.'];
    lines=['조금 어색했지만 오늘은 먼저 웃으며 자리를 잡았다.','의자를 둥글게 놓자 지난번보다 편하게 얘기가 이어졌다.'];
  }
  if(mail){
    if(m.kind==='argument')message=m.choice===1?'그날 두고 간 우산, 네 문 앞에 놓고 갈게. 비 온대.':'비 오니까 같이 우산 쓰던 날이 생각났어. 잘 지내?';
    if(m.kind==='date' && m.choice===1)message='이번엔 케이크를 똑바로 들고 왔어. 딸기 하나 안 굴러갔다! 사진 봐.';
    if(m.kind==='rival')message=m.choice===2?'다 같이 앉았던 날 사진이 떴어. 나 표정 편해 보이지?':'그날 자리 때문에 신경 쓰였지? 이제 좀 웃긴다. 잘 지내?';
    if(m.kind==='date'){
      labels=[m.choice===0?'나 그 사진 보면 또 웃어.':'딸기 진짜 하나도 안 굴렀네!'];
      lines=[m.choice===0?'사진을 저장하고 웃는 얼굴을 하나 보냈다.':'사진 속 케이크에 하트를 눌렀다.'];
    }else if(m.kind==='argument'){
      labels=[m.choice===1?'우산 잘 받았어. 고마워.':'응. 너도 비 안 맞게 조심해.'];
      lines=[m.choice===1?'문 앞에서 우산을 찾고 잘 받았다고 답했다.':'빗소리를 들으며 안부를 주고받았다.'];
    }else{
      labels=[m.choice===2?'다음에도 상 붙여서 앉자.':'응, 다음엔 편하게 보자.'];
      lines=['다음에 마주치면 웃으며 인사하기로 했다.'];
    }
  }
  return {title,message,choices:labels.map((label,i)=>({label,line:lines[i]}))};
}
function finishReunion(e,index,mail=false){
  const m=mail?e.memoryThread:e.social.memoryThread,story=reunionScene(m,mail),a=story.choices[index];
  if(!a)return;
  remember(m.id,story.title,a.line,'reunion',mail?[]:e.guests.filter(id=>id!==m.id));game.log.at(-1).thread=m.key;game.log.at(-1).label=a.label;
  if(!mail && index===0){const c=meet(m.id);c.trust=(c.trust || 0)+1;}
  if(mail)e.result={label:a.label,line:a.line,spoken:false};
  else {e.social.resolved=true;e.social.line=a.line;}
  page=0;lastBeat=null;navigate(e);
}
