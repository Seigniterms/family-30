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
  const strained=pairs.find(pair=>(game.feuds || []).some(f=>pair.every(id=>f.includes(id))) ||
    game.townPairs?.some(p=>p.end && pair.every(id=>p.people.includes(id))));
  if(strained){
    const former=(game.townPairs || []).some(p=>p.end && strained.every(id=>p.people.includes(id)));
    return {kind:'grudge',speaker:strained[0],other:strained[1],former};
  }
  const roll=pick(['rival','grudge','regular','regular']);
  if(roll==='regular')return null;
  if(roll==='grudge'){
    const [speaker,other]=pick(pairs);
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
    case 'date':return {title:'기울어진 케이크',message:'앗, 케이크가 옆으로 누웠어! 촛불까지 비스듬한 것 좀 봐.',choices:[
      opt('같이 웃는 사진을 남긴다.','둘이 머리를 기울여 케이크랑 나란히 찍었다.'),
      opt('폰을 덮고 한입 같이 먹는다.','모양은 이래도 맛은 최고라며 둘이 끝까지 먹었다.')]};
    case 'argument':return {title:'비 오는 대벙',message:'비가 이렇게 오는데 지금 나가자고? 난 좀 기다리고 싶은데.',choices:[
      opt('잠깐 앉아서 끝까지 듣는다.','비가 잦아들자 둘이 우산 하나를 쓰고 천천히 걸어갔다.'),
      opt('나도 서운해. 먼저 갈게.','급하게 나오느라 내 우산을 입구에 두고 왔다. 상대가 우산을 챙겼다.')]};
    case 'grudge':return {title:'누가 이 사람 불렀어?',message:name(s.other)+'도 온다고 왜 말 안 했어? '+(s.former?'헤어지고 아직 제대로 얘기도 못 해 봤어.':'오늘은 둘이 같이 앉기 좀 불편해.'),choices:[
      opt('둘의 말을 차례로 들어 본다.','서로 전해 들은 말이 달랐다. 둘은 오해부터 직접 풀기로 했다.'),
      opt('오늘은 자리를 따로 잡는다.','테이블을 갈랐다. 모임은 이어졌지만 둘은 끝내 눈을 마주치지 않았다.')]};
    default:{
      const target=s.target===game.player?'네':name(s.target)+'의';
      return {title:'비워 둔 옆자리',message:target+' 옆자리, 내가 먼저 맡아 뒀어. '+name(s.other)+'도 같이 있고 싶다고 했어?',choices:[
        opt(name(s.speaker)+'에게 먼저 얘기할 시간을 준다.','먼저 마음을 꺼낼 시간이 생겼다. 다른 한 사람은 조용히 자리를 비켰다.'),
        opt(s.target===game.player?name(s.other)+' 옆에 앉고 싶다고 말한다.':name(s.target)+'에게 누구랑 있고 싶은지 묻는다.',
          s.target!==game.player && !s.preferred?'“오늘은 그냥 다 같이 놀고 싶어.” 둘 다 의자를 조금씩 뒤로 뺐다.':name(s.target===game.player?s.other:s.preferred)+' 옆자리에 의자가 놓였다. 기다리던 사람의 표정이 풀렸다.'),
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
    if(index===0)bond(s.speaker,s.other);
    else game.feuds.push([s.speaker,s.other]);
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
  page=0;lastBeat=null;navigate();
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
    title=m.choice===0?'기울어진 케이크 사진':'이번엔 멀쩡하지?';
    message=m.choice===0?'이 사진 봐. 케이크는 넘어가는데 우리는 되게 신나 보여.':'그때 사진 안 찍고 같이 먹어 줬잖아. 이번엔 안 넘어뜨렸다!';
    labels=['그날 얘기를 꺼낸다.','우리끼리 웃고 넘긴다.'];
    lines=['그날부터 좋아하던 케이크라는 걸 처음 들었다.','눈이 마주치자 굳이 설명할 필요가 없었다.'];
  }else if(m.kind==='argument'){
    title=m.choice===1?'두고 간 우산':'같은 우산 아래';
    message=m.choice===1?'네 우산이야. 비 그친 뒤에 네 자리에 남아 있더라.':'오늘도 비네. 지난번처럼 같이 걸어갈래?';
    labels=m.choice===1?['그날 먼저 가서 미안해.','우산만 받고 인사한다.']:['우산을 함께 편다.','오늘은 여기서 인사한다.'];
    lines=m.choice===1?[meet(m.id).trust<0?'“고마워. 오늘은 여기까지만 하자.” 우산을 돌려받고 각자 걸었다.':'“나도 말이 좀 셌어.” 우산을 접은 채 한참 얘기했다.','우산을 돌려받았다. 서로 고개만 살짝 숙였다.']:['빗소리를 들으며 지난번 다 못한 얘기를 마쳤다.','서로의 우산을 펴고 갈림길에서 손을 흔들었다.'];
  }else{
    title='그날의 옆자리';
    message=m.choice===2?'오늘도 둥글게 앉을까? 지난번엔 그러니까 한결 편했어.':m.choice===0?'그날 말할 시간 내줘서 고마워. 대답은 천천히 들어도 돼.':m.winner?(m.id===m.winner?'오늘은 내가 자리 잡아 뒀어. 그날 옆자리가 채워졌을 때 진짜 기분 좋았거든.':'그날은 먼저 가 버려서 미안. 오늘은 그냥 같이 놀고 싶어.'):'그때 그냥 놀고 싶다는 말, 잘 들었어. 오늘은 자리 안 맡았어.';
    labels=['옆에 자리를 내준다.','다 같이 앉자고 손짓한다.'];
    lines=['조금 어색했지만 오늘은 먼저 웃으며 자리를 잡았다.','의자를 둥글게 놓자 지난번보다 편하게 얘기가 이어졌다.'];
  }
  if(mail){
    if(m.kind==='argument')message=m.choice===1?'그날 두고 간 우산, 네 문 앞에 놓고 갈게. 비 온대.':'비 오니까 같이 우산 쓰던 날이 생각났어. 잘 지내?';
    if(m.kind==='date' && m.choice===1)message='그때 케이크 다시 만들었어. 이번엔 멀쩡하지? 사진 보낸다!';
    if(m.kind==='rival')message=m.choice===2?'다 같이 앉았던 날 사진이 떴어. 나 표정 편해 보이지?':'그날 자리 때문에 신경 쓰였지? 이제 좀 웃긴다. 잘 지내?';
    labels=['짧게 답장을 보낸다.'];lines=[m.kind==='argument' && m.choice===1?'문 앞에서 우산을 찾고 잘 받았다고 답했다.':'둘만 아는 그날 이야기에 짧은 답장을 남겼다.'];
  }
  return {title,message,choices:labels.map((label,i)=>({label,line:lines[i]}))};
}
function finishReunion(e,index,mail=false){
  const m=mail?e.memoryThread:e.social.memoryThread,story=reunionScene(m,mail),a=story.choices[index];
  if(!a)return;
  remember(m.id,story.title,a.line,'reunion');game.log.at(-1).thread=m.key;game.log.at(-1).label=a.label;
  if(!mail && index===0){const c=meet(m.id);c.trust=(c.trust || 0)+1;}
  if(mail)e.result={label:a.label,line:a.line};
  else {e.social.resolved=true;e.social.line=a.line;}
  page=0;lastBeat=null;navigate();
}
