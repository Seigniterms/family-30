// The spring photo keeps its actual cast throughout the run.
function firstSnapshot(){
  const choose=(preferred,exclude)=>preferred.find(id=>id!==game.player && !exclude.includes(id) && !isCut(id));
  const joker=choose(['24','6','31'],[]);
  const sender=choose(['6','31','24'],[joker]);
  meet(joker);meet(sender);
  game.snapshot={joker,sender};
  return {type:'snapshot',id:joker};
}
const snapChoice=(label,line,effect='memory')=>({label,line,effect,spoken:true});
function snapshotScene(e){
  const s=game.snapshot, name=members[s.joker].name;
  if(e.type==='snapshot')return {title:'첫 번개 대표 사진',message:'타이머가 두 번 터졌다. 단톡방 배경, 어느 쪽으로 할까?',choices:[
    snapChoice('다 같이 나온 컷','잠깐. 내 얼굴만 확대해 봐. 나 지금 뛰어가는 중이잖아!'),
    snapChoice(name+'만 잘 나온 컷','잠금 화면도 바꿨다. 단톡방 배경은 내가 지킨다!')]};
  if(e.type==='photoNote')return {title:'단톡에는 없는 한 컷',message:s.frame===1?'네가 그걸 고를 줄 알았어. 웃느라 고개 숙인 거, 여기 다 찍혔다.':'다 같이 나온 거 골라 줘서 좋더라. 근데 내가 제일 좋아하는 건 이거야.',choices:[
    snapChoice('우리 둘만 잘라서 보내줘.','벌써 잘라 놨는데. …보낸 시간 보지 마.','closer'),
    snapChoice('다음엔 셋이 타이머 잡자.','좋아. 이번엔 뛰는 사람 없이 셋 다 나오자.','friend'),
    snapChoice('사진 고마워. 잘 간직할게.','응. 오늘 와 줘서 좋았어.')]};
  if(e.type==='photoReunion'){
    if(s.reply===0)return {title:'너한테만 보낸 원본',message:'저번에 둘만 잘라 달라며. 오늘은 그냥 우리 둘이 찍으면 되잖아.',choices:[
      snapChoice('이번엔 내가 네 옆으로 갈게.','어깨가 닿았다. 타이머는 진작 끝났는데 아무도 안 움직였다.','closer'),
      snapChoice('카메라 내려놓고 조금 걸을래?','사진은 한 장도 없는데 이상하게 잘 기억날 저녁이었다.','dinnerPromise')]};
    return {title:'타이머 원정대',message:'지난번 뛰어든 자리 기억나? 오늘은 셋 다 프레임 안에 넣어 보자.',choices:[
      snapChoice('셋이 손잡고 같이 뛴다.','이번엔 셋 다 흔들렸다. 만장일치로 새 배경에 당첨됐다.','friend'),
      snapChoice('옆 테이블에 촬영을 부탁한다.','처음으로 셋 다 멀쩡하게 나왔다. 아무도 배경은 안 바꿨다.')]};
  }
  if(e.type==='photoWinter' && game.year>1){
    const years=game.year-1;
    return {title:years+'년 전 오늘',message:'사진첩이 띄워 줬어. '+years+'년 전 오늘이래. 저때 누가 우리 이렇게 오래 볼 줄 알았을까?',choices:[
      snapChoice('그 자리에서 지금 사진도 찍자.','같은 자리에 섰는데 이번에는 아무도 어디 서야 할지 묻지 않았다.','friend'),
      snapChoice('그때 말 안 한 거 하나씩 털어놓자.','“나 사실 사진 올리고 네가 웃어 줄 때까지 계속 폰 봤어.” 그날의 답을 이제야 들었다.')]};
  }
  return {title:'그때 그 배경 사진',message:s.frame===1?'아직도 내 잠금 화면 그거야. 새로 찍어도 첫날 표정은 안 나오더라.':'이때 우리 이렇게 어색했어? 나 혼자 뛰어가는데 아무도 안 잡아 줬잖아.',choices:[
    snapChoice('똑같은 자리에 서 볼까?','처음 사진 옆에 오늘 사진을 붙였다. 이번엔 서로 팔짱을 끼고 있었다.','friend'),
    snapChoice('그때 사진 그대로 두자.','한참 들여다보다 같은 부분에서 웃음이 터졌다.')]};
}
const snapshotEvents=['snapshot','photoNote','photoReunion','photoWinter'];
function queueSnapshot(type,id,other){
  game.queue ||= [];
  game.queue.unshift({type,id,other,key:type+'-'+tick(),until:tick()});
}
function snapshotAnswer(e,index){
  const s=game.snapshot;
  if(e.type==='snapshot'){
    s.frame=index;
    queueSnapshot('photoNote',s.sender,s.joker);
  }else if(e.type==='photoNote')s.reply=index;
  else if(e.type==='photoReunion' && s.reply===1)bond(s.sender,s.joker);
}
function seasonSnapshot(){
  const s=game.snapshot;
  if(game.finale || !s || s.frame==null || [s.joker,s.sender].some(isCut))return;
  if(tick()===1 && [0,1].includes(s.reply) && !quietContact(s.sender))
    queueSnapshot('photoReunion',s.sender,s.joker);
  if((game.season===3 && [1,5,15,30].includes(game.year)) && !quietContact(s.joker))
    queueSnapshot('photoWinter',s.joker,s.sender);
}
function photoPrint(parent,frame,privateShot=false){
  const s=game.snapshot;
  if(!s || [s.sender,s.joker].some(isCut))return;
  const print=node('div','',parent,'snap-print snap-'+(privateShot?'private':frame));
  print.setAttribute('role','img');
  const cast=privateShot?[game.player,s.sender]:[game.player,s.sender,s.joker];
  print.setAttribute('aria-label',cast.map(id=>members[id].name).join(', ')+(privateShot?'의 비공개 사진':frame?' · 카메라 바로 앞 클로즈업':' · 뛰어들다 흔들린 단체 컷'));
  for(const id of cast){
    const img=node('img','',print);img.alt='';img.src=members[id].image;
  }
}
const approaches={
  shoot:['다들 카메라 보는데 너만 다른 데 보더라. 그 컷 보내도 돼?','그 사진 나한테만 보내줘.','사진 모아서 다 같이 보자.','딱 한 장 골라 둔 게 있어. 너한테 먼저 보여 주고 싶었어.'],
  game:['오늘 듀오 한 자리 비워 놨어. 누구 기다리는지는 알지?','내 자리 아직 있지?','다 같이 한 판 어때?','접속하자마자 네 이름부터 찾았어. 다음에도 내 옆자리 해 줄래?'],
  dinner:['둘이 먹어야 시킬 수 있는 메뉴래. 이상하게 네 생각이 났어.','그럼 맞은편은 내 자리네.','다 같이 가서 더 시키자.','사실 혼자서도 주문된대. 너랑 먹고 싶어서 그랬어.'],
  trip:['다들 큰길로 갔는데 너도 샛길 보던데. 이번엔 같이 걸어 볼래?','우리 둘만 아는 길로 가자.','친구들도 데려가자.','길 끝까지 갔다가 돌아왔어. 너랑 처음부터 같이 걷고 싶어서.']
};
function approachScene(e){
  const [opening,flirt,group,reply]=approaches[favorite(e.id)] || approaches.trip;
  if(e.step)return {title:'둘만 남은 대화',message:reply,choices:[
    snapChoice('나도 너랑 둘이 보고 싶어.','좋아. 그날은 내가 먼저 가서 기다릴게.','dinnerPromise'),
    snapChoice('천천히 알아가 볼래.','응. 오늘 한 얘긴 우리 둘만 알고 있자.','closer')]};
  const source=e.shared==='outing'?'지난번 번개 끝나고 연락처 물어볼걸. ':e.shared==='photo'?'사진 보고 또 웃었어. ':'단톡에 쓰려다가 여기로 왔어. ';
  return {title:'나한테 먼저 온 개인톡',message:source+opening,choices:[
    snapChoice(flirt,reply),snapChoice(group,'좋아. 내가 다른 멤버한테도 물어볼게.','friend'),
    snapChoice('마음은 고마워. 친구로 지내고 싶어.','알겠어. 다음 번개 때 편하게 보자.')]};
}
function inviteAdmirer(used,push){
  if(tick()<1 || game.finale || tick()<(game.nextApproach ?? 1))return;
  const pool=Object.keys(game.contacts).filter(id=>{
    const c=game.contacts[id];
    return !used.has(id) && !isCut(id) && !c.promise && !c.warning && !c.friendsOnly && !c.approached && !partner(c) && !allChildren().some(k=>k.id===id) && eligible(c,'date');
  });
  if(!pool.length)return;
  const others=pool.filter(id=>id!==game.snapshot?.sender);
  const candidates=others.length?others:pool;
  const atOuting=id=>game.club.guests[id]>0;
  const inPhoto=id=>game.snapshot && [game.snapshot.joker,game.snapshot.sender].includes(id);
  const familiar=candidates.filter(id=>atOuting(id) || inPhoto(id));
  const id=pick([...candidates,...familiar]);
  const shared=atOuting(id)?'outing':inPhoto(id)?'photo':'chat';
  if(push({type:'approach',id,shared},1)){
    game.contacts[id].approached=true;
    game.nextApproach=tick()+pick([2,3,4]);
  }
}

// A confession draws on the speaker's own interests even in a quiet, passive run.
const confessionLines={
  낙낙:'옆자리 맡아 둔 거, 사실 매번 너 기다린 거야.',
  제비:'이번 길은 같이 정하고 싶어. 돌아갈 때도 네 손 잡고.',
  로이:'후렴 끝나면 말하려고 했는데 노래가 너무 짧더라. 나 너 좋아해.',
  도리:'약속 장소를 한 바퀴 더 돈 건 너랑 조금 더 걷고 싶어서였어.',
  냥냥:'내 옆에 아무나 앉는 거 싫어. 근데 네가 안 오면 그것도 싫더라.',
  은하:'별 보러 가자고 했는데 하늘보다 네 쪽을 더 봤어.',
  커피:'네 단골잔, 손잡이 편한 걸로 따로 골랐어. 내일도 내려 줘도 돼?',
  닭발:'안 매운 거 연습했어. 나랑 자주 먹으려면 네 입맛도 맞아야지.',
  밥만:'밥을 다 먹으면 할 말이 없을 줄 알았어. 너랑은 이제 시작이더라.',
  햇님:'주말 예보를 두 군데나 봤어. 맑은 날 너랑 데이트하고 싶어서.',
  맹고:'달달한 쪽 떼 주다가 알았어. 내가 너 되게 좋아하더라.',
  돈돈:'첫 데이트 영수증도 모으고 싶어. 오늘 걸 첫 장으로 할까?',
  봄봄:'꽃 이름보다 네가 무슨 색 좋아하는지가 먼저 떠올라.',
  이슬:'자리 맡아 놨다는 말로는 부족하더라. 네가 오기를 기다린 거야.',
  해나:'내 잘 나오는 쪽 양보한 사람, 네가 처음이야. 눈치 못 챘지?',
  호두:'둘이 앉는 벤치 만든 거 기억나? 처음부터 네 자리였어.',
  감자:'반으로 나누면 자꾸 큰 쪽을 주게 돼. 나 너 좋아하나 봐.',
  저당:'네 주문 외웠어. 이번엔 데이트라고 하고 사 줘도 돼?',
  우춘:'오늘은 운세 안 봤어. 너한테 할 말은 내가 정했거든.',
  부처:'알림을 다 껐는데 네 답은 기다려지더라. 마음을 들켰구나.',
  이얍:'웃겨서 넘기려다 오늘은 그냥 말할래. 나 너 좋아해.',
  테란:'달에서 딱 한 통만 보낼 수 있다면 너한테 보낼 것 같아.',
  크림:'네 알림 두 번 뜨는 게 아니었어. 내가 두 번 열어 본 거야.',
  뒹굴:'영화 끝나도 가지 말라고 하고 싶었어. 다음엔 데이트할래?',
  묵은지:'고기 구울 땐 안 태우는데 네 쪽 보다가 세 점이나 태웠다.',
  유미:'내가 먼저 웃나 봤는데 아니더라. 네가 웃으면 바로 따라 웃어.',
  뽀삐:'사람 많은 데 가면 너부터 찾아. 오늘은 네가 나 찾아주면 좋겠다.',
  미노:'네 사진을 고르려는데 버릴 컷이 없더라. 내 마음 알겠어?',
  피치:'복숭아 고를 때 네 취향부터 생각해. 이제 둘이 장 보러 갈래?',
  보아:'새 길을 발견하면 꼭 네가 같이 있었으면 해. 이번엔 데이트로 가자.',
  김머:'다음 사진에선 뒤에서 손 흔들기 싫어. 네 바로 옆에 서도 돼?',
  동구:'누가 내 이름 부르는 것보다 네가 불러 주는 게 제일 좋아.',
  가을:'같이 걸은 날엔 집에 가는 길이 짧아서 아쉬워. 이번 주도 볼래?',
  제로:'아무것도 안 가져오랬지만 마음은 가져왔어. 네 건 어때?',
  유유:'퇴근하고도 만나고 싶으면 회의 핑계 그만 대야지. 데이트 신청할게.',
  버터:'두 장 굽는 게 습관이 됐어. 내 아침에 계속 같이 있어 줄래?',
  게장:'마지막 게딱지 양보한 거, 우리 집에선 고백인데. 알아들었어?',
  연두:'새잎 나면 너부터 찾는 이유가 있었어. 좋은 걸 매번 같이 보고 싶어.',
  주주:'오늘 제일 좋은 일은 이거야. 이제 네 앞에서 좋아한다고 말하는 거.',
  이오:'이번엔 동시에 말하지 말자. 내가 먼저 말할게. 좋아해.',
  히히:'피드엔 잘 나온 컷만 올리는데, 갤러리엔 너랑 흔들린 컷이 더 많아.',
  박들춘:'듀오는 아무나 구해도 되잖아. 근데 난 네가 올 때까지 기다려.',
  구월:'다음 달까지 미루려다 못 참겠더라. 우리 한번 만나 볼래?',
  파랑:'마지막 파도 타고 바로 나온 건 모래사장에 네가 있어서야.',
  죠륵디:'비 안 와도 같이 걷고 싶어. 맑은 날 데이트 어때?',
  여름:'해가 제일 긴 날에도 너랑 헤어질 땐 벌써 밤이더라.',
  늉니:'이름 부르는 목소리도 사람마다 다르더라. 네가 부르는 게 제일 좋아.',
  거미:'단톡에 썼다 지웠어. 이 말은 너만 읽었으면 해서. 나 너 좋아해.',
  초록:'같은 숲길도 너랑 걸으면 다른 데 같아. 우리 손잡고 걸을까?',
  바위:'가방은 한 손으로 들게. 다른 손은 너랑 잡아도 돼?',
  클로:'오늘은 동전 안 숨겼어. 내 마음도 그만 숨기려고.',
  우주:'이번엔 인터뷰 수첩 덮을게. 대답하기 전에 내 마음부터 말하고 싶어.',
  도도:'네가 먼저 말 걸어 줄 때까지 기다렸는데 오늘은 내가 할래. 좋아해.',
  지나:'빛이 좋아서 찍은 줄 알았는데 네가 있어서 찍은 거더라.',
  자작:'세상에 하나뿐인 걸 둘이 나눠 갖고 싶어서 한 쌍으로 만들었어.',
  춘식:'네 몫 한 송이 남겨 두는 게 좋아. 앞으로도 그래도 돼?',
  민민:'결과 나왔어. 네 앞에서만 맥박이 빨라져. 오늘은 실험 핑계 안 댈게.',
  씽씽:'바람 막으라고 지퍼 올려 줬잖아. 그날부터 자꾸 네 생각이 났어.',
  최강:'하이파이브하고 바로 손 놓는 거, 요즘은 좀 아쉽더라.'
};
