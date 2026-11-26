// Each incident can stay between two people or draw a witness into the room.
const incidents={
  mic:{
    title:'켜져 있던 마이크', setup:'번개 공연이 끝났다. 내 옆에서 빨간 마이크 불빛이 깜박인다.',
    pairReply:'좋아. 다음 저녁에 이어폰 가져갈게. 한쪽씩 나눠 끼자.',quietReply:'응. 마이크 껐으니까 한 번만 더 말할게. 네가 왔으면 했어.',
    teamReply:'다음 저녁엔 이 녹음부터 틀자. 내 음이탈까지 다 들리겠지?',photoReply:'세 사람이 마이크 하나를 들고 찍었다. 내가 찍은 사진에는 셋의 손이 겹쳐 보인다.',
    photoEcho:'마이크 잡은 손 셋이 겹친 사진, 우리끼리 한 장씩 갖자.', opening:'잠깐. 방금 내가 네 이름 부른 거… 스피커로 다 나갔어?',
    private:'마이크부터 끄고 둘이 얘기한다.', crowd:'마이크를 받아 공개 사연으로 바꾼다.',
    whisper:'신청곡 사연에 네 이름 썼어. 진행자가 읽기 전에 내가 말하고 싶었는데.',
    witness:'나 방금 끊긴 사연 들었어. 마이크 하나 더 있는데, 셋이 후렴 부를까?',
    pair:'다음 곡은 우리 둘이 듣자.', team:'셋이 후렴을 나눠 부른다.',
    groupMemory:'셋이 부른 앙코르 녹음',groupEcho:'마지막 음에서 셋 다 갈라진 거 들었어? 다음 번개 알림음으로 하재.', secret:'마이크 꺼진 동안 한 말은 우리만 알아. 다음 곡 골라 줄래?',
    keepsake:'이름이 들어간 신청곡', echo:'그날 신청곡 다시 듣기 떴어. 끝에 우리 웃음소리 들려?'
  },
  bag:{
    title:'쿠키 봉투 속 카드',setup:'간식 테이블에서 쿠키를 나누는데 내 봉투에만 접힌 종이가 보인다.',
    pairReply:'그럼 다음엔 저녁 먹고 우리 집에서 굽자. 카드에는 뭐라고 쓸지 같이 정하고.',
    quietReply:'그래. 다들 앞에서 읽었으면 얼굴 빨개졌을 거야.',
    teamReply:'좋아. 셋이 저녁부터 먹고 다음 번개에 낼 쿠키를 골라 보자.',photoReply:'카드 글씨는 가리고 셋이 쿠키 봉투만 찍었다.',
    photoEcho:'쿠키 봉투 사진 잘 받았어. 카드 글씨 가려 줘서 고마워.',opening:'그 봉투 열었어? 다 같이 먹을 쿠키는 맞는데… 밑에 카드가 하나 있어.',
    private:'카드는 주머니에 살짝 넣는다.',crowd:'쿠키부터 펼쳐 놓고 주인을 찾는다.',
    whisper:'네 것만 한 번 더 구웠어. 좋아한다고 쓰기는 쑥스러워서 뒷면에 조그맣게 썼는데.',
    witness:'범인 찾았다! 이 포장지 산 사람 나랑 같이 장 봤잖아.',
    pair:'다음엔 같이 구울래?',team:'셋이 다음 번개 간식을 맡는다.',
    groupMemory:'번개 간식 시식표',groupEcho:'우리 쿠키에 이름 붙이자고 투표 열렸어. 1등이 ‘범인 세트’야.',secret:'네가 주머니에 넣은 카드, 아직 갖고 있어? 답은 안 써도 돼.',
    keepsake:'쿠키 봉투 속 손편지',echo:'카드 모서리에 묻은 거 초콜릿이야. 다음엔 앞면에 제대로 쓸게.'
  },
  train:{
    title:'반대편 막차',setup:'막차에 막 올라탔다. 전광판에 우리 집과 반대쪽 역 이름이 뜬다.',
    pairReply:'좋아. 다음에 제대로 된 방향으로 타도 저녁은 또 같이 먹자.',quietReply:'오늘 길 잘못 든 얘기는 비밀이다. 같이 있으니까 덜 창피해.',
    teamReply:'그럼 오늘은 내가 길을 찾고, 다음 저녁은 너희가 사는 거다?',photoReply:'셋이 야식집 간판 앞에 섰다. 사진 아래에 역 이름도 적어 뒀다.',
    photoEcho:'그 야식집 주소 찾았어. 사진 밑에 역 이름 써 놓길 잘했지?',opening:'야, 내려! 우리 반대 방향 탔어. 어… 문 닫혔다.',
    private:'빈 좌석 둘에 나란히 앉는다.',crowd:'단톡에 구조 요청을 보낸다.',
    whisper:'방향 잘못 탄 줄 알고 식겁했는데… 너 옆에 앉으니까 조금 더 가도 되겠다 싶어.',
    witness:'다음 역에서 내려! 내가 그 동네 야식집 앞이야. 이렇게 만난 김에 한 끼 어때?',
    pair:'이번 역에서 내릴까? 다음 저녁도 나랑 먹자.',team:'구조대에게 우리가 저녁을 산다.',
    groupMemory:'막차 구조대 영수증',groupEcho:'야식집 사장님이 우리를 막차 구조대로 기억하셔. 다음엔 제시간에 오라시네.',secret:'막차 방향 잘못 탄 얘기는 아직 우리 둘만 알아. 노선도만 봐도 웃음 나.',
    keepsake:'반대 방향 막차표',echo:'반대로 탄 날 기억나? 오늘은 그 역 이름 보고 네 생각부터 났어.'
  },
  blackout:{
    title:'촛불이 꺼진 순간',setup:'생일 번개에서 케이크가 나오자마자 방 안이 캄캄해졌다.',
    pairReply:'그럼 저녁 먹을 날 잡자. 초는 네가, 케이크는 내가 챙길게.',quietReply:'그래. 케이크 맨 위 딸기도 네 몫으로 놔둘게.',
    teamReply:'다음에 셋이 저녁 먹을 때 이 포즈 또 찍자. 그땐 전등 켜고!',photoReply:'불이 돌아온 뒤 셋이 빈 케이크 접시와 손전등을 한 장에 담았다.',
    photoEcho:'빈 접시 옆에 손전등까지 나온 사진 봤어? 정전됐던 밤이 딱 생각나.',opening:'잠깐, 정전이야? 생일 케이크가 아직 내 손에 있는데!',
    private:'휴대폰 불빛으로 둘이 케이크를 지킨다.',crowd:'단톡에 플래시 켜고 모이라고 한다.',
    whisper:'사실 다음엔 네가 좋아하는 맛으로 만들어 보고 싶어. 첫 조각 먹어 볼래?',
    witness:'여기 케이크 보여! 초 대신 우리 폰 세 개 켜고 소원 빌까?',
    pair:'다음 생일엔 내가 초를 꽂아 줄게.',team:'플래시 세 개 켜고 기념사진을 찍는다.',
    groupMemory:'휴대폰 세 대로 찍은 생일사진',groupEcho:'내년 생일에도 폰 세 대 들고 찍자는 사람이 벌써 둘이야. 너까지 셋 할래?',secret:'케이크 첫 조각 잘라 준 건 우리 둘만 알고 있자. 생일엔 초도 챙길게.',
    keepsake:'촛불 대신 켜진 불빛',echo:'그날 네가 폰으로 비춰 준 덕에 케이크 안 떨어뜨렸어. 다음엔 첫 조각 네가 골라.'
  }
};
// Private conversations can also be close friendships or family memories.
const friendlyIncidents={
  mic:{whisper:'네 이름을 불러야 다음 소절을 받지! 우리 둘 다 박자 놓친 거 들렸어?',pair:'후렴 들어오는 신호부터 맞춰 보자.',pairReply:'내가 손가락 세 개 펴면 들어와. 이번엔 둘 다 놓치지 말자.',quietReply:'좋아. 우리 둘이 연습한 다음에 들려주자.',echo:'손가락 세 개 펴는 거 기억하지? 오늘 혼자 노래하다가 나도 모르게 손 들었어.',secret:'우리 음이탈 난 부분 다시 들어 봤어. 딱 같은 데서 틀렸더라.'},
  bag:{whisper:'카드에 쿠키 점수 적어 줘. 다른 사람들은 다 맛있다고만 해. 너는 솔직하게 말해 주잖아.',pair:'하나 더 먹고 시식평을 적는다.',pairReply:'가장자리가 제일 맛있다고? 다음 판은 작게 여러 개 구워 볼게.',quietReply:'좋아. 점수는 나중에 알려 줘. 다른 사람들한테는 비밀이야.',echo:'작게 구운 쿠키가 제일 먼저 동났어. 네 시식평 덕분이야!',secret:'그날 카드에 점수 적을 칸 작았지? 다음엔 크게 그릴게.'},
  train:{whisper:'우리 집 방향만 보고 탔는데 그것마저 틀렸네. 네 폰에 버스 몇 번 뜨는지 봐 줄래?',pair:'지도 펴고 돌아갈 길을 찾는다.',pairReply:'심야 버스 아직 있네! 내가 정류장 찾을게. 넌 막차 시간 봐 줘.',quietReply:'응, 단톡에는 무사히 도착했다고만 하자.',echo:'오늘은 제대로 탔어. 네가 알려 준 심야 버스도 즐겨찾기 해 놨어.',secret:'그날 반대편 타고도 집에 간 거, 우리 길 찾는 실력 좀 늘었지?'},
  blackout:{whisper:'불빛을 조금만 왼쪽으로! 케이크 미끄러지는 거 봤어? 딱 우리 둘만 본 거지?',pair:'접시를 같이 잡고 테이블에 놓는다.',pairReply:'살았다! 우리 오늘 케이크 구조대야. 딸기도 하나 안 떨어졌어.',quietReply:'좋아. 누가 물으면 원래 기울어진 케이크였다고 하자.',echo:'다음 생일에도 케이크 구조대 부탁한대. 이번엔 처음부터 접시 들고 있자.',secret:'사진 확대해 봤는데 아무도 케이크 기운 거 모르겠더라!'}
};
function friendlyIncident(id){
  const c=game.contacts[id];
  return c?.friendsOnly || closeKin(game.player,id) || (!partner(c || {}) && outsideRelationship(id)) ||
    allChildren().some(child=>child.id===id && childAge(child)<18);
}
function incidentScene(e){
  const s=incidents[e.code];
  if(!e.route)return {title:s.title,setup:s.setup,message:s.opening,choices:[
    {label:s.private},{label:s.crowd}]};
  if(e.route==='pair' && friendlyIncident(e.id)){
    const friend=friendlyIncidents[e.code];
    return {title:s.title,speaker:e.id,message:friend.whisper,choices:[
      snapChoice(friend.pair,friend.pairReply,'friend'),
      snapChoice('오늘 얘긴 우리끼리 간직하자.',friend.quietReply,'memory')]};
  }
  if(e.route==='pair')return {title:s.title,speaker:e.id,message:s.whisper,choices:[
    snapChoice(s.pair,s.pairReply,'dinnerPromise'),
    snapChoice('오늘 얘긴 우리끼리 간직하자.',s.quietReply,'memory')]};
  return {title:s.title,speaker:e.other,message:s.witness,choices:[
    snapChoice(s.team,s.teamReply,'friend'),
    {label:'셋이 기념사진을 찍는다.',line:s.photoReply,effect:'memory'}]};
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
    else if(friendlyIncident(e.id)){
      c.trust=(c.trust || 0)+1;
      if(c.role==='지인')c.role='친구';
    }else {c.affection++;setPromise(c,'dinnerDate');}
  }
  const participants=group?[e.other]:[];
  const souvenir=group?(index===0?s.groupMemory:s.title+' · 단체 사진'):s.keepsake;
  const memory=group && index===1?action.line:kinPerson(group?e.other:e.id).name+'의 대답 “'+action.line+'”';
  (game.keepsakes ||= []).push({id:e.id,title:souvenir,year:game.year,memory,others:participants});
  remember(e.id,s.title,memory,'incident',participants);
  game.log.at(-1).label=action.label;
  const afterword=!group && friendlyIncident(e.id)?friendlyIncidents[e.code]:s;
  addEcho(e.id,'incident',group?(index===0?s.groupEcho:s.photoEcho):index===0?afterword.echo:afterword.secret,souvenir,participants);
  game.echoes.at(-1).romantic=!group && !friendlyIncident(e.id);
  c.last=memory;e.result={label:action.label,line:action.line,spoken:!!action.spoken,speaker:group?e.other:e.id};
  navigate(e);
}
function seasonalEncounter(){
  if(game.ended || game.arrivalTick===tick())return;
  game.arrivalTick=tick();
  const queue=game.queue.filter(e=>!e.read);
  let event=queue.find(e=>e.protected || e.type==='departure');
  if(!event && (upcoming().length || Object.values(game.contacts).some(c=>c.promise && c.deadline<=tick())))return;
  event ||= queue.find(e=>e.type==='photoPromise') || queue.find(e=>e.type==='outreach') || queue.find(e=>e.type==='secret');
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
