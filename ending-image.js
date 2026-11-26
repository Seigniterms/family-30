// A long run stays vector-based as one file. Raster shares use bounded, lossless pages.
const albumWidth=960,albumHeight=1280;
function xmlText(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
async function embeddedPhoto(url){
  const response=await fetch(url);
  if(!response.ok)throw Error('portrait');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);
  });
}
async function buildEndingImage(){
  const cast=creditCast(),end=ending(game),people=[...cast.keys()];
  const snapshot=game.snapshot?.frame!=null && ![game.snapshot.joker,game.snapshot.sender].some(isCut)?game.snapshot:null;
  const photoIds=[...new Set([...people,...(snapshot?[snapshot.joker,snapshot.sender]:[])])];
  const assets=new Map(await Promise.all(photoIds.map(async id=>[id,await embeddedPhoto(kinPerson(id).image)])));
  const measure=document.createElement('canvas').getContext('2d');
  const pages=[];
  let page,y;
  function startPage(){page={lines:[],faces:new Set()};pages.push(page);y=98;}
  function room(height){if(y+height>albumHeight-80)startPage();}
  function words(content,size=26,weight=500,color='#403344'){
    measure.font=weight+' '+size+'px sans-serif';
    const max=albumWidth-112;let line='';
    function print(){
      room(size*1.55);
      page.lines.push('<text x="56" y="'+(y+size)+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+xmlText(line.trimEnd())+'</text>');
      y+=size*1.55;line='';
    }
    for(const word of String(content).split(/\s+/u)){
      if(line && measure.measureText(line+' '+word).width>max)print();
      if(line)line+=' ';
      for(const char of word){if(line && measure.measureText(line+char).width>max)print();line+=char;}
    }
    if(line)print();
  }
  function section(title){room(145);y+=18;words(title,34,750,'#934b3b');}
  function face(id,x,top,size){
    page.faces.add(id);
    page.lines.push('<use href="#face-'+xmlText(id)+'" x="'+x+'" y="'+top+'" width="'+size+'" height="'+size+'"/>');
  }
  startPage();words(end.title,48,800);
  words(kinPerson(game.player).name+'의 이야기 · '+clockLabel(),30);
  if(end.tags.length)words(end.tags.join('   ·   '),23);
  if(epilogue(game)?.line)words(epilogue(game).line);
  for(const t of end.threads){section(t.title);words(t.line);}
  for(const t of communityCredits(cast)){
    section(t.title);
    for(const n of t.events){words(seasonDate(n.when),22,600);words(townCreditLine(n));}
  }
  if(snapshot){
    section('첫 번개 대표 사진');
    const order=[game.player,snapshot.sender,snapshot.joker];
    room(188);
    order.forEach((id,i)=>face(id,56+i*160,y,i===2 && snapshot.frame===1?164:138));
    y+=182;words(snapshot.frame===1?kinPerson(snapshot.joker).name+'만 잘 나온 컷':'다 같이 나온 컷',23);
  }
  section('끝까지 함께한 사람들 · '+cast.size+'명');
  for(let i=0;i<people.length;i+=4){
    room(195);
    people.slice(i,i+4).forEach((id,col)=>{
      const x=56+col*215;face(id,x,y,104);
      page.lines.push('<text x="'+x+'" y="'+(y+136)+'" font-size="26" font-weight="700">'+xmlText(kinPerson(id).name)+'</text>',
        '<text x="'+x+'" y="'+(y+169)+'" font-size="22">'+xmlText(cast.get(id))+'</text>');
    });y+=188;
  }
  section('우리 모임');words(game.club.chooseOnHost?'아직 주최한 번개 없음':game.club.goal+' · 번개 '+game.club.visits+'회');
  if(game.club.completed)words(goals[game.club.goal].reward);
  for(const [kind,count] of Object.entries(game.club.tracks))words(kind+' · '+count+'회',23);
  const links=new Set();
  for(const id of familyIds()){
    for(const [other,roles] of connections(id)){
      const key=[id,other].sort().join('/');
      if(links.has(key))continue;
      if(!links.size)section('마지막 가계도');
      links.add(key);words(kinPerson(id).name+'의 '+relationName(roles)+' · '+kinPerson(other).name,23);
    }
  }
  const log=game.log.filter(visibleMemory);
  section('내 연표 · '+log.length+'개의 기억');
  for(const e of log){
    room(124);y+=12;
    const ids=[...new Set([e.id,...(e.others || [])])].filter(Boolean);
    words(e.year+'년 차 '+(seasons[e.season || 0])+' · '+ids.map(id=>kinPerson(id).name).join(' · '),22,600,'#885241');
    words(e.title,31,750);
    if(e.label)words('내 선택 · '+e.label,23);
    words(e.memory || '');
  }
  const keepsakes=(game.keepsakes || []).filter(visibleMemory);
  if(keepsakes.length){section('간직한 기념품');for(const k of keepsakes){room(100);words(k.year+'년 차 · '+k.title,28,700);words(k.memory || '');}}
  const news=(game.townNews || []).filter(n=>!n.people.some(isCut));
  if(news.length){section('동네에 남은 소식');for(const item of news){room(104);words(seasonDate(item.when)+' · '+item.title,27,700);words(item.people.map(id=>kinPerson(id).name).join(' · '),22);words(item.text);}}
  function svg(indices){
    const ids=new Set(indices.flatMap(i=>[...pages[i].faces]));
    const defs=[...ids].map(id=>'<symbol id="face-'+xmlText(id)+'" viewBox="0 0 100 100"><image width="100" height="100" preserveAspectRatio="xMidYMid slice" href="'+assets.get(id)+'"/></symbol>').join('');
    const blocks=indices.map((i,n)=>'<g transform="translate(0 '+n*albumHeight+')"><rect width="960" height="1280" fill="#fff7e7"/><rect width="960" height="12" fill="#ba6a50"/><text x="56" y="58" font-size="24" font-weight="800" fill="#804333">FAMILY 30</text>'+pages[i].lines.join('')+'<text x="904" y="1240" text-anchor="end" font-size="21" fill="#785a56">'+(i+1)+' / '+pages.length+'</text></g>').join('');
    return new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="'+albumHeight*indices.length+'" viewBox="0 0 960 '+albumHeight*indices.length+'" font-family="sans-serif" fill="#403344"><defs>'+defs+'</defs>'+blocks+'</svg>'],{type:'image/svg+xml;charset=utf-8'});
  }
  return {count:pages.length,svg,name:'Family30-'+kinPerson(game.player).name+'-'+game.year+'년차'};
}
async function albumPng(album,index){
  const url=URL.createObjectURL(album.svg([index]));
  try{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1920;
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    canvas.width=canvas.height=1;
    if(!blob)throw Error('png');
    return new File([blob],album.name+'-'+String(index+1).padStart(2,'0')+'.png',{type:'image/png'});
  }finally{URL.revokeObjectURL(url);}
}
// PNGs are already compressed. A stored ZIP avoids recompressing them on the phone.
async function pngBundle(files){
  const parts=[],directory=[];
  const table=Uint32Array.from({length:256},(_,value)=>{
    for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);
    return value>>>0;
  });
  let offset=0,centralSize=0;
  for(const file of files){
    const name=new TextEncoder().encode(file.name),bytes=new Uint8Array(await file.arrayBuffer());
    let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);
    const local=new DataView(new ArrayBuffer(30)),central=new DataView(new ArrayBuffer(46));
    local.setUint32(0,0x04034b50,true);central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);
    for(const [view,start] of [[local,4],[central,6]]){
      view.setUint16(start,20,true);view.setUint16(start+2,0x0800,true);
      view.setUint16(start+8,33,true);view.setUint32(start+10,~crc,true);
      view.setUint32(start+14,file.size,true);view.setUint32(start+18,file.size,true);view.setUint16(start+22,name.length,true);
    }
    central.setUint32(42,offset,true);
    parts.push(local.buffer,name,file);directory.push(central.buffer,name);
    offset+=30+name.length+file.size;centralSize+=46+name.length;
  }
  const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);
  end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);
  end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end.buffer],{type:'application/zip'});
}
function endingExport(){
  menu('엔딩 이미지 저장');const status=node('p','사진과 연표를 모으는 중…',lifeBody);
  const urls=[];
  lifeMenu.addEventListener('close',()=>{for(const url of urls)URL.revokeObjectURL(url);},{once:true});
  function active(){return status.isConnected && lifeMenu.open;}
  function download(blob,name,label){
    const link=node('a',label,lifeBody,'ending-download');link.download=name;link.href=URL.createObjectURL(blob);urls.push(link.href);
  }
  async function prepare(){
    try{
      const album=await buildEndingImage();if(!active())return;
      const indices=Array.from({length:album.count},(_,i)=>i);
      const files=[];
      for(const i of indices){status.textContent='PNG 준비 중 · '+(i+1)+' / '+indices.length;files.push(await albumPng(album,i));if(!active())return;}
      if(files.length>1){
        const bundle=await pngBundle(files);if(!active())return;
        download(bundle,album.name+'.zip','전체 PNG 한 번에 저장 · ZIP');
      }
      status.textContent='1440 × 1920 PNG · '+files.length+'장';
      if(navigator.canShare?.({files}))menuButton('엔딩 이미지 공유',async()=>{
        try{await navigator.share({files,title:album.name});}
        catch(err){if(err.name!=='AbortError')status.textContent='아래 이미지를 저장해서 공유해 주세요.';}
      });
      files.forEach((file,i)=>download(file,file.name,files.length===1?'PNG 저장':(i+1)+'쪽 PNG 저장'));
    }catch{if(active()){status.textContent='엔딩 이미지를 준비하지 못했어요. 다시 시도해 주세요.';menuButton('다시 준비하기',endingExport);}}
  }
  prepare();
}
