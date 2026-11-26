// Persistent play systems shared by the neighbourhood, story scenes and album.
const lifeMenu=el('life-menu'), lifeBody=el('life-body');
function storedList(key){
  try {const data=readFamilySave(localStorage.getItem(key));return Array.isArray(data)?data:[];} catch{return [];}
}
const goals={
  '동창들의 아지트':{brief:'서로 다른 친구 셋을 초대해 동창회를 열어요.',reward:'오랜만의 출석부',line:'옛날 출석번호로 서로를 부르다가 다 같이 빵 터졌다.'},
  '한 지붕 작업실':{brief:'같은 활동을 세 번 열어 첫 작품을 완성해요.',reward:'우리 작업실 첫 전시',line:'비뚤어진 액자 아래, 우리 이름을 나란히 적었다.'},
  '골목 야식회':{brief:'세 번의 야식 번개로 골목 단골상을 차려요.',reward:'우리 이름이 적힌 메뉴판',line:'닫힌 줄 알았던 가게에서 사장님이 우리 단골상을 꺼내셨다.'}
};
function goalProgress(club){
  if(club.goal==='골목 야식회')return club.tracks['요리'] || 0;
  if(club.goal==='한 지붕 작업실')return Math.max(0,...Object.values(club.tracks));
  return Object.keys(club.guests).length;
}
const households=['동창들의 아지트','한 지붕 작업실','골목 야식회'];
function initLife(){
  game.blocked ||= [];
  game.diary ||= [];game.weddings ||= [];game.watching ||= [];
  game.echoes ||= []; game.bonds ||= []; game.club ||= {visits:0,tracks:{},guests:{},goal:households[game.seed%3]};
  game.runId ||= crypto.randomUUID();
  if(!game.reconciledMarriages){
    for(const c of Object.values(game.contacts))if(c.promise && c.deadline>119)c.deadline=119;
    for(const p of game.townPairs || [])if(!p.end && p.status==='배우자' && !p.people.some(isCut) && p.people.some(id=>game.contacts[id]?.role==='연인'))weddingNotice(p);
    game.reconciledMarriages=true;
  }
  pruneFriendshipThreads();
  prunePhotoThreads();
}
function isCut(id){return game.blocked?.includes(id);}
function visibleMemory(item){
  return !isCut(item.id) && !(item.others || []).some(isCut) && !game.blocked.some(id=>(item.memory || '').includes(members[id]?.name));
}
function menu(title){
  el('life-title').textContent=title;lifeBody.replaceChildren();
  if(!lifeMenu.open)lifeMenu.showModal();
  lifeMenu.scrollTop=0;
}
function menuButton(label,fn){control(lifeBody,label,fn);}
function closeMenu(){lifeMenu.close();}
function enterScene(e){
  closeMenu();preview=null;courtesy=null;page=0;lastBeat=null;game.event=e;navigate();
}
const exits=[
 ['욕 하고 시비 걸기','참아 온 말을 쏟아냈다. 수저 부딪치는 소리까지 뚝 그쳤다.'],
 ['주먹을 날린다','주먹이 휙 지나갔다. 뒤에 있던 생일 풍선만 펑 터졌다.'],
 ['침을 뱉는다','퉤! 바람에 냅킨이 팔랑이고 테이블이 조용해졌다.'],
 ['밥상을 엎는다','밥상이 벌떡 섰다. 계란말이가 마지막까지 접시 위를 굴렀다.'],
 ['김치 싸대기를 날린다','김치가 철썩! 단체사진 타이머는 하필 그 순간에 터졌다.'],
 ['옷을 찢어버린다','부욱! 단체 티셔츠의 ‘영원히 함께’가 두 동강 났다.'],
 ['단톡방에서 강퇴시킨다','내보내기를 눌렀다. 상대 프로필이 사라지고 단톡방 인원이 한 명 줄었다.'],
 ['마지막 편지를 건넨다','접은 편지를 건네고 먼저 자리에서 일어났다.']
];
function cutMenu(id){
  if(!id || id===game.player || isCut(id))return;
  menu(members[id].name+'와 관계 정리');
  node('p','절교하면 이번 회차가 끝날 때까지 다시 마주치지 않아요. 함께 잡은 약속도 정리돼요.',lifeBody);
  if(partner(game.contacts[id] || {})) menuButton('이별만 이야기하기',()=>enterScene({type:'farewell',id}));
  menuButton('절교하기',()=>{
    menu('어떻게 끝낼까?');
    for(const [label,line] of exits)menuButton(label,()=>{
      menu(label);node('p',line,lifeBody,'exit-line');
      node('p',members[id].name+'와 절교할까요? 이 회차에서는 다시 만날 수 없어요.',lifeBody);
      menuButton('절교 확정',()=>cutPerson(id,line));
      menuButton('다시 고르기',()=>cutMenu(id));
    });
  });
}
function cutPerson(id,line){
  if(isCut(id))return;
  game.watching=game.watching.filter(who=>who!==id);
  game.diary=game.diary.filter(p=>{
    p.people=p.people.filter(who=>who!==id);
    if(p.kind==='groupMeal' && p.people.length<2)return false;
    return p.people.length && (p.kind!=='ceremony' || p.people.length===2);
  });
  game.weddings=game.weddings.filter(e=>id!==e.id && id!==e.other);
  game.reunions=(game.reunions || []).filter(m=>!m.people.includes(id));
  game.blocked.push(id);endMarriage(id);delete game.contacts[id];
  const includes=e=>e && [e.id,e.other,e.kid,e.observer,...(e.guests || []),...(e.people || [])].includes(id);
  for(const key of ['queue','obligations','echoes','sightings','bonds'])
    game[key]=(game[key] || []).filter(e=>!includes(e));
  for(const key of ['pending','familyDate'])if(includes(game[key]))delete game[key];
  if(game.weekend){
    game.weekend.people=game.weekend.people.filter(p=>p!==id);
    if(game.weekend.directInvite?.id===id)delete game.weekend.directInvite;
  }
  for(const c of Object.values(game.contacts)){
    if(c.last?.includes(members[id].name))c.last='';
    if(c.note?.text?.includes(members[id].name))delete c.note;
  }
  delete game.club.guests[id];preview=null;gathered=[];persist();renderStage();
  menu('마지막 장면');const shot=node('figure','',lifeBody,'exit-shot');
  const art=node('img','',shot);art.src=members[game.player].image;art.alt='';
  const sounds=['버럭!','휙!','퉤!','와장창!','철썩!','부욱!','톡.','사락.'];
  node('strong',sounds[exits.findIndex(x=>x[1]===line)],shot);
  node('p',line,lifeBody,'exit-line');menuButton('돌아서기',closeMenu);
}
const outings={
 shoot:{title:'골목 화보',track:'사진',job:'동네 사진가',setup:'옷걸이에 똑같은 재킷이 두 벌 걸려 있다.',voice:'재킷 맞춰 입고 찍으면 다들 우리 보고 뭐라고 할까?',paths:[
 ['커플 화보를 공개한다','둘이 등 돌리고 찍은 컷이 단톡방 대문 사진이 됐다.','우리 진짜 사귀냐고 아직도 물어봐. 다음엔 셋이 찍을까?','단톡 대문 사진'],
 ['한 장만 인화해 간직한다','서툰 포즈가 담긴 사진을 봉투에 넣었다.','그때 눈 마주치고 웃은 사진도 한 장 뽑았어. 너한테 주려고.','둘만의 B컷']]},
 game:{title:'동네 게임 대회',track:'게임',job:'대회 해설위원',setup:'결승전을 앞두고 팀의 마이크가 하나만 살아남았다.',voice:'누가 작전 불러 줄래?',paths:[
 ['직접 작전을 부른다','마지막 역전 순간, 둘이 같은 타이밍에 소리를 질렀다.','결승 녹음 들었어? 우리 목소리로 응원가 만들자.','역전 경기 녹음'],
 ['객석에서 중계를 맡는다','말이 꼬인 중계가 경기보다 더 큰 박수를 받았다.','다음 경기 중계석에 우리 이름 붙었어. 올 거지?','손글씨 중계석 명패']]},
 dinner:{title:'심야 포장마차',track:'요리',job:'골목 주방장',setup:'야식 번개에 도착하자 사장님이 오늘의 마지막 재료를 내밀었다.',voice:'라면 하나, 김치 한 접시. 이걸로 다 같이 먹을 수 있겠어?',paths:[
 ['한 냄비에 몽땅 끓인다','즉석 김치 라면을 종이컵에 나눠 담았다.','사장님이 우리 라면을 메뉴판에 올리셨대! 이름 지으러 갈래?','손때 묻은 레시피'],
 ['남은 재료로 요리 대결','컵라면 뚜껑 위에서 세상 작은 시식회가 열렸다.','이번에는 내가 재료 사 갈게. 심사위원 해 줘.','종이컵 우승 트로피']]},
 trip:{title:'막차 놓친 여행',track:'여행',job:'골목 여행 작가',setup:'역무원이 막차 대신 첫차 시간을 가리켰다. 우리 짐은 벌써 벤치 하나를 다 차지했다.',voice:'첫차까지 네 시간인데, 뭐 하고 놀까?',paths:[
 ['새벽 시장에서 길을 묻는다','시장 상인이 첫 손님이라며 따뜻한 어묵을 얹어 줬다.','첫차 기다리면서 어묵 먹었던 가게 기억나? 다음엔 일부러 찾아갈래?','새벽 시장 지도'],
 ['대합실에서 라디오를 켠다','신청곡 사연에 우리 이름이 차례로 흘러나왔다.','우리 사연 다시 듣기 떴어. 같이 들을래?','첫차 방송 사연']]}
};
const favorites={'히히':'shoot','우주':'shoot','박들춘':'game','크림':'game','닭발':'dinner','묵은지':'dinner','씽씽':'trip','냥냥':'trip'};
function favorite(id){return favorites[members[id].name] || Object.keys(outings)[Number(id)%4];}
function advanceCareer(id,activity){
  const c=meet(id),o=outings[activity];c.practice ||= {};
  const level=c.practice[activity]=(c.practice[activity] || 0)+1;
  if(level!==2 && level!==5)return;
  c.job=level===5?o.job:o.track+' 모임 운영진';
  addEcho(id,'career','나 '+c.job+' 됐어. 처음에 같이 해 준 거 기억나?',c.job+'의 첫 초대');
}
const teamRoles={
  shoot:['렌즈 뒤에 선다','모델 자리에 선다','셔터를 쥔 내 손이 떨렸다.','조명이 켜지자 사람들이 내 포즈를 따라 했다.'],
  game:['팀장을 맡는다','후보석에서 지켜본다','팀원들이 내 신호를 기다렸다.','작전판을 쥔 채 선수 교체 신호를 기다렸다.'],
  dinner:['불 앞을 맡는다','시식단을 모은다','냄비가 끓어넘치기 직전이다.','나는 시식할 접시를 꺼냈다.'],
  trip:['총무를 맡는다','추억 담당을 맡는다','주머니에 남은 동전과 차표를 세었다.','카메라에 찍힌 건 흔들린 간판뿐이다.']
};
function addEcho(id,kind,message,title,guests=[]){
  game.echoes.push({type:'echo',kind,id,message,title,guests,due:Math.min(119,tick()+1)});
}
function noodleGuest(e){
  return [...(e.guests || []),...Object.keys(game.contacts),...unused()].find(id=>
    id!==e.id && id!==game.player && !isCut(id) && !quietContact(id) && !game.contacts[id]?.warning);
}
function lifeScene(e){
  const opt=(label,line)=>({label,line,effect:'memory'});
  if(e.type==='echo'){
    const visitReplies={
      shoot:[['다음엔 타이머 켜고 같이 찍자.','다음 촬영에는 사진을 찍던 사람도 프레임에 들어오기로 했다.'],['그 사진 나도 한 장 갖고 싶어.','함께 웃은 사진을 한 장씩 나눠 가졌다.']],
      game:[['우리 목소리부터 들어 보자.','역전 순간의 함성을 다시 듣다가 둘 다 헤드폰을 벗고 웃었다.'],['중계석에 내 자리 남겨 줘.','중계석 명패 뒤에 다음 경기 날짜를 적었다.']],
      dinner:[['메뉴판에 이름 쓰러 가자.','단골집 메뉴판에 그날 만든 라면 이름을 나란히 적었다.'],['다음엔 내가 심사할게.','다음 시식회의 첫 숟갈은 내 몫이 됐다.']],
      trip:[['이번엔 어묵 먹으러 가자.','막차를 놓치고 찾아간 어묵집이 둘이서 약속한 목적지가 됐다.'],['다시 듣기 같이 틀자.','방송에서 우리 이름이 들리자 둘이 동시에 볼륨을 올렸다.']]
    };
    const follow=visitReplies[e.kind]?.[e.path] ||{
      shoot:['사진 얘기를 더 나눈다.','번개에서 가장 마음에 들었던 사진을 한 장씩 골랐다.'],
      game:['그날 경기 얘기를 꺼낸다.','경기를 떠올리며 가장 떨렸던 순간을 들려줬다.'],
      dinner:['다음에 먹을 메뉴를 고른다.','그날 맛본 음식 중 또 먹고 싶은 걸 하나 골랐다.'],
      trip:['막차를 놓쳤던 밤 얘기를 한다.','새벽까지 놀던 기억을 떠올리며 한참 얘기했다.'],
      neighbors:['사진 속 두 사람에게 답장','사진을 보고 웃었다. 다음 모임 날짜는 내 일정에서 따로 정하기로 했다.'],
      weddingAfter:['그날 이야기의 뒷장을 남긴다','서로에게 했던 말을 기억하기로 했다.'],
      retry:noodleGuest(e)?['다 같이 국수 먹으러 가자.','친구 한 명을 더 초대해 셋이 국수 먹을 날을 찾아보기로 했다.']:['요즘 어떻게 지내?','따로 약속을 잡지 않고 서로 안부를 물었다.'],
      career:['첫 일감 같이 맡기','새 명함을 받아 들고 첫 손님 칸에 내 이름을 썼다.'],
      milestone:['첫날 멤버들과 기념사진','처음 모였던 그 자리에서 사진을 찍어 벽 한가운데 걸었다.'],
      growth:['그 순간을 녹음한다','가족 앨범에 오늘의 목소리가 남았다.']
    }[e.kind] || ['그래, 같이 하자.','그날의 이야기에 우리만 아는 뒷장이 생겼다.'];
    const note=e.kind==='milestone' || e.id===game.player;
    return {title:e.title,setup:e.previous || '',message:e.message,narrationOnly:note,choices:[
      opt(...follow),note?opt('앨범에 적어 둔다.','오늘의 기억을 앨범에 적었다.'):opt('오늘은 답장만 남긴다.','소식을 전해 줘서 고맙다고 답했다.')]};
  }
  if(e.social && !e.social.resolved)return meetupScene(e);
  const o=outings[e.activity];
  if(e.role==null && e.guests.length){
    const roles=teamRoles[e.activity];return {title:o.title,setup:e.social?.line || e.guests.map(id=>members[id].name).join(' · ')+'와 만났다.',message:o.title+'에서 어떤 역할을 맡을래?',choices:[opt(roles[0],roles[2]),opt(roles[1],roles[3])]};
  }
  const prior=e.role!=null?teamRoles[e.activity][2+e.role]:'';
  return {title:o.title,setup:[prior,o.setup].filter(Boolean).join(' '),message:e.id===game.player?'혼자서 오늘 뭘 해 볼까?':o.voice,narrationOnly:e.id===game.player,choices:o.paths.map(p=>opt(p[0],p[1]))};
}
function bond(a,b){
  if(!a || !b || a===b)return;
  const people=[a,b].sort(); let item=game.bonds.find(x=>x.people.join()===people.join());
  if(!item){item={people,visits:0};game.bonds.push(item);}item.visits++;
}
function remember(id,title,memory,effect,others=[]){
  game.log.push({id,title,memory,effect,others,year:game.year,season:game.season});
}
function answerLife(e,index){
  const a=lifeScene(e).choices[index];if(!a)return;
  let memory=a.line;
  if(e.type==='outingDay'){
    if(e.social && !e.social.resolved){settleMeetup(e,index);return;}
    if(e.role==null && e.guests.length){e.role=index;page=0;lastBeat=null;navigate();return;}
    const o=outings[e.activity], path=o.paths[index], club=game.club;
    club.visits++;club.tracks[o.track]=(club.tracks[o.track] || 0)+1;
    for(const id of e.guests){
      const c=meet(id);c.affection++;c.needsMeeting=false;c.last=memory;
      if(c.role==='지인')c.role='친구';
      club.guests[id]=(club.guests[id] || 0)+1;
      if(e.role===1 || favorite(id)===e.activity)advanceCareer(id,e.activity);
      if(e.role===0 && index===0)c.trust=(c.trust || 0)+1;
    }
    for(let i=0;i<e.guests.length;i++)for(const other of e.guests.slice(i+1)){
      if(!game.feuds?.some(pair=>pair.includes(e.guests[i]) && pair.includes(other)))bond(e.guests[i],other);
    }
    const skill=club.tracks[o.track];
    if(skill===3)memory+=' 동네 사람들이 나를 '+o.job+'로 부르기 시작했다.';
    if(club.visits===3)memory+=' 다 같이 모일 단골자리가 생겼다.';
    if(!club.completed && goalProgress(club)>=3){
      club.completed=true;const goal=goals[club.goal];memory+=' '+goal.line;
      addEcho(e.id,'milestone',goal.line,goal.reward,e.guests);
    }
    if(club.visits===8)memory+=' 단골자리에 우리 이름으로 작은 간판을 달았다.';
    (game.keepsakes ||= []).push({id:e.id,title:path[3],year:game.year,memory,others:e.guests});
    addEcho(e.id,e.activity,e.id===game.player?'그날 남긴 '+path[3]+', 다시 꺼내 볼까?':path[2],path[3],e.guests);
    game.echoes.at(-1).path=index;
  }else if(index===0 && game.contacts[e.id]){
    const c=game.contacts[e.id];c.trust=(c.trust || 0)+1;c.needsMeeting=false;
    if(e.kind==='retry'){
      const guest=noodleGuest(e);
      if(guest){meet(guest);e.guests=[guest];proposePlan('groupMeal',[e.id,guest]);}
    }
  }
  if(e.type==='echo' && index===0){
    if(e.kind==='neighbors' && e.guests?.length){
      proposePlan('groupMeal',[e.id,...e.guests]);
    }else if(['career','milestone','growth'].includes(e.kind)){
      (game.keepsakes ||= []).push({id:e.id,title:e.title,year:game.year,memory,others:e.guests});
    }
  }
  remember(e.id,lifeScene(e).title,memory,e.type,e.guests);
  e.result={label:a.label,line:memory,memory};navigate(e);
}
function weekend(){
  const prior=game.weekend;
  if(prior?.when===tick() && Array.isArray(prior.rosters))return prior;
  const kinds=Object.keys(outings);
  const recent=game.log.filter(e=>e.effect==='outingDay').slice(-2).map(e=>e.title);
  const opening={'동창들의 아지트':'trip','한 지붕 작업실':'shoot','골목 야식회':'dinner'};
  const first=(tick()===0 || game.club.firstHostSeason===tick())?opening[game.club.goal]:pick(kinds.filter(k=>!recent.includes(outings[k].title)));
  const plans=prior?.when===tick()?prior.plans:[first,pick(kinds.filter(k=>k!==first))];
  const rosters=[[],[]],available=new Set([...Object.keys(game.contacts),...unused()]);
  for(let seat=0;seat<8 && available.size;seat++){
    const i=seat%2,pool=[...available];
    const familiar=pool.filter(id=>game.contacts[id] && !quietContact(id));
    const poolForSeat=seat<2 && familiar.length?familiar:pool.filter(id=>!quietContact(id));
    const candidates=poolForSeat.length?poolForSeat:pool;
    const returning=prior?.when!==tick()?prior?.rosters?.[prior.plans.indexOf(plans[i])] || []:[];
    const newFaces=candidates.filter(id=>!returning.includes(id));
    const rotation=newFaces.length?newFaces:candidates;
    const fans=rotation.filter(id=>favorite(id)===plans[i]);
    const waiting=seat===0 && pendingReunions().find(m=>available.has(m.id));
    const id=waiting?waiting.id:pick(fans.length?fans:rotation);
    rosters[i].push(id);available.delete(id);
  }
  game.weekend={when:tick(),plans,rosters,people:rosters.flat(),taken:prior?.when===tick() && prior.taken};persist();return game.weekend;
}
function weekendRoster(w,i){
  const available=new Set([...Object.keys(game.contacts),...unused()]);
  const direct=w.directInvite;
  const seats=w.rosters[i].filter(id=>!direct || direct.i===i || id!==direct.id);
  if(direct?.i===i && !seats.includes(direct.id))seats.push(direct.id);
  return seats.filter(id=>available.has(id) && !isCut(id));
}
function inviteStatus(id,w,i){
  const c=game.contacts[id];
  if(quietContact(id))return '혼자 쉬는 중';
  if(c?.contactAfter>tick() || c?.changes>=2 && c.callAfter>tick())return '이번 번개는 사양했어요';
  if(['new','final'].includes(c?.warning))return '먼저 풀 이야기가 있어요';
  if(c?.invitedAt===tick() && !(w.directAnswer?.id===id && w.directAnswer.i===i))return '이번 계절에는 이미 답했어요';
  return '';
}
function reserve(i,guests,confirmed=false,ready=false){
  const w=weekend();if(w.taken || game.event || game.ended)return;
  guests=[...new Set(guests)].filter(id=>weekendRoster(w,i).includes(id));
  const answer=w.directAnswer,requested=guests.length===1?'pair':'group';
  const accepted=id=>answer?.id===id && answer.i===i && answer.mode===requested;
  const declined=guests.filter(id=>inviteStatus(id,w,i) || (game.contacts[id]?.invitedAt===tick() && !accepted(id)));
  guests=guests.filter(id=>!declined.includes(id));
  if(!guests.length){
    menu('함께 갈 멤버가 없어요');node('p','다른 멤버를 한 명 이상 초대해 주세요.',lifeBody);menuButton('다시 고르기',hosts);return;
  }
  if(guests.length===1){
    const id=guests[0];
    if(outreachBoundary(id) || game.contacts[id]?.groupUntil>=tick()){
      menu('여럿이 만나는 번개');node('p',withParticle(members[id].name,'과','와')+'는 다른 멤버도 함께 초대해요.',lifeBody);
      menuButton('멤버 더 고르기',()=>guestMenu(i,guests));return;
    }
    if(!confirmed){
      menu(otherLove(id)?'둘이 만나자고 물어볼까?':'둘만 가는 데벙이에요');
      if(declined.length)node('p',declined.map(id=>members[id].name).join(' · ')+' 멤버는 이번에 쉬기로 했어요.',lifeBody);
      node('p',otherLove(id)?'이미 만나는 사람이 있어요. 상대에게 먼저 마음을 물어볼까요?':withParticle(members[id].name,'과','와')+' 단둘이 만나는 데이트벙개예요. 둘이서 갈까요?',lifeBody);
      menuButton(otherLove(id)?'둘이 만나자고 제안':'좋아, 데벙으로 출발',()=>reserve(i,guests,true));menuButton('멤버 다시 고르기',()=>guestMenu(i,guests));return;
    }
  }
  if(guests.length===1 && otherLove(guests[0])){
    const id=guests[0];meet(id);
    if(canSecretInvite(id)){
      w.taken=true;game.contacts[id].invitedAt=tick();closeMenu();
      if(startSecretInvite(id))return;
      w.taken=false;delete game.contacts[id].invitedAt;persist();
    }
    menu('둘만 만날 수 없는 날');node('p','오늘은 친구들과 함께 만나자고 했어요.',lifeBody);
    menuButton('다른 멤버도 부르기',()=>guestMenu(i,guests));return;
  }
  const direct=w.directInvite;
  if(direct?.i===i && guests.includes(direct.id)){
    const id=direct.id;meet(id);
    const mode=guests.length===1?'pair':'group';
    const agreed=accepted(id) || sendOutreach(id,w.plans[i],mode,undefined,i);
    if(!agreed)return;
    if(!ready){
      menu(members[id].name+'의 답장');node('p',game.contacts[id].inviteNote,lifeBody,'contact-reply');
      menuButton('약속 장소로 가기',()=>reserve(i,guests,true,true));
      menuButton('멤버 다시 고르기',()=>guestMenu(i,guests));return;
    }
  }
  const others=weekendRoster(w,1-i).filter(id=>!quietContact(id) && !game.contacts[id]?.warning);
  if(others.length>=2){
    const [a,b]=others;meet(a);meet(b);bond(a,b);advanceCareer(a,w.plans[1-i]);advanceCareer(b,w.plans[1-i]);
    const rival=outings[w.plans[1-i]];
    const memory=members[a].name+'와 '+members[b].name+' 둘이 '+rival.title+'에 다녀왔다.';
    remember(a,'내가 빠진 토요일',memory,'neighbors',[b]);addEcho(a,'neighbors',members[b].name+'랑 다녀왔어. 사진 구경할래?',rival.title+' 단체사진',[b]);
  }
  guests.forEach(meet);w.taken=true;
  if(w.directInvite && guests.includes(w.directInvite.id))game.contacts[w.directInvite.id].invitedAt=tick();
  enterScene({type:'outingDay',activity:w.plans[i],id:guests[0],guests,declined,social:meetupSituation(guests)});
}
function hosts(){
  if(game.club.chooseOnHost){
    menu('어떤 번개를 만들어 갈까?');
    for(const goal of households)menuButton(goal+' · '+goals[goal].brief,()=>{
      game.club.goal=goal;game.club.firstHostSeason=tick();delete game.club.chooseOnHost;
      persist();hosts();
    });
    return;
  }
  const w=weekend();menu('토요일, 어디로 갈까?');
  node('p',game.club.goal+' · '+goals[game.club.goal].brief,lifeBody);
  node('p','같이 갈 멤버를 한 명 이상 골라요. 단둘이 만나면 데이트벙개, 줄여서 데벙이에요.',lifeBody);
  w.plans.forEach((key,i)=>{
    const roster=weekendRoster(w,i);
    menuButton(outings[key].title+' · '+(roster.map(id=>members[id].name).join(' · ') || '참석자 없음'),()=>guestMenu(i));
  });
}
function guestMenu(i,selected=[]){
  const w=weekend(),key=w.plans[i],roster=weekendRoster(w,i);
  const guests=new Set(selected.filter(id=>roster.includes(id) && !inviteStatus(id,w,i)));
  menu(outings[key].title);
  const status=node('p','',lifeBody,'guest-status');status.setAttribute('aria-live','polite');
  for(const id of roster){
    const label=node('label','',lifeBody,'invitee'),box=node('input','',label);
    const reason=inviteStatus(id,w,i);
    box.type='checkbox';box.disabled=!!reason;box.checked=guests.has(id);
    box.onchange=()=>{if(box.checked)guests.add(id);else guests.delete(id);sync();};
    label.append(' '+members[id].name+(box.disabled?' · '+reason:favorite(id)===key?' · 기다리던 번개':''));
  }
  const outside=Object.keys(game.contacts).filter(id=>!w.rosters[i].includes(id) &&
    !inviteStatus(id,w,i) && !isCut(id) && !allChildren().some(c=>c.id===id));
  if(outside.length){
    const field=node('label','다른 멤버 한 명 직접 초대',lifeBody);
    const select=node('select','',field);
    node('option','멤버 고르기',select).value='';
    for(const id of outside)node('option',members[id].name,select).value=id;
    select.value=w.directInvite?.i===i?w.directInvite.id:'';
    select.onchange=()=>{
      const prior=w.directInvite;
      if(prior)guests.delete(prior.id);
      if(select.value){w.directInvite={i,id:select.value};guests.add(select.value);}
      else delete w.directInvite;
      persist();guestMenu(i,[...guests]);
    };
  }
  const depart=node('button','이대로 출발',lifeBody,'start-button');depart.type='button';
  depart.onclick=()=>reserve(i,[...guests]);menuButton('다른 약속 보기',hosts);
  function sync(){depart.disabled=!guests.size;status.textContent=guests.size?'함께 갈 멤버 · '+guests.size+'명':'한 명 이상 골라 주세요.';}
  sync();
}
function growth(){
  for(const child of game.children){
    if(isCut(child.id))continue;
    const age=game.year-child.year+(child.kind==='입양'?3:0);
    const phases=[[3,'첫 가족사진','사진 찍을 때 나도 이렇게 웃으면 돼?'],[10,'우리 집의 버릇','나도 모르게 식탁을 두 번 톡톡 두드렸어. 집에서 하던 것처럼!'],[18,'아이의 독립','이삿짐은 다 쌌어. 첫 손님으로 와 줄 거지?']];
    const phase=phases.findLast(p=>age>=p[0]);if(!phase || (child.growth || 0)>=phase[0])continue;
    child.growth=phase[0];
    const adult=child.parents.filter(id=>!isCut(id)).at(-1) || game.player;
    const track=Object.entries(game.club.tracks).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const voice=phase[0]===3?members[adult].name+'처럼 웃어 봤어. 닮았어?':phase[0]===10 && track?'나도 '+track+' 해 볼래. 집에서 매번 봤잖아!':phase[2];
    addEcho(child.id,'growth',voice,phase[1]);game.echoes.at(-1).due=tick();
  }
}
function messages(){
  menu('우리 단톡방');
  for(const e of game.queue.filter(isLetter)){
    menuButton(members[e.id].name+(e.read?' · 연락 다시 보기':' · 새 연락 열기'),()=>{
      closeMenu();focusOn({kind:'event',e});
    });
  }
  const echoes=game.echoes.filter(e=>e.due<=tick());
  echoes.forEach(e=>menuButton(members[e.id].name+' · '+e.title,()=>{
    game.echoes.splice(game.echoes.indexOf(e),1);enterScene(e);
  }));
  for(const pair of game.bonds.slice(-3)){
    node('p',pair.people.map(id=>members[id].name).join(' · ')+'  /  함께한 모임 '+pair.visits+'번',lifeBody);
  }
  const ids=[...new Set([...Object.keys(game.contacts),...game.children.map(c=>c.id)])].filter(id=>!isCut(id));
  for(const id of ids)personCard(lifeBody,id,game.contacts[id]?.role || '가족',()=>{
    if(allChildren().some(c=>c.id===id)){childMenu(id);return;}
    const c=game.contacts[id];menu(members[id].name);
    node('p',c?.last || '익숙한 얼굴이 내 쪽을 돌아봤다.',lifeBody);
    if(c)node('p',(c.job || outings[favorite(id)].track+' 좋아하는 중')+' · '+(c.job?'요즘 하는 일':'관심사'),lifeBody);
    if(c)menuButton('만날 약속 제안',()=>outreachMenu(id));
    if(c)menuButton('안부 묻기',()=>{
      const repeated=c.greeted===tick();c.greeted=tick();
      if(!repeated)remember(id,'단톡방 안부','서로의 하루를 물었다.','greeting');
      const echo=game.echoes.find(e=>e.id===id && e.due<=tick());
      const quiet=quietContact(id);
      const reply=echo?.message || (repeated?'또 연락했네. 무슨 일 있어?':c.promise?'약속한 날 시간 비워 놨어. 그날 보자.':'마침 네 생각 했어. 오늘 어땠어?');
      const note=quiet?'메시지를 보냈다. 아직 답이 없다.':members[id].name+' · '+reply;
      let bubble=lifeBody.querySelector('.contact-reply');if(!bubble)bubble=node('p','',lifeBody,'contact-reply');bubble.textContent=note;persist();
    });
    menuButton('관계 정리',()=>cutMenu(id));
  });
  menuButton('동네로 돌아가기',closeMenu);
}
el('circle').onclick=messages;
function needsReply(){
  return game.weddings.length || upcoming().length || game.queue.some(e=>e.protected || (isLetter(e) || e.type==='sports')) ||
    game.echoes.some(e=>e.due<=tick()) || Object.values(game.contacts).some(c=>c.promise && c.deadline<=tick());
}
function passSeason(skip=false,onMove){
  const closing=game.year===30 && game.season===3;
  if(closing && (game.obligations?.length || game.queue.some(e=>e.protected))){
    menu('겨울에 남은 가족 소식');const event=game.queue.find(e=>e.protected) || game.obligations[0];
    menuButton(scene(event).title,()=>{game.queue=game.queue.filter(e=>e!==event);game.obligations=game.obligations.filter(e=>e!==event);enterScene(event);});return;
  }
  const promises=Object.values(game.contacts).filter(c=>c.promise && c.deadline<=tick());
  function move(){
    if(onMove)onMove();
    if(lifeMenu.open)closeMenu();preview=null;page=0;lastBeat=null;
    do{
      advance();if(game.ended)break;
      prepareSeason();growth();
      seasonalEncounter();
    }while(skip && !game.event && !game.finale && !needsReply() && !(game.year===30 && game.season===3));
    navigate();
  }
  if(promises.length || upcoming().length || (closing && game.echoes.some(e=>e.due<=tick()))){
    menu('기다리는 사람이 있어요');
    for(const [id,c] of Object.entries(game.contacts))if(promises.includes(c))personalPlanButton(id,c);
    for(const p of upcoming())diaryVisitButton(p);
    node('p',promises.length+upcoming().length?'계절을 넘기면 이 약속에 가지 못해요.':'읽지 않은 후일담이 있어요. 지금 30년을 마칠까요?',lifeBody);
    menuButton('동네에 더 머물기',closeMenu);menuButton('그래도 계절 넘기기',move);
  }else move();
}
function canEndEarly(){return !game.ended && tick()>=20 && tick()<119;}
function earlyEndingMenu(){
  if(!canEndEarly())return;
  menu('이 계절에서 이야기를 마칠까요?');
  node('p',clockLabel()+'까지의 추억을 앨범에 남겨요. 엔딩을 보면 남은 대화와 약속은 진행할 수 없어요.',lifeBody);
  menuButton('계속 플레이',closeMenu);
  menuButton('이야기를 마치고 엔딩 보기',()=>{
    closeMenu();if(albumDialog.open)albumDialog.close();
    preview=null;game.event=null;completeRun();navigate();
  });
}
function lifeDock(){
  growth();const taken=game.weekend?.when===tick() && game.weekend.taken,due=game.echoes.filter(e=>e.due<=tick()).length;
  const unread=due+game.queue.filter(e=>isLetter(e) && !e.read).length;
  el('circle').textContent=unread?'단톡방 · '+unread:'단톡방';
  if(game.weddings.length){
    const e=game.weddings[0];dockButton(members[e.id].name+' · '+e.source,()=>{game.weddings.shift();enterScene(e);});
  }
  if(game.diary.length || Object.values(game.contacts).some(c=>c.promise))dockButton('내 일정'+(game.diary.some(p=>p.state==='proposal')?' · 날짜 정하기':''),calendarMenu,true);
  if(!taken)dockButton('토요일 번개 열기',hosts);
  else if(due)dockButton('도착한 후일담 읽기',messages);
  dockButton(game.year===30 && game.season===3?'30년의 마지막 겨울 마치기':nextSeasonLabel()+' 넘어가기',()=>passSeason());
  if(canEndEarly())dockButton('지금 엔딩 보기',earlyEndingMenu,true);
  if(!needsReply() && tick()<119)dockButton('다음 소식까지 쉬기',()=>passSeason(true),true);
}
function epilogue(g){
  const guests=Object.entries(g.club?.guests || {}).filter(([id])=>!g.blocked?.includes(id)).sort((a,b)=>b[1]-a[1]);
  const friend=guests.find(([id,n])=>n>=3 && g.contacts[id]?.role==='친구');
  const longFriend=Object.keys(g.contacts).filter(id=>g.contacts[id].role==='친구').map(id=>{
    const years=new Set(g.log.filter(e=>e.id===id || e.others?.includes(id)).map(e=>e.year));
    return {id,years:years.size};
  }).sort((a,b)=>b.years-a.years)[0];
  if(longFriend?.years>=5)return {title:'생일상을 돌려받은 날',line:members[longFriend.id].name+'가 식탁 한가운데 촛불을 켰다. “올해는 내가 차릴 차례야.” 우리 앨범에는 서로 찾아간 '+longFriend.years+'년이 남아 있다.'};
  if(friend)return {title:'늘 내 자리를 남겨 둔 사람',line:members[friend[0]].name+'가 오늘은 먼저 자리를 잡았다. “이번엔 네가 앉아. '+friend[1]+'번이나 네가 불렀잖아.”'};
  const track=Object.entries(g.club?.tracks || {}).sort((a,b)=>b[1]-a[1])[0];
  if(track && track[1]>=3)return {title:g.club.goal+'의 마지막 초대장',line:'서랍에서 첫 '+track[0]+' 기념품을 꺼냈다. '+track[1]+'번이나 이어진 토요일이 손안에 들어왔다.'};
  return null;
}
function archiveRun(){
  const end=ending(game);
  const run={id:game.runId,endedAt:clockLabel(),player:game.player,title:end.title,line:epilogue(game)?.line,
    achievements:end.threads,community:communityCredits(creditCast()).map(t=>({title:t.title,
      events:t.events.map(n=>({date:seasonDate(n.when),line:townCreditLine(n)}))})),
    names:Object.fromEntries(familyIds().map(id=>[id,kinPerson(id).name])),
    links:familyIds().flatMap(id=>[...connections(id)].filter(([who])=>id<who).map(([who,roles])=>({id,who,roles}))),
    scenes:game.log.filter(visibleMemory).map(({year,season,id,title,memory,others,label})=>({year,season,id,title,memory,others,label}))};
  const archives=storedList('family30.albums').filter(a=>a.id!==run.id);
  try{localStorage.setItem('family30.albums',JSON.stringify([...archives,run]));game.archived=true;}
  catch{game.archived=false;}
}
function albumLife(parent){
  const club=game.club;
  if(!club.chooseOnHost){
    node('h3',club.goal,parent);node('p',(club.visits>=8?'우리 간판이 걸린 아지트':club.visits>=3?'익숙한 단골자리':'첫 모임을 기다리는 자리')+' · 모임 '+club.visits+'회',parent);
    node('p',club.completed?goals[club.goal].reward:goals[club.goal].brief+' ('+Math.min(3,goalProgress(club))+'/3)',parent);
  }
  for(const o of Object.values(outings))if(club.tracks[o.track])
    node('p',o.track+' '+club.tracks[o.track]+'회 · '+(club.tracks[o.track]>=3?o.job:'배우는 중'),parent);
  if(game.ended){const end=epilogue(game);if(end)node('p',end.line,parent);if(!game.archived)archiveRun();}
  const archived=storedList('family30.albums').filter(r=>r.id!==game.runId);
  if(!archived.length)return;
  const shelf=details(parent,'지난 가족의 앨범 · '+archived.length+'권');
  for(const r of archived.reverse()){
    const book=details(shelf,members[r.player].name+' · '+(r.endedAt || '30년 차 겨울')+' · '+r.title);
    if(r.line)node('p',r.line,book);
    for(const t of r.achievements || [])node('p',t.title+' · '+t.line,book,'memory-card');
    for(const t of r.community || []){
      const chapter=details(book,t.title);
      for(const n of t.events)node('p',n.date+' · '+n.line,chapter,'memory-card');
    }
    if(r.links){
      const tree=details(book,'그 시절의 가계도');
      for(const edge of r.links)
        node('p',r.names[edge.id]+' → '+edge.roles.join(' · ')+' → '+r.names[edge.who],tree);
    }
    for(const s of r.scenes){
      const card=node('div','',book,'memory-card');
      if(s.label)node('small','내 선택 · '+s.label,card);
      node('p',logText(s,r.names),card);
    }
  }
}
