const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','moment-image.js'),'utf8');

test('Korean captions wrap at word boundaries and long unbroken words fit the card',()=>{
  const ctx={measureText:s=>({width:[...s].length})};
  const wrap=vm.runInNewContext(source+';momentLines');
  assert.deepEqual(Array.from(wrap(ctx,'가을엔 우리 사진 같이 인화하러 가자.',7)),['가을엔 우리','사진 같이','인화하러','가자.']);
  assert.deepEqual(Array.from(wrap(ctx,'단톡방멤버들이모였다',4)),['단톡방멤','버들이모','였다']);
});
