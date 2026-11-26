// The final reel is rebuilt from the current save so older completed runs can play it too.
function creditCast(){
  const cast=new Map([[game.player,'나']]);
  function include(id,role){if(!isCut(id) && !cast.has(id))cast.set(id,role);}
  if(spouse())include(spouse(),'배우자');
  const descendants=new Set([game.player]);
  // Keep the family branch intact even when an intermediate parent has been cut off.
  for(const child of allChildren()){
    if(!child.parents.some(id=>descendants.has(id)))continue;
    descendants.add(child.id);
    include(child.id,child.parents.includes(game.player)?'자녀':'후손');
  }
  for(const [id,c] of Object.entries(game.contacts)){
    if(c.role!=='옛 인연')include(id,c.role);
  }
  return cast;
}
function creditMemories(){
  const entries=game.log.filter(visibleMemory);
  const highlights=new Set([entries[0],entries.at(-1)].filter(Boolean));
  const priority=e=>['arrival','marry','date','split','childVisit','calendarVisit','weddingLetter','outingDay'].includes(e.effect)?2:e.code || e.art?1:0;
  for(let year=1;year<=game.year;year+=4){
    const period=entries.filter(e=>e.year>=year && e.year<year+4);
    if(period.length)highlights.add(period.reduce((best,e)=>priority(e)>priority(best)?e:best));
  }
  return entries.filter(e=>highlights.has(e) || e.thread);
}
function communityCredits(cast){
  const news=(game.townNews || []).filter(n=>n.people?.length>=2 && !n.people.some(isCut));
  if(!news.length)return [];
  const result=[],used=new Set();
  const descendants=[...cast].filter(([,role])=>role==='자녀' || role==='후손').map(([id])=>id);
  function add(ids,label){
    for(const id of ids){
      const events=news.filter(n=>n.people.includes(id));
      const last=events.findLast(n=>!used.has(n));if(!last)continue;
      const first=events.find(n=>!used.has(n) && n.when<last.when);
      const selected=first?[first,last]:[last];
      selected.forEach(n=>used.add(n));
      result.push({title:label+' · '+kinPerson(id).name,events:selected});
      return;
    }
  }
  add(game.watching || [],'소식을 챙긴 사람');
  add(descendants,'우리 집의 다음 세대');
  if(!result.length){
    const closest=Object.entries(game.club?.guests || {}).sort((a,b)=>b[1]-a[1]).map(([id])=>id);
    add([...closest,...news[0].people],'동네에서 이어진 인연');
  }
  return result;
}
function townCreditLine(n){
  const names=n.people.map(id=>kinPerson(id).name);
  return names.join(' · ')+' — '+n.text;
}
function creditPortrait(parent,id,role){
  const person=kinPerson(id),figure=node('figure','',parent,'credit-face');
  const img=node('img','',figure);img.src=person.image;img.alt='';img.width=60;img.height=60;
  const caption=node('figcaption','',figure);
  node('strong',person.name,caption);node('small',role,caption);
}
function showCredits(replay=false){
  const cast=creditCast(),end=ending(game),title=end.title,community=communityCredits(cast);
  actors.replaceChildren();dock.replaceChildren();
  el('stage-time').textContent=clockLabel()+' · 엔딩';
  const frame=node('section','',actors,'credits-frame');
  frame.setAttribute('aria-label',clockLabel()+' 엔딩 크레딧');
  function finalPhoto(){
    frame.replaceChildren();dock.replaceChildren();frame.className='credits-frame credits-photo';
    node('small',clockLabel()+' · 마지막 사진',frame,'credit-year');
    node('h1',title,frame);
    for(const t of end.threads)node('p',t.line,frame);
    const group=node('div','',frame,'credit-group');
    for(const [id,role] of cast)creditPortrait(group,id,role);
    dockButton(tick()===119?'30년의 가족 앨범':'우리 가족 앨범',openAlbum);
    dockButton('엔딩 이미지 저장·공유',endingExport);
    dockButton('엔딩 다시 보기',()=>showCredits(true),true);
    if(!game.creditsSeen){game.creditsSeen=true;persist();}
  }
  if(game.creditsSeen && !replay){finalPhoto();return;}
  const reel=node('div','',frame,'credit-reel');
  node('small','첫 봄부터 '+clockLabel()+'까지',reel,'credit-year');
  node('h1',members[game.player].name+(tick()===119?'의 30년':'의 이야기'),reel);
  if(game.snapshot?.frame!=null)photoPrint(reel,game.snapshot.frame);
  const threads=new Map();
  for(const entry of creditMemories()){
    const card=threads.get(entry.thread) || node('article','',reel,'credit-memory');
    if(entry.thread)threads.set(entry.thread,card);
    node('small',entry.year+'년 차 '+seasons[entry.season || 0],card,'credit-year');
    node('h2',entry.title,card);
    if(entry.art && Object.hasOwn(secretArt,entry.art)){
      const image=node('img','',card,'credit-still');
      image.src='materials/secret-'+entry.art+'.webp';image.alt=secretArt[entry.art];
    }
    if(entry.label && (entry.thread || entry.effect==='outreach'))node('small','내 선택 · '+entry.label,card);
    node('p',entry.memory,card);
    const withWhom=[...new Set([entry.id,...(entry.others || [])])].filter(id=>id!==game.player && !isCut(id));
    if(withWhom.length)node('small',withWhom.map(id=>kinPerson(id).name).join(' · '),card);
  }
  for(const thread of community){
    const card=node('article','',reel,'credit-memory');
    node('h2',thread.title,card);
    for(const n of thread.events){node('small',seasonDate(n.when),card,'credit-year');node('p',townCreditLine(n),card);}
  }
  for(const t of end.threads){
    const card=node('article','',reel,'credit-memory');
    node('h2',t.title,card);node('p',t.line,card);
  }
  node('h2',cast.size>1?'끝까지 함께한 사람들':'마지막 장면의 나',reel);
  const group=node('div','',reel,'credit-group');
  for(const [id,role] of cast)creditPortrait(group,id,role);
  const maxScroll=()=>Math.max(0,frame.scrollHeight-frame.clientHeight);
  const manual=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !window.requestAnimationFrame;
  let paused=false,position=0,last=null,raf;
  function finish(){cancelAnimationFrame(raf);finalPhoto();}
  function animate(now){
    if(!frame.isConnected)return;
    if(paused || chat.hidden || document.hidden || lifeMenu.open || albumDialog.open){last=null;}
    else if(last!==null){
      position+=Math.min(now-last,100)*0.032;
      frame.scrollTop=Math.min(position,maxScroll());
      if(position>=maxScroll()+55){finish();return;}
    }
    if(!paused && !chat.hidden && !document.hidden && !lifeMenu.open && !albumDialog.open)last=now;
    raf=requestAnimationFrame(animate);
  }
  if(manual){
    frame.classList.add('credits-manual');frame.tabIndex=0;
  }else{
    const pause=node('button','잠시 멈추기',dock);
    pause.onclick=()=>{paused=!paused;pause.textContent=paused?'계속 보기':'잠시 멈추기';last=null;};
    raf=requestAnimationFrame(animate);
  }
  dockButton('엔딩 이미지 저장·공유',endingExport);
  dockButton('마지막 사진 보기',()=>{if(raf!==undefined)cancelAnimationFrame(raf);finalPhoto();},true);
}
