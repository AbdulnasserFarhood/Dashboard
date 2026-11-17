/* ===== الإعدادات: ضع رابط الـ Web App هنا ===== */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_ZKgt4NKJWqdlDRGJjCoJ7hg1myc2aVlgPW30GNjzIsAQgTyNMYpxihnaLB32_ZTA/exec';
const KEYWORD = 'fusion';            // المهام التي يحتوي وصفها هذه الكلمة تظهر في الصفحة
const DEFAULT_PROJECT = 'RoboGeex';
/* =============================================== */

const PEOPLE = [
 {n:'Abdulnasser', k:'abdulnasser'},
 {n:'khaled moussa', k:'khaled'},
 {n:'Osama Ammar', k:'osama'},
 {n:'Ali Khalaf', k:'ali'}];
const TYPES=['مونتاج','تصميم جرافيك','كتابة محتوى','تصوير فيديو','تصوير فوتوغرافي','توثيق ومتابعة','تحرير وترجمة','تغطية فعالية','تسويق','أخرى','تنسيق مناهج'];
const PROJECTS=['RoboGeex','InJoy Toys','FGC','FGC & RoboGeex','curricula'];

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let rows=[], cur=0;

/* ----- Build static UI from data ----- */
$('cols').innerHTML=PEOPLE.slice(1).map((p,i)=>`<div class="box col"><div class="ch"><strong>${p.n}</strong><button class="plus" data-i="${i+1}">+</button></div><div class="stat" id="s${i+1}"></div><div id="l${i+1}"></div></div>`).join('');
$('ty').innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');
$('pr').innerHTML=PROJECTS.map(t=>`<option ${t===DEFAULT_PROJECT?'selected':''}>${t}</option>`).join('');

/* ----- Render tasks per person ----- */
function render(){
  PEOPLE.forEach((p,i)=>{
    const mine=rows.filter(r=>r.name.toLowerCase().includes(p.k)).sort((a,b)=>b.date.localeCompare(a.date));
    const h=mine.reduce((a,r)=>a+(parseFloat(r.hours)||0),0);
    $('s'+i).textContent=`${mine.length} مهام · ${h.toFixed(2)} ساعة`;
    $('l'+i).innerHTML=mine.map(r=>`<div class="task">${esc(r.desc)}<div class="m"><span>${esc(r.date)}</span><span class="${r.status==='تم'?'ok':'pt'}">${esc(r.status)}</span><span>${esc(r.hours||'—')} س</span></div></div>`).join('')||'<div class="msg">لا مهام بعد</div>';
  });
}

/* ----- Load data from Google Sheet ----- */
async function load(){
  if(SCRIPT_URL.startsWith('PASTE')){ $('status').textContent='ضع رابط الـ Web App في SCRIPT_URL'; return; }
  try{
    const j=await (await fetch(SCRIPT_URL)).json();
    rows=j.rows.filter(r=>r.desc.toLowerCase().includes(KEYWORD));
    $('status').textContent=''; render();
  }catch(e){ $('status').textContent='تعذّر تحميل البيانات من الشيت'; }
}

/* ----- Open add-task dialog ----- */
document.addEventListener('click',e=>{
  const b=e.target.closest('.plus'); if(!b) return;
  cur=+b.dataset.i;
  $('dt').textContent='مهمة جديدة – '+PEOPLE[cur].n;
  $('date').value=new Date().toLocaleDateString('en-CA');
  $('err').textContent=''; $('desc').value=''; $('nt').value='';
  $('dlg').showModal();
});

$('cancel').onclick=()=>$('dlg').close();

/* ----- Submit new task to Google Sheet ----- */
$('f').onsubmit=async e=>{
  e.preventDefault();
  let desc=$('desc').value.trim();
  if(!desc.toLowerCase().includes(KEYWORD)) desc='Fusion 360 | '+desc;
  $('go').disabled=true; $('err').textContent='';
  try{
    const res=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({
      name:PEOPLE[cur].n,desc,date:$('date').value,start:$('t1').value,end:$('t2').value,
      status:$('st').value,type:$('ty').value,project:$('pr').value,notes:$('nt').value})});
    const j=await res.json();
    if(!j.ok){ $('err').textContent=j.error||'فشل الإضافة'; }
    else{ $('dlg').close(); await load(); }
  }catch(x){ $('err').textContent='تعذّر الاتصال بالشيت، تحقق من الرابط وصلاحيات النشر'; }
  $('go').disabled=false;
};

load();
