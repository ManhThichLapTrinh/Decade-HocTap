/* Decade – Neon Pink Dark
 * Vào web (gating): belt_open -> (GIỮ FRAME CUỐI & CHỜ NHẤN DRIVER) ->
 * belt_close -> henshin_effect (GIỮ FRAME CUỐI) ->
 * flash + logo -> flash + logo biến mất -> ẨN henshin_effect -> vào web.
 * Chuyển tab: flash + logo với nền mờ; KHÔNG driver; SFX chỉ phát 1 lần/nhấn.
 */
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];
const $  = (s, r=document)=>r.querySelector(s);

const CONFIG = {
  base: "./assets/decade",
  fps: 24,
  probeMax: 120,
  pad: 4,
  sounds: { open: "sound_1.mp3", close: "sound_2.mp3" },

  autoplayOnLoad: true,   // vào web: chạy henshin (gating)
  flash1: 420,
  logoHold: 900,
  flash2: 420,

  // Âm thanh khi CHUYỂN TAB (SFX mặc định; belt sẽ dùng SFX theo Rider)
  tabSound: "Sound_effect.mp3",
  tabSoundVolume: 1.0
};

let overlay, driver, toast, seqWrap, flashEl, logoImg;
let pendingTarget = null;
let playingSeq = false;
let isTransitioning = false; // chống double-click khi chuyển tab

/* Danh sách frames (tùy chọn) */
const seqLists = { belt_open: [], belt_close: [], henshin_effect: [] };

/* ===== BG theo từng Rider (light/dark) ===== */
const BG = {
  decade: {
    light: "radial-gradient(1200px 700px at 50% -10%, #ffffff 0%, #f2f6ff 60%, #eaf0ff 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #101522 0%, #0c111b 60%, #0b0f19 100%)"
  },
  faiz: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fff 0%, #ffe8ee 55%, #ffd6e0 100%), radial-gradient(800px 500px at 50% -10%, rgba(255,0,51,.08), rgba(255,0,51,0) 70%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #140a0d 0%, #0c0a10 55%, #0a0c12 100%), radial-gradient(900px 600px at 50% -10%, rgba(255,0,51,.18), rgba(255,0,51,0) 70%)"
  },
  kabuto: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fff 0%, #ffecef 55%, #ffe2e6 100%), radial-gradient(1000px 700px at 80% -20%, rgba(0,122,255,.12), rgba(0,122,255,0) 70%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #140b0e 0%, #100c12 55%, #0c0f14 100%), radial-gradient(1000px 700px at 80% -20%, rgba(0,122,255,.18), rgba(0,122,255,0) 70%)"
  },
  w: {
    light: "radial-gradient(1200px 700px at 50% -10%, #f7fff7 0%, #e9fff3 55%, #e3f7ff 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #0f1912 0%, #0c1714 55%, #0b1418 100%)"
  },
  ghost: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fff7f0 0%, #ffe8d2 55%, #ffe7f0 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #1a130c 0%, #141116 55%, #10131a 100%)"
  },
  build: {
    light: "radial-gradient(1200px 700px at 50% -10%, #eef6ff 0%, #e7f0ff 55%, #ffe7f7 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #0b1320 0%, #0c121d 55%, #180c19 100%)"
  },
  ooo: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fff6f6 0%, #fff2d9 55%, #f0ffe0 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #1b1010 0%, #1a150c 55%, #0f1a10 100%)"
  },
  fourze: {
    light: "radial-gradient(1200px 700px at 50% -10%, #f6fbff 0%, #e9f6ff 55%, #fff0e6 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #0e131a 0%, #0b1218 55%, #1a120c 100%)"
  },
  gaim: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fff7ea 0%, #ffefd6 55%, #e8fff8 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #1a140a 0%, #18120c 55%, #0c1716 100%)"
  },
  zeroone: {
    light: "radial-gradient(1200px 700px at 50% -10%, #fbffe0 0%, #f2ffd1 55%, #e0fbff 100%)",
    dark:  "radial-gradient(1200px 700px at 50% -10%, #121a05 0%, #0f1a0a 55%, #0a171a 100%)"
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  overlay  = $('#overlay') || $('.henshin-overlay');
  driver   = $('.decade-driver');
  toast    = $('.toast');
  seqWrap  = $('#seq');
  flashEl  = $('#flash');
  logoImg  = $('#decade-logo');

  // Build frames & preload âm thanh trước khi autoplay
  await buildSequences();
  preloadSounds();

  // ====== MENU EVENTS ======
  // 1) Chỉ nút có data-tab mới chuyển tab
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.tab;
      if(!target || btn.classList.contains('is-active')) return;
      runTabTransition(target, btn).catch(console.error);
    });
  });
  // 2) Điều hướng ngoài (Khóa học) sau hiệu ứng
  document.querySelectorAll('[data-link]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      const url = el.getAttribute('data-link') || el.getAttribute('href');
      if(!url) return;
      e.preventDefault();
      navigateWithTransition(url);
    });
  });

  // Click driver để tiếp tục sau belt_open
  driver.addEventListener('click', async ()=>{
    if(!overlay.classList.contains('active') || !pendingTarget) return;

    // belt_close
    playSound('close');
    driver.classList.remove('open'); void driver.offsetWidth; driver.classList.add('close');
    await playSequence("belt_close", { holdLast:false, clearAfter:false });

    // henshin_effect: GIỮ frame cuối cho tới khi logo biến mất
    await playSequence("henshin_effect", { holdLast:true, clearAfter:false });

    // Chuỗi neon logo (không SFX tab ở flow vào web)
    await runLogoSequence({ withSound:false });

    // Ẩn henshin_effect sau khi logo biến mất
    clearSeq();

    // Vào web
    applyTab(pendingTarget);
    pendingTarget = null;
    overlay.classList.remove('active','tab-mode');
    releaseGate();
  });

  // Gating: vào web là bật henshin
  if (CONFIG.autoplayOnLoad) {
    const activeBtn = document.querySelector('.tab-btn.is-active')
                    || document.querySelector('.tab-btn[data-tab="home"]');
    await startHenshinOpen(activeBtn?.dataset.tab || 'home', activeBtn);
  }

  // HOME COURSES
  renderHomeCourses();

  // Belt reveal (hover logo Decade)
  setupBeltHoverReveal();

  // Render Rider belt
  renderRiderBelt();

  // Login swipe
  initDecadeLogin();
});

/* ---------- HENSHIN khi vào web ---------- */
async function startHenshinOpen(targetTabName, btnEl){
  // đổi trạng thái nút ngay
  document.querySelectorAll('.tab-btn[data-tab]').forEach(b=> b.classList.toggle('is-active', b===btnEl));

  pendingTarget = targetTabName;
  overlay.classList.remove('tab-mode');  // không mờ nền
  overlay.classList.add('active');

  // driver mở + sound_1
  driver.classList.remove('close'); void driver.offsetWidth; driver.classList.add('open');
  playSound('open');
  showToast('Open! Nhấn driver để tiếp tục…');

  // belt_open: GIỮ frame cuối & CHỜ NHẤN DRIVER
  await playSequence("belt_open", { holdLast:true, clearAfter:false });
  // -> dừng tại đây, chờ click driver
}

/* ---------- TAB SWITCH: neon logo + SFX (1 lần) + nền mờ ---------- */
function setTabBlur(on){ document.body.classList.toggle('tab-transitioning', !!on); }

async function runTabTransition(targetTabName, btnEl){
  if (!targetTabName || isTransitioning) return;  // chống double / invalid
  isTransitioning = true;

  setTabBlur(true);
  overlay.classList.add('tab-mode','active');
  driver.classList.remove('open','close'); // ẩn driver (CSS cũng ẩn)

  // Chuỗi neon logo có âm thanh SFX tab (mặc định)
  await runLogoSequence({ withSound:true });

  // Đổi tab nội bộ (để giữ trạng thái active của nút)
  switchTabUI(targetTabName, btnEl);

  // Tắt overlay
  overlay.classList.remove('active','tab-mode');
  setTabBlur(false);

  isTransitioning = false;
}

/* ---------- Điều hướng ngoài sau hiệu ứng ---------- */
async function navigateWithTransition(url){
  if(isTransitioning || !url){ window.location.href = url; return; }
  isTransitioning = true;

  setTabBlur(true);
  overlay.classList.add('tab-mode','active');
  await runLogoSequence({ withSound:true });
  overlay.classList.remove('active','tab-mode');
  setTabBlur(false);

  isTransitioning = false;
  window.location.href = url;
}

/* ---------- Chuỗi neon: lóe → logo → lóe biến mất ---------- */
async function runLogoSequence({ withSound = false } = {}){
  // reset
  logoImg.classList.remove('show','vanish');
  flashEl.classList.remove('show');
  void flashEl.offsetWidth;

  // Flash #1 (+ SFX 1 lần duy nhất nếu bật)
  if (withSound) playTabSound();
  flashOnce(CONFIG.flash1);
  await wait(CONFIG.flash1 * 0.7);

  // Show logo
  logoImg.classList.add('show');
  await wait(CONFIG.logoHold);

  // Flash #2 (KHÔNG phát SFX lần 2)
  flashOnce(CONFIG.flash2);
  logoImg.classList.add('vanish');
  await wait(CONFIG.flash2);

  logoImg.classList.remove('show','vanish');
}
function flashOnce(dur){
  flashEl.style.animationDuration = `${dur}ms`;
  flashEl.classList.remove('show'); void flashEl.offsetWidth;
  flashEl.classList.add('show');
}

/* ---------- Play PNG sequences (giữ frame cuối nếu cần) ---------- */
async function playSequence(name, {holdLast=false, clearAfter=true}={}){
  const list = seqLists[name]||[];
  if(list.length===0){ await wait(250); return; }

  while (playingSeq) { await wait(10); }
  playingSeq = true;

  const img = new Image();
  let lastUrl = null;
  seqWrap.replaceChildren(img);

  const delay = Math.max(10, Math.floor(1000/CONFIG.fps));
  for(let i=0;i<list.length;i++){
    lastUrl = list[i];
    img.src = lastUrl;
    await wait(delay);
  }

  if(holdLast){
    img.src = lastUrl; // giữ khung cuối
  }else if(clearAfter){
    clearSeq();
  }

  playingSeq = false;
}
function clearSeq(){ seqWrap && seqWrap.replaceChildren(); }

/* ---------- Build frames ---------- */
async function buildSequences(){
  const manifest = await fetchJSON(`${CONFIG.base}/frames.json`);
  const names = Object.keys(seqLists);
  for(const name of names){
    let frames = [];
    if (manifest && Number.isInteger(manifest[name]) && manifest[name] > 0){
      const count = manifest[name];
      frames = Array.from({length:count}, (_,i)=> frameURL(name, i));
    } else {
      frames = await discoverFramesByImage(name, CONFIG.probeMax);
    }
    seqLists[name] = frames;
  }
}
function frameURL(name, idx){
  return `${CONFIG.base}/${name}/${name}_${String(idx).padStart(CONFIG.pad,'0')}.png`;
}
async function discoverFramesByImage(name, maxN){
  const out = [];
  for(let i=0;i<maxN;i++){
    const url = frameURL(name, i);
    const ok = await imageExists(url);
    if(!ok){
      if(i===0) return [];  // không có seq này
      break;                // dừng tại frame cuối
    }
    out.push(url);
  }
  return out;
}
function imageExists(url){
  return new Promise(resolve=>{
    const im = new Image();
    im.onload = ()=> resolve(true);
    im.onerror= ()=> resolve(false);
    im.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  });
}

/* ---------- Tabs & UI helpers ---------- */
function switchTabUI(name, btn){
  document.querySelectorAll('.tab-btn[data-tab]').forEach(b=> b.classList.toggle('is-active', b===btn));
  document.querySelectorAll('.tab-panel').forEach(p=> p.classList.remove('is-active'));
  const panel = document.getElementById('tab-'+name);
  if(panel){ panel.classList.add('is-active'); panel.focus({preventScroll:true}); }
}
function applyTab(name){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('is-active'));
  const panel = document.getElementById('tab-'+name);
  if(panel){ panel.classList.add('is-active'); panel.focus({preventScroll:true}); }
}

/* ---------- Gate + Toast + Sound ---------- */
function releaseGate(){ document.documentElement.classList.remove('henshin-gate'); }
const wait = (ms)=> new Promise(r=>setTimeout(r, ms));

let toastTimer=0;
function showToast(msg){ clearTimeout(toastTimer); toast.textContent=msg; toast.classList.add('show'); toastTimer=setTimeout(()=>toast.classList.remove('show'),2200); }

function getAudioEl(id, src){
  let el = document.getElementById(id);
  if(!el){
    el=document.createElement('audio');
    el.id=id; el.src=src; el.preload='auto';
    document.body.appendChild(el);
  } else if (src && !el.src.includes(src)) {
    el.src=src;
  }
  return el;
}
function preloadSounds(){
  getAudioEl("sound-open",  `${CONFIG.base}/${CONFIG.sounds.open}`);
  getAudioEl("sound-close", `${CONFIG.base}/${CONFIG.sounds.close}`);
  getAudioEl("sound-tab",   `${CONFIG.base}/${CONFIG.tabSound}`);
  preloadRiderSfx(); /* SFX theo Rider */
}
function playSound(which){
  const id = which==='open' ? 'sound-open' : 'sound-close';
  const file = which==='open' ? CONFIG.sounds.open : CONFIG.sounds.close;
  const audio = document.getElementById(id) || getAudioEl(id, `${CONFIG.base}/${file}`);
  try{ audio.currentTime = 0; audio.play().catch(()=>{}); }catch{}
}
function playTabSound(){
  const el = document.getElementById('sound-tab') || getAudioEl('sound-tab', `${CONFIG.base}/${CONFIG.tabSound}`);
  try { el.volume = CONFIG.tabSoundVolume ?? 1.0; el.currentTime = 0; el.play().catch(()=>{}); } catch {}
}

/* ---------- Fetch JSON helper ---------- */
async function fetchJSON(url){
  try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return null; return await r.json(); }
  catch{ return null; }
}

/* =========================================================
   HOME COURSES – đọc từ localStorage & render theo danh mục
   ========================================================= */
const LS_KEY = 'decade_courses_v1';
const loadCourses = ()=> {
  try{ return JSON.parse(localStorage.getItem(LS_KEY)) || []; }catch{ return []; }
};
const CATS = ['programming','music','design','language','other'];
const CAT_LABEL = {
  programming:'Lập trình', music:'Âm nhạc', design:'Design', language:'Language', other:'Khác'
};
const esc = (s='')=>{ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; };

const iUsers = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="7" r="4" stroke="#7a819a" stroke-width="2"/></svg>`;
const iBook  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" stroke="#7a819a" stroke-width="2" stroke-linejoin="round"/><path d="M8 7h8M8 11h8" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/></svg>`;
const iClock = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#7a819a" stroke-width="2"/><path d="M12 7v5l3 3" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/></svg>`;

function groupByCategory(list){
  const g = { programming:[], music:[], design:[], language:[], other:[] };
  list.forEach(c=>{
    let k = (c.category||'other').toLowerCase();
    if(!g[k]) k='other';
    g[k].push(c);
  });
  return g;
}
function courseCard(c){
  const lessonsCount = (c.lessons||[]).length;
  const students = c.stats?.students;
  const duration = c.stats?.duration;

  const el = document.createElement('article');
  el.className = 'course-card';
  el.innerHTML = `
    <div class="course-thumb">
      ${c.img ? `<img src="${c.img}" alt="${esc(c.name)}">`
              : `<div class="placeholder">${esc((c.name||'?').slice(0,1).toUpperCase())}</div>`}
    </div>
    <div class="course-body">
      <div class="course-title">${esc(c.name||'Chưa đặt tên')}</div>
      <div class="price free">Miễn phí</div>
      <div class="course-info">${esc(c.info||'')}</div>
      <div class="course-meta">
        ${students!=null ? `<span class="meta-item">${iUsers}<span>${Number(students).toLocaleString('vi-VN')}</span></span>` : ``}
        <span class="meta-item">${iBook}<span>${lessonsCount}</span></span>
        ${duration ? `<span class="meta-item">${iClock}<span>${esc(duration)}</span></span>` : ``}
      </div>
      <div class="course-actions-row">
        <a class="btn primary" href="./manage-courses/manage-courses.html"
           data-link="./manage-courses/manage-courses.html">Chi tiết</a>
      </div>
    </div>`;
  return el;
}
function renderSection(cat, list, root){
  if(!list.length) return;
  const sec = document.createElement('section');
  sec.className = 'home-cat';
  sec.innerHTML = `
    <header class="home-cat__head">
      <h2><span class="pill">${CAT_LABEL[cat]}</span></h2>
      <a class="view-all" href="./manage-courses/manage-courses.html"
         data-link="./manage-courses/manage-courses.html">Xem tất cả</a>
    </header>
    <div class="card-grid home" id="grid-${cat}"></div>`;
  root.appendChild(sec);
  const grid = sec.querySelector(`#grid-${cat}`);
  list.slice(0,8).forEach(c=> grid.appendChild(courseCard(c)));
}
function renderHomeCourses(){
  const root = document.getElementById('home-courses');
  if(!root) return;
  root.innerHTML = '';

  const all = loadCourses();
  const grouped = groupByCategory(all);
  ['programming','music','design','language','other'].forEach(cat=>{
    renderSection(cat, grouped[cat], root);
  });

  // Link “Chi tiết / Xem tất cả” chạy hiệu ứng trước khi đi
  root.querySelectorAll('[data-link]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      const url = el.getAttribute('data-link') || el.getAttribute('href');
      if(url){ e.preventDefault(); navigateWithTransition(url); }
    });
  });
}

/* =========================================================
   RIDER THEME: Picker + Accent + Flash logo + Badge
   ========================================================= */
const RIDERS = [
  { id:'decade',  name:'Decade',   logo:'./assets/decade/decade-logo.png',  accent:'#ff0a82', accent2:'#31ffd8' },
  { id:'faiz',    name:'Faiz',     logo:'./assets/logos/faiz.png',          accent:'#ff0033', accent2:'#ffe066' },
  { id:'kabuto',  name:'Kabuto',   logo:'./assets/logos/kabuto.png',        accent:'#ff2e2e', accent2:'#fca311' },
  { id:'w',       name:'W',        logo:'./assets/logos/w.png',             accent:'#31ffd8', accent2:'#7cff00' },
  { id:'ghost',   name:'Ghost',    logo:'./assets/logos/ghost.png',         accent:'#ff7a00', accent2:'#ffd166' },
  { id:'build',   name:'Build',    logo:'./assets/logos/build.png',         accent:'#008cff', accent2:'#ff008c' },
  { id:'ooo',     name:'OOO',      logo:'./assets/logos/ooo.png',           accent:'#e63946', accent2:'#f1c40f' },
  { id:'fourze',  name:'Fourze',   logo:'./assets/logos/fourze.png',        accent:'#00c2ff', accent2:'#ff6b00' },
  { id:'gaim',    name:'Gaim',     logo:'./assets/logos/gaim.png',          accent:'#ff9f1c', accent2:'#2ec4b6' },
  { id:'zeroone', name:'Zero-One', logo:'./assets/logos/gotchard.png',      accent:'#d4ff00', accent2:'#00e5ff' }
];
const RIDER_KEY = 'ui.rider';

function applyRiderTheme(r){
  if(!r) return;
  document.documentElement.style.setProperty('--accent',  r.accent);
  document.documentElement.style.setProperty('--accent-2',r.accent2);
  document.documentElement.style.setProperty('--rider-logo', `url('${r.logo}')`);

  /* Cập nhật nền theo Rider */
  const bg = BG[r.id];
  if (bg) {
    document.documentElement.style.setProperty('--page-bg', bg.light);
    document.documentElement.style.setProperty('--page-bg-dark', bg.dark);
  }

  const flashLogo = document.getElementById('decade-logo');
  if (flashLogo) flashLogo.src = r.logo;

  try{ localStorage.setItem(RIDER_KEY, r.id); }catch{}
  document.querySelectorAll('.logo-chip').forEach(el=>{
    el.classList.toggle('is-active', el.dataset.id===r.id);
  });

  // Đồng bộ trạng thái active trên Rider Belt (nếu đã render)
  const belt = document.getElementById('rider-belt');
  if(belt){
    belt.querySelectorAll('.belt-chip').forEach(el=>{
      el.classList.toggle('is-active', el.dataset.id===r.id);
    });
  }
}

/* Map Tab -> Rider (đổi logo + accent khi chuyển tab, trước khi flash) */
const TAB_RIDER = { home:'decade', gallery:'decade', profile:'faiz', khoahoc:'build', login:'ghost' };
const pickRiderByTab = (tab)=> RIDERS.find(r=> r.id === (TAB_RIDER[tab] || 'decade')) || RIDERS[0];

/* Chèn badge logo theo danh mục trên thẻ khóa học */
const CAT_LOGO = {
  programming:'./assets/logos/build.png',
  design:'./assets/logos/w.png',
  language:'./assets/logos/ghost.png',
  music:'./assets/logos/faiz.png',
  other:'./assets/decade/decade-logo.png'
};
const _courseCardOrig = courseCard;
courseCard = function(c){
  const el = _courseCardOrig(c);
  const catLogo = CAT_LOGO[(c.category||'other')];
  if(catLogo){
    const thumb = el.querySelector('.course-thumb');
    if(thumb){
      const badge = document.createElement('span');
      badge.className = 'logo-badge';
      badge.style.setProperty('--logo', `url('${catLogo}')`);
      thumb.appendChild(badge);
    }
  }
  return el;
};

/* Hook đổi Rider khi chuyển tab / vào trang lần đầu */
const _runTabTransition = runTabTransition;
runTabTransition = async function(targetTabName, btnEl){
  if(!targetTabName) return;
  applyRiderTheme(pickRiderByTab(targetTabName));
  return _runTabTransition(targetTabName, btnEl);
};
const _startHenshinOpen = startHenshinOpen;
startHenshinOpen = async function(targetTabName, btnEl){
  applyRiderTheme(pickRiderByTab(targetTabName||'home'));
  return _startHenshinOpen(targetTabName, btnEl);
};

/* === Filter logos + click đổi theme (gallery) === */
document.addEventListener('DOMContentLoaded', ()=>{
  const section = document.querySelector('.logo-section');
  if(!section) return;

  const buttons = section.querySelectorAll('[data-filter]');
  const items = section.querySelectorAll('.logo-item');

  // Filter theo Heisei / Reiwa / All
  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      buttons.forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const f = btn.getAttribute('data-filter');
      items.forEach(el=>{
        el.style.display = (f==='all' || el.classList.contains(f)) ? '' : 'none';
      });
    });
  });

  // Click logo để áp theme + flash nhẹ (không đổi tab)
  const NAME_TO_ID = {
    // Heisei P1
    'Kuuga':'decade','Agito':'decade','Ryuki':'decade','Faiz':'faiz','Blade':'decade',
    'Hibiki':'decade','Kabuto':'kabuto','Den-O':'decade','Kiva':'decade','Decade':'decade',
    // Heisei P2
    'W':'w','OOO':'ooo','Fourze':'fourze','Wizard':'decade','Gaim':'gaim','Drive':'drive',
    'Ghost':'ghost','Ex-Aid':'decade','Build':'build','Zi-O':'decade',
    // Reiwa
    'Zero-One':'zeroone','Saber':'decade','Revice':'decade','Geats':'decade','Gotchard':'decade'
  };

  items.forEach(fig=>{
    fig.style.cursor = 'pointer';
    fig.addEventListener('click', async ()=>{
      const name = fig.getAttribute('data-name') || fig.querySelector('figcaption')?.textContent?.trim();
      const rid  = NAME_TO_ID[name];
      const r    = RIDERS.find(x=>x.id===rid);
      if(!r) return;

      applyRiderTheme(r);
      overlay.classList.add('tab-mode','active');
      playTabSoundByRider(r.id);
      await runLogoSequence({ withSound:false });
      overlay.classList.remove('active','tab-mode');
    });
  });
});

/* =========================================================
   BELT REVEAL (hover logo Decade) + RIDER BELT render
   ========================================================= */

/* SFX riêng cho từng Rider khi bấm trên belt / gallery */
const RIDER_SFX = {
  decade:  './assets/decade/Sound_effect.mp3',
  faiz:    './assets/sfx/faiz_tab.mp3',
  kabuto:  './assets/sfx/kabuto_tab.mp3',
  w:       './assets/sfx/w_tab.mp3',
  ghost:   './assets/sfx/ghost_tab.mp3',
  build:   './assets/sfx/build_tab.mp3',
  ooo:     './assets/sfx/ooo_tab.mp3',
  fourze:  './assets/sfx/fourze_tab.mp3',
  gaim:    './assets/sfx/gaim_tab.mp3',
  zeroone: './assets/sfx/zeroone_tab.mp3',
};
function preloadRiderSfx(){
  Object.entries(RIDER_SFX).forEach(([id, src])=>{
    if(!src) return;
    getAudioEl('sfx-'+id, src);
  });
}
function playTabSoundByRider(id){
  const src = RIDER_SFX[id];
  if(!src) return;
  const el = getAudioEl('sfx-'+id, src);
  try{ el.currentTime = 0; el.play().catch(()=>{}); }catch{}
}

function setupBeltHoverReveal(){
  const logo = document.querySelector('.tab-logo');
  const belt = document.getElementById('rider-belt');
  if(!logo || !belt) return;

  const show = ()=> { belt.classList.add('is-open'); };
  const hide = ()=> { belt.classList.remove('is-open'); document.body.classList.remove('belt-open'); };

  // Desktop: hover logo để mở
  logo.addEventListener('mouseenter', show);
  logo.addEventListener('mouseleave', ()=> { if(!belt.matches(':hover')) hide(); });

  // Hover vào belt để giữ mở
  belt.addEventListener('mouseenter', show);
  belt.addEventListener('mouseleave', hide);

  // Mobile: tap logo để toggle
  logo.addEventListener('click', (e)=>{
    if (window.matchMedia('(hover: none)').matches) {
      e.preventDefault();
      const on = document.body.classList.toggle('belt-open');
      belt.classList.toggle('is-open', on);
    }
  });

  // Click ra ngoài => đóng
  document.addEventListener('click', (e)=>{
    if (!belt.contains(e.target) && !logo.contains(e.target)) hide();
  });
}
function closeBeltNow(){
  const belt = document.getElementById('rider-belt');
  belt?.classList.remove('is-open');
  document.body.classList.remove('belt-open');
}

function renderRiderBelt(){
  const host = document.getElementById('rider-belt');
  if(!host) return;

  // clear nếu re-render
  host.innerHTML = '';

  RIDERS.forEach((r, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'belt-chip';
    btn.type = 'button';
    btn.dataset.id = r.id;
    btn.title = r.name;
    btn.innerHTML = `<span class="ink" style="--logo:url('${r.logo}')"></span>`;
    btn.addEventListener('click', async ()=>{
      // 1) Đổi giao diện sang Rider đã bấm (accent + BG)
      applyRiderTheme(r);

      // 2) Hiệu ứng flash + logo của *Rider đó* (SFX riêng theo Rider)
      overlay.classList.add('tab-mode','active');
      playTabSoundByRider(r.id);
      await runLogoSequence({ withSound:false });
      overlay.classList.remove('active','tab-mode');

      // 3) Đóng belt; KHÔNG điều hướng trang
      closeBeltNow();
    });
    host.appendChild(btn);

    // phân cách nhẹ mỗi 5 icon
    if((idx+1) % 5 === 0 && idx !== RIDERS.length - 1){
      const sep = document.createElement('span');
      sep.className = 'belt-sep';
      host.appendChild(sep);
    }
  });

  // Active theo rider đã lưu
  const savedId = localStorage.getItem(RIDER_KEY) || RIDERS[0].id;
  host.querySelectorAll('.belt-chip').forEach(el=>{
    el.classList.toggle('is-active', el.dataset.id === savedId);
  });
}

/* =========================================================
   LOGIN – Decade card swipe
   ========================================================= */
function rectsOverlap(a, b, threshold = 0.4){
  const x_overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y_overlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlapArea = x_overlap * y_overlap;
  const aArea = (a.width || (a.right-a.left)) * (a.height || (a.bottom-a.top));
  return aArea > 0 ? (overlapArea / aArea) >= threshold : false;
}

function initDecadeLogin(){
  const pass = document.getElementById('rider-pass');
  const slot = document.getElementById('driver-slot');
  if(!pass || !slot) return;

  let dragging = false;
  let sx = 0, sy = 0, startX = 0, startY = 0;

  const onPointerMove = (e)=>{
    if(!dragging) return;
    const x = (e.touches?.[0]?.clientX ?? e.clientX);
    const y = (e.touches?.[0]?.clientY ?? e.clientY);
    const dx = x - sx;
    const dy = y - sy;
    const nx = startX + dx;
    const ny = startY + dy;
    pass.style.transform = `translate(${nx}px, ${ny}px)`;

    const rPass = pass.getBoundingClientRect();
    const rSlot = slot.getBoundingClientRect();
    if(rectsOverlap(rPass, rSlot, .35)){
      slot.classList.add('is-armed');
    }else{
      slot.classList.remove('is-armed');
    }
  };

  const onPointerUp = async (e)=>{
    if(!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);

    const rPass = pass.getBoundingClientRect();
    const rSlot = slot.getBoundingClientRect();
    if(rectsOverlap(rPass, rSlot, .35)){
      // Thành công – hiệu ứng quẹt
      slot.classList.remove('is-armed');
      slot.classList.add('is-success');

      // SFX quẹt + accept
      try{ document.getElementById('login-swipe')?.play().catch(()=>{}); }catch{}
      setTimeout(()=>{ try{ document.getElementById('login-accept')?.play().catch(()=>{}); }catch{} }, 200);

      // Lóe logo (Decade style) nhưng KHÔNG thay theme hiện tại
      const logoEl = document.getElementById('decade-logo');
      const prevSrc = logoEl?.src;
      if(logoEl) logoEl.src = './assets/decade/decade-logo.png';

      overlay.classList.add('tab-mode','active');
      await runLogoSequence({ withSound:false });
      overlay.classList.remove('active','tab-mode');

      if(logoEl && prevSrc) logoEl.src = prevSrc;

      showToast('Đăng nhập thành công!');
      // snap thẻ vào khe + biến mất nhẹ
      pass.style.transition = 'transform .25s ease';
      const cx = (rSlot.left + rSlot.right)/2 - (rPass.left + rPass.right)/2;
      const cy = (rSlot.top + rSlot.bottom)/2 - (rPass.top + rPass.bottom)/2;
      pass.style.transform = `translate(${cx}px, ${cy}px)`;
      setTimeout(()=>{ pass.style.opacity = .0; pass.style.pointerEvents='none'; }, 260);
    }else{
      // Trả về vị trí cũ
      pass.style.transition = 'transform .2s ease';
      pass.style.transform = 'translate(0,0)';
      setTimeout(()=>{ pass.style.transition = ''; }, 220);
    }
  };

  const onPointerDown = (e)=>{
    dragging = true;
    pass.style.transition = '';
    const x = (e.touches?.[0]?.clientX ?? e.clientX);
    const y = (e.touches?.[0]?.clientY ?? e.clientY);
    sx = x; sy = y; startX = 0; startY = 0;

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, {passive:false});
    document.addEventListener('touchend', onPointerUp);

    // âm quẹt nhẹ khi bắt đầu kéo
    try{ document.getElementById('login-swipe')?.play().catch(()=>{}); }catch{}
  };

  pass.addEventListener('mousedown', onPointerDown);
  pass.addEventListener('touchstart', onPointerDown, {passive:true});
}
