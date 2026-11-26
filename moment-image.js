// Lay out at export resolution so long Korean captions also fit on small phones.
function momentLines(ctx,text,width){
  const lines=[];
  let line='';
  for(const word of String(text).trim().split(/\s+/u)){
    if(line && ctx.measureText(line+' '+word).width>width){lines.push(line);line='';}
    if(line)line+=' ';
    for(const char of word){
      if(line && ctx.measureText(line+char).width>width){lines.push(line);line='';}
      line+=char;
    }
  }
  if(line)lines.push(line);
  return lines;
}

async function momentPng(entry){
  const width=1080,margin=72,inner=width-2*margin;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  const present=entry.present || [...(entry.label?[game.player]:[]),entry.id,...(entry.others || []),entry.speaker];
  const ids=[...new Set(present.filter(Boolean))];
  const people=await Promise.all(ids.map(async id=>{
    const person=kinPerson(id),img=new Image();
    img.src=person.image;await img.decode();
    return {name:person.name,img};
  }));
  const rows=[];
  let y=84;
  function paragraph(text,size,weight,color){
    if(!text)return;
    const font=weight+' '+size+'px sans-serif';
    ctx.font=font;
    for(const line of momentLines(ctx,text,inner)){
      rows.push({line,y,font,color});y+=Math.ceil(size*1.48);
    }
  }
  paragraph('FAMILY 30    /    '+entry.year+'년 차 '+seasons[entry.season || 0],30,750,'#995842');
  y+=22;paragraph(entry.title,56,800,'#432b3e');y+=28;
  const faceTop=y;
  y+=Math.ceil(people.length/5)*179+20;
  if(entry.label){
    paragraph('내 선택',28,750,'#995842');paragraph(entry.label,42,650,'#432b3e');y+=26;
  }
  if(entry.reply){
    paragraph(kinPerson(entry.speaker || entry.id).name+'의 대답',28,750,'#995842');
    paragraph('“'+entry.reply+'”',42,650,'#432b3e');y+=26;
  }
  const quotedReply=entry.reply && kinPerson(entry.speaker || entry.id).name+'의 대답 “'+entry.reply+'”';
  if(entry.memory && entry.memory!==entry.reply && entry.memory!==quotedReply){
    paragraph('그날의 기억',28,750,'#995842');paragraph(entry.memory,40,500,'#432b3e');
  }
  canvas.width=width;canvas.height=y+64;
  ctx.fillStyle='#fff3db';ctx.fillRect(0,0,width,canvas.height);
  ctx.fillStyle='#b86351';ctx.fillRect(0,0,width,18);
  for(const {line,y,font,color} of rows){
    ctx.font=font;ctx.fillStyle=color;ctx.textBaseline='top';ctx.fillText(line,margin,y);
  }
  for(const [i,{img,name}] of people.entries()){
    const x=margin+i%5*184,top=faceTop+Math.floor(i/5)*179,size=118;
    ctx.save();ctx.beginPath();ctx.arc(x+size/2,top+size/2,size/2,0,Math.PI*2);ctx.clip();
    const side=Math.min(img.naturalWidth,img.naturalHeight);
    ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,x,top,size,size);
    ctx.restore();
    ctx.font='650 27px sans-serif';ctx.textBaseline='top';ctx.fillStyle='#644353';
    ctx.fillText(name,x,top+size+8,170);
  }
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('png');
  return new File([blob],'Family30-'+entry.year+'년차-'+seasons[entry.season || 0]+'-'+entry.title.replace(/[/\\:*?"<>|]/g,'')+'.png',{type:'image/png'});
}

async function momentExport(entry){
  if(!visibleMemory(entry))return;
  menu('이 장면 간직하기');
  const status=node('p','장면을 사진으로 만드는 중…',lifeBody);
  try{
    const file=await momentPng(entry);
    if(!status.isConnected || !lifeMenu.open)return;
    const url=URL.createObjectURL(file);
    lifeMenu.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
    const preview=node('img','',lifeBody,'moment-preview');preview.src=url;preview.alt=entry.title;
    status.textContent=entry.year+'년 차 '+seasons[entry.season || 0]+' · '+entry.title;
    const link=node('a','장면 PNG 저장',lifeBody,'ending-download');link.download=file.name;link.href=url;
    if(navigator.canShare?.({files:[file]}))menuButton('친구에게 공유',async()=>{
      try{await navigator.share({files:[file],title:entry.title});}
      catch(error){if(error.name!=='AbortError')status.textContent='사진을 저장해서 친구에게 보내 주세요.';}
    });
  }catch{
    if(!status.isConnected || !lifeMenu.open)return;
    status.textContent='사진을 불러오지 못했어요.';menuButton('다시 만들기',()=>momentExport(entry));
  }
}
