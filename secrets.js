// A thread keeps the people, observed facts and next appointment across saves.
function secretAdult(id){
  if(!id || !members[id] || isCut(id))return false;
  const child=allChildren().find(c=>c.id===id);
  return !child || childAge(child)>=18;
}
function secretPartner(id){
  if(id===game.player){
    const candidates=Object.keys(game.contacts).filter(who=>partner(game.contacts[who]));
    return candidates.find(who=>game.contacts[who].role==='배우자') || candidates[0];
  }
  const pair=game.townPairs?.find(p=>p.end==null && p.people.includes(id));
  return pair?.people.find(who=>who!==id);
}
function secretLinked(a,b){
  if(!a || !b)return false;
  if(a===game.player || b===game.player)return partner(game.contacts[a===game.player?b:a] || {});
  return game.townPairs?.some(p=>p.end==null && p.people.includes(a) && p.people.includes(b));
}
function secretCast(actor){
  const mine=secretPartner(game.player),theirs=secretPartner(actor);
  const people=[...new Set([game.player,actor,mine,theirs].filter(Boolean))];
  if(people.some(id=>!secretAdult(id)) || closeKin(game.player,actor))return null;
  return {actor,mine,theirs,people};
}
function secretAvailable(id){
  const c=game.contacts[id];
  return !!c && id!==game.player && !partner(c) && !c.warning && !c.friendsOnly &&
    !quietContact(id) && !(c.groupUntil>=tick()) && (c.contactAfter || 0)<=tick() && (c.cooldown || 0)<=tick() && !c.needsMeeting && secretCast(id);
}
function freeSecretGroup(people,due,thread){
  if(due>119 || people.some(id=>!freeToContact(id) || !secretAdult(id)))return false;
  for(const id of people){
    const c=game.contacts[id];
    if(c.needsMeeting || (c.cooldown || 0)>tick() || (c.contactAfter || 0)>tick() ||
      c.promise && c.deadline<=due || c.alternate && c.alternate.asked===tick())return false;
  }
  const overlaps=e=>[e.id,...(e.people || []),...(e.guests || [])].some(id=>people.includes(id));
  const scheduled=[...Object.values(game.contacts).map(c=>c.outreach),...(game.queue || []).filter(e=>e.type==='outreach')].filter(Boolean);
  if(scheduled.some(e=>e.sourceThread!==thread && e.due<=due && e.until>=tick() && overlaps(e)))return false;
  if((game.diary || []).some(p=>p.state==='booked' && p.due===due && overlaps(p)))return false;
  return ![...(game.obligations || []),game.familyDate,...(game.queue || []).filter(e=>e.protected)]
    .some(e=>e && overlaps(e) && (e.due==null || e.due===due));
}
function secretGroupGuest(t){
  const c=game.contacts[t.actor];
  if(c.outreach || c.alternate || c.trust<0 || tick()>=119)return null;
  const guests=Object.keys(game.contacts).filter(id=>id!==t.actor && id!==game.player && freeSecretGroup([t.actor,id],tick()+1,t.key));
  return guests.find(id=>!t.people.includes(id)) || guests[0];
}
function secretBusy(){
  return (game.secretThreads || []).some(t=>t.next && tick()<=t.expires && validSecretThread(t));
}
function canSecretInvite(id){
  const cast=secretAvailable(id);
  return !!(cast && (cast.mine || cast.theirs) && !game.ended && !game.finale && !secretBusy() &&
    (game.secretThreads || []).every(t=>t.actor!==id || tick()-t.started>=4));
}
function validSecretThread(t){
  if(!t || t.people.some(id=>!secretAdult(id)))return false;
  if(t.witness)return (t.sawHands || secretLinked(t.actor,t.other)) && !quietContact(t.actor) && !quietContact(t.other) && !quietContact(t.asker);
  if(!game.contacts[t.actor] || quietContact(t.actor) || closeKin(game.player,t.actor))return false;
  if(game.contacts[t.actor].friendsOnly && !t.friendly)return false;
  if(t.friendly)return true;
  return !secretLinked(game.player,t.actor) &&
    (!t.mine || secretLinked(game.player,t.mine)) && (!t.theirs || secretLinked(t.actor,t.theirs)) &&
    (!!t.mine || !secretPartner(game.player)) && (!!t.theirs || !secretPartner(t.actor));
}
function secretThread(e){return game.secretThreads?.find(t=>t.key===e.thread);}
function validSecretEvent(e){
  if(e.type!=='secret')return true;
  const t=secretThread(e);
  if(!t)return false;
  if(e.result)return true;
  if(e.kind==='reflection' && !t.sharedPhoto || e.askAboutMovie && !t.sawHands)return false;
  return validSecretThread(t) && t.next===e.kind && tick()<=t.expires;
}
function secretNext(t,kind,delay=1){
  t.next=kind;t.due=tick()+delay;t.expires=t.due+3;
}
function secretEvent(t){
  const kind=t.next;
  const art={tickets:'tickets',cups:'cups',cinema:'cinema',reflection:t.friendly?'gallery':'reflection'}[kind];
  const id=kind==='cinema' && t.sawHands?t.asker:kind==='reflection'?t.asker:t.actor;
  return {type:'secret',kind,id,thread:t.key,people:[...t.people],askAboutMovie:kind==='cinema' && !!t.sawHands,art,key:t.key+'-'+kind+'-'+t.due,until:t.expires};
}
function newSecret(cast,kind){
  game.secretThreads ||= [];
  const t={...cast,started:tick(),key:'secret-'+tick()+'-'+game.secretThreads.length};
  game.secretThreads.push(t);secretNext(t,kind,0);return t;
}
function startSecretInvite(id){
  if(game.event || !canSecretInvite(id))return false;
  const t=newSecret(secretCast(id),'tickets');t.initiator=game.player;
  game.event=secretEvent(t);navigate();return true;
}
function queueSecretSeason(){
  if(game.ended || game.finale || game.secretTick===tick())return null;
  game.secretTick=tick();
  game.queue ||= [];
  game.queue=game.queue.filter(e=>validSecretEvent(e));
  const threads=game.secretThreads || [];
  for(const t of threads)if(t.next && (!validSecretThread(t) || tick()>t.expires))t.next=null;
  if(game.queue.some(e=>e.type==='secret') || game.event?.type==='secret')return null;
  let t=threads.find(t=>t.next && t.due<=tick());
  if(!t){
    if(secretBusy() || tick()<4 || tick()-(game.lastSecretOffer ?? -4)<4 || !pick([false,false,true]))return null;
    const couples=(game.townPairs || []).filter(p=>p.end==null && p.people.every(id=>secretAdult(id) && !quietContact(id)) && !closeKin(...p.people));
    const candidates=Object.keys(game.contacts).filter(id=>secretAvailable(id) && threads.every(t=>t.actor!==id || tick()-t.started>=6));
    const kinds=[];
    if(candidates.length)kinds.push('disclosure');
    const committed=candidates.filter(id=>{const c=secretCast(id);return c.mine || c.theirs;});
    if(committed.length)kinds.push('tickets');
    const married=committed.filter(id=>{const c=secretCast(id);return c.mine===spouse() && !!c.mine || townSpouse(id);});
    if(married.length)kinds.push('cups');
    const observers=Object.keys(game.contacts).filter(id=>secretAdult(id) && !quietContact(id));
    const sightings=couples.filter(p=>observers.some(id=>!p.people.includes(id)));
    if(sightings.length)kinds.push('cinema');
    if(!kinds.length)return null;
    const kind=pick(kinds);
    if(kind==='cinema'){
      const [actor,other]=pick(sightings).people;
      const asker=pick(observers.filter(id=>id!==actor && id!==other));
      t=newSecret({actor,other,asker,witness:true,people:[game.player,actor,other,asker]},kind);
    }else{
      const actor=pick(kind==='cups'?married:kind==='tickets'?committed:candidates);
      const cast=secretCast(actor);
      if(kind==='disclosure'){
        const others=observers.filter(id=>id!==actor && !closeKin(actor,id));
        cast.crush=cast.theirs || (others.length?pick(others):null);
        if(!cast.crush)return null;
        cast.people=[...new Set([...cast.people,cast.crush])];
      }
      t=newSecret(cast,kind);
    }
    game.lastSecretOffer=tick();
  }
  const e=secretEvent(t);
  game.queue.push(e);return e;
}
function secretScene(e){
  const t=secretThread(e);
  if(!t || (!e.result && !validSecretEvent(e)))return {title:'달라진 약속',message:'그사이 상황이 달라졌다. 이 약속은 여기에서 마무리한다.',narrationOnly:true,choices:[{label:'돌아간다.'}]};
  const name=id=>kinPerson(id).name;
  function scene(title,setup,message,labels,narrationOnly=false){
    return {title,setup,message,narrationOnly,speaker:e.id,art:e.art,choices:labels.map(label=>({label}))};
  }
  if(e.step==='groupOffer'){
    if(!freeSecretGroup([t.actor,e.guest],tick()+1,t.key) || game.contacts[t.actor].outreach)
      return scene('엇갈린 번개 일정','','그사이 다른 약속이 생겼어. 이번에는 각자 보고 다음에 보자.',['알겠어. 다음에 보자.']);
    return scene('상대가 다시 내민 초대','','둘이 가는 건 어려워. 나는 너랑 친구로 지내고 싶어. 다음 번개는 '+name(e.guest)+'도 불러서 셋이 국수 먹을래?',
      ['좋아. 다음 계절에 셋이 보자.','이번 번개는 쉴게.']);
  }
  if(e.step==='photo'){
    return scene('어디까지 보여 줄까?',e.previous,
      '휴대폰에 사진 한 장이 남았다. 단톡방에 올릴까, 우리끼리 간직할까?',
      ['단톡방에 사진을 올린다.','내 사진첩에만 둔다.'],true);
  }
  switch(e.kind){
    case 'disclosure':return scene('말해 두고 싶은 이름','모임이 끝난 뒤 둘이서 의자를 접고 있다.',
      '나 지금 마음 둔 사람이 있어. '+name(t.crush)+' 얘기야. 네가 나중에 다른 데서 듣는 건 싫었어. 그래도 너만 괜찮다면, 한 번 더 보고 싶어.',
      ['말해 줘서 고마워. 그래도 다시 보고 싶어.','그렇구나. 나는 여기서 물러날게.','오늘은 생각할 시간을 줘.']);
    case 'tickets':{
      const mine=t.mine?'내가 이미 만나고 있는 사람은 '+withParticle(name(t.mine),'이다.','다.'):'';
      const theirs=t.theirs?name(t.actor)+' 곁에는 '+name(t.theirs)+'도 있다.':'';
      return scene('전시표 두 장',[t.initiator===game.player?'내가 먼저 단둘이 볼 전시표를 내밀었다.':'상대가 접힌 전시표 두 장을 테이블 위에 놓았다.',mine,theirs].filter(Boolean).join(' '),
        t.initiator===game.player?'우리 둘이? 너는 이 약속을 어떤 마음으로 잡고 싶어?':'같이 갈래? 우리 둘이 가는 거라서, 가기 전에 네 마음도 듣고 싶어.',
        ['데이트로 가고 싶어. 넌 어때?','친구로 전시를 보고 싶어.','이번 표는 다른 사람에게 줘.']);}
    case 'cups':return scene('사진에서 잘린 찻잔',t.mine?'내 앞에는 찻잔 두 개가 있다. 옆자리까지 찍은 사진을 같이 들여다본다.':'찻잔 두 개 중 하나가 사진 밖으로 밀려난다.',
      t.theirs && townSpouse(t.actor)?'우리 집에는 혼자 차 마신다고 했어. 사진은 내 잔만 나오게 자르면 안 될까?':'네가 만나는 사람도 우리 여기 있는 거 알아? 사진엔 잔 하나만 보이는데.',
      ['왜 숨기려는 건지 먼저 얘기하자.','둘이 만난 건 우리끼리 알고 있자.','숨겨야 한다면 여기까지 할래.']);
    case 'cinema':
      if(!e.askAboutMovie)return scene('극장 불이 켜질 때','엔딩 크레딧이 올라간다. 출구 쪽 두 사람이 눈에 들어온다.',
        name(t.actor)+' 옆에 '+name(t.other)+'도 있다. 불이 켜질 때까지 둘은 손을 잡고 있었다.',
        ['목례만 하고 지나간다.','팝콘 통을 들고 먼저 나온다.'],true);
      return scene('그날 극장에 있었지?','며칠 뒤, 단톡방에서 그날 마지막 회차의 영화 얘기가 나왔다.','너도 마지막 회차 봤지? 출구에서 '+name(t.actor)+' 봤어? 누구랑 같이 나가던 것 같던데.',
        ['당사자에게 따로 묻는다.','손잡고 나오는 걸 봤다고만 한다.','남의 얘기는 여기서 그만하자.']);
    case 'reflection':return scene('창문에 비친 옆자리','내가 단톡방에 올린 사진 한쪽, 유리창에 두 사람이 비친다.',
      '여기 너랑 '+name(t.actor)+' 맞지? 사진만 보니까 둘이 무슨 일 있었나 싶어서.',
      ['우리가 왜 거기 있었는지 설명한다.','같이 간 사람에게 먼저 말할래 하고 묻는다.','사진만 보고 더 추측하지 말자.']);
    case 'decision':
      if(t.mine && e.step!=='between')return {...scene('먼저 마주 앉은 두 사람',withParticle(name(t.mine),'이','가')+' 내 맞은편에 앉는다.',
        '요즘 우리 둘이 무슨 생각 하는지 서로 잘 모르는 것 같아. 나하고 계속 만나고 싶은지, 솔직히 얘기해 줄래?',
        ['내 마음이 달라진 걸 먼저 이야기한다.','우리가 어디서 멀어졌는지 네 얘기부터 듣는다.']),speaker:t.mine};
      return scene('각자의 대답',t.mine?e.previous:'모임이 끝난 뒤 둘이 마주 앉았다.',
      t.theirs?'내가 지금 만나는 사람에게도 솔직하고 싶어. 너는 어떻게 하고 싶어?':'지난번 우리 얘기, 나도 생각해 봤어. 네 마음부터 들을 수 있을까?',
      [t.mine?'지금 내 관계를 끝내고 너를 만나고 싶어.':'난 너와 연인이 되고 싶어.',t.mine?'내가 만나던 사람과 다시 잘해 보고 싶어.':'우리가 알던 편한 사이로 돌아가고 싶어.','한동안 서로 연락하지 말자.']);
  }
}
function endSecretRelationship(a,b){
  if(!secretLinked(a,b))return;
  if(a===game.player || b===game.player){
    const id=a===game.player?b:a,c=game.contacts[id];
    endMarriage(id);c.role='옛 인연';c.affair=false;c.affection=0;c.promise=false;
    c.warning=null;c.needsMeeting=true;c.cooldown=tick()+4;
    game.diary=(game.diary || []).filter(p=>p.people.length!==1 || p.people[0]!==id || !['dinnerDate','umbrellaDate','follow'].includes(p.kind));
    game.queue=(game.queue || []).filter(e=>e.id!==id || !['anniversary','reconnect','couple','departure','warning'].includes(e.type));
  }else{
    const p=game.townPairs.find(p=>p.end==null && p.people.includes(a) && p.people.includes(b));
    p.status=p.status==='배우자'?'옛 배우자':'옛 연인';p.end=tick();p.nextChild=null;
    townNews(p,'각자의 길','두 사람은 서로의 결정을 확인하고 관계를 마쳤다.');
  }
}
function secretChoice(t){
  // Their answers use seeded randomness and are saved before the result can be replayed.
  const c=game.contacts[t.actor];
  const current=(game.townPairs || []).find(p=>p.end==null && p.people.includes(t.actor));
  const [a,b]=current?.people || [];
  const commitment=current?(current.status==='배우자'?4:2)+Math.min(3,sharedBond(a,b)?.visits || 0)-
    (ongoingFeud(a,b)?3:0):0;
  const lean=(c.trust || 0)+(c.affection || 0)-commitment;
  return pick(lean>=4?[true,true,false]:lean<0?[false,false,true]:[true,false]);
}
function answerSecret(e,index){
  if(e.result || !Number.isInteger(index))return;
  if(!validSecretEvent(e)){
    if(index===0){game.event=null;navigate();}return;
  }
  const story=secretScene(e),choice=story.choices[index];
  if(!choice)return;
  const t=secretThread(e),name=id=>kinPerson(id).name;
  const c=game.contacts[t.actor];
  let line='',spoken=true,speaker=e.id,memory='',effect='memory';
  let present=[game.player,e.id];
  function closeMyRelationship(reason){
    endSecretRelationship(game.player,t.mine);
    remember(t.mine,'우리 사이의 마지막 대답',reason,'split',[]);
    Object.assign(game.log.at(-1),{label:choice.label,thread:t.key,present:[game.player,t.mine]});
    memory=reason;
  }
  function schedulePhoto(previous){
    e.step='photo';e.previous=previous;e.firstChoice=choice.label;
    if(t.friendly)e.art='gallery';
    t.asker=t.mine || t.theirs || Object.keys(game.contacts).find(id=>id!==t.actor && secretAdult(id) && !quietContact(id));
    navigate();
  }
  function observe(text){line=text;spoken=false;}
  if(e.kind==='decision' && t.mine && e.step!=='between'){
    const prior=index===0?'내 마음이 흔들렸다고 말했다. 상대는 다음 대답도 내 입으로 듣고 싶다고 했다.':'함께 있어도 딴생각을 하는 게 보였다는 말을 들었다. 나는 끝까지 자리를 지켰다.';
    remember(t.mine,story.title,prior,'memory',[]);
    Object.assign(game.log.at(-1),{present:[game.player,t.mine],label:choice.label,thread:t.key});
    e.step='between';e.previous=prior+' 그 뒤 '+withParticle(name(t.actor),'과','와')+' 마주 앉았다.';navigate();return;
  }
  t.next=null;
  if(e.step==='groupOffer'){
    c.invitedAt=tick();
    if(story.choices.length===1)line='응. 이번엔 약속 안 잡는 걸로 하자.';
    else if(index===1)line='알겠어. 먼저 물어보고 싶었어. 오늘은 잘 가.';
    else{
      const due=tick()+1;
      c.outreach={type:'outreach',id:t.actor,activity:'dinner',mode:'group',guests:[e.guest],sourceThread:t.key,
        sourcePeople:[game.player,t.actor],origin:'전시표 두 장',rescheduled:true,due,until:due};
      line=name(e.guest)+'도 된대! 다음 계절에 내가 먼저 연락할게.';
      c.inviteNote=line;
    }
  }else if(e.step==='photo'){
    t.sharedPhoto=index===0;
    if(t.sharedPhoto){
      if(t.asker && !t.people.includes(t.asker))t.people.push(t.asker);
      t.photo=t.friendly?'전시 포스터 앞에서 찍은 사진':'찻잔 하나만 남긴 디저트 사진';
      observe(t.photo+' 한 장을 단톡방에 올렸다. 유리창에는 우리 둘의 옆모습이 작게 비쳤다.');
      if(t.asker)secretNext(t,'reflection');else if(!t.friendly)secretNext(t,'decision');
    }else{
      observe('사진을 내 휴대폰에만 남겼다. 단톡에는 올리지 않았다.');
      if(!t.friendly)secretNext(t,'decision');
    }
  }else if(e.kind==='disclosure'){
    if(index===0){
      line='고마워. 마음을 정하기 전에 데이트인 척하고 싶진 않아. 다음에 전시 보면서 더 얘기할래?';
      secretNext(t,'tickets');
    }else if(index===1)line='알겠어. 내 얘기 들어 줘서 고마워.';
    else {line='그래. 지금 대답 안 해도 돼. 한 계절쯤 지나고 다시 물어볼게.';secretNext(t,'tickets',2);}
  }else if(e.kind==='tickets'){
    if(index===0){
      if(secretChoice(t)){
        line='나도 너한테 마음이 있어. 오늘은 전시를 보고, 우리 관계는 제대로 얘기하고 정하자.';
        memory='전시장에 함께 들어갔다. 관계를 어떻게 할지는 다음에 마주 앉아 이야기하기로 했다.';
        secretNext(t,t.theirs && townSpouse(t.actor) || t.mine && t.mine===spouse()?'cups':'decision');
      }else{
        const guest=secretGroupGuest(t);
        if(guest && pick(['stop','offer'])==='offer'){
          t.friendly=true;t.next=e.kind;e.step='groupOffer';e.guest=guest;e.firstChoice=choice.label;
          chooseFriendship(t.actor);navigate();return;
        }
        c.contactAfter=tick()+2;c.groupUntil=tick()+2;
        line='나는 데이트하고 싶은 마음은 없어. 오늘은 여기까지 하자.';
      }
    }else if(index===1){
      t.friendly=true;c.trust=(c.trust || 0)+1;
      t.next=e.kind;schedulePhoto('친구로 전시를 봤다. 출구의 포스터가 마음에 들어 사진을 찍었다.');return;
    }else line='응. 표는 다른 사람에게 물어볼게.';
  }else if(e.kind==='cups'){
    if(index===0){
      line=t.theirs && townSpouse(t.actor)?'내가 먼저 만나자고 한 걸 집에서 숨기고 싶었어. 이렇게는 싫다. 내가 직접 얘기할게.':'남들이 보면 오해할까 봐 그랬어. 사진 자르지 말자. 먼저 각자 얘기하자.';
      secretNext(t,'decision');
    }else if(index===1){
      t.hiddenMeeting=true;t.next=e.kind;
      schedulePhoto('둘이 만난 건 따로 얘기하지 않기로 했다. 케이크 옆의 찻잔 하나만 사진에 남겼다.');return;
    }else line='알겠어. 사진은 올리지 않을게. 오늘은 각자 돌아가자.';
  }else if(e.kind==='cinema'){
    if(!e.askAboutMovie){
      t.sawHands=true;present=[game.player,t.actor,t.other];
      observe(index===0?'눈이 마주쳐 고개를 끄덕였다. 두 사람은 손을 잡은 채 출구로 향했다.':'팝콘 통을 버리고 나왔다. 두 사람이 손잡은 모습만 잠깐 보았다.');
      secretNext(t,'cinema');
    }else if(index===0){
      speaker=t.actor;present=[game.player,t.actor];
      line='응, 같이 영화 봤어. 우리 얘기는 내가 하고 싶을 때 직접 할게.';
    }else if(index===1){
      observe('두 사람이 손잡고 나오는 걸 봤다고 답했다. 왜 함께 있었는지는 덧붙이지 않았다.');
    }else line='알겠어. 내가 사진 한 장 보고 너무 앞서갔다.';
  }else if(e.kind==='reflection'){
    if(!t.sharedPhoto)return;
    if(index===0)line=t.friendly?'전시 포스터 찍다가 둘 다 비친 거구나. 네 얘기 들으니까 알겠다.':'둘이 만나고도 말하지 않았다는 거구나. 사진에 나온 것까지만 들을게.';
    else if(index===1){
      speaker=t.actor;present.push(t.actor);
      line=t.friendly?'내가 포스터 찍어 달라고 했어. 옆에 같이 서 있었거든.':'그날 같이 차 마신 건 맞아. 더 할 얘기는 따로 만나서 할게.';
    }else line='맞아. 사진에 둘이 비친 것 말고는 내가 아는 게 없네.';
    if(!t.friendly)secretNext(t,'decision');
  }else if(e.kind==='decision'){
    if(index===0){
      if(t.mine)closeMyRelationship(name(t.mine)+'에게 내 마음을 이야기하고 관계를 마쳤다.');
      const yes=secretChoice(t);
      if(yes){
        if(t.theirs)endSecretRelationship(t.actor,t.theirs);
        c.role='연인';c.affair=false;c.celebrated=false;effect='date';
        line=t.theirs?'내가 만나던 사람과는 내 뜻으로 정리했어. 이제 너를 만나고 싶어.':'나도 같은 마음이야. 우리, 이제 연인으로 만나자.';
        memory=[memory,withParticle(name(t.actor),'과','와')+' 사귀기 시작했다.'].filter(Boolean).join(' ');
      }else line=t.theirs?'나는 지금 만나는 사람 곁에 남기로 했어. 네 마음을 들어 줬다고 마음이 같은 건 아니야.':'네 마음은 고마워. 나는 연인으로 만나고 싶지는 않아.';
    }else if(index===1){
      line='네 선택을 존중할게. 나도 내 마음은 내가 정리할게.';
      if(t.mine){
        const current=game.contacts[t.mine];
        if((current.trust || 0)<0 && !pick([true,false])){
          closeMyRelationship(name(t.mine)+'에게 다시 해보자고 했지만, 상대는 여기서 마치고 싶다고 했다.');
        }else {current.trust=(current.trust || 0)+1;memory=name(t.mine)+'도 다시 이야기해 보자고 했다. 우리는 기존 관계를 이어 갔다.';}
      }else {c.trust=(c.trust || 0)+1;}
    }else {c.quietUntil=tick()+3;line='그래. 당분간 먼저 연락하지 않을게.';}
  }
  t.lastChoice=index;
  const recorded=memory?[line,memory].join(' '):line;
  const focus=present.includes(e.id)?e.id:speaker;
  remember(focus,story.title,recorded,effect,present.filter(id=>id!==game.player && id!==focus));
  const log=game.log.at(-1);
  log.present=[...new Set(present)];log.label=[e.firstChoice,choice.label].filter(Boolean).join(' → ');log.thread=t.key;
  e.result={label:log.label,line,spoken,speaker,memory:memory || undefined};
  navigate(e);
}
