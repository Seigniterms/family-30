// One calendar entry represents one meeting, including every invited guest.
const planNames={concert:'공연',dinnerDate:'저녁 식사',umbrellaDate:'우산 산책',friday:'다시 잡은 약속',follow:'둘만의 약속',groupMeal:'다 같이 저녁',childMeal:'가족 저녁',ceremony:'결혼식'};
function seasonDate(t){return (1+Math.floor(t/4))+'년 차 '+seasons[t%4];}
function plansAt(due){
  const booked=Object.entries(game.contacts).filter(([,c])=>c.promise && c.deadline===due)
    .map(([id,c])=>({kind:c.plan || 'follow',people:[id]}));
  return booked.concat(game.diary.filter(p=>p.due===due && p.state==='booked'));
}
function planLabel(p){return p.people.map(id=>kinPerson(id).name).join(' · ')+' / '+(planNames[p.kind] || '약속');}
function proposePlan(kind,people){
  people=[...new Set(people)].filter(id=>!isCut(id));
  if(!people.length)return;
  const exists=game.diary.find(p=>p.kind===kind && p.people.length===people.length && people.every(id=>p.people.includes(id)));
  if(game.event && !game.event.result)game.event.planChoice={kind,people};
  if(exists)return exists;
  const plan={kind,people,due:Math.min(119,tick()+1),state:'proposal'};
  game.diary.push(plan);return plan;
}
function updatePlanResult(p,message){
  const choice=game.event?.planChoice;
  if(game.event?.result && choice?.kind===p.kind && p.people.length===choice.people.length && p.people.every(id=>choice.people.includes(id))){
    game.event.result.line=message;game.event.result.memory=message;game.event.result.spoken=false;
  }
}
function bookMenu(p){
  menu(planLabel(p));const date=Math.max(tick(),p.due),other=plansAt(date);
  node('p',seasonDate(date)+(other.length?'에는 먼저 잡은 약속이 있어요.':'에 만날까요?'),lifeBody);
  for(const item of other)node('p',planLabel(item),lifeBody);
  let available=date;while(available<=119 && plansAt(available).length)available++;
  if(available>119)node('p','마지막 겨울까지 일정이 차 있어요. 새 약속을 사양할 수 있어요.',lifeBody);
  if(p.kind==='ceremony' && other.length===1 && other[0].kind!=='ceremony' && available<=119){
    const first=other[0];
    menuButton(planLabel(first)+' → '+seasonDate(available)+'로 옮기고 결혼식 약속 확정',()=>{
      if(first.state==='booked')first.due=available;
      else game.contacts[first.people[0]].deadline=available;
      p.state='booked';p.due=date;remember(game.player,'결혼식 날의 일정',planLabel(first)+' 날짜를 '+seasonDate(available)+'로 다시 잡았다.','reschedule',first.people);
      updatePlanResult(p,seasonDate(p.due)+'에 만나기로 했다.');persist();calendarMenu();
    });
  }
  if(available<=119 && (p.kind!=='ceremony' || !other.length))menuButton(seasonDate(available)+'에 약속 확정',()=>{
    p.state='booked';p.due=available;updatePlanResult(p,seasonDate(p.due)+'에 만나기로 했다.');persist();calendarMenu();
  });
  menuButton(other.length?'먼저 잡은 약속만 지키기':'이번에는 사양하기',()=>{
    game.diary=game.diary.filter(item=>item!==p);updatePlanResult(p,'이번 약속은 사양했다.');persist();calendarMenu();
  });
}
function personalPlanButton(id,c){
  if(!c.promise || c.deadline>tick())return;
  const kind=c.waitAt==='seats'?'seated':c.plan || 'follow';
  const label=c.plan==='concert'?'공연장으로 가기':(planNames[c.plan] || '약속')+' 만나러 가기';
  menuButton(members[id].name+' · '+label,()=>{
    const e={id,type:kind,previous:c.last};
    if(game.event?.result){game.event=null;persist();}
    closeMenu();venue=eventPlace(e);focusOn({kind:'promise',c,e});
  });
}
function diaryVisitButton(p){
  menuButton('만나러 가기 · '+planLabel(p),()=>{
    game.diary=game.diary.filter(item=>item!==p);
    const special=['groupMeal','childMeal','ceremony'].includes(p.kind);
    if(!special){
      const c=game.contacts[p.people[0]];
      if(c){c.kept=(c.kept || 0)+1;c.trust=(c.trust || 0)+1;c.needsMeeting=false;}
    }
    enterScene({type:special?'calendarVisit':p.kind,id:members[p.people[0]]?p.people[0]:game.player,people:p.people,kind:p.kind});
  });
}
function calendarMenu(){
  menu('내 일정');
  for(const [id,c] of Object.entries(game.contacts).filter(([,c])=>c.promise)){
    node('p',seasonDate(c.deadline)+' · '+(planNames[c.plan] || '약속'),lifeBody);
    if(c.deadline<=tick())personalPlanButton(id,c);
  }
  for(const p of game.diary){
    if(p.state==='proposal')menuButton('일정 정하기 · '+planLabel(p),()=>bookMenu(p));
    else if(p.due<=tick())diaryVisitButton(p);
    else node('p',seasonDate(p.due)+' · '+planLabel(p),lifeBody);
  }
  menuButton('돌아가기',closeMenu);
}
function expirePlans(){
  for(const p of game.diary){
    if(p.state==='booked' && p.due<=tick())remember(game.player,'지나간 약속',planLabel(p)+'에 가지 못했다.','missedPlan',p.people);
  }
  game.diary=game.diary.filter(p=>p.state==='booked' || p.kind==='ceremony'?p.due>tick():p.due+2>tick());
  game.weddings=game.weddings.filter(e=>{
    if(tick()-e.due<3)return true;
    remember(e.id,'답하지 않은 청첩장','축하 인사를 쓰다가 청첩장을 조용히 접었다.','memory',[e.other]);return false;
  });
}
function upcoming(){return game.diary.filter(p=>p.state==='booked' && p.due<=tick());}
const familyScenes=[
 {until:6,title:'잠들기 전 그림책',setup:'책을 덮으려는데 아이가 괴물 그림을 손가락으로 짚는다.',voice:'괴물 나오는 데 한 번만 더 읽어 줘!',replies:['으악! 그 목소리로 굿나잇도 해 줘.','괴물도 우리 집에서 자면 안 돼?'],choices:[['괴물 목소리로 읽는다','이불을 뒤집어쓴 아이의 웃음소리가 터졌다.'],['같이 결말을 지어낸다','책 맨 뒤에 우리만의 결말을 그렸다.']]},
 {until:12,title:'방과 후 운동장',setup:'방과 후 운동장에 가니 아이가 줄넘기를 들고 뛰어온다.',voice:'오늘 처음으로 줄 안 걸리고 열 번 넘었어. 한번 볼래?',replies:['열하나! 방금 내 기록 깼지?','이번엔 내가 세어 줄게. 하나, 둘!'],choices:[['한 번 더 보여 달라고 한다','아이가 줄을 넘을 때마다 숫자를 셌다. 열한 번째에 둘 다 만세를 불렀다.'],['같이 연습한다','한 줄씩 잡고 나란히 뛰다가 서로 발이 엉켜 웃었다.']]},
 {until:18,title:'닫힌 방문 앞에서',setup:'방문을 두드리자 안쪽에서 이어폰 줄을 감는 소리가 난다.',voice:'학교에서 속상한 일 있었어. 오늘은 그냥 들어 줄래?',replies:['점심시간에 나만 남았거든. 그때 얘기부터 해도 돼?','귤 봤어. 고마워. 조금 쉬고 나갈게.'],choices:[['조용히 곁에 앉는다','아이가 먼저 이어폰 한쪽을 건네고 학교 얘기를 꺼냈다.'],['지금은 혼자 있게 해 준다','문 앞에 귤 두 개를 놓았다. 잠시 뒤 고맙다는 톡이 왔다.']]},
 {until:Infinity,title:'독립한 집의 첫 손님',setup:'이사를 마친 아이에게서 새집 주소가 왔다.',voice:'저녁 먹으러 와. 첫 손님 맞으려고 접시 두 개 꺼냈어.',replies:['우리 집에서 국 끓이는 냄새 나니까 진짜 이사 온 것 같다.','금방이야. 모퉁이 돌면 내가 좋아하는 식당 있어.'],choices:[['장바구니를 들고 찾아간다','작은 부엌에서 국을 끓이고 그릇 두 개를 꺼냈다.'],['동네 단골집을 소개받는다','아이가 내 손을 잡고 자기 동네 골목을 안내했다.']]}
];
function childMenu(id){
  const child=allChildren().find(c=>c.id===id);if(!child || isCut(id))return;
  const s=familyScenes.find(s=>childAge(child)<s.until);
  menu(kinPerson(id).name+' · '+childAge(child)+'세');
  if(child.lastVisit)node('p',child.lastVisit,lifeBody);
  if(child.visitWhen!==tick())menuButton(s.title,()=>enterScene({type:'childVisit',id:game.player,kid:id}));
  else node('p','이번 계절엔 함께 시간을 보냈어요.',lifeBody);
  if(members[id] && game.children.some(c=>c.id===id))menuButton('관계 정리',()=>cutMenu(id));
  menuButton('같이 저녁 먹을 날 잡기',()=>{
    const p=proposePlan('childMeal',[id]);persist();if(p.state==='proposal')bookMenu(p);else calendarMenu();
  });
}
function weddingNotice(pair){
  for(const id of pair.people){
    const c=game.contacts[id];if(!c || !['연인','옛 인연'].includes(c.role))continue;
    const other=pair.people.find(person=>person!==id);
    if(c.role==='연인'){
      c.role='옛 인연';c.cooldown=tick()+4;c.needsMeeting=true;c.affair=false;
      remember(id,'청첩장이 온 날','연애를 마치고 결혼 소식에 답할 시간을 갖기로 했다.','split',[other]);
    }
    if(!game.weddings.some(e=>e.id===id && e.other===other))
      game.weddings.push({type:'weddingLetter',id,other,source:pick(['친구가 보낸 사진','먼저 걸려 온 전화','우편함 속 청첩장']),due:tick()});
  }
}
function personalScene(e){
  const child=e.type==='childVisit'?allChildren().find(c=>c.id===e.kid):null;
  let title,message,choices,setup,replies;
  if(child){
    const script=familyScenes.find(s=>childAge(child)<s.until);
    ({title,setup,voice:message,choices}=script);
    replies=script.replies;
  }else if(e.type==='weddingLetter'){
    title=e.source;message=kinPerson(e.other).name+'와 결혼해. 너한테는 내 입으로 얘기하고 싶었어.';
    replies=['응. 내가 먼저 연락할게. 고맙다는 말도 얼굴 보고 하고 싶어.','와 주면 정말 좋지. 결혼식 날짜 보내 줄게.','알겠어. 당분간은 내가 먼저 연락하지 않을게.'];
    choices=[['따로 만나서 얘기하고 싶다고 한다','마주 앉아 함께했던 시간을 돌아보고 서로의 새 출발에 인사를 건넸다.'],['결혼식에 가고 싶다고 전한다','축하를 전하고 결혼식 일정을 확인하기로 했다.'],['당분간 연락을 쉬자고 한다','내 마음을 추스를 시간을 달라고 했다.']];
  }else{
    const lines={
      groupMeal:['같이 잡은 저녁','빈 접시 하나 더! 오늘은 다 같이 먹는 날이잖아.','다 같이 건배한다','함께 사진을 찍는다'],
      childMeal:['가족 저녁','오늘 내 옆자리 비워 놨어!','옆에 앉아 하루를 묻는다','같이 디저트를 만든다'],
      ceremony:['결혼식장에서','결혼식에 와 줘서 고마워. 하객석에서 네 얼굴 보니까 긴장이 풀리더라.','축하를 전한다','방명록에 편지를 남긴다']
    }[e.kind];[title,message]=lines;
    const outcomes={
      groupMeal:['식탁에 모인 사람들이 잔을 맞댔다. 지난번 번개 얘기에 여기저기서 웃음이 터졌다.','식탁 위 빈 그릇까지 담긴 사진이 단톡방에 올라갔다.'],
      childMeal:['수저를 내려놓자 아이가 오늘 있었던 일을 하나씩 들려줬다.','아이가 접시에 마지막 딸기를 올리고 내 앞으로 밀어 줬다.'],
      ceremony:['식이 끝난 뒤 눈을 마주치고 두 사람에게 축하를 건넸다.','식장 문을 나서기 전, 방명록에 짧은 편지를 남겼다.']
    }[e.kind];
    replies={
      groupMeal:['오늘은 막차 전에 단체 사진도 찍자.','잠깐, 나 입 닦고! 찍으면 단톡에도 올려 줘.'],
      childMeal:['오늘 웃긴 일 있었어. 첫 숟갈 먹으면서 얘기해 줄게.','저 딸기 제일 큰 거야. 먼저 먹어 봐.'],
      ceremony:['와 줘서 고마워. 나중에 사진도 꼭 보내 줄게.','네 글씨 알아봤어. 식 끝나면 천천히 읽을게.']
    }[e.kind];
    choices=lines.slice(2).map((label,i)=>[label,outcomes[i]]);
  }
  const delivery={'친구가 보낸 사진':'예복을 입은 두 사람의 사진이 단톡에 올라왔다. 잠시 뒤 개인톡이 왔다.','먼저 걸려 온 전화':'휴대폰이 울린다. 전화를 받자 상대가 잠시 숨을 고른다.','우편함 속 청첩장':'청첩장 안에 내 이름으로 시작하는 짧은 편지가 들어 있다.'};
  return {title,setup:setup || delivery[e.source] || planLabel(e)+' 약속 날이다.',message,choices:choices.map(([label,line],i)=>({label,line,reply:replies?.[i]}))};
}
function answerPersonal(e,index){
  const story=personalScene(e),a=story.choices[index];if(!a)return;
  const people=e.people || [e.kid || e.id,...(e.other?[e.other]:[])];
  if(e.type==='childVisit'){
    const child=allChildren().find(c=>c.id===e.kid);child.visitWhen=tick();child.lastVisit=a.line;
  }else if(e.type==='weddingLetter'){
    const c=game.contacts[e.id];
    if(c.role==='연인'){c.role='옛 인연';c.affair=false;}
    c.last=a.line;c.cooldown=tick()+4;c.needsMeeting=true;
    if(index===2)c.quietUntil=tick()+4;
    if(index===1)proposePlan('ceremony',people);
    addEcho(e.id,'weddingAfter',['그날 끝까지 들어 줘서 고마웠어.','청첩장 받아 줘서 고마워.','답장 안 해도 돼. 네가 말한 대로 기다릴게.'][index],'그날의 대답',[e.other]);
    if(index===2)game.echoes.at(-1).due=c.quietUntil;
  }else if(e.kind==='childMeal'){
    const child=allChildren().find(c=>c.id===e.people[0]);if(child)child.lastVisit=a.line;
  }else if(e.kind==='groupMeal'){
    bond(...e.people);for(const id of e.people){const c=game.contacts[id];if(c)c.trust=(c.trust || 0)+1;}
  }
  const memory=people.map(id=>kinPerson(id).name).join(' · ')+' — '+a.line;
  remember(e.id,story.title,memory,e.type,people);
  e.result={label:a.label,line:a.reply || a.line,memory:a.line,spoken:!!a.reply,
    speaker:e.type==='childVisit'?e.kid:e.type==='calendarVisit'?e.people[0]:e.id};
  navigate(e);
}
