const members = Object.fromEntries(Array.from(portraits, card => [card.dataset.id, {
  name: card.dataset.name, sex: card.dataset.sex, image: card.querySelector('img').src
}]));
const originalMembers=Object.keys(members);
const saveKey = 'family30.run.v2';
let game = null;
try {
  const saved = JSON.parse(localStorage.getItem(saveKey) ?? localStorage.getItem('family30.run.v1'));
  for(const [id,child] of Object.entries(saved?.newMembers || {}))if(id.startsWith('born-') && members[child.face])members[id]={...members[child.face],name:child.name};
  if ([1,2].includes(saved?.version) && members[saved.player] && Array.isArray(saved.log) && saved.contacts && Array.isArray(saved.marriages) && Array.isArray(saved.children) && Number.isInteger(saved.year) && Object.keys(saved.contacts).every(id=>members[id] && saved.contacts[id]) && (!saved.event || members[saved.event.id])) game = {...saved,version:2};
} catch {}
const el = id => document.getElementById(id);
function pick(list) {
  game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0;
  return list[Math.floor(game.seed / 4294967296 * list.length)];
}
function unused() {
  const reserved=[...(game.obligations || []),...(game.queue || []), game.event].filter(e=>e?.type==='arrival').map(e=>e.kid);
  return originalMembers.filter(id => id !== game.player && !isCut(id) && !reserved.includes(id) && !game.contacts[id] && !allChildren().some(c => c.id === id));
}
const outgoingNames=new Set('히히 씽씽 민민 우주 닭발 유유 늉니 도도 거미 낙낙 돈돈 로이 맹고 보아 뽀삐 여름 이얍 제비 최강 핵나 해나'.split(' '));
const deliberateNames=new Set('부처 크림 가을 감자 구월 미노 바위 버터 은하 이오 자작 저당 제로 지나 커피 호두 박들춘 연두'.split(' '));
function temperament(id){ const name=members[id].name; return outgoingNames.has(name)?0:deliberateNames.has(name)?2:1; }
function meet(id) {
  return game.contacts[id] ||= {role:'지인', affection:0, promise:false, last:''};
}
function persist() {
  try { localStorage.setItem(saveKey, JSON.stringify(game)); el('save-warning').hidden=true; }
  catch { el('save-warning').hidden=false; }
}
function navigate() {
  persist();
  const hash = game.event ? '#first-chat' : '#family-tree';
  if (location.hash === hash) renderGame();
  else location.hash = hash;
}
function startRun(player, sender, story, goal) {
  if(game?.ended){initLife();if(!game.archived){archiveRun();if(!game.archived){alert('이전 가족 앨범을 저장할 공간이 부족해요.');return;}}}
  game = {version:2, seed:crypto.getRandomValues(new Uint32Array(1))[0], player, year:1,
    season:0, queue:[], contacts:{}, children:[], marriages:[], log:[], done:false, extra:false, ended:false};
  initLife();
  if(households.includes(goal))game.club.goal=goal;
  const id = sender && !isCut(sender) ? sender : pick(unused());
  if(!id){game.event={type:'quiet',id:player};navigate();return;}
  meet(id);
  game.event = {type:'intro', id, story:story || pick(stories).id};
  navigate();
}
function spouse() { return game.marriages.find(m => m.end === null)?.id; }
function nextChildId(other){
  const fresh=unused();if(fresh.length)return pick(fresh);
  game.newMembers ||= {};
  const id='born-'+game.runId+'-'+(Object.keys(game.newMembers).length+1);
  const face=pick([game.player,other].filter(Boolean));
  const name=members[face].name[0]+pick(['온','이든','단비','여울','하늘','별']);
  game.newMembers[id]={face,name};members[id]={...members[face],name};
  return id;
}
function endMarriage(id) {
  const marriage = game.marriages.find(m => m.id === id && m.end === null);
  if (marriage) marriage.end = game.year;
}
// A choice carries its own narration and one state transition.
function baseScene(e) {
  const id = e.id, contact = game.contacts[id];
  const choice = (label, line, effect='memory') => ({label,line,effect});
  const stay = choice('지금처럼 지내자.', '우리 속도대로 지내기로 했다.');
  if (e.type === 'intro') {
    const story = stories.find(s => s.id === e.story);
    return {title:story.title, setup:story.scene, message:story.message, choices:story.choices.map(([label,line,memory],i) =>
      ({label,line,memory,effect:i === 0 || (story.id === 'dinner' && i === 2) ? 'promise' : 'closer'}))};
  }
  let title, setup, message, choices;
  switch(e.type) {
    case 'encore':
      title='그날의 가수가 돌아왔다'; setup='예매 알림이 뜨자, 서랍에 넣어 둔 공연표 두 장이 떠올랐다.';
      message='지난번 앙코르 기억하지? 이번에도 같이 갈래?';
      choices=[choice('이번에도 옆자리로!', '같은 가수의 새 공연을 약속했다.', 'bookConcert'),stay]; break;
    case 'seated':
      title='객석에서 다시 만났다';setup='불이 어두워지기 전, 비워 둔 옆자리를 찾았다.';message='여기야! 늦는다고 말해 줘서 자리를 잡아 뒀어.';
      choices=[choice('기다려 줘서 고마워.', '둘이 나란히 앉아 첫 곡부터 함께 들었다.', 'ticketStub'),choice('앙코르는 같이 따라 부르자.', '마지막 소절에서 두 사람의 목소리가 겹쳤다.', 'ticketStub')];break;
    case 'concert':
      title='두 장의 공연표'; setup='공연장 앞에서 나는 좌석 번호가 찍힌 표를 꺼냈다.';
      message='몇 번 출구야? 표 사진 보내 줄래?';
      choices=[choice('채팅창을 열어 사진을 보낸다.', '', 'sendTicket'),choice('전화해서 입구에서 만난다.', '입구에서 만나 앙코르까지 함께 들었다.', 'ticketStub')]; break;
    case 'ticketChat':
      title='잠깐, 여긴 단톡인데'; setup='사진 아래 읽음 숫자가 순식간에 줄었다. '+members[e.other].name+'에게서 답장이 왔다.';
      message=e.collision?'그거 오늘 표야? 우리도 오늘 만나기로 했잖아.':'옆자리까지 두 장이네? 둘이 언제부터 그렇게 친했어?';
      choices=e.collision ? [choice('내가 겹쳐 잡았어. 우리 금요일에 볼까?', '금요일로 다시 약속하고 공연장으로 달려갔다.', 'ticketReschedule'),choice('먼저 한 약속 지킬게. 공연은 다음에 가자.', '먼저 잡은 약속에 나갔다. 다음 공연을 같이 보기로 했다.', 'concertAgain')]
        : [choice('응, 우리 둘이 간다! 끝나면 후기 들려줄게.', '단톡에 앙코르 영상을 올렸다. 그날 표 두 장은 내가 챙겼다.', 'ticketStub'),choice('다음엔 너도 갈래?', '셋이 좋아하는 곡을 주고받았다. 다음 공연 때 다시 연락하기로 했다.', 'inviteWitness')]; break;
    case 'dinnerDate':
      title='먼저 잡아 둔 두 자리'; setup='약속한 식당에 도착하니 불판이 벌써 달아올라 있었다.'; message='마지막 고기 한 점, 가위바위보 할래?';
      choices=[choice('슬쩍 상대 접시에 올려 준다.', '빈 접시에 두 사람이 웃었다.', 'closer'),choice('진 사람이 다음 저녁 사기!', '다음 저녁도 함께 먹기로 했다.', 'dinnerPromise')]; break;
    case 'umbrellaDate':
      title='우산 한쪽'; setup='2번 출구 앞, 내 쪽으로 우산이 기울었다.'; message='어깨 젖잖아. 조금 더 붙을래?';
      choices=[choice('보폭을 맞춰 걷는다.', '집 앞까지 같은 속도로 걸었다.', 'closer'),choice('따뜻한 저녁은 내가 살게.', '젖은 어깨를 털며 다음 저녁을 약속했다.', 'dinnerPromise')]; break;
    case 'friday':
      title='이번엔 달력에 동그라미'; setup='미뤄 둔 약속을 지키러 내가 먼저 도착했다.'; message='오늘은 표 사진 잘못 보낼 일 없지?';
      choices=[choice('오늘은 폰을 주머니에 넣을게.', '기다려 준 사람과 저녁을 보냈다.', 'closer')]; break;
    case 'anniversary':
      title='냉장고에 케이크가 두 개'; setup='우리 기념일, 케이크를 숨기려 문을 열었다. 같은 상자가 먼저 와 있었다.'; message='설마 너도 같은 빵집 갔어?';
      choices=[choice('초를 두 배로 켜자!', '불을 끄고 두 케이크 사이에서 소원을 빌었다.', 'candles'),choice('한 판은 친구들 부르자.', '단톡 멤버들과 케이크를 나눠 먹었다.', 'partyPhoto')]; break;
    case 'sportsLater':
      title='운동회 다음 날'; setup='아이와 같이 운동회 사진을 펼쳐 보기로 한 날이다.'; message='내가 달리는 사진부터 볼래?';
      choices=[choice('옆에 앉아 한 장씩 넘긴다.', '뒤늦게 함께 본 운동회 사진에 아이의 이야기를 적었다.', 'sportsPhoto')]; break;
    case 'sports':
      title='운동회 초대장'; setup=members[e.kid].name+'의 첫 운동회 날, 나는 보호자 달리기 출발선에 섰다.'; message='출발 총성이 울렸다. 아이가 결승선에서 손을 흔든다.';
      choices=[choice('폼 잡고 전력 질주!', '결승선 직전 모자가 날아갔다. 아이가 웃으며 내게 종이 메달을 걸어 줬다.', 'medal'),choice('손을 흔들며 골인한다.', '아이가 직접 찍은 사진 속에서 나는 활짝 웃고 있었다.', 'sportsPhoto')]; break;
    case 'meet': case 'follow':
      title = e.type === 'follow' ? '기억하고 있었구나' : '빈자리 하나';
      setup = e.type === 'follow' ? '지난번 기억이 떠올랐다. '+(e.previous || '')+' 오늘은 내가 먼저 연락했다.' : '모임에 조금 일찍 도착했다. 내 옆에 한 사람이 앉았다.';
      message = '오늘은 우리 둘이 좀 더 얘기할까?';
      choices = [choice('다음엔 둘이서 만날래?', '좋아. 다음 만남은 우리 둘만의 약속이다.', 'promise'), choice('친구로 자주 보자!', '편한 친구가 한 명 더 생겼다.', 'friend'), choice('오늘은 먼저 갈게.', '웃으며 다음을 기약했다.')];
      if (!['연인','배우자'].includes(contact.role) && contact?.affection > 0)
        choices.unshift(choice('나, 너랑 사귀고 싶어.', '나도 같은 마음이야. 오늘부터 우리 첫날이다.', 'date'));
      break;
    case 'couple':
      title='우리의 다음 장'; setup='둘이 걷던 길 끝에서 나는 걸음을 늦췄다.'; message='앞으로 우리는 어떻게 지내고 싶어?';
      choices=[choice('다음 데이트도 약속하자.', '달력에 둘만의 날짜를 적었다.', 'promise'),choice('우리 여기까지 하자.', '서로의 마음을 듣고 연애를 마쳤다.', 'split')];
      if (!spouse() && !townSpouse(id)) choices.unshift(choice('나랑 결혼할래?', '응. 우리 함께 살자. 오늘부터 우리는 가족이다.', 'marry'));
      if (contact.role === '배우자') choices[1]=choice('우리 이혼하자.', '긴 대화 끝에 혼인을 마무리했다.', 'split');
      break;
    case 'affair':
      title='둘만 남은 저녁'; setup='모임이 끝났는데 나는 조금 더 머물렀다.'; message='오늘은 조금 더 가까워져도 될까?';
      choices=[choice('나도 원해.', '서로의 마음을 확인하고 둘만의 밤을 보냈다.', 'affair'),stay]; break;
    case 'schedule': {
      const other=members[e.other].name;
      title='같은 날 잡힌 두 약속'; setup=other+'와 만나기로 한 날, 또 하나의 약속 알림이 떴다.';
      message='그날 시간 그대로 괜찮아?';
      choices=[choice('이 약속을 지키고 다른 약속을 미루자.', other+'에게 먼저 연락해 양해를 구했다.', 'keepFirst'),
        choice(other+'와의 약속을 먼저 지키자.', '겹친 일정을 솔직히 설명하고 다음을 기약했다.', 'keepOther')];
      break;
    }
    case 'clash':
      title='우연히 마주친 눈'; setup='다른 사람과 함께 있던 나를 익숙한 얼굴이 알아봤다.'; message='아까 그 사람과는 어떤 사이야?';
      choices=[choice('솔직히 말하고 얘기를 듣자.', '우리는 오래 이야기했다. 다시 믿으려면 시간이 필요하다.', 'conflict'),choice('우리 관계를 정리하자.', '우리는 각자의 길을 가기로 했다.', 'split')]; break;
    case 'family':
      title='가족에 관한 이야기'; setup='앞으로의 삶에 대해 생각하다가 아이 이야기가 나왔다.';
      message='우리 가족이 더 커진다면 어떨까?'; choices=[stay];
      {
        if (members[id].sex !== members[game.player].sex)
          choices.unshift(choice('우리 아이를 맞이하자.', '함께 새 생명을 맞을 준비를 했다.', 'birth'));
        if (['배우자','연인'].includes(contact.role))
          choices.unshift(choice('함께 입양을 준비하자.', '함께 부모가 되기로 했다.', 'adopt'));
      } break;
    case 'solo':
      title='내가 그리는 가족'; setup='입양 설명회를 다녀온 뒤 내 마음을 들여다봤다.'; message='나는 혼자서도 부모가 되고 싶을까?';
      choices=[choice('단독 입양을 진행한다.', '내가 아이의 보호자가 되었다.', 'solo'),choice('조금 더 생각한다.', '결정을 서두르지 않기로 했다.')]; break;
    default:
      title='나를 위한 하루'; setup='모처럼 약속 없는 주말이다.'; message='오늘 하루는 어떻게 보낼까?';
      choices=[choice('동네를 산책한다.', '처음 보는 골목에서 마음에 드는 가게를 발견했다.'),choice('푹 쉬기로 한다.', '오랜만에 나 자신을 돌봤다.')];
  }
  return {title,setup,message,choices};
}
const seasons=['봄','여름','가을','겨울'];
function tick(){ return (game.year-1)*4+(game.season || 0); }
function clockLabel(){ return game.year+'년 차 '+seasons[game.season || 0]; }
function partner(c){ return ['연인','배우자'].includes(c.role); }
function eligible(c,kind){
  if(!c || (c.quietUntil ?? 0)>tick() || c.callAfter!=null) return false;
  if(c.cooldown || c.needsMeeting){
    const blocked=(c.cooldown || 0)>tick() || c.needsMeeting;
    const marriageOnly=(c.pauseKind || c.response?.kind)==='marry' && partner(c);
    if(blocked && (!marriageOnly || kind==='marry')) return false;
  }
  if(kind==='marry') return c.role==='연인' && !spouse() && !townSpouse(Object.keys(game.contacts).find(id=>game.contacts[id]===c));
  if(kind==='date')return !partner(c) && !townSpouse(Object.keys(game.contacts).find(id=>game.contacts[id]===c));
  return true;
}
const offers={
  outing:['저녁에 나랑 산책할래?','같이 걷고 싶어.','산책 약속을 잡았다.'],
  date:['친구로만 만나기엔 네가 너무 좋아. 나랑 사귈래?','나도 같은 마음이야.','오늘부터 우리 첫날이다.'],
  marry:['앞으로도 네 곁에서 살고 싶어. 나랑 결혼할래?','응, 우리 결혼하자.','우리는 앞으로의 삶을 함께하기로 했다.']
};
function scene(e){
  if(['calendarVisit','childVisit','weddingLetter'].includes(e.type))return personalScene(e);
  if(e.type==='outingDay' || e.type==='echo') return lifeScene(e);
  const c=game.contacts[e.id];
  const opt=(label,line,effect)=>({label,line,effect});
  if(e.type==='farewell')return {title:'각자의 길',setup:'우리 둘이 잠시 자리에 남았다.',message:'하고 싶은 얘기가 있다고?',choices:[opt('우리 관계는 여기까지야.','함께한 시간에 인사하고 각자의 길로 돌아섰다.','split'),opt('조금 더 생각할게.','오늘은 함께 걷던 길을 한 번 더 걸었다.','memory')]};
  if(e.type==='chapter'){
    const chapter=library.find(s=>s.code===e.code);
    return {...chapter,message:e.id===game.player?'나는 어떻게 할까?':members[e.id].name+'의 시선이 내게 머물렀다.',choices:chapter.choices.map(a=>({...a}))};
  }
  if(e.type==='reconnect'){
    return {title:'먼저 떠오른 사람',setup:e.previous || '오랜만에 둘만의 연락이 왔다.',
      message:e.afterProposal?'결혼 얘기는 천천히 하자. 이번엔 그냥 같이 밥 먹을래?':
        e.concert?'우리 그날 앙코르까지 들었잖아. 집에 오는 길에 그 노래가 나오더라. 저녁 같이 할래?':'문득 네 생각이 났어. 이번 주에 얼굴 보고 저녁 먹을래?',
      choices:[opt('좋아. 지난번 그 자리에서 보자.','둘이 다시 만날 저녁 약속을 잡았다.','dinnerPromise'),
        opt('오늘은 통화로 안부를 나누자.','오랜만에 목소리를 들으며 서로의 하루를 얘기했다.','closer'),
        opt('이번엔 혼자 쉴게.','오늘은 각자의 시간을 보내기로 했다.','memory')]};
  }
  if(e.type==='walkInvite'){
    return {title:'벤치 옆 산책길',setup:'걸음을 늦추고 옆에 섰다.',message:'무슨 얘기 하려고?',
      choices:[{label:'오늘은 둘이 걸을래?',line:'좋아, 우리 둘이 걷자.',effect:'closer',offer:'outing',spoken:true},
        {label:'잠깐 안부 묻고 싶었어.',line:'얼굴 보니까 좋다. 다음에 또 보자!',effect:'memory',spoken:true}].filter(a=>!a.offer || eligible(c,a.offer))};
  }
  if(e.type==='arrival'){
    return {title:'우리 집에 처음 온 날',setup:e.previous,message:'작은 손이 내 손가락을 감쌌다.',
      choices:[opt('오늘 날짜와 이름을 적는다.','가족 앨범의 첫 줄을 썼다.','arrival'),opt('첫날의 이야기를 녹음한다.','첫날의 목소리를 간직했다.','arrival')]};
  }
  if(e.type==='familyNews'){
    return {title:'소식을 전하는 날',setup:e.previous,message:'이 순간을 어떻게 남길까?',choices:[opt('가까운 사람들에게 전한다.','우리 소식에 축하 인사가 하나씩 도착했다.','memory'),opt('오늘 날짜를 앨범에 적는다.','서툰 글씨로 가족의 새 페이지를 채웠다.','memory')]};
  }
  if(e.type==='proposal'){
    const [message,label,line]=offers[e.kind];
    return {title:'먼저 도착한 마음',setup:c.last || '내 이름을 부르는 메시지가 왔다.',message:e.returnCall?'기다렸지? 내 일정 정리됐어. 이번엔 같이 걸을래?':(c.voice || '')+message,
      choices:[opt(label,line,e.kind==='outing'?'promise':e.kind),opt('조금 더 만나 보고 싶어.','서두르지 않고 다시 만나기로 했다.','later'),opt('솔직히 말할게. 나는 원하지 않아.','상대는 내 대답을 받아들였다.','no')]};
  }
  if(e.type==='warning' || e.type==='departure'){
    const leave=e.type==='departure';
    return {title:leave?'마지막으로 온 연락':'읽지 못한 마음',setup:c.last,message:leave?'기다리는 일이 너무 많았어. 우리 여기까지 하자.':c.changes?'다시 잡은 날에도 못 봤잖아. 무슨 일 있었어?':'지난번에 기다렸는데 연락도 없더라. 무슨 일 있었어?',
      choices:leave?[opt('네 마음을 존중할게.','상대가 작별을 고했다.','split')]:
        [opt('미안해. 다음 약속은 내가 먼저 잡을게.','다시 만날 날을 함께 정했다.','repair'),opt('오늘은 이 얘기 그만하자.','풀지 못한 이야기가 남았다.','dismiss')]};
  }
  const story=baseScene(e);
  if(e.type==='couple') story.choices.unshift(opt('요즘 어떻게 지내는지 듣는다.','재촉하지 않고 요즘 마음을 들었다.','closer'));
  for(const a of story.choices){
    if(['date','marry'].includes(a.effect)) a.offer=a.effect;
    if(a.effect==='promise' && ['meet','follow','couple'].includes(e.type)) a.offer='outing';
  }
  story.choices=story.choices.filter(a=>!a.offer || eligible(c,a.offer));
  if(e.type==='clash' && e.other) story.message=members[e.other].name+'하고 둘이 있는 걸 봤어. 나한테 얘기해 줄래?';
  if(e.type==='sports') story.choices.push(opt('미리 말하고 저녁에 사진을 같이 보자.', '아이와 사진을 보는 시간을 따로 잡았다.', 'sportsLater'));
  return story;
}
function recordResponse(c,e,kind,outcome){
  c.response={kind,outcome,from:e.type==='proposal'?e.id:game.player,year:game.year,season:game.season};
  if(outcome==='later' || outcome==='no'){
    if(kind==='marry') c.followMarriage=true;
    c.pauseKind=kind;
    c.cooldown=tick()+(outcome==='no'?4:2);
    c.needsMeeting=true;
  }
}
function decide(c,kind){
  const score=c.affection+(c.trust || 0)+(c.kept || 0);
  const threshold=({outing:1,date:3,marry:5})[kind]+c.pace;
  if(score<threshold-1 || c.warning) return 'no';
  if(score>threshold) return 'yes';
  return pick(['yes','later','later']);
}
function changeAppointment(c,seat=false){
  if(!c.promise || c.postponed===tick()) return c.last;
  let nextDate=Math.max(c.deadline,tick()+1);
  while(nextDate<=119 && plansAt(nextDate).some(p=>p.people.length!==1 || game.contacts[p.people[0]]!==c || p.state==='booked'))nextDate++;
  if(nextDate>119)return '이번 겨울이 마지막이야. 원래 약속 시간에 기다릴게.';
  c.postponed=tick();
  c.changes=(c.changes ?? (c.waitAt==='seats'?1:0))+1;
  if(c.changes>=2){
    c.promise=false; delete c.deadline; delete c.waitAt;
    c.callAfter=tick()+2;
    c.last='이번엔 내 일정부터 잡을게. 시간 될 때 내가 먼저 연락할게.';
  } else {
    c.deadline=nextDate;
    if(seat) c.waitAt='seats';
    c.last=seat?'입구 말고 객석에서 봐. 옆자리 비워 둘게!':'그래, '+seasonDate(nextDate)+'에 보자. 달력에 옮겨 둘게.';
  }
  c.note={until:tick()+1,text:c.last};
  return c.last;
}
function missed(c){
  const changed=c.changes || c.waitAt || c.postponed!=null;
  c.last=changed?'시간을 바꾼 건 알았는데, 다시 잡은 약속에도 안 왔네. 오늘은 먼저 갈게.':'기다렸는데 안 와서 나 먼저 갈게.';
  c.promise=false; delete c.deadline; delete c.waitAt;
  c.note={until:tick()+1,text:c.last};
  c.trust=(c.trust || 0)-1;
  if(c.warning==='heard' || (partner(c) && c.unansweredWarning)) c.warning='final';
  else if(!c.warning) c.warning='new';
}
function completeRun(){
  if(game.ended)return;
  game.ended=true;archiveRun();
}
function advance(){
  if(game.ended) return;
  game.season ??= 0;
  for(const invitation of game.queue || []){
    const contact=game.contacts[invitation.id];
    if(contact && invitation.until<=tick() && ['warning','proposal','reconnect'].includes(invitation.type)){
      contact.quietUntil=tick()+4;
      if(invitation.type==='warning'){
        contact.warning=null;contact.unansweredWarning=true;
        contact.trust=(contact.trust || 0)-1;
        contact.last='한참 기다리던 상대가 먼저 자리를 떴다.';
        remember(invitation.id,'엇갈린 시간',contact.last,'distance');
      }
    }
    if(invitation.type==='departure' && invitation.until<=tick()){
      const c=game.contacts[invitation.id];
      if(c.warning==='final' && partner(c)){
        endMarriage(invitation.id); c.role='옛 인연'; c.warning=null; c.promise=false;
        c.quietUntil=tick()+5; c.affection=0; c.affair=false; c.cooldown=tick()+4; c.needsMeeting=true;
        c.last='답을 기다리던 상대가 마지막 인사를 남기고 떠났다.';
        game.log.push({year:game.year,season:game.season,id:invitation.id,title:'마지막 인사',memory:c.last,effect:'split'});
      }
    }
  }
  for(const notice of game.queue || []){
    if(notice.type==='sports' && notice.shown===tick() && notice.until===tick()){
      const kid=game.children.find(child=>child.id===notice.kid);
      if(kid && !kid.sports){
        kid.sports=true;
        const memory=members[kid.id].name+'의 운동회에 가지 못했다. 집에 돌아와 오늘의 달리기 이야기를 들었다.';
        game.log.push({year:game.year,season:game.season,id:kid.id,title:'운동회가 끝난 저녁',memory,effect:'memory'});
      }
    }
  }
  for(const c of Object.values(game.contacts))
    if(c.promise && c.deadline<=tick()) missed(c);
  if(game.year===30 && game.season===3 && (game.obligations?.length || game.queue?.some(e=>e.protected))){
    game.finale=true; delete game.prepared; return;
  }
  expirePlans();
  if(game.season===3){
    if(game.year===30){completeRun();return;}
    game.year++; game.season=0;
  } else game.season++;
  progressTown();
}
function prepareSeason(){
  game.season ??= game.extra ? 2 : game.done ? 1 : 0;
  initLife();
  game.queue ||= [];
  for(const [id,c] of Object.entries(game.contacts)){
    c.pace ??= temperament(id);
    c.voice ??= ['잠깐, 나 할 말 있어! ','있잖아. ','천천히 들어 줘. '][c.pace];
    if(c.promise && c.deadline==null) c.deadline=tick()+1;
  }
  if(game.prepared===tick()) return;
  game.queue=game.queue.filter(e=>(e.protected || e.until>=tick()) && (e.type!=='proposal' || eligible(game.contacts[e.id],e.kind)));
  if(game.finale) game.queue=game.queue.filter(e=>e.protected);
  const used=new Set(game.queue.map(e=>e.id));
  function push(e,life){
    if(used.has(e.id) || (!e.protected && quietContact(e.id))) return false;
    game.queue.push({...e,key:tick()+'-'+e.id,until:tick()+life}); used.add(e.id); return true;
  }
  const entries=Object.entries(game.contacts);
  for(const [id,c] of entries){
    if(c.warning==='new' || (c.warning==='final' && partner(c))) push({type:c.warning==='new'?'warning':'departure',id},0);
  }
  for(const [id,c] of entries){
    if(c.callAfter!=null && c.callAfter<=tick() && !c.promise && !c.warning && (c.cooldown || 0)<=tick() && !c.needsMeeting){
      if(push({type:'proposal',id,kind:'outing',returnCall:true},1)) delete c.callAfter;
    }
  }
  game.obligations ||= [];
  if(game.familyDate){game.obligations.push(game.familyDate); delete game.familyDate;}
  game.obligations=game.obligations.filter(e=>!push({...e,protected:true},1));
  if(game.finale && game.queue.some(e=>e.protected)){game.prepared=tick();persist();return;}
  const waiting=entries.filter(([id,c])=>partner(c) && !used.has(id) && !c.promise && !c.warning && eligible(c,'outing')).map(([id,c])=>{
    const last=game.log.findLast(entry=>entry.id===id);
    const lastTick=last?(last.year-1)*4+(last.season || 0):0;
    return {id,c,gap:tick()-Math.max(lastTick,c.lastReach ?? -1)};
  }).sort((a,b)=>b.gap-a.gap);
  const reunion=waiting.find(({c,gap})=>gap>=(c.followMarriage?1:3));
  if(reunion){
    const {id,c}=reunion;
    const afterProposal=c.followMarriage ?? (c.response?.kind==='marry' && ['later','no'].includes(c.response.outcome));
    if(push({type:'reconnect',id,previous:c.last,afterProposal,concert:game.keepsakes?.some(k=>k.id===id && k.title==='그날의 공연표')},1)){
      c.lastReach=tick(); c.followMarriage=false;
    }
  }
  const annual=game.pending || chooseAnnual(); delete game.pending;
  if(!['solo','quiet','sports'].includes(annual.type) && annual.id!==game.player) meet(annual.id);
  const newcomer=game.contacts[annual.id];
  if(annual.type==='meet' && newcomer && !newcomer.promise && eligible(newcomer,'outing') && pick([true,false]))
    push({type:'proposal',id:annual.id,kind:newcomer.affection && eligible(newcomer,'date')?'date':'outing'},1);
  else push(annual,0);
  if(!game.queue.some(e=>e.type==='chapter')){
    const chapter=selectChapter(game);
    if(chapter) push(chapter,0);
  }
  const candidates=Object.entries(game.contacts).filter(([id,c])=>!used.has(id) && !c.promise && eligible(c,'outing'));
  if(candidates.length){
    const [id,c]=pick(candidates.flatMap(pair=>Array(3-temperament(pair[0])).fill(pair)));
    let kind='outing';
    if(eligible(c,'marry') && c.affection>=2) kind='marry';
    else if(eligible(c,'date') && c.affection>=1) kind='date';
    push({type:'proposal',id,kind},1);
  }
  game.prepared=tick(); persist();
}
function openSeasonEvent(e){
  game.queue=game.queue.filter(item=>item.key!==e.key);
  game.event=e; navigate();
}
function chooseAnnual() {
  const pool=[{type:'quiet',id:game.player}];
  function add(type,id) { pool.push({type,id}); }
  const fresh=unused();
  add('solo',game.player);
  if (fresh.length) { const id=pick(fresh); add('meet',id); add('meet',id); }
  const entries=Object.entries(game.contacts);
  const partners=entries.filter(([,c]) => ['연인','배우자'].includes(c.role));
  for(const [id,c] of entries) {
    if (['연인','배우자'].includes(c.role)) add('couple',id);
    else { add('meet',id); if (partners.length) add('affair',id); }
    if (['연인','배우자'].includes(c.role) || (c.affair && members[id].sex !== members[game.player].sex)) add('family',id);
    const seen=game.sightings?.find(s=>s.observer===id && !s.used);
    if(partner(c) && seen) pool.push({type:'clash',id,other:seen.other});
  }
  const promised=entries.filter(([,c])=>c.promise && c.deadline===tick()).map(([id])=>id);
  if(promised.length>=2){
    const id=pick(promised);
    pool.push({type:'schedule',id,other:pick(promised.filter(other=>other!==id))});
  }
  for (const [id,c] of partners) {
    const since=game.log.findLast(entry=>entry.id===id && entry.effect==='date')?.year;
    if (since && game.year-since>=2 && !c.celebrated) add('anniversary',id);
  }
  for(const [id] of entries) {
    if(game.keepsakes?.some(k=>k.id===id && k.title==='그날의 공연표' && k.year<game.year)) add('encore',id);
  }
  const childAtSchool=game.children.find(c=>!isCut(c.id) && !c.sports && game.year-c.year+(c.kind==='입양'?3:0)===7);
  const annual=childAtSchool ? {type:'sports',id:game.player,kid:childAtSchool.id} : pick(pool);
  return annual;
}
function answer(index) {
  const e=game.event;
  if(e && !e.result && ['calendarVisit','childVisit','weddingLetter'].includes(e.type)){answerPersonal(e,index);return;}
  if(e && !e.result && ['outingDay','echo'].includes(e.type)){answerLife(e,index);return;}
  if (!e || e.result) return;
  const {title,choices}=scene(e), c=game.contacts[e.id], action=choices[index];
  if (!action) return;
  if(c) c.pace ??= temperament(e.id);
  if(action.offer){
    const outcome=decide(c,action.offer);
    recordResponse(c,e,action.offer,outcome);
    if(outcome!=='yes'){
      action.line=outcome==='later'?'마음은 고마워. 한 번 더 만나 보고 대답해도 될까?':
        c.trust<0?'지난번 약속 이후로 아직 마음이 편하지 않아.':'나는 아직 그런 마음이 아니야. 솔직히 말하고 싶었어.';
      action.effect=outcome;
    }
  }
  if(e.type==='proposal') recordResponse(c,e,e.kind,['later','no'].includes(action.effect)?action.effect:'yes');
  if(!action.offer && ['meet','follow','concert','dinnerDate','friday','umbrellaDate'].includes(e.type)) {
    c.needsMeeting=false;
  }
  if(e.type==='clash'){
    const seen=game.sightings?.find(s=>s.other===e.other && s.observer===e.id && !s.used);
    if(seen) seen.used=true;
  }
  let memory=action.memory || action.line;
  switch(action.effect) {
    case 'sportsLater': game.familyDate={type:'sportsLater',id:game.player,kid:e.kid}; break;
    case 'repair': c.unansweredWarning=false;c.warning='heard'; setPromise(c,'friday'); break;
    case 'dismiss': c.warning=partner(c)?'final':null; break;
    case 'bookConcert': setPromise(c,'concert'); break;
    case 'sendTicket': {
      if(pick([true,true,false])===false) {
        memory='표 사진이 잘 도착했다. 둘이 나란히 앉아 앙코르까지 들었다.';
        action.effect='ticketStub'; break;
      }
      const others=Object.keys(game.contacts).filter(id=>id!==e.id);
      const booked=others.filter(id=>game.contacts[id].promise && game.contacts[id].deadline===tick());
      const witnesses=booked.length?booked:others.length?others:unused();
      if(witnesses.length) {
        e.other=pick(witnesses); meet(e.other); (game.sightings ||= []).push({observer:e.other,other:e.id}); e.collision=booked.includes(e.other);
        e.type='ticketChat'; navigate(); return;
      }
      memory='공연장 입구에서 만나 표를 나눠 들었다.';
      break;
    }
    case 'concertAgain': setPromise(c,'concert'); game.contacts[e.other].promise=false; break;
    case 'inviteWitness': setPromise(game.contacts[e.other],'concert'); break;
    case 'ticketReschedule': setPromise(game.contacts[e.other],'friday'); break;
    case 'dinnerPromise': setPromise(c,'dinnerDate'); break;
    case 'promise': setPromise(c,({ticket:'concert',dinner:'dinnerDate',umbrella:'umbrellaDate'})[e.story] || 'follow'); if(c.lastCloser!==tick()){c.affection++;c.lastCloser=tick();} break;
    case 'keepFirst': case 'keepOther': {
      const later=action.effect==='keepFirst'?e.other:e.id;
      const contact=game.contacts[later];
      memory=members[later].name+' · '+changeAppointment(contact);
      action.line=memory;break;
    }
    case 'closer': if(c.lastCloser!==tick()){c.affection++;c.lastCloser=tick();} break;
    case 'friend': if (c.role==='지인'){c.role='친구';c.affection++;} break;
    case 'date': c.role='연인'; c.affair=false; c.celebrated=false; break;
    case 'marry': c.role='배우자'; game.marriages.push({id:e.id,start:game.year,end:null}); break;
    case 'split': c.warning=null; c.cooldown=tick()+4; c.needsMeeting=true; endMarriage(e.id); c.role='옛 인연'; c.affair=false; c.affection=0; c.promise=false; break;
    case 'affair': {
      const possible=Object.keys(game.contacts).filter(id=>id!==e.id && partner(game.contacts[id]));
      if(possible.length && pick([true,false])) (game.sightings ||= []).push({observer:pick(possible),other:e.id});
    } c.affair=true; c.affection++; break;
    case 'conflict': c.warning=c.warning==='heard'?'final':'new'; c.affection=Math.max(0,c.affection-1); break;
    case 'birth': case 'adopt': case 'solo': {
      const kid=nextChildId(e.id);
      (game.obligations ||= []).push({type:'arrival',id:e.id,kid,previous:memory,kind:action.effect==='birth'?'출생':'입양',parents:action.effect==='solo'?[game.player]:[game.player,e.id]});
      break;
    }
    case 'arrival':
      game.children.push({id:e.kid,parents:e.parents,year:game.year,kind:e.kind});
      memory=members[e.kid].name+' · '+memory; break;
  }
  if(e.type==='intro' && action.effect==='promise' && !(e.story==='dinner' && index===2)) c.due=game.year;
  const souvenir={ticketStub:'그날의 공연표',ticketReschedule:'그날의 공연표',inviteWitness:'그날의 공연표',candles:'두 케이크의 초',partyPhoto:'기념일 단체사진',medal:'종이 메달',sportsPhoto:'운동회 사진'}[action.effect];
  if (souvenir) {
    game.keepsakes ||= [];
    game.keepsakes.push({title:souvenir,year:game.year,id:e.kid || e.id,memory});
  }
  if(e.type==='anniversary') c.celebrated=true;
  if(e.type==='sports') game.children.find(k=>k.id===e.kid).sports=true;
  if(action.effect==='marry'){
    (game.obligations ||= []).push({type:'familyNews',id:e.id,previous:memory});
  }
  if(e.type==='chapter' && c){
    c.affection++;c.needsMeeting=false;
    if(e.code==='relationship-7' && index===1) setPromise(c,'concert');
    if(e.code==='relationship-19' && index===0) {c.trust=(c.trust || 0)+1;setPromise(c,'friday');}
    if(e.code==='relationship-3' && index===0) setPromise(c,'dinnerDate');
  }
  if(c && partner(c) && (c.pauseKind || c.response?.kind)==='marry' &&
     (e.type==='reconnect' || e.type==='couple' || e.type==='anniversary') &&
     !['no','later','memory'].includes(action.effect) && (action.effect!=='dinnerPromise')) c.needsMeeting=false;
  if(e.planChoice && game.diary.some(p=>p.kind===e.planChoice.kind && p.state==='proposal' && p.people.includes(e.id)) && ['promise','dinnerPromise','bookConcert','repair'].includes(action.effect)){
    memory=action.line='먼저 잡은 약속이 있어. 내 일정에서 만날 날을 다시 고르자.';
  }
  if(c) c.last=memory;
  const spoken = !!action.spoken || e.type==='intro' || (action.offer && ['later','no'].includes(action.effect));
  e.result={label:action.label,line:action.line,memory,spoken};
  game.log.push({year:game.year,season:game.season || 0,code:e.code,id:e.id,title,memory,effect:action.effect, label:action.label});
  game.done=true;
  if(action.offer && action.effect==='no' && !game.echoes.some(x=>x.id===e.id && x.kind==='retry')) addEcho(e.id,'retry','지난번 대답이 마음에 걸렸어. 이번엔 친구들이랑 같이 국수 먹을래?', '분식집 단체석');
  navigate();
}
function node(tag,text,parent,cls) {
  const n=document.createElement(tag);
  if(text) n.textContent=text;
  if(cls) n.className=cls;
  parent.append(n);
  return n;
}
function control(parent,text,fn) {
  const b=node('button',text,parent,'start-button');
  b.type='button'; b.onclick=fn;
}
function details(parent,title) {
  const d=node('details','',parent); node('summary',title,d); return d;
}
function portrait(parent,id,label) {
  const fig=node('figure','',parent);
  const img=node('img','',fig); img.src=members[id].image; img.alt='';
  node('figcaption',label+' · '+members[id].name,fig);
}
function logText(entry,names={}) {
  return entry.year+'년 차 '+(seasons[entry.season] || '')+' · '+(names[entry.id] || members[entry.id]?.name || '가족')+' · '+entry.title+' — '+entry.memory;
}
function setPromise(contact,kind) {
  const id=Object.keys(game.contacts).find(id=>game.contacts[id]===contact);
  if(contact.promise && contact.plan===kind)return;
  if(contact.promise || plansAt(Math.min(119,tick()+1)).length){
    proposePlan(kind,[id]);return;
  }
  delete contact.waitAt; delete contact.postponed; delete contact.callAfter; contact.changes=0; contact.promise=true; contact.plan=kind; contact.deadline=Math.min(119,tick()+1); delete contact.due;
}
const callouts={concert:'공연 표 챙겼어? 입구에서 봐!',dinnerDate:'두 자리 잡았어. 저녁 먹으러 올래?',umbrellaDate:'2번 출구야. 우산 보이지?',friday:'다시 잡은 약속, 이번엔 만날 수 있지?',follow:'지난번에 한 약속, 기억해?'};
function personCard(parent,id,text,onClick) {
  const card=node('button','',parent,'person-card');
  card.type='button'; card.onclick=onClick;
  const face=node('img','',card); face.src=members[id].image; face.alt='';
  const body=node('span','',card); node('strong',members[id].name,body); node('span',text,body,'person-line');
}
function fillAlbum() {
  const visibleLog=game.log.filter(visibleMemory);
  const box=el('family-content'); box.replaceChildren();

  node('p',clockLabel(),box);
  node('h1',game.ended?(tick()===119?'우리 가족의 30년':'우리 가족의 이야기'):'내 가계도',box,'selection-title');
  if(canEndEarly())control(box,'지금 엔딩 보기',earlyEndingMenu);
  const board=node('div','',box,'kin-board');
  drawKin(board,game.player);
  if(game.ended) {
    const epilogue=ending(game);
    node('h2',epilogue.title,box);
    node('p',members[game.player].name+' · '+clockLabel()+' · '+epilogue.tags.join(' · '),box);
    const companion=Object.keys(game.contacts).sort((a,b)=>game.log.filter(e=>e.id===b).length-game.log.filter(e=>e.id===a).length)[0];
    if(companion) node('p','내 연표에 가장 자주 등장한 사람은 '+members[companion].name+'였다.',box);
    node('h3','기억에 남은 순간',box);
    const milestones=visibleLog.filter(e=>['birth','solo','adopt','date','marry','split'].includes(e.effect));
    const highlights=new Set([visibleLog[0],milestones[0],milestones.at(-1),visibleLog.findLast(e=>e.code),visibleLog.at(-1)].filter(Boolean));
    for(const entry of highlights) node('p',logText(entry),box,'memory-card');
    control(box,'새 이야기 시작하기',()=>{el('family-album').close();location.hash='character-select';});
  }
  const latest=game.keepsakes?.findLast(visibleMemory);
  if(latest) {
    const card=node('article','',box,'souvenir');
    node('small',latest.year+'년 차 · '+members[latest.id].name,card);
    node('h3',latest.title,card); node('p',latest.memory,card);
  }
  const album=details(box,'함께한 사람들 · '+Object.keys(game.contacts).length);
  for(const [id,c] of Object.entries(game.contacts)) {
    const d=node('section','',album);
    const history=node('div','',d); history.hidden=true;
    personCard(d,id,c.role,()=>{history.hidden=!history.hidden;});
    d.append(history);
    node('p',c.last || '처음 만난 인연',history);
    for(const m of game.marriages.filter(m=>m.id===id)) node('p',m.start+'년 차 결혼 · '+(m.end?m.end+'년 차 이혼':'혼인 중'),history);
  }
  albumLife(box);
  const timeline=details(box,'내 연표 · '+visibleLog.length+'개의 기억');
  for(const entry of visibleLog) node('p',logText(entry),timeline);
}
function renderGame() {
  if(el('kin-dialog').open)el('kin-dialog').close();
  if(lifeMenu.open)lifeMenu.close();
  const [route,query]=location.hash.slice(1).split('?');
  const play=['first-chat','family-tree'].includes(route);
  if(play && !game && query) {
    const params=new URLSearchParams(query);
    const idOf=name=>Object.keys(members).find(id=>members[id].name===name);
    const player=idOf(params.get('player')), sender=idOf(params.get('sender'));
    const story=stories.find(s=>s.id===params.get('story')) || stories[0];
    if(player && sender && player!==sender) {
      startRun(player,sender,story.id);
      const reply=params.get('reply');
      if(reply!==null && story.choices[reply]) {
        answer(Number(reply)); if(route==='family-tree'){game.event=null; navigate();}
      }
      return;
    }
  }
  const album=route==='character-select' || (play && !game);
  const playing=play && !!game;
  characterScreen.hidden=!album; startScreen.hidden=album || playing;
  chat.hidden=!playing;
  el('resume').hidden=!game;
  el('resume').onclick=()=>location.hash=game.event?'first-chat':'family-tree';
  if(playing) {
    initLife();renderStage();
    document.title=(game.event?'나의 이야기':'내 가계도')+' — Family 30';
  } else document.title=album?'캐릭터 선택 — Family 30':'Family 30';
  if(album){el('album-search').dispatchEvent(new Event('input'));characterTitle.focus({preventScroll:true});}
  if(playing) window.scrollTo(0,0);
}
el('retry-save').onclick=persist;
