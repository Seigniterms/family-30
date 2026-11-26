// Town relationships advance on the season clock, even when nobody opens the map.
let kinFocus=null;
function allChildren(){return [...game.children,...(game.townKids || [])];}
function quietContact(id){return (game.contacts[id]?.quietUntil || 0)>tick();}
function kinPerson(id){
  if(members[id])return members[id];
  const child=game.townKids?.find(c=>c.id===id);
  return {name:child.name,image:members[child.portrait].image};
}
function familyIds(){
  return [...new Set([game.player,...Object.keys(game.contacts),...allChildren().flatMap(c=>[c.id,...c.parents]),
    ...(game.townPairs || []).flatMap(p=>p.people),...game.marriages.map(m=>m.id)])].filter(id=>!isCut(id));
}
function childAge(c){return game.year-c.year+(c.placedAge ?? (c.kind==='입양'?3:0));}
function closeKin(a,b){
  const children=allChildren();
  const ancestry=id=>{
    const seen=new Set([id]),stack=[id];
    while(stack.length){
      const current=stack.pop();
      const child=children.find(c=>c.id===current);
      if(child)for(const parent of child.parents)if(!seen.has(parent)){seen.add(parent);stack.push(parent);}
    }
    return seen;
  };
  const left=ancestry(a);
  return [...ancestry(b)].some(id=>left.has(id));
}
function townNews(pair,title,text,extra=[]){
  (game.townNews ||= []).push({people:[...pair.people,...extra],title,text,when:tick()});
}
function progressTown(){
  if(game.townTick===tick())return;
  game.townTick=tick();
  game.townPairs ||= [];game.townKids ||= [];
  // Unanswered casual messages age out; milestones stay in the album.
  game.echoes=(game.echoes || []).filter(e=>{
    if(tick()-e.due<4)return true;
    if(!isCut(e.id))remember(e.id,e.title,e.message,'unread',e.guests);
    return false;
  });
  const couples=game.townPairs.filter(p=>!p.people.some(isCut) && !p.end);
  for(const p of couples){
    const age=tick()-p.since;
    if(p.status==='연인' && age>=p.decision){
      if(p.partWays || p.people.includes(spouse())){
        p.status='옛 연인';p.end=tick();townNews(p,'각자의 길','두 사람은 연애를 끝내고 각자의 생활로 돌아갔다.');
      }else{
        p.status='배우자';p.wedding=tick();weddingNotice(p);townNews(p,'결혼 소식','가장 가까운 사람들 앞에서 두 사람이 결혼했다.');
      }
    }else if(p.status==='배우자' && tick()===p.nextChild){
      const id='child-'+(game.townKids.length+1);
      const source=pick(p.people), parent=game.townKids.find(c=>c.id===source);
      const portrait=parent?.portrait || source;
      const names=['봄','나루','하람','도담','보리','여울','솔','별','다온','로운','이든','윤슬'];
      const surname=Array.from(kinPerson(source).name)[0];
      let name=surname+pick(names);
      const taken=new Set(familyIds().map(id=>kinPerson(id).name));
      if(taken.has(name))name+=String(game.townKids.length+1);
      game.townKids.push({id,parents:[...p.people],year:game.year,kind:'입양',name,portrait,placedAge:0});
      townNews(p,'우리 집에 온 아이',name+'의 첫 가족사진을 찍었다.',[id]);
      p.nextChild=null;
    }
  }
  if(tick()%2===0)return;
  const children=allChildren(), active=game.townPairs.filter(p=>!p.end && !p.people.some(isCut));
  const eligible=id=>id!==game.player && !isCut(id) && !active.some(p=>p.people.includes(id)) &&
    !children.some(c=>c.id===id && childAge(c)<18);
  const available=familyIds().filter(eligible);
  if(!available.length && unused().length){const id=pick(unused());meet(id);available.push(id);}
  if(!available.length)return;
  const origins=available.filter(id=>game.contacts[id]?.role==='옛 인연' || game.contacts[id]?.role==='연인' || children.some(c=>c.id===id));
  const a=pick(origins.length?origins:available);
  const matches=id=>id!==a && !closeKin(a,id) && !game.townPairs.some(p=>p.people.includes(a) && p.people.includes(id));
  const friends=game.bonds.filter(p=>p.people.includes(a)).flatMap(p=>p.people).filter(id=>available.includes(id) && matches(id));
  let candidates=friends.length?friends:available.filter(matches);
  if(!candidates.length)candidates=unused().filter(matches);
  if(!candidates.length)return;
  const b=pick(candidates);if(members[b] && !children.some(c=>c.id===b))meet(b);
  const p={people:[a,b],status:'연인',since:tick(),decision:pick([4,6,8]),partWays:pick([false,false,true]),nextChild:tick()+pick([12,16,20])};
  game.townPairs.push(p);townNews(p,'두 사람의 첫날','둘이서 만나기 시작했다는 소식이 전해졌다.');
}
function connections(id){
  const rows=new Map();
  function add(who,role){
    if(who===id || isCut(who))return;
    const tags=rows.get(who) || [];if(!tags.includes(role))tags.push(role);rows.set(who,tags);
  }
  for(const c of allChildren()){
    if(c.id===id)c.parents.forEach(p=>add(p,'부모'));
    if(c.parents.includes(id))add(c.id,'자녀');
  }
  if(id===game.player){
    for(const [who,c] of Object.entries(game.contacts))add(who,c.role);
  }else if(game.contacts[id])add(game.player,game.contacts[id].role);
  for(const entry of game.log){
    if(entry.effect==='date' && (id===game.player || id===entry.id) && !partner(game.contacts[entry.id] || {}))
      add(id===game.player?entry.id:game.player,'옛 연인');
  }
  for(const m of game.marriages){
    if(id===game.player || id===m.id)add(id===game.player?m.id:game.player,m.end==null?'배우자':'옛 배우자');
  }
  for(const p of game.townPairs || [])if(p.people.includes(id))add(p.people.find(v=>v!==id),p.status);
  for(const p of game.bonds)if(p.people.includes(id))add(p.people.find(v=>v!==id),'모임 친구');
  return rows;
}
function kinCard(container,id,label,callback){
  const person=kinPerson(id),button=node('button','',container,'kin-card');
  button.type='button';button.onclick=callback;
  const img=node('img','',button);img.src=person.image;img.alt='';img.loading='lazy';
  node('strong',person.name,button);node('small',label,button);
  return button;
}
function drawKin(container,initial,main=false){
  let path=main?(game.kinPath || []).filter(id=>!isCut(id)):[];
  function draw(id){
    const previous=path.indexOf(id);
    path=previous>=0?path.slice(0,previous+1):[...path,id];
    if(main)game.kinPath=path;
    if(main)kinFocus=id;
    container.replaceChildren();
    const head=node('header','',container,'kin-heading');
    node('strong','우리 가계도 · '+familyIds().length+'명',head);
    const chooser=node('select','',head);chooser.setAttribute('aria-label','가계도에서 인물 찾기');
    for(const who of familyIds()){const o=node('option',kinPerson(who).name,chooser);o.value=who;o.selected=who===id;}
    chooser.onchange=()=>draw(chooser.value);
    const trail=node('nav','',container,'kin-trail');trail.setAttribute('aria-label','가계도 이동 경로');
    path.forEach((who,i)=>{
      if(i)node('span','›',trail);
      const step=node('button',who===game.player?'나':kinPerson(who).name,trail);step.disabled=i===path.length-1;step.onclick=()=>draw(who);
    });
    if(path.length>1){const back=node('button','‹ 한 단계 뒤로',trail);back.onclick=()=>draw(path.at(-2));}
    const rows=[...connections(id)], family=allChildren();
    const groups=[['부모',p=>p.includes('부모')],['가운데',null],['연인과 배우자',p=>p.some(r=>['연인','배우자','옛 인연','옛 연인','옛 배우자'].includes(r))],['자녀',p=>p.includes('자녀')],['친구와 지인',()=>true]];
    let rest=rows;
    for(const [name,test] of groups){
      if(!test){
        const person=kinPerson(id),hero=node('div','',container,'kin-focus');
        const img=node('img','',hero);img.src=person.image;img.alt='';
        const child=family.find(c=>c.id===id);
        node('strong',(id===game.player?'나 · ':'')+person.name+(child?' · '+childAge(child)+'세':''),hero);
        if(!game.ended && id!==game.player){
          const watch=node('button',game.watching.includes(id)?'★ 소식 보는 중':'☆ 소식 챙겨보기',hero,'town-news');
          watch.onclick=()=>{
            if(game.watching.includes(id))game.watching=game.watching.filter(who=>who!==id);
            else game.watching.push(id);
            persist();draw(id);
          };
        }
        if(main && child){
          const visit=node('button','함께 시간 보내기',hero,'town-news');visit.onclick=()=>childMenu(id);
        }else if(main && id!==game.player && game.contacts[id]){
          const talk=node('button',quietContact(id)?'지금은 혼자 쉬는 중':'먼저 연락하기',hero,'town-news');talk.disabled=quietContact(id);
          talk.onclick=()=>{
            const current=gathered.find(entry=>entry.e.id===id);
            preview=current || {e:{type:partner(game.contacts[id])?'couple':'meet',id},kind:'visitor',hint:''};
            browsingTopics=!!current;courtesy=null;page=0;lastBeat=null;renderStage();
          };
        }
        continue;
      }
      const group=rest.filter(([,roles])=>test(roles));if(!group.length)continue;
      rest=rest.filter(([,roles])=>!test(roles));
      node('h3',name,container);const branch=node('div','',container,'kin-branch');
      for(const [who,labels] of group)kinCard(branch,who,labels.join(' · '),()=>{draw(who);container.scrollIntoView?.({block:'nearest'});});
    }
  }
  draw(initial && !isCut(initial)?initial:game.player);
}
function drawTown(board,entries){
  if(entries.length){
    const invitations=node('div','',board,'town-invitations');
    for(const id of new Set(entries.map(x=>x.e.id))){
      const topics=entries.filter(x=>x.e.id===id),entry=topics[0];
      kinCard(invitations,id,entry.hint || '말 걸기',()=>{
        preview=entry;courtesy=null;browsingTopics=true;page=0;lastBeat=null;renderStage();
      });
    }
  }
  for(const [id,c] of Object.entries(game.contacts)){
    if(c.note?.until!==tick())continue;
    const note=node('button',kinPerson(id).name+'의 쪽지',board,'town-news');
    note.onclick=()=>{menu(kinPerson(id).name+'의 쪽지');node('p',c.note.text,lifeBody);};
  }
  const recent=(game.townNews || []).filter(n=>!n.people.some(isCut));
  if(recent.length){
    const important=item=>item.people.some(id=>game.watching.includes(id));
    const sorted=[...recent].reverse().sort((a,b)=>Number(important(b))-Number(important(a)));
    const n=sorted[0], announcement=node('button',(important(n)?'★ ':'')+n.people.slice(0,2).map(id=>kinPerson(id).name).join(' · ')+'  ─  '+n.title,board,'town-news');
    announcement.onclick=()=>{menu('동네 소식');for(const item of sorted){
      menuButton(item.people.map(id=>kinPerson(id).name).join(' · ')+' / '+item.title,()=>{
        closeMenu();kinFocus=item.people.at(-1);game.kinPath=[game.player];renderStage();
      });node('p',(Math.floor(item.when/4)+1)+'년 차 '+seasons[item.when%4]+' · '+item.text,lifeBody);
    }};
  }
  drawKin(node('section','',board,'kin-board'),kinFocus,true);
}
function townSpouse(id){return game.townPairs?.some(p=>p.status==='배우자' && !p.end && p.people.includes(id));}
