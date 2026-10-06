const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { spawn } = require('child_process');
const base = path.resolve(__dirname, '..');
const XLSX = require(path.join(base, 'node_modules/xlsx'));
const fixture = fs.mkdtempSync(path.join(require('os').tmpdir(), 'french-center-test-'));
fs.mkdirSync(path.join(fixture, 'data'), { recursive: true });
fs.copyFileSync(path.join(base, 'server.js'), path.join(fixture, 'server.js'));
fs.mkdirSync(path.join(fixture, 'public'), {recursive:true});
for(const file of fs.readdirSync(path.join(base,'public'))) fs.copyFileSync(path.join(base,'public',file),path.join(fixture,'public',file));
const db = path.join(fixture, 'data/main data 2.xlsx');
fs.copyFileSync(path.join(base, 'data/main data 2.xlsx'), db);
const users = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(users, XLSX.utils.aoa_to_sheet([['user name','pasword','الصلاحيات'], ['test-admin','test123','مدير'], ['test-employee','test123','موظف']]), 'Users');
XLSX.writeFile(users, path.join(fixture, 'data/usre.xlsx'));
const fingerprint = () => crypto.createHash('sha256').update(fs.readFileSync(db)).digest('hex');
const originalHash = fingerprint();
const raw = () => XLSX.readFile(db);
const before = raw();
const child = spawn(process.execPath, [path.join(fixture,'server.js')], { cwd: fixture, env: {...process.env, NODE_PATH:path.join(base,'node_modules'), PORT:'3218', GARAGE_DATA_FILE:db}, windowsHide:true, stdio:['ignore','pipe','pipe'] });
child.stderr.on('data', b => process.stderr.write(b));
const url = 'http://127.0.0.1:3218';
let cookie = '';
async function req(route, method='GET', body) {
  const res = await fetch(url+route, {method, headers:{'Content-Type':'application/json',Cookie:cookie}, body:body===undefined?undefined:JSON.stringify(body)});
  const text=await res.text(); let value; try {value=JSON.parse(text)} catch {value=text};
  return {status:res.status, value, cookie:res.headers.get('set-cookie')};
}
async function login(username) { const r=await req('/api/login','POST',{username,password:'test123'});assert.equal(r.status,200,JSON.stringify(r.value));cookie=r.cookie.split(';')[0]; }
async function run() {
  for(let i=0;i<80;i++){try{await fetch(url+'/login.html');break}catch{await new Promise(r=>setTimeout(r,100))}}
  assert.equal(fingerprint(),originalHash,'startup changes supplied workbook');
  assert.equal((await req('/api/inventory/quantity','PATCH',{productId:'ROW-2',quantity:0})).status,401);
  await login('test-admin');
  let data=(await req('/api/data')).value;
  assert.equal(data.inventory.length,176);
  const first=data.inventory[0], second=data.inventory[1];
  assert.equal(first.code,'');assert.equal(second.code,'');assert.notEqual(first.productId,second.productId);
  assert.equal(fingerprint(),originalHash,'read changes workbook');
  for(const quantity of [-1,null,true,{},'bad']) assert.equal((await req('/api/inventory/quantity','PATCH',{productId:first.productId,quantity})).status,400);
  assert.equal(fingerprint(),originalHash,'invalid request changed workbook');
  let r=await req('/api/inventory/quantity','PATCH',{productId:second.productId,quantity:0});assert.equal(r.status,200,JSON.stringify(r.value));
  assert.equal(r.value.oldQty,second.qty);assert.equal(r.value.movement.qty,-second.qty);assert.equal(r.value.movement.type,'تسوية جرد');
  let after=raw();
  for(const sheet of before.SheetNames){
    if(sheet==='حركة المخزن')continue;
    for(const [cell,value] of Object.entries(before.Sheets[sheet])){
      if(cell.startsWith('!')||(sheet==='قسم المخرن'&&cell==='E'+second._sheetRow))continue;
      assert.deepEqual(after.Sheets[sheet][cell]?.v,value.v,`changed unrelated ${sheet}!${cell}`);
      assert.equal(after.Sheets[sheet][cell]?.f,value.f,`changed unrelated formula ${sheet}!${cell}`);
    }
  }
  assert.equal((await req('/api/inventory/prices','PATCH',{productId:second.productId})).status,400);
  for(const buy of [-1,null,true,{},'bad'])assert.equal((await req('/api/inventory/prices','PATCH',{productId:second.productId,buy})).status,400);
  await login('test-employee');
  assert.equal((await req('/api/accounts','POST',{amount:1})).status,403);
  assert.equal((await req('/api/users')).status,403);
  r=await req('/api/inventory/prices','PATCH',{productId:second.productId,newCode:'P-TEST-2'});assert.equal(r.status,200,JSON.stringify(r.value));
  after=raw(); assert.equal(after.Sheets['قسم المخرن']['D'+second._sheetRow].v,'P-TEST-2');assert.equal(after.Sheets['قسم المخرن']['F'+second._sheetRow]?.v,before.Sheets['قسم المخرن']['F'+second._sheetRow]?.v);
  assert.equal((await req('/api/inventory/prices','PATCH',{productId:second.productId,buy:80})).status,200);
  assert.equal((await req('/api/inventory/prices','PATCH',{productId:second.productId,sell:110})).status,200);
  assert.equal((await req('/api/inventory/quantity','PATCH',{productId:second.productId,quantity:3.5})).status,200);
  assert.equal((await req('/api/inventory/prices','PATCH',{productId:first.productId,newCode:'p-test-2'})).status,409);
  await login('test-admin'); data=(await req('/api/data')).value;
  const updated=data.inventory.find(i=>i.productId===second.productId); assert.equal(updated.qty,3.5);assert.equal(updated.buy,80);assert.equal(updated.sell,110);assert.equal(updated.margin,30);
  assert.equal(data.inventory[0].code,'');assert.equal(data.inventory[0].qty,first.qty);
  assert.equal(data.accounts.length,0);assert.equal(data.visits.length,0);assert.equal(data.suppliers.length,0);
  assert.equal(data.movements.length,2);assert.ok(data.movements.every(m=>m.productId===second.productId));
  const log=XLSX.readFile(path.join(fixture,'data/usre.xlsx'));const audit=JSON.stringify(XLSX.utils.sheet_to_json(log.Sheets['سجل الحركات']));
  assert.match(audit,/تسوية جرد/);assert.match(audit,/تعديل سعر/);assert.doesNotMatch(audit,/undefined/);
  await login('test-employee');
  r=await req('/api/inventory/details','PATCH',{productId:first.productId,name:'منتج اختبار موحد',details:'تفاصيل الاختبار',country:'مصر',supplier:'مورد الاختبار',newCode:'MANUAL1',quantity:5,buy:150,sell:220,oldValues:{name:'FAKE-CLIENT-BEFORE'}});
  assert.equal(r.status,200,JSON.stringify(r.value));
  after=raw(); const sourceRow=first._sheetRow;
  for(const [col,value] of Object.entries({A:'منتج اختبار موحد',B:'تفاصيل الاختبار',C:'مصر',D:'MANUAL1',E:5,F:150,G:220,H:70,I:'مورد الاختبار'}))assert.equal(after.Sheets['قسم المخرن'][col+sourceRow].v,value,`unified ${col}`);
  r=await req('/api/inventory/details','PATCH',{productId:first.productId,details:'',country:'',supplier:'',quantity:''});assert.equal(r.status,200,JSON.stringify(r.value));
  for(const bad of [{name:''},{quantity:true},{quantity:-1},{buy:null},{sell:-1},{newCode:'P-TEST-2'}]){
    const unchanged=fingerprint();r=await req('/api/inventory/details','PATCH',{productId:first.productId,...bad});assert.ok([400,409].includes(r.status),JSON.stringify({bad,result:r}));assert.equal(fingerprint(),unchanged);
  }
  r=await req('/api/inventory/details','PATCH',{productId:second.productId,name:second.name,quantity:3.5});assert.ok([200,400].includes(r.status));
  await login('test-admin');data=(await req('/api/data')).value;
  assert.equal(data.inventory.length,176);assert.equal(data.movements.length,3);assert.equal(data.movements[2].productId,first.productId);
  assert.equal(data.accounts.length,0);assert.equal(data.visits.length,0);assert.equal(data.suppliers.length,0);
  assert.equal(data.inventory[0].name,'منتج اختبار موحد');assert.equal(data.inventory[0].qty,5);assert.equal(data.inventory[0].supplier,'');
  const auditFinal=XLSX.readFile(path.join(fixture,'data/usre.xlsx'));const auditText=JSON.stringify(XLSX.utils.sheet_to_json(auditFinal.Sheets['سجل الحركات']));assert.doesNotMatch(auditText,/undefined|FAKE-CLIENT-BEFORE/);assert.match(auditText,/تعديل تفاصيل/);
  console.log('PASS: startup hash, 176 products, isolated preservation, unified details, clearing optional text, numeric validation, quantity zero/fractions, employee permissions, partial prices/code, margin, no extra movement on unchanged quantity, audit and unchanged financial history.');
}
run().then(()=>{if(process.argv.includes('--serve'))console.log('UI fixture ready http://localhost:3218 test-employee/test123');else child.kill();}).catch(error=>{child.kill();console.error(error);process.exitCode=1;});
