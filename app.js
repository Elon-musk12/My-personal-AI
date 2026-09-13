const views = {
 home: document.getElementById('homeView'),
 journal: document.getElementById('journalView'),
 ideas: document.getElementById('ideasView'),
 wallet: document.getElementById('walletView'),
 youtube: document.getElementById('youtubeView'),
 devices: document.getElementById('devicesView'),
 settings: document.getElementById('settingsView')
};
const nav = document.querySelectorAll('[data-view]');
const title = document.getElementById('pageTitle');

function showView(name){
  Object.values(views).forEach(v=>v.classList.remove('active'));
  views[name].classList.add('active');
  nav.forEach(n=>n.classList.toggle('active',n.dataset.view===name));
  title.textContent = ({home:'Home',journal:'Daily Journal',ideas:'Idea Engine',wallet:'Account Wallet',youtube:'YouTube Learning',devices:'Authorized Devices',settings:'Settings'})[name];
  window.scrollTo({top:0,behavior:'smooth'});
}
nav.forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));

if(localStorage.getItem('gel_logged_in')!=='1') location.href='login.html';
document.getElementById('logoutBtn').addEventListener('click',()=>{localStorage.removeItem('gel_logged_in');location.href='login.html'});

const journalForm=document.getElementById('journalForm');
journalForm.addEventListener('submit',e=>{
  e.preventDefault();
  const text=document.getElementById('journalText').value.trim();
  if(!text)return;
  const items=JSON.parse(localStorage.getItem('gel_journal')||'[]');
  items.unshift({date:new Date().toLocaleString(),text});
  localStorage.setItem('gel_journal',JSON.stringify(items.slice(0,100)));
  document.getElementById('journalText').value='';
  renderJournal();
});
function renderJournal(){
 const box=document.getElementById('journalList'); const items=JSON.parse(localStorage.getItem('gel_journal')||'[]');
 box.innerHTML=items.length?items.map(x=>`<div class="row"><div><b>${escapeHtml(x.text.slice(0,90))}${x.text.length>90?'…':''}</b><div class="muted">${escapeHtml(x.date)}</div></div></div>`).join(''):'<div class="muted">No entries yet. Tell GEL how your day went.</div>';
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
renderJournal();

const devices=[
 {name:'Main Device',detail:'This device',active:true},
 {name:'Backup Device',detail:'Not logged in',active:false},
 {name:'Recovery Device 1',detail:'Not logged in',active:false},
 {name:'Recovery Device 2',detail:'Not logged in',active:false}
];
function renderDevices(){
 document.getElementById('deviceList').innerHTML=devices.map((d,i)=>`<div class="device"><div class="device-meta"><span class="dot" style="background:${d.active?'var(--green)':'#526a80'}"></span><div><b>${d.name}</b><div class="muted">${d.detail}</div></div></div><button class="btn ${i===0?'danger':''}" onclick="toggleDevice(${i})">${d.active?'Remove':'Authorize'}</button></div>`).join('');
}
window.toggleDevice=i=>{if(i===0){alert('The main device cannot be removed from this demo.');return} devices[i].active=!devices[i].active;devices[i].detail=devices[i].active?'Authorized':'Not logged in';renderDevices();document.getElementById('deviceCount').textContent=devices.filter(d=>d.active).length+'/4 Authorized Devices'};
renderDevices();

document.getElementById('saveSettings').addEventListener('click',()=>{localStorage.setItem('gel_name',document.getElementById('displayName').value);alert('Settings saved.')});
document.getElementById('displayName').value=localStorage.getItem('gel_name')||'Seyi';

document.getElementById('ideaBtn').addEventListener('click',()=>{
 const ideas=['Build a web dashboard that controls a small ESP32 robot in real time.','Create a local-business website generator where GEL turns a business profile into a polished site.','Build a learning tracker that connects your daily journal to the skills you are trying to master.'];
 document.getElementById('ideaOutput').innerHTML=`<div class="idea"><b>${ideas[Math.floor(Math.random()*ideas.length)]}</b><p class="muted">GEL would later analyze your projects, journal and learning history to generate more personalized ideas.</p></div>`;
});
document.getElementById('ytSearch').addEventListener('click',()=>{
 const q=document.getElementById('ytQuery').value.trim()||'web development robotics AI';
 window.open('https://www.youtube.com/results?search_query='+encodeURIComponent(q),'_blank','noopener');
});
document.getElementById('clearJournal').addEventListener('click',()=>{if(confirm('Clear local journal entries?')){localStorage.removeItem('gel_journal');renderJournal()}});

document.getElementById('searchBox').addEventListener('keydown',e=>{
 if(e.key==='Enter'){const q=e.target.value.trim();if(!q)return;document.getElementById('globalResult').textContent=`GEL search is ready for: “${q}” — full AI/web search will be connected in Phase 2.`;showView('home');}
});
