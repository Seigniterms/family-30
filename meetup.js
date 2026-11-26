// Pick a social situation once, when the guests arrive. Reloading keeps the cast and outcome.
function meetupSituation(guests){
  if(guests.length===1){
    const c=game.contacts[guests[0]];
    const fight=c.trust<0 || c.needsMeeting || pick([false,false,false,true]);
    return {kind:fight?'argument':'date',speaker:guests[0]};
  }
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
    case 'date':return {title:'둘만 나온 대벙',message:'진짜 우리 둘뿐이네. 오늘은 내 옆에 좀 더 붙어 있어도 돼?',choices:[
      opt('옆자리로 의자를 당긴다.','의자가 부딪쳤다. 둘 다 한참 웃으면서도 자리를 옮기지 않았다.'),
      opt('천천히, 편하게 놀자.','서로 부담 주지 않기로 하고 오늘 하고 싶었던 얘기를 꺼냈다.')]};
    case 'argument':return {title:'대벙에서 터진 말다툼',message:'오늘 우리 둘이 보는 거, 왜 단톡에 먼저 얘기했어? 난 우리끼리만 알고 싶었어.',choices:[
      opt('어디까지 말해도 좋을지 먼저 듣는다.','폰을 뒤집어 놓고 서로 싫었던 걸 얘기했다. 다음엔 먼저 묻기로 했다.'),
      opt('나도 서운해. 오늘은 먼저 갈게.','계산대 앞에서 헤어졌다. 비워 둔 두 자리에 아무도 돌아오지 않았다.')]};
    case 'grudge':return {title:'누가 이 사람 불렀어?',message:name(s.other)+'도 온다고 왜 말 안 했어? '+(s.former?'헤어지고 아직 제대로 얘기도 못 해 봤어.':'지난번에 내 얘기를 옮긴 뒤로 우리 말도 안 해.'),choices:[
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
  if(s.kind==='rival'){
    addEcho(s.other,'meetup',index===2?'그날 둥글게 앉자고 해 줘서 고마워. 솔직히 좀 긴장했어.':'그날 옆자리 때문에 나도 모르게 티가 났나 봐. 다음엔 내 입으로 말하고 싶어.','그날의 옆자리',e.guests.filter(id=>id!==s.other));
  }
  c.last=action.line;s.resolved=true;s.choice=index;s.line=action.line;
  if(s.kind==='argument' && index===1){
    e.result={label:action.label,line:action.line,memory:action.line};
  }
  page=0;lastBeat=null;navigate();
}
