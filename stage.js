const actors=el('stage-actors');
const dock=el('stage-dock');
const albumDialog=el('family-album');
let browsingTopics=false, courtesy=null;
let preview=null, page=0, lastBeat=null, gathered=[], venue='square';
const places={square:'동네 광장',home:'우리 집',venue:'공연장 앞',seats:'공연장 객석'};

function openAlbum(){
  fillAlbum();
  if(!albumDialog.open) albumDialog.showModal();
}
el('open-album').onclick=openAlbum;
el('reset-run').onclick=()=>{
  if(!game || game.ended) return;
  menu('이번 회차를 리셋할까요?');
  node('p',members[game.player].name+'의 '+clockLabel()+'까지 진행한 이야기와 약속이 지워져요. 처음부터 캐릭터를 다시 고를 수 있어요.',lifeBody);
  menuButton('계속 플레이',closeMenu);
  menuButton('리셋하고 다시 고르기',()=>{
    try {
      localStorage.removeItem('family30.run.v1');
      localStorage.removeItem(saveKey);
    } catch {
      node('p','진행 기록을 지우지 못했어요. 잠시 후 다시 시도해 주세요.',lifeBody);
      return;
    }
    game=null;
    closeMenu();
    el('save-warning').hidden=true;
    el('album-search').value='';
    for(const card of portraits) card.setAttribute('aria-pressed','false');
    history.replaceState(null,'','#character-select');
    renderGame();
  });
};
function dockButton(text,fn,quiet=false){
  const btn=node('button',text,dock,quiet?'quiet':'');
  btn.type='button';btn.onclick=fn;
}
function stageEntries(){
  const list=[];
  for(const [id,c] of Object.entries(game.contacts)){
    if(!c.promise || game.finale) continue;
    list.push({e:{id,type:c.waitAt==='seats'?'seated':c.plan || 'follow',previous:c.last},kind:'promise',c,
      hint:c.waitAt==='seats'?'객석에 자리 잡았어!':(c.plan==='concert'?'공연표 · ':'약속 · ')+seasons[c.deadline%4]+'까지'});
  }
  const incoming=[...game.queue].sort((a,b)=>Number(!!b.protected)-Number(!!a.protected));
  for(const e of incoming){
    if(game.finale && !e.protected) continue;
    const hint=e.type==='reconnect'?'오늘은 네 생각이 났어.':e.type==='proposal'?'잠깐, 할 말 있어!':e.type==='warning'?'얘기 좀 할까?':scene(e).title;
    const item={e,kind:'event',hint};
    if(e.protected || ['departure','sports','warning'].includes(e.type)) list.unshift(item);
    else list.push(item);
  }
  const visible=[],ids=new Set();
  for(const item of list){

    ids.add(item.e.id);visible.push(item);
    if(item.c) item.c.shown=tick(); else item.e.shown=tick();
  }
  if(!game.finale){
    const familiar=Object.keys(game.contacts).filter(id=>!quietContact(id) && !ids.has(id) && !game.contacts[id].promise);
    const id=familiar[tick()%Math.max(1,familiar.length)];
    if(id && !game.log.some(e=>e.year===game.year && e.season===game.season && e.id===id)) visible.push({e:{id,type:partner(game.contacts[id])?'couple':'meet'},kind:'visitor',hint:''});
  }
  return visible;
}
function isLetter(e){return e.invited || ['proposal','warning','departure','reconnect','photoNote','photoReunion','photoWinter','approach'].includes(e.type);}
function focusOn(entry){
  if(entry?.kind==='event' && isLetter(entry.e)){entry.e.read=true;persist();}
  preview=entry;courtesy=null;browsingTopics=false;page=0;lastBeat=null;renderStage();
}
function acceptEntry(entry){
  if(entry.kind==='promise'){
    const c=entry.c;
    c.promise=false;delete c.note;delete c.waitAt;c.needsMeeting=false;c.kept=(c.kept || 0)+1;c.trust=(c.trust || 0)+1;
    c.unansweredWarning=false;
    if(c.warning==='heard') c.warning=null;
    if(c.plan==='concert') c.affection++;
  } else if(entry.kind==='event') game.queue=game.queue.filter(e=>e.key!==entry.e.key);
  game.event=entry.e;
  preview=null;
}
const landmarks=[[20,54],[78,43],[49,74]];
function placeActors(ids){
  game.spots ||= {};
  const spots=game.spots[venue] ||= {};
  const used=new Set();
  const assign=(id,start)=>{
    let slot=start%3;
    while(used.has(slot)) slot=(slot+1)%3;
    spots[id]=slot;used.add(slot);
  };
  const present=Array.from(actors.querySelectorAll('.stage-person'),b=>b.dataset.id);
  const returning=ids.filter(id=>spots[id]!=null);
  returning.sort((a,b)=>Number(present.includes(b))-Number(present.includes(a)));
  for(const id of returning) assign(id,spots[id]);
  for(const id of ids.filter(id=>spots[id]==null)) assign(id,Number(id) || 0);
  return spots;
}
function extraAction(entry){
  const c=game.contacts[entry.e.id];
  if(!c || game.finale || ['proposal','warning','departure'].includes(entry.e.type)) return null;
  if(['new','heard'].includes(c.warning)) return {type:'warning',label:'지난번 약속부터 사과하기'};
  if(entry.kind==='visitor' && eligible(c,'outing')) return {type:'walkInvite',label:'둘이 산책하자고 하기'};
  return null;
}
function stageFace(id,hint,slot,focused,fn){
  let b=Array.from(actors.children).find(actor=>actor.dataset.id===id);
  if(!b){
    b=node('button','',actors,'stage-person'); b.dataset.id=id;
    node('small','',b);
    const image=node('img','',b);image.src=kinPerson(id).image;image.alt='';
    node('strong',(id===game.player?'나 · ':'')+kinPerson(id).name,b);
  }
  b.classList.toggle('active',focused);
  b.type='button';b.disabled=!fn;b.onclick=fn;
  const [x,y]=landmarks[slot];b.style.left=x+'%';b.style.top=y+'%';
  const bubble=b.querySelector('small');
  bubble.textContent=hint || '';bubble.hidden=!hint || focused;
  b.setAttribute('aria-label',[kinPerson(id).name,hint].filter(Boolean).join(' · '));
}
// A beat is one speaker or one observation. Let CSS wrap the full thought.
function sceneBeats(story,event){
  const result=event.result;
  if(result){
    const beats=[];
    // Older photo reunions saved narrated outcomes with the speech flag set.
    const legacyNarration=['photoReunion','photoWinter'].includes(event.type) &&
      !story.choices.some(choice=>choice.label===result.label);
    if(result.line)beats.push({text:result.line,voice:result.spoken===true && !legacyNarration});
    if(result.memory && result.memory!==result.line)beats.push({text:result.memory,voice:false});
    return beats;
  }
  const beats=[];
  if(story.setup && story.setup!==story.message)beats.push({text:story.setup,voice:false});
  if(story.message)beats.push({text:story.message,voice:!story.narrationOnly});
  return beats;
}
function sceneSpeaker(event,story){
  if(event.result?.speaker)return event.result.speaker;
  if(story.speaker)return story.speaker;
  if(event.social && !event.social.resolved)return event.social.speaker;
  if(event.type==='ticketChat' || (event.type==='incident' && event.route==='group'))return event.other;
  if(['childVisit','sports','sportsLater'].includes(event.type))return event.kid;
  if(event.type==='calendarVisit')return event.people[0];
  return event.id;
}
function stageLine(text,speaker){
  const bubble=node('div','',dock,speaker?'actor-dialogue':'stage-narration');
  if(speaker)node('strong',speaker===game.player?'나 · '+kinPerson(speaker).name:kinPerson(speaker).name,bubble,'voice-name');
  node('span',text,bubble);
  return bubble;
}
function eventPlace(e){
  if(e?.type==='seated') return 'seats';
  if(['concert','encore','ticketChat'].includes(e?.type) || e?.story==='ticket') return 'venue';
  if(['family','arrival','familyNews','solo','anniversary','sportsLater'].includes(e?.type) || /^(family|home)-/.test(e?.code || '')) return 'home';
  return 'square';
}
let displayedRun;
function renderStage(){
  el('stage-hud-tools').querySelector('.stage-back')?.remove();
  if(displayedRun!==game){displayedRun=game;preview=null;gathered=[];page=0;lastBeat=null;}
  if(!game.event && !game.ended) prepareSeason();
  el('reset-run').hidden=game.ended;
  el('circle').hidden=!!game.event || game.ended;
  if(!game.event && !preview) gathered=game.ended?[]:stageEntries();
  const event=game.event || preview?.e;
  if(game.event) venue=event.stagePlace || eventPlace(event);
  else if(!preview || browsingTopics) venue='square';
  chat.style.setProperty('--place','url(materials/stage-'+venue+'.jpg)');
  chat.style.setProperty('--light',['#ffadba10','#ffcc4b15','#fa863723','#a9d3ff38'][game.season || 0]);
  el('stage-time').textContent=clockLabel()+' · '+(event?.type==='incident'?incidents[event.code].title:places[venue]);
  dock.replaceChildren(); actors.querySelector('.actor-dialogue')?.remove();
  actors.classList.toggle('focused',!!event);
  actors.classList.remove('speaking');
  actors.dataset.reaction=event?.result ? (['no','later','split'].includes(game.log.at(-1)?.effect)?'hesitate':'reply'):'';
  actors.classList.toggle('neighbourhood',!event && !game.ended);
  actors.querySelector('.town-board')?.remove();
  chat.classList.toggle('in-credits',game.ended);
  if(game.ended){
    showCredits();return;
  }
  const story=event?scene(event):null;
  const speaker=event && sceneSpeaker(event,story);
  if(!event){
    actors.replaceChildren();
    const board=node('div','',actors,'town-board');
    drawTown(board,gathered);
    lifeDock();persist();return;
  }
  let ids=[...new Set([speaker,game.player,...(event.type==='incident'?[event.id]:(event.guests || []))].filter(Boolean))].slice(0,3);
  for(const actor of Array.from(actors.children)) if(!ids.includes(actor.dataset.id)) actor.remove();
  const spots=placeActors(ids);
  ids.forEach(id=>{
    const entry=gathered.find(item=>item.e.id===id);
    stageFace(id,entry?.hint,spots[id],id===speaker,!game.event && entry?()=>{
      const topics=gathered.filter(item=>item.e.id===id);
      const changeSeat=entry.c?.plan==='concert' && !entry.c.waitAt && entry.c.postponed!==tick();
      const menu=!!game.contacts[id] || topics.length>1 || extraAction(entry) || changeSeat;
      venue=menu?'square':eventPlace(entry.e);
      preview=entry;courtesy=null;browsingTopics=!!menu;page=0;lastBeat=null;renderStage();
    }:null);

  });
  const topics=gathered.filter(item=>item.e.id===speaker);
  if(courtesy && preview){
    stageLine(courtesy,speaker);
    dockButton('다른 인물 만나기',()=>focusOn(null));return;
  }
  if(preview && browsingTopics){
    for(const item of topics){
      const place=eventPlace(item.e);
      const action=item.e.type==='seated'?'객석으로 들어가기':item.e.type==='concert'?'공연장 입구에서 표 꺼내기':
        item.kind==='visitor'?'벤치 옆에 앉아 말 걸기':item.kind==='promise'?'약속 이야기 꺼내기':
        item.e.id===game.player?scene(item.e).title:scene(item.e).title+' 이야기하기';
      dockButton(action,()=>{venue=place;focusOn(item);});
    }
    const action=topics.length===1 && extraAction(preview);
    if(action) dockButton(action.label,()=>focusOn({e:{id:speaker,type:action.type},kind:'visitor'}));
    const booking=topics.find(item=>item.c?.plan==='concert' && !item.c.waitAt && item.c.postponed!==tick());
    if(booking) dockButton('오늘 조금 늦을 것 같아',()=>{
      courtesy=changeAppointment(booking.c,true);persist();renderStage();
    });
    if(game.contacts[speaker]) dockButton('관계 정리',()=>cutMenu(speaker),true);
    dockButton('주변 보기',()=>focusOn(null),true);return;
  }
  if(event.memoryThread?.kind==='date'){
    actors.replaceChildren();
    const wall=node('div','',actors,'snap-wall');
    const print=node('div','',wall,'snap-print cake-print');
    if(event.memoryThread.choice===0)for(const id of [game.player,event.id]){
      const img=node('img','',print);img.src=kinPerson(id).image;img.alt=kinPerson(id).name;
    }
    const cake=node('span','',print,'little-cake');
    cake.setAttribute('role','img');cake.setAttribute('aria-label',event.memoryThread.choice===0?'기울어진 딸기 케이크':'다시 만든 딸기 케이크');
    if(event.memoryThread.choice===0)cake.classList.add('tilted');
    node('small',kinPerson(event.id).name+' · 개인톡 사진',wall,'snap-caption');
  }
  if(snapshotEvents.includes(event.type)){
    actors.replaceChildren();
    const wall=node('div','',actors,'snap-wall');
    if(event.type==='snapshot' && !event.result){
      story.choices.forEach((choice,index)=>{
        const button=node('button','',wall,'snap-pick');
        button.type='button';button.setAttribute('aria-label',choice.label+' 선택');
        photoPrint(button,index);
        button.onclick=()=>answer(index);
      });
    }else{
      const cropped=event.type==='photoNote' && (event.step===1 || (event.result && game.snapshot.reply===0));
      photoPrint(wall,event.type==='photoNote'?0:game.snapshot.frame,cropped || (event.type==='photoReunion' && game.snapshot.reply===0));
    }
    node('small',event.type==='snapshot'?'첫 번개 · 단톡방 배경':(event.type==='photoWinter'?'첫 번개 사진첩':event.type==='photoReunion'?'여름 번개':members[event.id].name+' · 개인톡'),wall,'snap-caption');
  }
  const beat=event.result || event.type+':'+event.id+':'+(event.route || event.step || 0);
  if(lastBeat!==beat){page=0;lastBeat=beat;}
  const lines=sceneBeats(story,event);
  const current=lines[page] || lines[0];
  const nextLine=()=>{page++;renderStage();};
  actors.classList.toggle('speaking',current.voice);
  if(event.result)node('small','나 · '+event.result.label,dock,'my-answer');
  const line=stageLine(current.text,current.voice?speaker:null);
  if(event.result){
    const effect=game.log.at(-1)?.effect;
    const c=game.contacts[event.id];
    let change='';
    const chosen=event.planChoice;
    const actual=chosen && game.diary.find(p=>p.kind===chosen.kind && p.people.length===chosen.people.length && chosen.people.every(id=>p.people.includes(id)));
    if(chosen){
      change=planLabel(chosen)+' · '+(!actual?'사양함':actual.state==='proposal'?'날짜 미정':seasonDate(actual.due)+' 확정');
      if(actual?.state==='proposal')dockButton('날짜 고르기',()=>bookMenu(actual));
    }else if(c?.promise && ['promise','bookConcert','dinnerPromise','repair'].includes(effect))
      change=(c.plan==='concert'?'공연표':'약속')+' · '+members[event.id].name+' · '+seasons[c.deadline%4];
    if(['date','marry','split'].includes(effect)) change=members[event.id].name+' · '+c.role;
    if(change) node('small',change,dock,'stage-change');
  }
  if(page<lines.length-1){
    line.classList.add('tap-line');line.tabIndex=0;line.setAttribute('role','button');
    line.setAttribute('aria-label',line.textContent+' · 다음 대사');line.onclick=nextLine;
    line.onkeydown=ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();nextLine();}};
  } else if(event.result){
    const leave=()=>{game.event=null;preview=null;page=0;lastBeat=null;};
    const letter=game.queue?.find(e=>e.type==='photoNote' && !e.read);
    const reveal=['marry','arrival'].includes(game.log.at(-1)?.effect);
    if(letter)dockButton(members[letter.id].name+'의 비공개 사진 열기',()=>{
      leave();openSeasonEvent(letter);
    });
    if(reveal)dockButton('달라진 가계도 보기',()=>{leave();navigate();openAlbum();});
    dockButton(tick()===119?'마지막 겨울 마치기':nextSeasonLabel()+' ▸',()=>{
      // Keep the result available if the player cancels the missed-appointment prompt.
      passSeason(false,leave);
    },!!letter || reveal);
    dockButton(seasons[game.season]+'에 더 머물기',()=>{leave();navigate();},true);
  } else {
    story.choices.forEach((choice,i)=>dockButton(choice.label,()=>{
      if(preview){acceptEntry(preview);event.stagePlace=venue;}
      page=0;answer(i);
    }));
    if(preview?.c && preview.c.postponed!==tick() && preview.c.deadline<=tick())
      dockButton('미리 연락해 약속 미루기',()=>{
        courtesy=changeAppointment(preview.c);persist();renderStage();
      },true);
  }
  if(event.spontaneous && !event.protected && !event.result && !event.route && !event.step){
    dockButton('나중에 보기',()=>{
      const pending={...event,read:true,spontaneous:false};
      game.queue.push(pending);game.event=null;preview=null;page=0;navigate();
    },true);
  }
  if(preview){
    const back=node('button',topics.length>1?'‹ 대화 고르기':'‹ 주변 보기',el('stage-hud-tools'),'stage-back');
    back.onclick=()=>{if(topics.length>1){browsingTopics=true;renderStage();}else focusOn(null);};
  }
}
lifeMenu.addEventListener('close',()=>{if(game?.event?.result && game.event.planChoice)renderStage();});
showCurrentScreen();
