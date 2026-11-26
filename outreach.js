// A personal invitation remembers what prompted it and who actually said yes.
const outreachIdeas={
  shoot:{invite:'사진 한 장 더 찍자',place:'사진 부스',item:'사진',voice:'사진 나오는 동안 여기 좀 더 있을까?'},
  game:{invite:'한 판 더 하자',place:'오락실',item:'게임',voice:'내가 동전 두 개 남겨 놨어. 마지막 판은 네가 골라.'},
  dinner:{invite:'국수 먹으러 가자',place:'국숫집',item:'국수',voice:'여기 양념장 따로 주더라. 네 그릇에 얼마나 넣을래?'},
  trip:{invite:'강변 걸으러 가자',place:'강변 산책로',item:'산책',voice:'여기쯤 오면 강이 보여. 잠깐 같이 서 있을래?'}
};
function outreachMemory(id){
  return game.log.findLast(m=>visibleMemory(m) && (m.id===id || m.others?.includes(id)) &&
    !['neighbors','unread','outreachRequest','distance'].includes(m.effect));
}
function outreachBoundary(id){
  return game.contacts[id]?.friendsOnly || closeKin(game.player,id) ||
    allChildren().some(child=>child.id===id && childAge(child)<18);
}
function freeToContact(id){
  const c=game.contacts[id];
  return !!c && id!==game.player && !isCut(id) && !quietContact(id) &&
    !['new','final'].includes(c.warning) && !game.ended && !game.finale;
}
function canOutreach(id){
  const c=game.contacts[id];
  return freeToContact(id) && (c.cooldown || 0)<=tick() && tick()<119 && c.invitedAt!==tick() && !c.outreach &&
    (c.contactAfter ?? 0)<=tick() && !game.queue.some(e=>e.type==='outreach' && e.id===id);
}
function outreachGuest(id){
  return [...Object.keys(game.contacts),...unused()].find(who=>who!==id && who!==game.player &&
    !isCut(who) && !quietContact(who) && !game.contacts[who]?.warning && !allChildren().some(k=>k.id===who));
}
function outreachIdea(id,event){
  if(event?.activity && outreachIdeas[event.activity])return event.activity;
  if(event?.type?.startsWith('photo') || event?.type==='snapshot')return 'shoot';
  return favorite(id) in outreachIdeas?favorite(id):'trip';
}
const sendbacks={
  photo:{action:'다음에 내가 사진 보내기',title:'내가 보낸 사진 한 장',opening:'네가 보내 준 사진 받았어. 확대해 봤는데 나 입 벌리고 웃고 있더라. 그때 뭐가 그렇게 웃겼지?',
    choices:[['나도 보다가 또 웃었어.','이 사진은 지우지 말자. 기분 안 좋은 날 꺼내 보게.'],['다음엔 웃기 전에 한 장 찍자.','그게 되겠어? 네가 카메라만 들면 벌써 웃긴데.']]},
  concert:{action:'다음에 앙코르 영상 보내기',title:'끝나고 보낸 앙코르 영상',opening:'네 영상 방금 봤어. 마지막 소절에서 노래보다 우리 목소리가 더 크게 들려!',
    choices:[['그래서 그 부분만 잘라 뒀어.','나도 저장했어. 이제 이 노래 나오면 우리 목소리부터 들릴 것 같아.'],['다음 공연에도 같이 부를까?','좋지. 다음엔 가사부터 같이 외워 가자.']]},
  recipe:{action:'다음에 내가 레시피 보내기',title:'한 그릇에 담긴 답장',opening:'보내 준 레시피로 끓여 봤어. 그날처럼 맛있을까 했는데 벌써 국물까지 다 먹었어.',
    choices:[['양념은 얼마나 넣었어?','딱 반 숟갈! 네가 적어 준 대로 하니까 간이 맞더라.'],['다음엔 네가 끓여 줘.','좋아. 그릇 두 개 꺼내 놓을게.']]}
};
function sceneSendback(e){
  if(e.type==='concert' || e.type==='encore' || e.type==='seated' || e.type==='incident' && e.code==='mic' && e.route==='group')return 'concert';
  if(e.type==='snapshot' || e.type?.startsWith('photo') || e.activity==='shoot')return 'photo';
  if(e.activity==='dinner')return 'recipe';
}
function resultOutreach(e){
  if(!e?.result || ['outreach','farewell','departure','secret'].includes(e.type) || !canOutreach(e.id) ||
      e.planChoice || game.snapshot?.promiseDue!=null && e.type==='photoReunion')return null;
  const sendback=sceneSendback(e);
  if(sendback)return {label:sendbacks[sendback].action,open:()=>sendOutreach(e.id,outreachIdea(e.id,e),'sendback',sendback)};
  if(game.contacts[e.id].promise || !['intro','meet','follow','walkInvite','incident','outingDay','couple'].includes(e.type))return null;
  return {label:members[e.id].name+'에게 다음 번개 제안',open:()=>outreachMenu(e.id,e)};
}
function outreachMenu(id,event){
  const c=game.contacts[id];
  if(!c)return;
  menu(members[id].name+'에게 먼저 연락');
  const memory=outreachMemory(id);
  if(memory)node('p',seasonDate((memory.year-1)*4+(memory.season || 0))+' · '+memory.title,lifeBody);
  if(!game.event){
    const existing=gathered.find(item=>item.e.id===id);
    if(existing)menuButton(scene(existing.e).title+' 이야기하기',()=>{
      closeMenu();preview=existing;browsingTopics=true;courtesy=null;page=0;lastBeat=null;renderStage();
    });
  }
  if(c.alternate && c.alternate.asked===tick() && freeToContact(id)){
    const proposal=c.alternate;
    node('p',c.inviteNote,lifeBody);
    menuButton(seasonDate(proposal.due)+'에 연락 받기',()=>{
      if(proposal.mode==='group')meet(proposal.guests[0]);
      c.outreach=proposal;delete c.alternate;c.inviteNote='그날 먼저 연락하기로 했어.';
      persist();outreachMenu(id);
    });
    menuButton('이번에는 쉬자',()=>{delete c.alternate;c.inviteNote='이번 약속은 잡지 않았다.';persist();outreachMenu(id);});return;
  }
  if(!canOutreach(id)){
    node('p',c.inviteNote || '지금은 다음 약속을 잡기 어려워요.',lifeBody);
    menuButton('닫기',closeMenu);return;
  }
  const activity=outreachIdea(id,event), idea=outreachIdeas[activity];
  if(!game.event && canSecretInvite(id))menuButton('둘이 따로 만나자고 물어보기',()=>{
    closeMenu();if(startSecretInvite(id)){c.invitedAt=tick();persist();}
  });
  if(!outreachBoundary(id) && !otherLove(id) && !(c.groupUntil>=tick()))
    menuButton('둘이 '+idea.invite,()=>sendOutreach(id,activity,'pair'));
  if(outreachGuest(id))menuButton('친구들도 불러서 '+idea.invite,()=>sendOutreach(id,activity,'group'));
  menuButton('지난 얘기로 안부 묻기',()=>sendOutreach(id,activity,'hello'));
  menuButton('닫기',closeMenu);
}
function otherLove(id){
  return !partner(game.contacts[id] || {}) && outsideRelationship(id);
}
function sendOutreach(id,activity,mode,sendback,weekendIndex){
  if(!canOutreach(id) || !outreachIdeas[activity] || mode==='sendback' && !sendbacks[sendback])return;
  const c=game.contacts[id],idea=outreachIdeas[activity],memory=outreachMemory(id),guest=outreachGuest(id);
  if(mode==='pair' && (outreachBoundary(id) || otherLove(id)) || mode==='group' && !guest)return;
  c.invitedAt=tick();
  const busy=c.promise || game.diary.some(p=>p.state==='booked' && p.people.includes(id)) || (c.trust || 0)<0;
  let response=mode;
  if(mode==='pair' || mode==='group'){
    if(busy)response=tick()<118?pick(['later','reschedule']):'later';
    else if(mode==='pair' && c.groupUntil>=tick())response='group';
    else if(mode==='pair' && !partner(c))response=pick(['pair','pair','group','later','friends']);
  }
  if(weekendIndex!=null && response===mode){
    game.weekend.directAnswer={id,i:weekendIndex,mode};
    c.inviteNote=mode==='pair'?'좋아. 오늘은 너랑 둘이 가고 싶어.':'좋아. 다 같이 거기서 만나자!';
    persist();
    return true;
  }
  let line;
  if(response==='reschedule'){
    const due=tick()+2;
    line=seasonDate(due)+'에는 시간이 돼. 그때 내가 먼저 연락해도 돼?';
    c.inviteNote=line;remember(id,'다른 날을 제안한 답장',line,'outreachRequest');
    c.alternate={type:'outreach',id,activity,mode:mode==='group'?'group':'pair',guests:mode==='group'?[guest]:[],
      origin:memory?.title || '',sourcePeople:memory?[memory.id,...(memory.others || [])]:[],due,until:Math.min(119,due+1),rescheduled:true,asked:tick()};
    persist();outreachMenu(id);return;
  }else if(response==='later'){
    c.contactAfter=tick()+2;line='이번엔 시간이 안 돼. 한 계절 쉬고 다시 물어봐 줄래?';
  }else if(response==='friends'){
    chooseFriendship(id);line='먼저 불러 줘서 고마워. 난 너랑 친구로 지내고 싶어.';
  }else if(response==='group' && !guest){
    c.contactAfter=tick()+1;line='난 여럿이 보는 게 좋아. 다음에 같이 갈 사람이 생기면 보자.';
  }else{
    if(response==='group' && mode==='pair')c.groupUntil=tick()+2;
    if(response==='group')meet(guest);
    c.outreach={type:'outreach',id,activity,mode:response,sendback,guests:response==='group'?[guest]:[],
      origin:memory?.title || '',sourcePeople:memory?[memory.id,...(memory.others || [])]:[],due:tick()+1,until:Math.min(119,tick()+2)};
    if(response==='sendback')line=({photo:'좋아, 사진 기다릴게!',concert:'앙코르 찍었어? 보내 주면 이어폰 끼고 들을게!',recipe:'그 국물 맛 궁금했어. 기다릴게!'}[sendback]);
    else if(response==='hello')line='네 톡 보고 웃었어. 다음에 내가 먼저 연락할게.';
    else if(response==='group')line=
      members[guest].name+'도 같이 가고 싶대. 셋이 '+idea.place+'에서 보자.';
    else line='좋아. 다음 계절에 '+idea.place+' 앞에서 만나자.';
  }
  c.inviteNote=line;
  remember(id,'내가 먼저 보낸 연락',line,'outreachRequest',c.outreach?.guests || []);
  game.log.at(-1).label=sendback?sendbacks[sendback].action:mode==='hello'?'안부 묻기':idea.invite;
  persist();menu(members[id].name+'의 답장');node('p',line,lifeBody,'contact-reply');
  menuButton('닫기',()=>{closeMenu();renderStage();});
}
function validOutreachEvent(e){
  if(e?.type!=='outreach')return true;
  if(e.sourceThread && !freeSecretGroup([e.id,...e.guests],e.due,e.sourceThread))return false;
  return freeToContact(e.id) && tick()<=e.until &&
    !(e.mode==='pair' && (outreachBoundary(e.id) || otherLove(e.id))) &&
    !(e.guests || []).some(id=>isCut(id) || quietContact(id)) && !(e.sourcePeople || []).some(isCut);
}
function seasonOutreach(){
  game.queue=game.queue.filter(validOutreachEvent);
  for(const c of Object.values(game.contacts)){
    if(c.alternate && c.alternate.asked<tick())delete c.alternate;
    const e=c.outreach;if(!e || tick()<e.due)continue;
    const obligations=[...(game.obligations || []),game.familyDate,...game.queue.filter(q=>q.protected)].filter(Boolean);
    if(obligations.some(p=>p.id===e.id) && tick()<e.until)continue;
    if(validOutreachEvent(e) && !obligations.some(p=>p.id===e.id)){
      game.queue.unshift({...e,key:'outreach-'+e.id+'-'+e.due});delete c.outreach;
    }else if(tick()>=e.until || isCut(e.id) || e.mode==='pair' && (outreachBoundary(e.id) || otherLove(e.id)) ||
      [...(e.guests || []),...(e.sourcePeople || [])].some(isCut))delete c.outreach;
  }
}
function outreachScene(e){
  const idea=outreachIdeas[e.activity],hello=e.mode==='hello',group=e.mode==='group';
  const setup=e.sourceThread?'전시표를 건넸던 날 셋이 보기로 했다. 약속한 날, 상대가 먼저 국숫집 위치를 보내 왔다.':e.rescheduled?'상대가 다시 잡아 준 날이 되자 먼저 연락이 왔다.':e.origin?'지난번 ‘'+e.origin+'’ 이야기를 꺼내 내가 먼저 연락했다.':'지난 계절에 내가 먼저 연락했다.';
  if(e.mode==='sendback'){
    const reply=sendbacks[e.sendback];
    return {title:reply.title,setup,message:reply.opening,choices:reply.choices.map(([label,line])=>({label,line}))};
  }
  return {title:hello?'약속한 안부 전화':idea.place+'에서 다시 만난 날',setup,message:hello?
    '지난번엔 네가 먼저 연락했잖아. 오늘은 내가 먼저 네 목소리 듣고 싶었어.':group?
    members[e.guests[0]].name+'도 왔어! '+idea.voice:idea.voice,
    choices:hello?[{label:'지금 통화할래?',line:'응. 잠깐 이어폰 낄게. 오늘 무슨 일 있었어?'},{label:'연락 줘서 고마워. 잘 지내지?',line:'응! 네 목소리 들으니까 좋다. 다음에 또 얘기하자.'}]:
    [{label:group?'셋이 같이 사진 남기자.':'오늘 오길 잘했다.',line:group?'휴대폰 세워 놨어. 다 같이 여기 봐!':'나도. 네가 먼저 말 안 꺼냈으면 오늘 그냥 지나갔을 거야.'},
     {label:'다음엔 네가 장소 골라 줄래?',line:'좋아. 가 보고 싶은 데 찾으면 내가 먼저 말할게.'}]};
}
function answerOutreach(e,index){
  if(e.result || !validOutreachEvent(e))return;
  const story=outreachScene(e),action=story.choices[index];if(!action)return;
  const c=game.contacts[e.id];c.trust=(c.trust || 0)+1;
  if(e.mode==='pair' && index===0)c.affection++;
  if(e.mode==='group')bond(e.id,e.guests[0]);
  remember(e.id,story.title,action.line,'outreach',e.guests);
  e.result={label:action.label,line:action.line,spoken:true,speaker:e.id};navigate(e);
}
