// The spring photo keeps its actual cast throughout the run.
function firstSnapshot(){
  const cast=(names,exclude)=>pick(originalMembers.filter(id=>id!==game.player && id!==exclude && names.includes(members[id].name)));
  const joker=cast(['박들춘','유유','민민']);
  const sender=cast(['히히','우주','씽씽'],joker);
  meet(joker);meet(sender);
  game.snapshot={joker,sender};
  return {type:'snapshot',id:joker};
}
const snapChoice=(label,line,effect='memory')=>({label,line,effect,spoken:true});
function snapshotScene(e){
  const s=game.snapshot, name=members[s.joker].name;
  if(e.type==='snapshot')return {title:'첫 번개 대표 사진',message:'우리 셋이 찍은 사진이야. 어느 쪽을 단톡방 배경으로 할까?',choices:[
    snapChoice('셋 다 나온 사진','나만 뛰어오다 흔들렸네. 다음엔 타이머 좀 길게 맞춰 줘!'),
    snapChoice(name+' 얼굴이 크게 나온 사진','내 얼굴이 단톡방을 꽉 채웠네. 기념으로 저장해야겠다!')]};
  if(e.type==='photoNote'){
    if(e.step===1)return {title:'둘만 나온 사진',message:'사실 집에 오자마자 잘라 놨어. 네가 보내 달라고 할 줄은 몰랐는데.',choices:[
      snapChoice('그럼 우리 같은 사진 저장한 거네.','그러네. 내 사진첩 열 때마다 네 생각 나겠다.','closer'),
      snapChoice('왜 나랑 나온 부분만 골랐어?','네 옆에 선 내 표정이 좋더라. 평소엔 사진 찍을 때 그렇게 안 웃거든.','closer')]};
    return {title:'따로 보낸 단체 사진',message:'셋이 나온 원본도 보낼게. 우리 둘, 붙어서 찍힌 거 봤어?',choices:[
      snapChoice('우리 둘만 잘라서 보내줄래?',''),
      snapChoice('다음엔 셋이 제대로 찍자.','좋아. 다음 번개엔 내가 삼각대 챙겨 갈게.','friend'),
      snapChoice('봤어. 원본 보내줘서 고마워.','응. 오늘 만나서 반가웠어. 잘 들어가!')]};
  }
  if(e.type==='photoReunion'){
    if(s.reply===0)return {title:'이번에는 둘이서',message:'지난번엔 단체 사진을 잘랐잖아. 오늘은 처음부터 둘이 찍을까?',choices:[
      snapChoice('응. 이번엔 내가 네 옆에 설게.','찍혔다. 근데… 조금만 더 이렇게 있어도 돼?','closer'),
      snapChoice('사진은 조금 이따 찍고, 같이 걸을래?','좋아. 걷다가 배고프면 둘이 저녁도 먹자.','dinnerPromise')]};
    return {title:'셋이 다시 모인 날',message:'삼각대 가져왔어. 타이머는 몇 초면 셋 다 들어올까?',choices:[
      snapChoice('삼 초! 셋이 손잡고 뛰자.','이번엔 셋 다 흔들렸네. 이거 단톡에 올려도 돼?','friend'),
      snapChoice('옆 테이블에 찍어 달라고 하자.','드디어 셋 다 멀쩡해! 이상하게 첫 사진이 더 웃기긴 하다.')]};
  }
  if(e.type==='photoWinter' && game.year>1){
    const years=game.year-1;
    return {title:years+'년 전 첫 번개',message:'첫 번개 사진 찾았어. 찍은 지 벌써 '+years+'년이나 됐대.',choices:[
      snapChoice('그 자리에서 다시 찍자.','너는 여기, 나는 옆에. 신기하다. 우리 어디 섰는지 아직도 기억나.','friend'),
      snapChoice('그날 제일 기억나는 게 뭐야?','우리 셋이 카메라 앞에서 허둥대던 거. 그땐 너랑 이렇게 오래 연락할 줄 몰랐지.')]};
  }
  return {title:'첫 번개 사진을 다시 보며',message:s.frame===1?'첫 번개 때 내 얼굴 크게 나온 사진 골랐잖아. 그 사진 아직 갖고 있어.':'첫 번개 사진 좀 봐. 뛰어오는 내 얼굴만 흐릿해!',choices:[
    snapChoice('같은 자리에서 한 장 더 찍자.','이번엔 네 옆에 미리 서 있을래. 자, 이제 찍어!','friend'),
    snapChoice('봄에 찍은 사진, 그대로 간직하자.','응. 폰 바꿔도 이 사진은 꼭 옮겨야지.')]};
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
  }else if(e.type==='photoNote'){
    if(!e.step && index===0){
      e.step=1;navigate();return true;
    }
    s.reply=e.step===1?0:index;
  }else if(e.type==='photoReunion' && s.reply===1)bond(s.sender,s.joker);
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
  return print;
}
const approaches={
  shoot:['골목에 사진 찍기 좋은 벽을 찾았어. 너랑 가 보고 싶은데.','둘이서 찍으면 누가 찍어 줘?','사진 좋아하는 친구들도 부르자.','삼각대 챙길게. 나도 사진 속에 너랑 같이 있고 싶어.'],
  game:['오늘 듀오 한 자리 비워 뒀어. 나랑 한 판 할래?','내가 들어가도 돼?','오늘은 다 같이 한 판 하자.','네가 들어오길 기다렸어. 게임 끝나고도 조금 더 얘기하고 싶어서.'],
  dinner:['둘이 가야 시킬 수 있는 메뉴를 찾았어. 같이 먹어 볼래?','내 생각이 났어?','여럿이 가서 다른 메뉴도 나눠 먹자.','응. 저장해 둔 식당이 몇 군데 있는데, 거긴 꼭 너랑 가고 싶어.'],
  trip:['산책하다 조용한 골목을 찾았어. 주말에 같이 걸어 볼래?','둘이서 가는 거야?','친구들도 데려가자.','응. 여럿이 만나면 네 옆에서 얘기할 틈이 잘 안 나더라.']
};
function approachScene(e){
  const [opening,flirt,group,reply]=approaches[favorite(e.id)] || approaches.trip;
  if(e.step)return {title:'둘만 남은 대화',message:reply,choices:[
    snapChoice('나도 둘이 보고 싶어. 저녁 같이 먹자.','좋아. 그날은 내가 먼저 가서 기다릴게.','dinnerPromise'),
    snapChoice('나도 더 알아가고 싶어. 천천히 만나자.','응. 오늘은 너랑 이렇게 얘기한 것만으로도 좋아.','closer')]};
  return {title:'먼저 온 개인톡',message:opening,choices:[
    snapChoice(flirt,''),snapChoice(group,'좋아. 같이 갈 사람 있는지 내가 물어볼게.','friend'),
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
  낙낙:'다음 번개에선 네 옆에 앉아도 돼? 사실 그전에 둘이 먼저 만나고 싶어.',
  제비:'둘이 길을 잃어도 재밌을 것 같아. 이번 주말에 나랑 데이트할래?',
  로이:'너한테 들려주고 싶은 노래가 있어. 노래 틀기 전에 먼저 말할게. 좋아해.',
  도리:'너랑 걸어 보고 싶은 길이 있어. 손잡아도 되는 사이로 가고 싶어.',
  냥냥:'내 옆자리는 웬만하면 안 내줘. 근데 네가 앉으면 좋겠어.',
  은하:'별 보러 갈래? 내가 하늘보다 네 쪽을 더 봐도 웃지 마.',
  커피:'네가 올 때마다 꺼내 줄 잔 하나 골랐어. 첫 잔은 데이트하면서 마실래?',
  닭발:'안 매운 닭발도 만들어 봤어. 너랑은 천천히 오래 먹고 싶거든. 데이트할래?',
  밥만:'밥 먹자고 핑계 대려다 그냥 말할래. 나 너랑 데이트하고 싶어.',
  햇님:'주말 예보를 두 군데나 봤어. 맑은 날 너랑 데이트하고 싶어서.',
  맹고:'망고를 반으로 가르면 제일 단 쪽은 너한테 주고 싶어. 나 너 좋아해.',
  돈돈:'우리 첫 데이트 영수증을 간직하고 싶어. 오늘 저녁부터 시작할까?',
  봄봄:'꽃집 앞을 지나는데 네가 좋아할 색이 궁금했어. 나랑 같이 고르러 갈래?',
  이슬:'창가에 앉으면 옆에 네가 있었으면 해. 이번엔 둘이 만날까?',
  해나:'왼쪽이 사진 잘 나오는 쪽인데, 네 옆이면 어느 쪽이든 좋아. 나 티 났어?',
  호두:'둘이 앉을 벤치를 만들고 있어. 내 옆자리에 네가 앉아 주면 좋겠어.',
  감자:'감자를 반으로 가르면 큰 쪽은 꼭 네가 먹었으면 해. 나 너 좋아하나 봐.',
  저당:'이번엔 네가 좋아하는 걸 직접 골라 줘. 데이트 신청하는 사람이 살게.',
  우춘:'오늘은 운세 안 봤어. 너한테 좋아한다고 말할 날은 내가 정하고 싶어서.',
  부처:'휴대폰을 내려놔도 네 답장은 기다려지더라. 너한테 마음이 가나 봐.',
  이얍:'평소 같으면 농담했을 텐데, 오늘은 그냥 말할래. 너 좋아해.',
  테란:'달에서 딱 한 통만 보낼 수 있다면 너한테 보낼 거야. 나 너 좋아해.',
  크림:'네 알림이 두 번 뜨는 줄 알았는데 내가 두 번씩 보더라. 이번 주말에 만날래?',
  뒹굴:'영화 하나 골라 줄래? 다 보고 나서도 너랑 둘이 있고 싶어.',
  묵은지:'고기 한 점에 김치 한 장 얹어서 네 접시에 놓아 주고 싶어. 우리 둘이 먹으러 갈까?',
  유미:'네가 웃으면 나도 따라 웃게 돼. 우리 둘이 좀 더 자주 만나 볼래?',
  뽀삐:'여럿이 모이면 네 얼굴부터 찾게 돼. 오늘은 내가 먼저 데이트 신청할래.',
  미노:'카메라 들면 너부터 찾게 돼. 오늘은 카메라 내려놓고 말할게. 좋아해.',
  피치:'복숭아 사러 갈래? 딱딱한 것도 말랑한 것도 하나씩 골라서 둘이 먹고 싶어.',
  보아:'처음 가는 골목은 너랑 같이 걷고 싶어. 이번 주에 데이트할래?',
  김머:'다음 단체 사진에선 네 옆에 서도 돼? 사진 찍고 나서도 같이 있고 싶어.',
  동구:'네가 내 이름 부르면 유난히 기분이 좋아. 오늘은 내가 먼저 만나자고 해도 돼?',
  가을:'낙엽 소리 좋은 길을 알아. 이번엔 너랑 손잡고 걷고 싶어.',
  제로:'준비물은 하나도 없어. 네가 오면 돼. 주말에 나랑 데이트할래?',
  유유:'퇴근 후 일정 하나 잡을까? 이번 건 회의 아니고 데이트야.',
  버터:'내일 토스트 두 장 구워도 돼? 아침부터 네 얼굴 보고 싶어.',
  게장:'나는 마지막 게딱지 절대 안 주는데 너한텐 주고 싶어. 우리 둘이 밥 먹을까?',
  연두:'화분에 새잎이 났어. 좋은 걸 보면 네가 먼저 떠올라. 내가 너 좋아하나 봐.',
  주주:'오늘 제일 하고 싶던 얘기야. 나 너 좋아해. 우리 한번 만나 볼래?',
  이오:'하나, 둘, 셋 하면 말하려고 했는데 못 기다리겠다. 나 너 좋아해.',
  히히:'둘이 사진 찍으러 갈래? 이번 사진은 피드에 안 올리고 우리만 갖고 싶어.',
  박들춘:'오늘 듀오는 좀 늦어도 돼. 네가 올 때까지 기다리고 싶거든.',
  구월:'다음 달까지 미루려다 못 참겠더라. 우리 한번 만나 볼래?',
  파랑:'바다 보러 갈래? 이번엔 파도 타는 것보다 모래사장에서 너랑 걷고 싶어.',
  죠륵디:'우산 같이 쓸 핑계 찾다가 생각났어. 맑은 날에도 너랑 걷고 싶어.',
  여름:'해가 제일 긴 날을 골라도 너랑 놀면 아쉬울 것 같아. 이번 주말 어때?',
  늉니:'내 이름을 네가 불러 줄 때가 제일 좋아. 나한테 너 좀 특별해.',
  거미:'단톡에 썼다 지웠어. 이 말은 너만 읽었으면 해서. 나 너 좋아해.',
  초록:'숲길 하나 같이 걸을래? 나란히 걷다가 네 손도 잡아 보고 싶어.',
  바위:'네 가방은 한 손으로도 들 수 있어. 다른 손은 너랑 잡아도 돼?',
  클로:'동전 숨기는 건 잘하는데 좋아하는 마음은 못 숨기겠다. 우리 데이트할래?',
  우주:'오늘은 인터뷰 수첩 안 가져갈게. 내 얘기를 먼저 하고 싶어. 나 너 좋아해.',
  도도:'네가 먼저 말 걸어 주길 기다렸는데 오늘은 내가 할래. 너 좋아해.',
  지나:'해 질 때 네 사진 한 장 찍어도 돼? 그 시간에 제일 보고 싶은 얼굴이 네 얼굴이야.',
  자작:'직접 만든 열쇠고리 한 쌍이야. 내가 하나 갖고, 나머지는 네가 달아 줄래?',
  춘식:'꽃 한 송이를 네 몫으로 남겨 뒀어. 둘이 만나서 직접 주고 싶어.',
  민민:'네 앞에서만 맥박이 빨라져. 오늘은 실험 핑계 안 댈게. 나 너 좋아해.',
  씽씽:'바람 센 날에도 너랑은 나가고 싶어. 주말에 둘이 강변 걸을까?',
  최강:'하이파이브 말고, 오늘은 네 손 그냥 잡아도 돼?'
};
