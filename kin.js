// Town relationships advance on the season clock, even when nobody opens the map.
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
function relationName(roles){
  // The contact list can also contain a relative as a generic acquaintance.
  const specific=roles.filter(role=>!['지인','옛 인연'].includes(role));
  return (specific.length?specific:roles).join(' · ');
}
function kinRoute(target){
  const paths=[[game.player]],seen=new Set([game.player]);
  for(let i=0;i<paths.length;i++){
    const path=paths[i],id=path.at(-1);
    if(id===target)return path;
    for(const who of connections(id).keys())if(!seen.has(who)){
      seen.add(who);paths.push([...path,who]);
    }
  }
  return [];
}
function kinAction(parent,label,fn){
  const button=node('button',label,parent,'town-news');
  button.type='button';button.onclick=fn;return button;
}
function personActions(parent,id,main){
  if(game.ended || id===game.player)return;
  const watch=kinAction(parent,'',()=>{
    if(game.watching.includes(id))game.watching=game.watching.filter(who=>who!==id);
    else game.watching.push(id);
    persist();update();
  });
  function update(){
    const watched=game.watching.includes(id);
    watch.textContent=watched?'★ 소식 보는 중':'☆ 소식 챙겨보기';
    watch.setAttribute('aria-pressed',String(watched));
  }
  update();
  if(!main)return;
  const sheet=el('kin-dialog');
  if(allChildren().some(c=>c.id===id)){
    kinAction(parent,'함께 시간 보내기',()=>{if(sheet.open)sheet.close();childMenu(id);});
  }else if(game.contacts[id]){
    const talk=kinAction(parent,quietContact(id)?'지금은 혼자 쉬는 중':'먼저 연락하기',()=>{
      if(sheet.open)sheet.close();
      const current=gathered.find(entry=>entry.e.id===id);
      preview=current || {e:{type:partner(game.contacts[id])?'couple':'meet',id},kind:'visitor',hint:''};
      browsingTopics=!!current;courtesy=null;page=0;lastBeat=null;renderStage();
    });
    talk.disabled=quietContact(id);
  }
}
function kinGroups(id){
  const groups=new Map();
  for(const [who,roles] of connections(id)){
    const name=roles.includes('부모')?'부모':roles.includes('자녀')?'자녀':
      roles.some(r=>['연인','배우자','옛 인연','옛 연인','옛 배우자'].includes(r))?'연인·배우자':'친구·지인';
    if(!groups.has(name))groups.set(name,[]);
    groups.get(name).push([who,roles]);
  }
  return groups;
}
function kinSheet(first,context,main,category){
  const sheet=el('kin-dialog'),body=el('kin-detail');
  const stack=[{id:first,context,list:!!category,category,page:0}];
  function draw(){
    const view=stack.at(-1),name=kinPerson(view.id).name;
    body.replaceChildren();
    el('kin-title').textContent=view.list?(view.category || name+'의 가족'):name;
    node('p',view.context,body);
    function visit(id,context,list=false){
      stack.push({id,context,list,page:0});draw();
    }
    if(view.list){
      const rows=view.category?(kinGroups(view.id).get(view.category) || []):[...connections(view.id)];
      const grid=node('div','',body,'kin-branch');
      const size=6, start=view.page*size;
      for(const [who,roles] of rows.slice(start,start+size)){
        const label=(view.id===game.player?'내 ':name+'의 ')+relationName(roles);
        kinCard(grid,who,label,()=>visit(who,label));
      }
      if(!rows.length)node('p','아직 연결된 사람이 없어요.',body);
      if(rows.length>size){
        const nav=node('nav','',body,'kin-pages');
        kinAction(nav,'‹ 앞쪽',()=>{view.page--;draw();}).disabled=view.page===0;
        node('span',(view.page+1)+' / '+Math.ceil(rows.length/size),nav);
        kinAction(nav,'다음 ›',()=>{view.page++;draw();}).disabled=start+size>=rows.length;
      }
    }else{
      const photo=node('img','',body,'kin-detail-photo');photo.src=kinPerson(view.id).image;photo.alt='';
      const child=allChildren().find(c=>c.id===view.id);
      if(child)node('small',childAge(child)+'세',body);
      personActions(body,view.id,main);
      kinAction(body,name+'의 가족 보기',()=>visit(view.id,name+'와 연결된 사람들',true));
    }
    if(stack.length>1)kinAction(body,'‹ 이전 보기',()=>{stack.pop();draw();});
    sheet.scrollTop=0;
  }
  draw();if(!sheet.open)sheet.showModal();
}
function drawKin(container,main=false){
  const root=game.player,groups=kinGroups(root);
  const head=node('header','',container,'kin-heading');
  node('strong','우리 가계도 · '+familyIds().length+'명',head);
  const chooser=node('select','',head);chooser.setAttribute('aria-label','가계도에서 인물 찾기');
  node('option','인물 찾기',chooser).value='';
  for(const id of familyIds())if(id!==root)node('option',kinPerson(id).name,chooser).value=id;
  chooser.onchange=()=>{
    const id=chooser.value;if(!id)return;
    chooser.value='';
    const path=kinRoute(id);
    const label=path.slice(1).map((who,i)=>kinPerson(path[i]).name+'의 '+relationName(connections(path[i]).get(who))).join(' › ');
    kinSheet(id,label || '동네 사람',main);
  };
  const hero=node('div','',container,'kin-focus');
  const portrait=node('img','',hero);portrait.src=kinPerson(root).image;portrait.alt='';
  node('strong','나 · '+kinPerson(root).name,hero);
  const grid=node('div','',container,'kin-summary');
  for(const [name,rows] of groups){
    const card=node('button','',grid,'kin-cluster');card.type='button';
    const faces=node('span','',card,'kin-faces');
    for(const [id] of rows.slice(0,3)){const img=node('img','',faces);img.src=kinPerson(id).image;img.alt='';}
    node('strong',name+' '+rows.length+'명',card);
    node('small',rows.slice(0,2).map(([id])=>kinPerson(id).name).join(' · ')+(rows.length>2?' 외 '+(rows.length-2)+'명':''),card);
    card.onclick=()=>rows.length===1?kinSheet(rows[0][0],'내 '+relationName(rows[0][1]),main):kinSheet(root,'나 · '+kinPerson(root).name,main,name);
  }
}
function drawTown(board,entries){
  drawKin(node('section','',board,'kin-board'),true);
  entries=entries.filter(item=>!isLetter(item.e));
  if(entries.length){
    const invitations=node('div','',board,'town-invitations');
    for(const id of new Set(entries.map(x=>x.e.id))){
      const topics=entries.filter(x=>x.e.id===id);
      if(!topics.length)continue;
      const appointment=topics.find(item=>item.kind==='promise');
      const entry=appointment || topics[0];
      const hint=appointment?(appointment.c.plan==='concert'?'공연장 가기':(planNames[appointment.c.plan] || '약속')+' 만나러 가기'):entry.hint || '말 걸기';
      kinCard(invitations,id,hint,()=>{
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
    const sorted=[...recent].reverse().sort((a,b)=>Number(!!a.read)-Number(!!b.read) || b.when-a.when || Number(important(b))-Number(important(a)));
    const n=sorted[0];
    const prefix=item=>[important(item)?'★':'',item.read?'읽음':'새 소식',seasonDate(item.when)].filter(Boolean).join(' · ');
    const clue=n.title==='두 사람의 첫날' && !n.read && n.when===tick();
    const headline=clue?'가방에 같은 키링이 달렸다':n.title;
    const announcement=node('button',prefix(n)+' · '+n.people.slice(0,2).map(id=>kinPerson(id).name).join(' · ')+' ─ '+headline,board,'town-news');
    announcement.onclick=()=>{
      menu('동네 소식');
      for(const item of sorted){
        menuButton(prefix(item)+' · '+item.people.map(id=>kinPerson(id).name).join(' · ')+' / '+item.title,()=>{
          item.read=true;persist();closeMenu();
          const direct=connections(game.player);
          const relevant=item.people.filter(id=>direct.has(id));
          const anchor=relevant.find(id=>direct.get(id).some(role=>['연인','옛 연인','옛 인연','배우자','옛 배우자','자녀'].includes(role))) || relevant.find(id=>game.watching.includes(id)) || relevant[0] || item.people[0];
          const who=item.people.at(-1)===anchor?item.people[0]:item.people.at(-1);
          renderStage();kinSheet(who,item.title+' · '+kinPerson(anchor).name+'와 '+kinPerson(who).name,true);
        });
        node('p',item.text,lifeBody);
      }
      n.read=true;persist();renderStage();
    };
  }

}
function townSpouse(id){return game.townPairs?.some(p=>p.status==='배우자' && !p.end && p.people.includes(id));}
