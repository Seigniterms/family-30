// Each incident can stay between two people or draw a witness into the room.
const incidents={
  mic:{
    title:'켜져 있던 마이크', opening:'잠깐. 방금 내가 네 이름 부른 거… 스피커로 다 나갔어?',
    private:'마이크부터 끄고 둘이 얘기한다.', crowd:'마이크를 받아 공개 사연으로 바꾼다.',
    whisper:'신청곡 사연에 네 이름 썼어. 진행자가 읽기 전에 내가 말하고 싶었는데.',
    witness:'나 사연 끝까지 못 들었어! 둘이 듀엣으로 마무리하면 인정.',
    pair:'다음 곡은 우리 둘이 듣자.', team:'셋이 후렴을 나눠 부른다.',
    groupMemory:'셋이 부른 앙코르 녹음',groupEcho:'마지막 음에서 셋 다 갈라진 거 들었어? 다음 번개 알림음으로 하재.', secret:'마이크 꺼진 동안 한 말은 우리만 알아. 다음 곡 골라 줄래?',
    keepsake:'이름이 들어간 신청곡', echo:'그날 신청곡 다시 듣기 떴어. 끝에 우리 웃음소리 들려?'
  },
  bag:{
    title:'바뀐 선물 봉투',opening:'그 봉투 열었어? 다 같이 먹을 쿠키는 맞는데… 밑에 카드가 하나 있어.',
    private:'카드는 주머니에 살짝 넣는다.',crowd:'쿠키부터 펼쳐 놓고 주인을 찾는다.',
    whisper:'네 것만 한 번 더 구웠어. 좋아한다고 쓰기는 쑥스러워서 뒷면에 조그맣게 썼는데.',
    witness:'범인 찾았다! 이 포장지 산 사람 나랑 같이 장 봤잖아.',
    pair:'다음엔 같이 구울래?',team:'셋이 다음 번개 간식을 맡는다.',
    groupMemory:'번개 간식 시식표',groupEcho:'우리 쿠키에 이름 붙이자고 투표 열렸어. 1등이 ‘범인 세트’야.',secret:'네가 주머니에 넣은 카드, 아직 갖고 있어? 답은 안 써도 돼.',
    keepsake:'쿠키 봉투 속 손편지',echo:'카드 모서리에 묻은 거 초콜릿이야. 다음엔 앞면에 제대로 쓸게.'
  },
  train:{
    title:'반대편 막차',opening:'야, 내려! 우리 반대 방향 탔어. 어… 문 닫혔다.',
    private:'빈 좌석 둘에 나란히 앉는다.',crowd:'단톡에 구조 요청을 보낸다.',
    whisper:'다들 알아채기 전에 말할게. 아까 너랑 더 있고 싶어서 한 정거장만 더 가려고 했어.',
    witness:'다음 역에서 내려! 내가 그 동네 야식집 앞이야. 이렇게 만난 김에 한 끼 어때?',
    pair:'다음 역에서 둘이 늦은 저녁을 먹자.',team:'구조대에게 우리가 저녁을 산다.',
    groupMemory:'막차 구조대 영수증',groupEcho:'야식집 사장님이 우리를 막차 구조대로 기억하셔. 다음엔 제시간에 오라시네.',secret:'그날 우리 내린 역, 노선도에서 보면 아직 웃겨. 이번엔 안 알려 줄게.',
    keepsake:'반대 방향 막차표',echo:'우리 잘못 내렸던 역이야. 오늘은 일부러 여기 왔어.'
  },
  blackout:{
    title:'촛불이 꺼진 순간',opening:'잠깐, 정전이야? 생일 케이크가 아직 내 손에 있는데!',
    private:'휴대폰 불빛으로 둘이 케이크를 지킨다.',crowd:'단톡에 플래시 켜고 모이라고 한다.',
    whisper:'사실 네 생일 때도 만들어 주려고 연습한 거야. 첫 조각 먹어 볼래?',
    witness:'불 들어왔다! 세상에, 초 대신 폰 세 대 들고 소원 비는 건 처음 본다.',
    pair:'다음 생일엔 내가 초를 꽂아 줄게.',team:'플래시 세 개 켜고 기념사진을 찍는다.',
    groupMemory:'휴대폰 세 대로 찍은 생일사진',groupEcho:'내년 생일에도 폰 세 대 들고 찍자는 사람이 벌써 둘이야. 너까지 셋 할래?',secret:'케이크 첫 조각 잘라 준 건 우리 둘만 알고 있자. 생일엔 초도 챙길게.',
    keepsake:'촛불 대신 켜진 불빛',echo:'그날 사진 봐. 불은 꺼졌는데 얼굴은 다 환하게 나왔어.'
  }
};
function incidentScene(e){
  const s=incidents[e.code];
  if(!e.route)return {title:s.title,message:s.opening,choices:[
    snapChoice(s.private,''),snapChoice(s.crowd,'')]};
  if(e.route==='pair')return {title:s.title,message:s.whisper,choices:[
    snapChoice(s.pair,'그럼 다음엔 내가 먼저 기다릴게. 둘만의 약속이야.','dinnerPromise'),
    snapChoice('우리끼리만 알고 웃어넘기자.','좋아. 나중에 눈만 마주쳐도 웃을 것 같아.','memory')]};
  return {title:s.title,message:s.witness,choices:[
    snapChoice(s.team,'날짜는 단톡에 올려 둘게. 다음에도 이 멤버로 만나자.','friend'),
    snapChoice('증거는 한 장만 간직하자.','오늘의 소동을 셋만 아는 추억으로 남겼다.','memory')]};
}
function handleIncident(e,index){
  const action=incidentScene(e).choices[index];if(!action)return;
  if(!e.route){
    e.route=index?'group':'pair';
    if(index){meet(e.other);e.guests=[e.other];}
    navigate();return;
  }
  const s=incidents[e.code],c=meet(e.id),group=e.route==='group';
  if(index===0){
    if(group){bond(e.id,e.other);proposePlan('groupMeal',[e.id,e.other]);}
    else {c.affection++;setPromise(c,'dinnerDate');}
  }
  const participants=group?[e.other]:[];
  const souvenir=group?s.groupMemory:s.keepsake;
  const memory=(group?s.crowd:s.private)+' '+action.line;
  (game.keepsakes ||= []).push({id:e.id,title:souvenir,year:game.year,memory,others:participants});
  remember(e.id,s.title,memory,'incident',participants);
  addEcho(e.id,'incident',group?s.groupEcho:index===0?s.echo:s.secret,souvenir,participants);
  c.last=memory;e.result={label:action.label,line:action.line,spoken:!(group && index===1)};
  navigate();
}
function seasonalEncounter(){
  if(game.ended || game.arrivalTick===tick())return;
  game.arrivalTick=tick();
  const queue=game.queue.filter(e=>!e.read);
  let event=queue.find(e=>e.protected || e.type==='departure');
  if(!event && (upcoming().length || Object.values(game.contacts).some(c=>c.promise && c.deadline<=tick())))return;
  if(!event && !game.finale){
    const m=pendingReunions().find(item=>(item.kind==='date' && item.choice===0) || tick()-item.when>=4);
    if(m){
      game.reunions=game.reunions.filter(item=>item!==m);
      game.event={type:'reunionMail',id:m.id,people:m.people,memoryThread:m,key:'mail-'+m.key,until:tick(),spontaneous:true};
      return;
    }
    event ||= queue.find(e=>['photoReunion','photoWinter'].includes(e.type));
    const echo=!event && game.echoes.find(e=>e.kind==='incident' && e.due<=tick());
    if(echo){
      game.echoes.splice(game.echoes.indexOf(echo),1);
      game.event={...echo,spontaneous:true,key:'echo-'+tick(),until:tick()};
      return;
    }
  }
  if(!event && tick()>(game.calmThrough ?? -1) && tick()>0 && tick()>=(game.nextIncident ?? 2)){
    const people=Object.keys(game.contacts).filter(id=>!quietContact(id) && !isCut(id) && !game.contacts[id].warning);
    if(people.length){
      const id=pick(people),others=people.filter(who=>who!==id);
      const witnesses=others.length?others:unused();
      if(witnesses.length){
        const history=game.incidentHistory || [];
        const code=pick(Object.keys(incidents).filter(key=>!history.includes(key)));
        game.incidentHistory=[...history,code].slice(-3);
        game.nextIncident=tick()+pick([2,3,4]);
        game.event={type:'incident',id,other:pick(witnesses),code,spontaneous:true,key:'incident-'+tick(),until:tick()};
        return;
      }
    }
  }
  event ||= queue.find(e=>['warning','approach','reconnect'].includes(e.type)) ||
    queue.find(e=>isLetter(e)) || (tick()>(game.calmThrough ?? -1) && queue.find(e=>e.type==='chapter'));
  if(event){
    game.queue=game.queue.filter(item=>item!==event);
    game.event={...event,spontaneous:true};
  }
}
