/* ==== THEME SYNC/TOGGLE (đồng bộ với trang chủ) ==== */
(function(){
  const THEME_KEY = "ui.theme.decade";
  try{
    const saved = localStorage.getItem(THEME_KEY);
    if(saved) document.documentElement.setAttribute('data-theme', saved);
  }catch{}
  const getTheme = ()=> document.documentElement.getAttribute('data-theme') || 'light';
  const setTheme = (t)=>{
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem(THEME_KEY, t); }catch{}
    const btn = document.querySelector('[data-theme-toggle]');
    if(btn){
      const icon = btn.querySelector('.icon');
      if(icon) icon.textContent = (t === 'dark' ? '☀︎' : '🌙');
      btn.setAttribute('aria-pressed', String(t === 'dark'));
    }
  };
  setTheme(getTheme());
  const toggleBtn = document.querySelector('[data-theme-toggle]');
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=> setTheme(getTheme()==='dark'?'light':'dark'));
  }
})();

/* ===== Helpers ===== */
const $  = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> [...r.querySelectorAll(s)];
const uid = ()=> Math.random().toString(36).slice(2) + Date.now().toString(36);
const toast = (msg)=>{
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1600);
};
const fileToDataURL = (file)=> new Promise((res,rej)=>{
  const fr = new FileReader();
  fr.onload = ()=> res(fr.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});
const escapeHTML = (s='')=>{ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; };

/* ===== Store (localStorage) ===== */
const LS_KEY = 'decade_courses_v1';
const loadCourses = ()=> { try{ const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; }catch{ return []; } };
const saveCourses = (list)=> localStorage.setItem(LS_KEY, JSON.stringify(list));
const findCourse = (courses, id)=> courses.find(c=> c.id===id);
const addCourse  = (courses, course)=> (courses.push(course), courses);
const deleteCourse= (courses, id)=> courses.filter(c=> c.id!==id);

/* ===== Overlay (tab transition effect) ===== */
const FX = { flash1: 420, logoHold: 900, flash2: 420, playSound: true, volume: 1.0 };
let isTransitioning = false;
const overlay = $('#overlay');
const flashEl = $('#flash');
const logoImg = $('#decade-logo');
const tabSnd  = $('#sound-tab');

function setTabBlur(on){ document.body.classList.toggle('tab-transitioning', !!on); }
function flashOnce(ms){
  if(!flashEl) return;
  flashEl.style.animationDuration = `${ms}ms`;
  flashEl.classList.remove('show'); void flashEl.offsetWidth;
  flashEl.classList.add('show');
}
function playTabSound(){
  if(!FX.playSound || !tabSnd) return;
  try{ tabSnd.volume = FX.volume; tabSnd.currentTime = 0; tabSnd.play().catch(()=>{}); }catch{}
}
const wait = (ms)=> new Promise(r=> setTimeout(r, ms));

async function runLogoSequence(){
  logoImg?.classList.remove('show','vanish');
  flashEl?.classList.remove('show'); void (flashEl?.offsetWidth);
  playTabSound();
  flashOnce(FX.flash1);
  await wait(FX.flash1 * 0.7);
  logoImg?.classList.add('show');
  await wait(FX.logoHold);
  flashOnce(FX.flash2);
  logoImg?.classList.add('vanish');
  await wait(FX.flash2);
  logoImg?.classList.remove('show','vanish');
}

async function runTabTransition(target, btn){
  if(isTransitioning || !target) return;
  isTransitioning = true;
  setTabBlur(true);
  overlay?.classList.add('active');
  await runLogoSequence();
  overlay?.classList.remove('active');
  setTabBlur(false);
  switchTabUI(target, btn);
  isTransitioning = false;
}

/* ===== State ===== */
let courses = loadCourses(); // [{id,name,info,img,category,lessons:[{id,title,url,kind}]}]
let editingId = null;

/* ===== DOM ===== */
const elList = $('#course-list');
const elEmpty = $('#empty-hint');

const cName = $('#c-name');
const cInfo = $('#c-info');
const cImg  = $('#c-img');
const cCat  = $('#c-cat');
const btnAdd= $('#btn-add');
const btnReset= $('#btn-reset');

const selCourse = $('#sel-course');
const lTitle = $('#l-title');
const lLink  = $('#l-link');
const lFile  = $('#l-file');
const btnAddLesson = $('#btn-add-lesson');
const btnClearLesson = $('#btn-clear-lesson');
const listLesson = $('#lesson-list');

const dlg = $('#dlg');
const eName = $('#e-name');
const eInfo = $('#e-info');
const eImg  = $('#e-img');
const eCat  = $('#e-cat');
const dlgCancel = $('#dlg-cancel');
const dlgSave   = $('#dlg-save');

/* ===== Menu / Tabs ===== */
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.classList.contains('is-active')) return;
    const target = btn.dataset.tab;
    runTabTransition(target, btn);
  });
});
document.querySelectorAll('[data-link]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    const url = a.getAttribute('data-link') || a.getAttribute('href');
    if(!url) return;
    (async ()=>{
      if(isTransitioning) { window.location.href=url; return; }
      isTransitioning = true;
      setTabBlur(true);
      overlay?.classList.add('active');
      await runLogoSequence();
      overlay?.classList.remove('active');
      setTabBlur(false);
      isTransitioning = false;
      window.location.href = url;
    })();
  });
});
function switchTabUI(name, btn){
  $$('.tab-btn').forEach(b=> b.classList.toggle('is-active', b===btn));
  $$('.tab-panel').forEach(p=> p.classList.remove('is-active'));
  const panel = $('#tab-'+name);
  if(panel){ panel.classList.add('is-active'); panel.focus({preventScroll:true}); }
}

/* ===== Small SVG icons ===== */
const iUsers = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/>
  <circle cx="10" cy="7" r="4" stroke="#7a819a" stroke-width="2"/>
</svg>`;
const iBook = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" stroke="#7a819a" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8 7h8M8 11h8" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/>
</svg>`;
const iClock = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="#7a819a" stroke-width="2"/>
  <path d="M12 7v5l3 3" stroke="#7a819a" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/* ===== Render Courses ===== */
function renderCourses(){
  elList.innerHTML = '';
  if (!courses.length){
    elEmpty.style.display = 'block';
    selCourse.innerHTML = '<option value="">(Chưa có khóa học)</option>';
    listLesson.innerHTML = '';
    return;
  }
  elEmpty.style.display = 'none';

  for(const c of courses){
    const lessonsCount = (c.lessons||[]).length;
    const students = c.stats?.students;
    const duration = c.stats?.duration;

    const metaHtml = `
      <div class="course-meta" style="display:flex;gap:14px;align-items:center;margin-top:2px;">
        ${students!=null ? `<span class="meta-item" style="display:inline-flex;gap:6px;align-items:center;color:#6b7390">${iUsers}<span>${Number(students).toLocaleString('vi-VN')}</span></span>` : ``}
        <span class="meta-item" style="display:inline-flex;gap:6px;align-items:center;color:#6b7390">${iBook}<span>${lessonsCount}</span></span>
        ${duration ? `<span class="meta-item" style="display:inline-flex;gap:6px;align-items:center;color:#6b7390">${iClock}<span>${escapeHTML(duration)}</span></span>` : ``}
      </div>`;

    const card = document.createElement('article');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-thumb">
        ${c.img
          ? `<img src="${c.img}" alt="${escapeHTML(c.name)}"/>`
          : `<div class="placeholder">${escapeHTML((c.name||'?').slice(0,1).toUpperCase())}</div>`}
      </div>
      <div class="course-body">
        <div class="course-title">${escapeHTML(c.name||'Chưa đặt tên')}</div>
        <div class="course-info">${escapeHTML(c.info||'')}</div>
        <div class="helper">Danh mục: <b>${escapeHTML((c.category||'other'))}</b></div>
        ${metaHtml}
        <div class="course-actions" style="justify-content:flex-end;">
          <button class="btn" data-act="edit" data-id="${c.id}">Sửa</button>
          <button class="btn danger" data-act="del" data-id="${c.id}">Xóa</button>
        </div>
      </div>`;
    elList.appendChild(card);
  }

  // actions
  elList.querySelectorAll('button[data-act="edit"]').forEach(b=>{
    b.onclick = ()=> openEdit(b.dataset.id);
  });
  elList.querySelectorAll('button[data-act="del"]').forEach(b=>{
    b.onclick = ()=> handleDeleteCourse(b.dataset.id);
  });

  // update select for lessons tab
  selCourse.innerHTML = courses.map(c=> `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  if (!selCourse.value && courses[0]) selCourse.value = courses[0].id;
  renderLessonsForSelected();
}

/* ===== Lessons render ===== */
function renderLessonsForSelected(){
  listLesson.innerHTML = '';
  const cid = selCourse.value;
  const c = findCourse(courses, cid);
  if(!c) return;

  (c.lessons||[]).forEach((l, idx)=>{
    const li = document.createElement('li');
    li.className = 'lesson-item';
    li.draggable = true;
    li.dataset.index = idx;
    li.innerHTML = `
      <span class="handle" title="Kéo thả để sắp xếp">⠿</span>
      <div class="lesson-title">
        <b>${escapeHTML(l.title||'Bài giảng')}</b>
        <small>${escapeHTML(l.kind==='upload' ? '(upload)' : (l.url||''))}</small>
      </div>
      <div class="lesson-actions">
        <button class="btn icon" title="Sửa" data-lact="edit" data-i="${idx}">✎</button>
        <button class="btn icon danger" title="Xóa" data-lact="del" data-i="${idx}">🗑</button>
      </div>
    `;
    listLesson.appendChild(li);
  });

  // edit / delete
  listLesson.querySelectorAll('button[data-lact="edit"]').forEach(b=>{
    b.onclick = ()=> editLesson(+b.dataset.i);
  });
  listLesson.querySelectorAll('button[data-lact="del"]').forEach(b=>{
    b.onclick = ()=> delLesson(+b.dataset.i);
  });

  bindLessonDnD();
}
function bindLessonDnD(){
  let dragIndex = null;
  listLesson.querySelectorAll('.lesson-item').forEach(li=>{
    li.addEventListener('dragstart', e=>{
      dragIndex = +li.dataset.index;
      e.dataTransfer.effectAllowed = 'move';
      li.style.opacity = .5;
    });
    li.addEventListener('dragend', ()=>{ li.style.opacity = 1; });
    li.addEventListener('dragover', e=>{ e.preventDefault(); });
    li.addEventListener('drop', e=>{
      e.preventDefault();
      const targetIndex = +li.dataset.index;
      if(dragIndex===null || targetIndex===dragIndex) return;
      reorderLesson(dragIndex, targetIndex);
    });
  });
}

/* ===== Init render ===== */
function refreshCoursesUI(){
  renderCourses();
  renderLessonsForSelected();
}
refreshCoursesUI();

/* ===== Create Course ===== */
$('#btn-add').onclick = async ()=>{
  const name = cName.value.trim();
  if(!name){ toast('Nhập tên khóa học'); cName.focus(); return; }
  let imgData = null;
  if (cImg.files && cImg.files[0]) imgData = await fileToDataURL(cImg.files[0]);
  const info = cInfo.value.trim();
  const category = (cCat.value || 'other').toLowerCase();

  addCourse(courses, { id: uid(), name, info, img: imgData, category, lessons: [] });
  saveCourses(courses);
  refreshCoursesUI();

  cName.value = ''; cInfo.value = ''; cImg.value=''; cCat.value='programming';
  toast('Đã tạo khóa học');
};
$('#btn-reset').onclick = ()=>{
  cName.value = ''; cInfo.value=''; cImg.value=''; cCat.value='programming';
};

/* ===== Edit/Delete Course ===== */
function openEdit(id){
  const c = findCourse(courses, id);
  if(!c) return;
  editingId = id;
  eName.value = c.name || '';
  eInfo.value = c.info || '';
  eImg.value = '';
  eCat.value = (c.category||'other');
  dlg.classList.add('show'); dlg.setAttribute('aria-hidden','false');
}
$('#dlg-cancel').onclick = ()=> { editingId = null; closeEdit(); };
function closeEdit(){
  dlg.classList.remove('show'); dlg.setAttribute('aria-hidden','true');
}
$('#dlg-save').onclick = async ()=>{
  const c = findCourse(courses, editingId);
  if(!c) return;
  c.name = eName.value.trim() || c.name;
  c.info = eInfo.value.trim() || '';
  c.category = (eCat.value || 'other').toLowerCase();
  const f = eImg.files?.[0];
  if(f) c.img = await fileToDataURL(f);
  saveCourses(courses);
  refreshCoursesUI();
  closeEdit();
  editingId = null;
  toast('Đã lưu thay đổi');
};

function handleDeleteCourse(id){
  const c = findCourse(courses, id);
  if(!c) return;
  if(!confirm(`Xóa khóa học "${c.name}"?`)) return;
  courses = deleteCourse(courses, id);
  saveCourses(courses);
  refreshCoursesUI();
  toast('Đã xóa khóa học');
}

/* ===== Lessons ===== */
selCourse.onchange = renderLessonsForSelected;
$$('input[name="vsrc"]').forEach(r=>{
  r.onchange = ()=>{
    const useLink = r.value==='link';
    $('#row-link').style.display = useLink ? 'flex' : 'none';
    $('#row-upload').style.display = useLink ? 'none' : 'flex';
  };
});
$('#btn-clear-lesson').onclick = ()=>{ lTitle.value=''; lLink.value=''; lFile.value=''; };
$('#btn-add-lesson').onclick = async ()=>{
  const cid = selCourse.value;
  if(!cid){ toast('Chưa chọn khóa học'); return; }
  const c = findCourse(courses, cid);
  if(!c) return;

  const title = lTitle.value.trim();
  if(!title){ toast('Nhập tên bài giảng'); lTitle.focus(); return; }

  const kind = document.querySelector('input[name="vsrc"]:checked').value;
  let url = '';
  if(kind==='link'){
    url = lLink.value.trim();
    if(!url){ toast('Nhập link video'); lLink.focus(); return; }
  }else{
    const f = lFile.files?.[0];
    if(!f){ toast('Chọn file video'); return; }
    url = URL.createObjectURL(f); // chỉ trong phiên
  }

  c.lessons = c.lessons || [];
  c.lessons.push({ id: uid(), title, url, kind });
  saveCourses(courses);

  lTitle.value=''; lLink.value=''; lFile.value='';
  renderLessonsForSelected();
  toast('Đã thêm bài giảng');
};

function delLesson(i){
  const cid = selCourse.value;
  const c = findCourse(courses, cid);
  if(!c) return;
  const l = c.lessons[i];
  if(!l) return;
  if(!confirm(`Xóa bài giảng "${l.title}"?`)) return;
  c.lessons.splice(i,1);
  saveCourses(courses);
  renderLessonsForSelected();
  toast('Đã xóa bài giảng');
}
function editLesson(i){
  const cid = selCourse.value;
  const c = findCourse(courses, cid);
  if(!c) return;
  const l = c.lessons[i];
  if(!l) return;

  const newTitle = prompt('Tên bài giảng:', l.title || '');
  if(newTitle==null) return;

  if(l.kind==='link'){
    const newUrl = prompt('Link video:', l.url || '');
    if(newUrl==null) return;
    l.url = newUrl.trim();
  }else{
    alert('Bài giảng dạng upload: không đổi file trong phiên. Xóa và tạo lại nếu cần.');
  }
  l.title = (newTitle||'').trim() || l.title;
  saveCourses(courses);
  renderLessonsForSelected();
  toast('Đã cập nhật bài giảng');
}
function reorderLesson(from, to){
  const cid = selCourse.value;
  const c = findCourse(courses, cid);
  if(!c) return;
  const [moved] = c.lessons.splice(from,1);
  c.lessons.splice(to,0,moved);
  saveCourses(courses);
  renderLessonsForSelected();
}
