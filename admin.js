// หน้าผู้ดูแล: ภาพรวม / ลงเวลา / คำขอ OT / สรุป / ตั้งค่า
(() => {
  const root = document.getElementById('root');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const toastEl = document.getElementById('toast');

  const OT_LABEL = { '1.5': 'หลังเลิกงาน วันทำงานปกติ', '2': 'วันหยุด', '3': 'หลังเลิกงาน วันหยุด' };
  const STATUS_TH = { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ' };
  const PAIR_TH = { complete: 'ครบ', no_checkout: 'ยังไม่เช็คเอ้าท์', no_checkin: 'ไม่มีเช็คอิน' };
  const I = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ot: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/>',
    sum: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

  // ---------- utils ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  // ช่องเลือกวันที่แบบไทย (วัน / เดือน / ปี พ.ศ.) แทน input type=date ที่แสดงตามภาษาเครื่อง (เดือน/วัน/ปี ค.ศ.)
  // ช่องเวลาแบบ 24 ชั่วโมง (ชั่วโมง : นาที) แทน input type=time ที่แสดง AM/PM ตามภาษาเครื่อง
  const time24Input = (name, value) => {
    const [h, m] = (value || '00:00').split(':');
    const mins = [...new Set([...Array.from({ length: 12 }, (_, i) => pad(i * 5)), m])].sort();
    return `<span class="time24" data-name="${name}">
      <select data-p="h" aria-label="ชั่วโมง">${Array.from({ length: 24 }, (_, i) => `<option${pad(i) === h ? ' selected' : ''}>${pad(i)}</option>`).join('')}</select>
      <b>:</b>
      <select data-p="m" aria-label="นาที">${mins.map((x) => `<option${x === m ? ' selected' : ''}>${x}</option>`).join('')}</select> <small>น.</small></span>`;
  };
  const readTime24 = (root, name) => {
    const el = root.querySelector(`.time24[data-name="${name}"]`);
    return `${el.querySelector('[data-p=h]').value}:${el.querySelector('[data-p=m]').value}`;
  };
  const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thDateInput = (id) => {
    const cy = new Date().getFullYear();
    const years = [cy - 1, cy, cy + 1, cy + 2];
    return `<span class="thdate" id="${id}">
      <select data-p="d" aria-label="วัน"><option value="">วัน</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
      <select data-p="m" aria-label="เดือน"><option value="">เดือน</option>${TH_MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
      <select data-p="y" aria-label="ปี พ.ศ."><option value="">ปี พ.ศ.</option>${years.map((y) => `<option value="${y}">${y + 543}</option>`).join('')}</select></span>`;
  };
  // คืน 'YYYY-MM-DD' · '' = ยังไม่เลือก · null = วันที่ไม่มีจริง (เช่น 31 กุมภาพันธ์)
  const readThDate = (id) => {
    const el = document.getElementById(id);
    const [d, m, y] = ['d', 'm', 'y'].map((p) => el.querySelector(`[data-p=${p}]`).value);
    if (!d && !m && !y) return '';
    if (!d || !m || !y) return null;
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    return new Date(`${iso}T12:00:00Z`).getUTCDate() === Number(d) ? iso : null;
  };
  const setThDate = (id, iso) => {
    const el = document.getElementById(id);
    const [y, m, d] = iso ? iso.split('-').map(Number) : ['', '', ''];
    const ys = el.querySelector('[data-p=y]');
    if (y && !ys.querySelector(`option[value="${y}"]`)) ys.insertAdjacentHTML('beforeend', `<option value="${y}">${y + 543}</option>`);
    el.querySelector('[data-p=d]').value = d;
    el.querySelector('[data-p=m]').value = m;
    ys.value = y;
  };
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const thDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
  };
  const thDateTime = (iso) => (iso ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const codeSub = (c) => (c ? `<div class="sub">รหัส ${esc(c)}</div>` : '');
  // รูปโปรไฟล์พนักงาน (โหลดครั้งเดียวต่อการเปิดหน้า) · ใส่ช่องว่าง data-av ไว้ แล้วเติมรูปให้อัตโนมัติ
  let AV = {};
  let avLoaded = null;
  let avReady = false;
  const loadAvatars = (force) => {
    if (!avLoaded || force) {
      avLoaded = api('/api/admin/avatars').then((r) => {
        AV = r.items || {};
        avReady = true;
        // จุดที่เคยแสดงเป็นตัวอักษร (ยังไม่มีรูป) ให้ลองเติมรูปใหม่
        document.querySelectorAll('[data-av][data-done]:not(.has-img)').forEach((el) => { delete el.dataset.done; });
        paintAvatars(document);
      }).catch(() => { avLoaded = null; });
    }
    return avLoaded;
  };
  const avTag = (id, name, cls = '') => `<span class="av ${cls}" data-av="${esc(id ?? '')}" data-n="${esc(String(name || '').replace(/^(นาย|นางสาว|นาง)/, '').trim().slice(0, 1))}"></span>`;
  function paintAvatars(scope) {
    scope.querySelectorAll('[data-av]:not([data-done])').forEach((el) => {
      const src = AV[el.dataset.av];
      if (!src && !avReady) return;
      el.dataset.done = '1';
      if (src) {
        el.innerHTML = `<img src="${esc(src)}" alt="" draggable="false">`;
        el.classList.add('has-img');
        el.onclick = (e) => { e.stopPropagation(); openModal(`<img class="av-big" src="${esc(src)}" alt="" draggable="false">`, 'img-only protect'); };
      } else el.textContent = el.dataset.n || '?';
    });
  }
  new MutationObserver(() => paintAvatars(document)).observe(document.documentElement, { childList: true, subtree: true });
  const nameCell = (id, name, code, extra = '') => `<div class="name-cell">${avTag(id, name)}<div><b>${esc(name)}</b>${codeSub(code)}${extra}</div></div>`;
  const num = (n) => (n || n === 0 ? Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '–');

  let toastTimer;
  function toast(msg, isError = false) {
    // ข้อผิดพลาดจากการเขียนลงหน้าที่ปิดไปแล้ว (เปลี่ยนหน้าระหว่างโหลด) ไม่ต้องแจ้งผู้ใช้
    if (isError && /properties of (null|undefined)/.test(String(msg))) { console.warn(msg); return; }
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = ''), 3000);
  }

  async function api(url, opts = {}) {
    const { status, data } = await Backend.request(opts.method || (opts.body ? 'POST' : 'GET'), url, { body: opts.body, admin: true });
    if (status === 401 && !url.includes('/login') && !url.includes('/password')) { boot(); throw new Error(data.error || 'กรุณาเข้าสู่ระบบ'); }
    if (status < 200 || status >= 300) throw new Error(data.error || 'เกิดข้อผิดพลาด');
    return data;
  }

  function openModal(html, cls = '') {
    modalBody.innerHTML = html;
    modal.querySelector('.modal-box').className = 'modal-box ' + cls;
    modal.hidden = false;
  }
  const closeModal = () => { modal.hidden = true; modalBody.innerHTML = ''; };
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.classList.contains('modal-x')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // ---------- filter state (ใช้ร่วมทุกหน้า) ----------
  const now = new Date();
  const filter = {
    from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    q: '',
    status: '',
  };
  const qs = (extra = {}) => new URLSearchParams(Object.entries({ ...filter, ...extra }).filter(([, v]) => v)).toString();

  // ---------- Auth ----------
  async function boot() {
    const me = await Backend.request('GET', '/api/admin/me', { admin: true }).then((r) => r.data).catch(() => ({}));
    if (me.authed) return renderShell();
    const setup = !me.setup;
    root.innerHTML = `
      <div class="auth"><form class="card" id="af">
        <img src="icon.svg" alt="">
        <h1>${setup ? 'ตั้งรหัสผ่านผู้ดูแล' : 'เข้าสู่ระบบผู้ดูแล'}</h1>
        <p class="muted">${setup ? 'ใช้งานครั้งแรก กรุณาตั้งรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)' : 'ระบบลงเวลาทำงานพนักงานนอก'}</p>
        <label class="field"><span>รหัสผ่าน</span><input type="password" name="pw" autocomplete="${setup ? 'new-password' : 'current-password'}" required autofocus></label>
        ${setup ? '<label class="field"><span>ยืนยันรหัสผ่าน</span><input type="password" name="pw2" autocomplete="new-password" required></label>' : ''}
        <button class="btn primary big" type="submit">${setup ? 'บันทึกและเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}</button>
      </form></div>`;
    const f = document.getElementById('af');
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (setup && f.pw.value !== f.pw2.value) return toast('รหัสผ่านไม่ตรงกัน', true);
      try {
        await api(setup ? '/api/admin/setup' : '/api/admin/login', { body: { password: f.pw.value } });
        renderShell();
      } catch (err) { toast(err.message, true); f.pw.select(); }
    };
  }

  // ---------- Shell ----------
  const PAGES = [
    { id: 'dash', label: 'ภาพรวมวันนี้', icon: 'home' },
    { id: 'att', label: 'ลงเวลาเข้า-ออก', icon: 'clock' },
    { id: 'map', label: 'แผนที่การลงเวลา', icon: 'pin' },
    { id: 'cal', label: 'ปฏิทินพนักงาน', icon: 'cal' },
    { id: 'appeal', label: 'คำร้อง', icon: 'flag' },
    { id: 'ot', label: 'คำขอ OT', icon: 'ot' },
    { id: 'sum', label: 'สรุปรายคน', icon: 'sum' },
    { id: 'emp', label: 'พนักงาน', icon: 'users' },
    { id: 'set', label: 'ตั้งค่า', icon: 'gear' },
  ];
  let page = 'dash';
  let dashTimer;

  function renderShell() {
    loadAvatars();
    const initial = location.hash.slice(1);
    if (PAGES.some((p) => p.id === initial)) page = initial;
    root.innerHTML = `
      <div class="shell">
        <aside class="side">
          <div class="brand"><img src="icon.svg" alt=""><div><b>ระบบลงเวลา</b><small>ผู้ดูแล · พนักงานนอก</small></div></div>
          ${PAGES.map((p) => `<button class="nav-btn" data-page="${p.id}">${icon(p.icon)}<span>${p.label}</span>${p.id === 'ot' ? '<span class="count" id="pendingCount" hidden></span>' : ''}${p.id === 'appeal' ? '<span class="count" id="appealCount" hidden></span>' : ''}${p.id === 'emp' ? '<span class="count" id="regCount" hidden></span>' : ''}</button>`).join('')}
          <div class="spacer"></div>
          <button class="nav-btn" id="reloadBtn">${icon('refresh')}<span>รีเฟรช</span></button>
          <button class="nav-btn" id="logout">${icon('out')}<span>ออกจากระบบ</span></button>
        </aside>
        <main class="content protect" id="content"></main>
      </div>`;
    root.querySelectorAll('[data-page]').forEach((b) => (b.onclick = () => go(b.dataset.page)));
    document.getElementById('reloadBtn').onclick = () => location.reload(); // อยู่หน้าเดิม ไม่ต้องล็อกอินใหม่
    document.getElementById('logout').onclick = async () => { await api('/api/admin/logout', { body: {} }).catch(() => {}); Backend.adminToken.set(''); boot(); };
    go(page);
  }

  function setCount(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !n;
    el.textContent = n;
  }
  const setPending = (n) => setCount('pendingCount', n);
  // อัปเดตตัวเลขคำขอ OT / คำร้องที่รอพิจารณาบนเมนู
  const refreshCounts = () => api('/api/admin/dashboard').then((d) => { setPending(d.pending); setCount('appealCount', d.appeals); setCount('regCount', (d.registrations || 0) + (d.code_requests || 0)); }).catch(() => {});

  function go(id) {
    page = id;
    clearInterval(dashTimer);
    root.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === id));
    history.replaceState(null, '', '#' + id);
    ({ dash: pageDash, att: pageAtt, map: pageMap, cal: pageCal, appeal: pageAppeal, ot: pageOT, sum: pageSum, emp: pageEmp, set: pageSet })[id]();
    if (id !== 'dash') refreshCounts();
  }
  const content = () => document.getElementById('content');

  function filterBar({ status = false, exportKind = null } = {}) {
    return `
      <form class="card filters" id="ff">
        <label class="field f-date"><span>ตั้งแต่วันที่</span><input type="date" name="from" value="${filter.from}"></label>
        <label class="field f-date"><span>ถึงวันที่</span><input type="date" name="to" value="${filter.to}"></label>
        <label class="field f-q"><span>ค้นหาชื่อ</span><input name="q" value="${esc(filter.q)}" placeholder="ชื่อพนักงาน"></label>
        ${status ? `<label class="field f-status"><span>สถานะ</span><select name="status">
          <option value="">ทั้งหมด</option>${Object.entries(STATUS_TH).map(([k, v]) => `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select></label>` : ''}
        <div class="quick">
          <button type="button" class="btn ghost sm" data-range="today">วันนี้</button>
          <button type="button" class="btn ghost sm" data-range="week">7 วัน</button>
          <button type="button" class="btn ghost sm" data-range="month">เดือนนี้</button>
          <button type="button" class="btn ghost sm" data-range="last">เดือนก่อน</button>
        </div>
        <div class="actions">
          <button class="btn primary" type="submit">ค้นหา</button>
          ${exportKind ? `<button type="button" class="btn ghost" id="exportBtn">${icon('dl')}ส่งออก Excel</button>` : ''}
        </div>
      </form>`;
  }

  function bindFilter(reload, exportKind) {
    const f = document.getElementById('ff');
    const apply = () => {
      filter.from = f.from.value; filter.to = f.to.value; filter.q = f.q.value.trim();
      if (f.status) filter.status = f.status.value;
      if (exportKind) document.getElementById('exportBtn').onclick = () => Backend.download(`/api/admin/export/${exportKind}?${qs()}`, `${exportKind}.csv`).catch((e) => toast(e.message, true));
    };
    f.onsubmit = (e) => { e.preventDefault(); apply(); reload(); };
    f.querySelectorAll('[data-range]').forEach((b) => (b.onclick = () => {
      const d = new Date();
      const r = b.dataset.range;
      let from = d, to = d;
      if (r === 'week') from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6);
      if (r === 'month') { from = new Date(d.getFullYear(), d.getMonth(), 1); to = new Date(d.getFullYear(), d.getMonth() + 1, 0); }
      if (r === 'last') { from = new Date(d.getFullYear(), d.getMonth() - 1, 1); to = new Date(d.getFullYear(), d.getMonth(), 0); }
      f.from.value = ymd(from); f.to.value = ymd(to);
      apply(); reload();
    }));
    apply();
  }

  // ---------- รูปสแกน: แสดงผ่าน canvas (คลิกขวาบันทึก/เปิดลิงก์ตรง/ดาวน์โหลดไม่ได้) ----------
  const photoCache = new Map(); // file -> Promise<ImageBitmap>
  function fetchPhoto(file) {
    if (!photoCache.has(file)) {
      const p = Backend.photo(file).then((b) => createImageBitmap(b));
      p.catch(() => photoCache.delete(file));
      photoCache.set(file, p);
      if (photoCache.size > 200) photoCache.delete(photoCache.keys().next().value);
    }
    return photoCache.get(file);
  }
  function drawPhoto(canvas, bmp, fit = 'cover') {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round((canvas.clientWidth || 42) * dpr));
    canvas.height = Math.max(1, Math.round((canvas.clientHeight || 42) * dpr));
    const ctx = canvas.getContext('2d');
    const s = fit === 'cover' ? Math.max(canvas.width / bmp.width, canvas.height / bmp.height) : Math.min(canvas.width / bmp.width, canvas.height / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  function hydratePhotos(scope) {
    scope.querySelectorAll('canvas[data-photo]:not([data-ready])').forEach(async (cv) => {
      cv.dataset.ready = '1';
      try { drawPhoto(cv, await fetchPhoto(cv.dataset.photo), cv.dataset.fit || 'cover'); } catch { cv.classList.add('broken'); }
    });
  }
  async function showPhoto(file) {
    openModal('<div class="empty" style="color:#fff">กำลังโหลดรูป…</div>', 'img-only protect');
    try {
      const bmp = await fetchPhoto(file);
      const s = Math.min((innerWidth * 0.92) / bmp.width, (innerHeight * 0.86) / bmp.height, 1.5);
      modalBody.innerHTML = `<canvas class="big-photo" style="width:${Math.round(bmp.width * s)}px;height:${Math.round(bmp.height * s)}px"></canvas>`;
      drawPhoto(modalBody.querySelector('canvas'), bmp, 'contain');
    } catch { modalBody.innerHTML = '<div class="empty" style="color:#fff">โหลดรูปไม่ได้</div>'; }
  }

  // ---------- ข้อสังเกตจากระบบกันโกง ----------
  const FLAG_TH = {
    outside_area: 'นอกพื้นที่ทำงาน',
    location_unverified: 'สถานที่พิมพ์เอง (ยังไม่ได้ตั้งพิกัดจุดทำงาน จึงไม่ได้วัดระยะ)',
    no_face_check: 'ตรวจใบหน้าไม่ได้',
    low_face_ratio: 'ตรวจพบใบหน้าไม่สม่ำเสมอ',
    low_gps_accuracy: 'GPS คลาดเคลื่อนสูง',
    gps_stale: 'พิกัด GPS ไม่เป็นปัจจุบัน',
    gps_suspicious: 'พิกัดผิดปกติ (อาจใช้แอปปลอมตำแหน่ง)',
    desktop_device: 'ลงเวลาจากคอมพิวเตอร์',
    overnight: 'เช็คเอ้าท์ข้ามวัน',
    gps_static: 'สงสัยปลอมตำแหน่ง: พิกัดนิ่งสนิทผิดธรรมชาติ',
    gps_jump: 'สงสัยปลอมตำแหน่ง: พิกัดกระโดดระหว่างสแกน',
    gps_teleport: 'สงสัยปลอมตำแหน่ง: ย้ายที่เร็วเกินจริงจากครั้งก่อน',
    gps_shared: 'สงสัยปลอมตำแหน่ง: พิกัดซ้ำกับพนักงานคนอื่น',
  };
  const INFO_FLAGS = new Set(['overnight', 'location_unverified']);
  const flagsOf = (r) => { try { return JSON.parse(r?.flags || '[]'); } catch { return []; } };
  const warnsOf = (r) => flagsOf(r).filter((f) => !INFO_FLAGS.has(f));
  const timeOf = (r) => (r.captured_at ? new Date(r.captured_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false }) : r.time);

  // ---------- attendance table ----------
  let pairCache = [];
  function attCell(rec) {
    if (!rec) return '<div class="tcell"><span class="thumb none">–</span><span class="muted">ไม่มี</span></div>';
    const w = warnsOf(rec);
    // บน Google ไม่โหลดรูปเต็มทุกแถว (ช้า/กินโควตา) — ดูรูปได้เมื่อคลิกแถว
    const pic = rec.thumb ? `<img class="thumb" src="${esc(rec.thumb)}" alt="" draggable="false">`
      : Backend.mode === 'gas' ? '<span class="thumb none" title="คลิกแถวเพื่อดูรูป">📷</span>'
        : `<canvas class="thumb" data-photo="${esc(rec.photo)}"></canvas>`;
    return `<div class="tcell">${pic}
      <div><div class="t-time">${esc(timeOf(rec))} น.</div>
      ${w.length ? `<span class="badge flag" title="${esc(w.map((f) => FLAG_TH[f] || f).join(', '))}">⚠ ตรวจสอบ ${w.length}</span>` : rec.verify_code ? '<span class="badge approved">✓ ผ่าน</span>' : '<div class="sub">ข้อมูลเดิม</div>'}
      </div></div>`;
  }
  function attTable(pairs, { showDate = true } = {}) {
    pairCache = pairs;
    if (!pairs.length) return '<div class="card empty">ไม่มีข้อมูลการลงเวลาในช่วงนี้</div>';
    const totalHours = pairs.reduce((s, p) => s + (p.hours || 0), 0);
    return `
      <div class="card table-card protect"><div class="table-wrap"><table>
        <thead><tr>${showDate ? '<th>วันที่</th>' : ''}<th>ชื่อ</th><th>สถานที่</th><th>เข้างาน</th><th>เลิกงาน</th><th class="num">ชั่วโมง</th><th>สถานะ</th></tr></thead>
        <tbody>${pairs.map((p, i) => {
          const locIn = p.checkin?.location, locOut = p.checkout?.location;
          const loc = locIn && locOut && locIn !== locOut ? `${esc(locIn)}<div class="sub">ออก: ${esc(locOut)}</div>` : esc(locIn || locOut);
          return `<tr class="click" data-i="${i}">
            ${showDate ? `<td class="nowrap">${esc(thDate(p.work_date))}</td>` : ''}
            <td>${nameCell(p.records[0]?.employee_id, p.name, p.emp_code, p.records.length > 2 ? `<div class="sub">${p.records.length} รายการ</div>` : '')}</td>
            <td>${loc}</td>
            <td>${attCell(p.checkin)}</td>
            <td>${attCell(p.checkout)}</td>
            <td class="num">${num(p.hours)}</td>
            <td><span class="badge ${p.status}">${PAIR_TH[p.status]}</span></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="table-foot"><span>${pairs.length} รายการ</span><span>รวม ${num(totalHours)} ชั่วโมง</span></div>
      </div>`;
  }
  function bindAttTable(container, reload) {
    container.querySelectorAll('tr[data-i]').forEach((tr) => (tr.onclick = () => attDetail(pairCache[tr.dataset.i], reload)));
    hydratePhotos(container);
  }

  function attDetail(p, reload) {
    const col = (rec, title, cls) => {
      if (!rec) return `<div class="detail-col"><span class="badge ${cls}">${title}</span><p class="muted">ไม่มีข้อมูล</p></div>`;
      const map = rec.lat != null
        ? `${rec.lat.toFixed(6)}, ${rec.lng.toFixed(6)} <span class="sub">(±${Math.round(rec.accuracy || 0)} ม.)</span><br><a href="https://www.google.com/maps?q=${rec.lat},${rec.lng}" target="_blank" rel="noopener noreferrer">เปิดแผนที่</a>`
        : '<span class="muted">ไม่มี</span>';
      const flags = flagsOf(rec);
      return `<div class="detail-col">
        <span class="badge ${cls}">${title}</span>
        <dl><dt>เวลาจริง</dt><dd><b>${esc(rec.captured_at ? new Date(rec.captured_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : rec.time + ' น.')}</b></dd>
        <dt>สถานที่</dt><dd>${esc(rec.location)}${rec.site_distance != null ? ` <span class="sub">(ห่างจุดทำงาน ${num(rec.site_distance)} ม.)</span>` : ''}</dd>
        <dt>พิกัด</dt><dd>${map}</dd>
        ${rec.verify_code ? `<dt>รหัสตรวจสอบ</dt><dd><b class="mono">${esc(rec.verify_code)}</b> <span class="sub">ต้องตรงกับในรูป</span></dd>` : ''}
        ${rec.face_ratio != null ? `<dt>ตรวจใบหน้า</dt><dd>พบใบหน้า ${Math.round(rec.face_ratio * 100)}% ของเวลาสแกน</dd>` : ''}
        <dt>ข้อสังเกต</dt><dd>${flags.length ? flags.map((f) => `<span class="badge ${INFO_FLAGS.has(f) ? 'pending' : 'flag'}">${esc(FLAG_TH[f] || f)}</span>`).join(' ') : rec.verify_code ? '<span class="badge approved">ไม่พบความผิดปกติ</span>' : '<span class="muted">ข้อมูลก่อนมีระบบสแกน</span>'}</dd>
        ${rec.ip ? `<dt>IP</dt><dd class="mono">${esc(rec.ip)}</dd>` : ''}
        ${rec.device ? `<dt>อุปกรณ์</dt><dd class="sub">${esc(rec.device)}</dd>` : ''}</dl>
        <canvas class="detail-photo" data-photo="${esc(rec.photo)}" data-fit="contain" data-open="${esc(rec.photo)}"></canvas>
      </div>`;
    };
    const extras = p.records.filter((r) => r !== p.checkin && r !== p.checkout);
    openModal(`
      <h2 style="margin:0 40px 2px 0">${esc(p.name)}</h2>${codeSub(p.emp_code)}
      <div class="muted">${esc(thDate(p.work_date))} · ${p.hours != null ? `ทำงาน ${num(p.hours)} ชั่วโมง` : PAIR_TH[p.status]}</div>
      <div class="detail-grid">${col(p.checkin, 'เช็คอิน', 'in')}${col(p.checkout, 'เช็คเอ้าท์', 'out')}</div>
      <div class="extra-list">
        <b>รายการทั้งหมดของวันนี้ (${p.records.length})</b>
        <div class="table-wrap"><table><tbody>${p.records.map((r) => `
          <tr><td><span class="badge ${r.type}">${r.type === 'in' ? 'เช็คอิน' : 'เช็คเอ้าท์'}</span></td><td>${esc(timeOf(r))} น.</td><td>${esc(r.location)}</td>
          <td><a href="#" data-open="${esc(r.photo)}">ดูรูป</a></td>
          <td class="act"><button class="btn danger sm" data-del="${r.id}">ลบ</button></td></tr>`).join('')}</tbody></table></div>
        ${extras.length ? `<p class="sub">มีรายการซ้ำ ${extras.length} รายการ — ระบบใช้เวลาเข้าเร็วสุดและเวลาออกช้าสุด</p>` : ''}
      </div>`, 'protect');
    hydratePhotos(modalBody);
    modalBody.querySelectorAll('[data-open]').forEach((el) => (el.onclick = (e) => { e.preventDefault(); showPhoto(el.dataset.open); }));
    modalBody.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('ลบรายการนี้และรูปถ่าย? ไม่สามารถกู้คืนได้')) return;
      try { await api(`/api/admin/attendance/${b.dataset.del}`, { method: 'DELETE' }); toast('ลบแล้ว'); closeModal(); reload(); }
      catch (err) { toast(err.message, true); }
    }));
  }

  // ---------- Pages ----------
  async function pageDash() {
    const c = content();
    const load = async () => {
      try {
        const d = await api('/api/admin/dashboard');
        if (page !== 'dash') return;
        setPending(d.pending);
        setCount('appealCount', d.appeals);
        setCount('regCount', (d.registrations || 0) + (d.code_requests || 0));
        const checkedIn = d.pairs.filter((p) => p.checkin).length;
        const noOut = d.pairs.filter((p) => p.status === 'no_checkout').length;
        const done = d.pairs.filter((p) => p.status === 'complete').length;
        c.innerHTML = `
          <div class="page-head"><div><h1>ภาพรวมวันนี้</h1><p>${esc(thDate(d.today))} · อัปเดตอัตโนมัติทุก 1 นาที</p></div>
            <button class="btn ghost" id="rf">${icon('refresh')}รีเฟรช</button></div>
          <div class="stats">
            <div class="card stat in"><div class="k">เช็คอินแล้ว</div><div class="v">${checkedIn}</div></div>
            <div class="card stat out"><div class="k">ยังไม่เช็คเอ้าท์</div><div class="v">${noOut}</div></div>
            <div class="card stat"><div class="k">ลงเวลาครบ</div><div class="v">${done}</div></div>
            <div class="card stat ot"><div class="k">OT รออนุมัติ</div><div class="v">${d.pending}</div></div>
            <button class="card stat map-stat" id="openMap" type="button"><div class="k">${icon('pin')}แผนที่การลงเวลา</div><div class="v">${d.pairs.reduce((n, p) => n + p.records.filter((r) => r.lat !== null && r.lat !== '' && r.lat !== undefined).length, 0)}</div><div class="sub">จุดสแกนวันนี้ · กดเพื่อเปิดแผนที่ →</div></button>
            <div class="card stat out"><div class="k">คำร้องรอพิจารณา</div><div class="v">${d.appeals || 0}</div></div>
          </div>
          <h2 class="section-title">การลงเวลาวันนี้</h2>
          <div id="tbl">${attTable(d.pairs, { showDate: false })}</div>`;
        document.getElementById('rf').onclick = load;
        document.getElementById('openMap').onclick = () => { mapState.date = d.today; go('map'); };
        bindAttTable(c, load);
      } catch (err) { toast(err.message, true); }
    };
    c.innerHTML = '<div class="empty">กำลังโหลด…</div>';
    await load();
    dashTimer = setInterval(() => { if (modal.hidden) load(); }, 60000);
  }

  // ---------- แผนที่การลงเวลา: จุดที่พนักงานสแกนเข้า/ออกงาน ----------
  const LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist';
  let leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletP) {
      leafletP = new Promise((resolve, reject) => {
        const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${LEAFLET}/leaflet.css`, integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=', crossOrigin: '' });
        const js = Object.assign(document.createElement('script'), { src: `${LEAFLET}/leaflet.js`, integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', crossOrigin: '' });
        js.onload = () => resolve(window.L);
        js.onerror = () => { leafletP = null; js.remove(); reject(new Error('โหลดแผนที่ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')); };
        document.head.append(css, js);
      });
    }
    return leafletP;
  }
  const mapState = { date: null, type: 'all', q: '' };
  let mapObj = null;
  async function pageMap() {
    const c = content();
    mapState.date = mapState.date || ymd(new Date());
    c.innerHTML = `<div class="page-head"><div><h1>แผนที่การลงเวลา</h1><p>จุดที่พนักงานสแกนเข้า-ออกงาน ตามพิกัด GPS จริงตอนถ่ายรูป · กดหมุดเพื่อดูรูปและรายละเอียด</p></div>
        <button class="btn ghost" id="mapRf">${icon('refresh')}รีเฟรช</button></div>
      <div class="card map-bar">
        <label class="field"><span>วันที่</span><input type="date" id="mapDate" value="${esc(mapState.date)}"></label>
        <div class="seg" id="mapType">
          <button type="button" data-t="all">ทั้งหมด</button><button type="button" data-t="in">🟢 เข้างาน</button><button type="button" data-t="out">🔴 ออกงาน</button>
        </div>
        <label class="field grow"><span>ค้นหา</span><input id="mapQ" placeholder="ชื่อ / รหัสพนักงาน / สถานที่" value="${esc(mapState.q)}"></label>
      </div>
      <div class="map-wrap">
        <div class="card map-card"><div id="map"><div class="empty">กำลังโหลดแผนที่…</div></div></div>
        <div class="card map-list" id="mapList"></div>
      </div>`;
    const typeBtns = c.querySelectorAll('#mapType [data-t]');
    const markType = () => typeBtns.forEach((b) => b.classList.toggle('on', b.dataset.t === mapState.type));
    markType();
    let L;
    try { L = await loadLeaflet(); } catch (err) { document.getElementById('map').innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
    if (page !== 'map') return;
    if (mapObj) { mapObj.remove(); mapObj = null; }
    const el = document.getElementById('map');
    el.innerHTML = '';
    mapObj = L.map(el, { zoomControl: true }).setView([13.75, 100.5], 6);
    // OpenStreetMap บล็อกคำขอที่ไม่บอกต้นทาง (หน้านี้ตั้ง referrer = same-origin) → ขอแบบ CORS และส่งเฉพาะชื่อเว็บ
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap', crossOrigin: 'anonymous', referrerPolicy: 'strict-origin-when-cross-origin',
    }).addTo(mapObj);
    const layer = L.layerGroup().addTo(mapObj);
    let recs = [];

    const popupHtml = (r) => {
      const w = warnsOf(r);
      return `<div class="map-pop">
        <canvas class="pop-photo" data-photo="${esc(r.photo)}" data-fit="contain"></canvas>
        <div class="pop-body">
          <span class="badge ${r.type === 'in' ? 'approved' : 'pending'}">${r.type === 'in' ? 'เข้างาน' : 'ออกงาน'}</span>
          <div class="name-cell">${avTag(r.employee_id, r.name)}<div><b>${esc(r.name)}</b><div class="sub">รหัส ${esc(r.emp_code)}</div></div></div>
          <div>🕒 ${esc(thDate(r.work_date))} ${esc(r.time)} น.</div>
          <div>🏢 ${esc(r.location)}</div>
          <div class="sub">📍 ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}${r.accuracy ? ` (±${Math.round(r.accuracy)} ม.)` : ''}</div>
          ${r.verify_code ? `<div>🔐 รหัสตรวจสอบ <b class="mono">${esc(r.verify_code)}</b></div>` : ''}
          ${w.length ? `<div class="pop-warn">⚠ ${esc(w.map((f) => FLAG_TH[f] || f).join(' / '))}</div>` : ''}
          <button class="btn ghost sm" data-big="${esc(r.photo)}" type="button">ดูรูปใหญ่</button>
        </div></div>`;
    };
    const draw = () => {
      layer.clearLayers();
      const q = mapState.q.trim().toLowerCase();
      const shown = recs.filter((r) => (mapState.type === 'all' || r.type === mapState.type)
        && (!q || `${r.name} ${r.emp_code} ${r.location}`.toLowerCase().includes(q)));
      const markers = new Map();
      shown.forEach((r) => {
        const bad = warnsOf(r).length > 0;
        const m = L.circleMarker([Number(r.lat), Number(r.lng)], {
          radius: 9, weight: bad ? 4 : 2, color: bad ? '#f9a825' : '#fff',
          fillColor: r.type === 'in' ? '#0f9d76' : '#d93025', fillOpacity: 0.95,
        }).addTo(layer);
        m.bindTooltip(`${esc(r.name)} · ${r.type === 'in' ? 'เข้า' : 'ออก'} ${esc(r.time)}`, { direction: 'top', offset: [0, -8] });
        m.bindPopup(() => popupHtml(r), { maxWidth: 300, minWidth: 240 });
        markers.set(r.id, m);
      });
      const list = document.getElementById('mapList');
      list.innerHTML = `<div class="map-list-head">${shown.length} จุด${recs.length !== shown.length ? ` (จาก ${recs.length})` : ''}</div>`
        + (shown.length ? shown.map((r) => `<button type="button" class="map-item" data-id="${esc(r.id)}">
            <span class="dot ${r.type}"></span>${avTag(r.employee_id, r.name, 'sm')}<span><b>${esc(r.name)}</b> <span class="sub">${esc(r.emp_code)}</span>
            <div class="sub">${r.type === 'in' ? 'เข้างาน' : 'ออกงาน'} ${esc(r.time)} · ${esc(r.location)}${warnsOf(r).length ? ' · <span class="bad">⚠</span>' : ''}</div></span></button>`).join('')
          : '<div class="empty">ไม่มีจุดสแกนในวันที่เลือก</div>');
      list.querySelectorAll('.map-item').forEach((b) => (b.onclick = () => {
        const m = markers.get(Number(b.dataset.id)) || markers.get(b.dataset.id);
        if (!m) return;
        mapObj.setView(m.getLatLng(), Math.max(mapObj.getZoom(), 17));
        m.openPopup();
      }));
      if (shown.length) mapObj.fitBounds(L.latLngBounds(shown.map((r) => [Number(r.lat), Number(r.lng)])).pad(0.2), { maxZoom: 17 });
    };
    mapObj.on('popupopen', (e) => {
      const node = e.popup.getElement();
      hydratePhotos(node);
      node.querySelectorAll('[data-big]').forEach((b) => (b.onclick = () => showPhoto(b.dataset.big)));
    });
    const load = async () => {
      try {
        const { pairs } = await api(`/api/admin/attendance?from=${mapState.date}&to=${mapState.date}`);
        if (page !== 'map') return;
        recs = pairs.flatMap((p) => p.records).filter((r) => r.lat !== null && r.lat !== '' && r.lat !== undefined && r.lng !== null && r.lng !== '')
          .sort((a, b) => String(a.time).localeCompare(String(b.time)));
        draw();
      } catch (err) { toast(err.message, true); }
    };
    typeBtns.forEach((b) => (b.onclick = () => { mapState.type = b.dataset.t; markType(); draw(); }));
    document.getElementById('mapDate').onchange = (e) => { if (e.target.value) { mapState.date = e.target.value; load(); } };
    let qt;
    document.getElementById('mapQ').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { mapState.q = e.target.value; draw(); }, 200); };
    document.getElementById('mapRf').onclick = load;
    setTimeout(() => mapObj && mapObj.invalidateSize(), 50);
    await load();
  }

  function pageAtt() {
    const c = content();
    c.innerHTML = `<div class="page-head"><div><h1>ลงเวลาเข้า-ออก</h1><p>คลิกแถวเพื่อดูรูปและรายละเอียด</p></div></div>
      ${filterBar({ exportKind: 'attendance' })}<div id="tbl"><div class="empty">กำลังโหลด…</div></div>`;
    const load = async () => {
      try {
        const { pairs } = await api(`/api/admin/attendance?${qs({ status: '' })}`);
        const t = document.getElementById('tbl');
        if (!t) return;
        t.innerHTML = attTable(pairs);
        bindAttTable(t, load);
      } catch (err) { toast(err.message, true); }
    };
    bindFilter(load, 'attendance');
    load();
  }

  function pageOT() {
    const c = content();
    c.innerHTML = `<div class="page-head"><div><h1>คำขอ OT</h1><p>อนุมัติหรือไม่อนุมัติคำขอทำโอที</p></div></div>
      ${filterBar({ status: true, exportKind: 'ot' })}<div id="tbl"><div class="empty">กำลังโหลด…</div></div>`;
    const load = async () => {
      try {
        const { items } = await api(`/api/admin/ot?${qs()}`);
        api('/api/admin/dashboard').then((d) => setPending(d.pending)).catch(() => {});
        const t = document.getElementById('tbl');
        if (!t) return;
        if (!items.length) { t.innerHTML = '<div class="card empty">ไม่มีคำขอ OT ในช่วงนี้</div>'; return; }
        const sumBy = (st) => items.filter((o) => o.status === st).reduce((s, o) => s + o.hours, 0);
        t.innerHTML = `
          <div class="card table-card"><div class="table-wrap"><table>
            <thead><tr><th><input type="checkbox" id="all" aria-label="เลือกทั้งหมด"></th><th>วันที่</th><th>ชื่อ</th><th>ประเภท</th><th>สแกนจริง (เข้า–ออก)</th><th>เวลา OT ที่ขอ</th><th class="num">ชั่วโมง</th><th>รายละเอียด</th><th>สถานะ</th><th class="num">จัดการ</th></tr></thead>
            <tbody>${items.map((o) => `
              <tr>
                <td><input type="checkbox" class="sel" value="${o.id}" aria-label="เลือก"></td>
                <td class="nowrap">${esc(thDate(o.ot_date))}<div class="sub">ส่ง ${esc(thDateTime(o.created_at))}</div></td>
                <td>${nameCell(o.employee_id, o.name, o.emp_code)}</td>
                <td><span class="badge ot">OT ${esc(o.ot_type)}</span><div class="sub">${OT_LABEL[o.ot_type]}</div></td>
                <td class="nowrap">${o.scan_in ? `<span class="t-time">${esc(o.scan_in)}–${esc(o.scan_out)}</span>${o.shift_name ? `<div class="sub">${esc(o.shift_name)}</div>` : ''}` : '<span class="muted">–</span>'}</td>
                <td class="nowrap t-time">${esc(o.start_time)}–${esc(o.end_time)}</td>
                <td class="num">${num(o.hours)}</td>
                <td>${esc(o.note) || '<span class="muted">–</span>'}${o.review_note ? `<div class="sub">ผู้อนุมัติ: ${esc(o.review_note)}</div>` : ''}</td>
                <td><span class="badge ${o.status}">${STATUS_TH[o.status]}</span></td>
                <td><div class="act">
                  ${o.status !== 'approved' ? `<button class="btn ok sm" data-st="approved" data-id="${o.id}">อนุมัติ</button>` : ''}
                  ${o.status !== 'rejected' ? `<button class="btn danger sm" data-st="rejected" data-id="${o.id}">ไม่อนุมัติ</button>` : ''}
                  ${o.status !== 'pending' ? `<button class="btn ghost sm" data-st="pending" data-id="${o.id}">รีเซ็ต</button>` : ''}
                  <button class="btn ghost sm" data-delot="${o.id}" title="ลบ">ลบ</button>
                </div></td>
              </tr>`).join('')}</tbody></table></div>
            <div class="table-foot">
              <span>${items.length} รายการ · อนุมัติแล้ว ${num(sumBy('approved'))} ชม. · รออนุมัติ ${num(sumBy('pending'))} ชม.</span>
              <span class="act"><button class="btn ok sm" id="bulkOk" disabled>อนุมัติที่เลือก</button><button class="btn danger sm" id="bulkNo" disabled>ไม่อนุมัติที่เลือก</button></span>
            </div></div>`;
        const sels = [...t.querySelectorAll('.sel')];
        const updBulk = () => { const n = sels.filter((s) => s.checked).length; t.querySelector('#bulkOk').disabled = t.querySelector('#bulkNo').disabled = !n; };
        t.querySelector('#all').onchange = (e) => { sels.forEach((s) => (s.checked = e.target.checked)); updBulk(); };
        sels.forEach((s) => (s.onchange = updBulk));
        const bulk = async (status) => {
          const ids = sels.filter((s) => s.checked).map((s) => Number(s.value));
          try { await api('/api/admin/ot/bulk', { body: { ids, status } }); toast(`อัปเดต ${ids.length} รายการ`); load(); } catch (err) { toast(err.message, true); }
        };
        t.querySelector('#bulkOk').onclick = () => bulk('approved');
        t.querySelector('#bulkNo').onclick = () => bulk('rejected');
        t.querySelectorAll('[data-st]').forEach((b) => (b.onclick = async () => {
          let review_note = '';
          if (b.dataset.st === 'rejected') {
            review_note = prompt('เหตุผลที่ไม่อนุมัติ (ไม่บังคับ)', '');
            if (review_note === null) return;
          }
          try { await api(`/api/admin/ot/${b.dataset.id}`, { method: 'PATCH', body: { status: b.dataset.st, review_note } }); toast('บันทึกแล้ว'); load(); }
          catch (err) { toast(err.message, true); }
        }));
        t.querySelectorAll('[data-delot]').forEach((b) => (b.onclick = async () => {
          if (!confirm('ลบคำขอ OT นี้? ไม่สามารถกู้คืนได้')) return;
          try { await api(`/api/admin/ot/${b.dataset.delot}`, { method: 'DELETE' }); toast('ลบแล้ว'); load(); } catch (err) { toast(err.message, true); }
        }));
      } catch (err) { toast(err.message, true); }
    };
    bindFilter(load, 'ot');
    load();
  }

  function pageSum() {
    const c = content();
    c.innerHTML = `<div class="page-head"><div><h1>สรุปรายคน</h1><p>นับเฉพาะ OT ที่อนุมัติแล้ว · ใช้ทำเงินเดือน/ค่าแรง</p></div></div>
      ${filterBar({ exportKind: 'summary' })}<div id="tbl"><div class="empty">กำลังโหลด…</div></div>`;
    const load = async () => {
      try {
        const { rows } = await api(`/api/admin/summary?${qs({ status: '' })}`);
        const t = document.getElementById('tbl');
        if (!t) return;
        if (!rows.length) { t.innerHTML = '<div class="card empty">ไม่มีข้อมูลในช่วงนี้</div>'; return; }
        const tot = (f) => rows.reduce((s, r) => s + f(r), 0);
        t.innerHTML = `<div class="card table-card"><div class="table-wrap"><table>
          <thead><tr><th>ชื่อ</th><th class="num">วันทำงาน</th><th class="num">ชั่วโมงทำงาน</th><th class="num">มาสาย (วัน)</th><th class="num">สีแดง (วัน)</th><th class="num">อนุมัติคำร้อง</th><th class="num">OT 1.5 (ชม.)</th><th class="num">OT 2 (ชม.)</th><th class="num">OT 3 (ชม.)</th><th class="num">OT รออนุมัติ</th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td><b>${esc(r.name)}</b>${codeSub(r.emp_code)}</td><td class="num">${r.days}</td><td class="num">${num(r.hours)}</td>
            <td class="num">${r.late_days ? `<span class="badge no_checkout">${r.late_days}</span>` : (r.late_days ?? '–')}</td>
            <td class="num">${r.red_days ? `<span class="badge rejected">${r.red_days}</span>` : (r.red_days ?? '–')}</td>
            <td class="num">${r.excused_days ?? '–'}</td>
            <td class="num">${num(r.ot['1.5'])}</td><td class="num">${num(r.ot['2'])}</td><td class="num">${num(r.ot['3'])}</td>
            <td class="num">${r.ot_pending ? `<span class="badge pending">${r.ot_pending}</span>` : '0'}</td></tr>`).join('')}
          <tr style="background:var(--surface-2);font-weight:700"><td>รวม ${rows.length} คน</td><td class="num">${tot((r) => r.days)}</td><td class="num">${num(tot((r) => r.hours))}</td>
            <td class="num">${tot((r) => r.late_days || 0)}</td><td class="num">${tot((r) => r.red_days || 0)}</td><td class="num">${tot((r) => r.excused_days || 0)}</td><td class="num">${num(tot((r) => r.ot['1.5']))}</td><td class="num">${num(tot((r) => r.ot['2']))}</td>
            <td class="num">${num(tot((r) => r.ot['3']))}</td><td class="num">${tot((r) => r.ot_pending)}</td></tr>
          </tbody></table></div></div>`;
      } catch (err) { toast(err.message, true); }
    };
    bindFilter(load, 'summary');
    load();
  }

  function pageEmp() {
    const c = content();
    c.innerHTML = `<div class="page-head"><div><h1>พนักงาน</h1><p>พนักงานที่ลงทะเบียนผ่านแอป · ปิดใช้งานเพื่อไม่ให้เข้าระบบได้อีก</p></div></div>
      <div class="card reg-card">
        <label class="switch"><input type="checkbox" id="regSwitch" disabled><span class="slider"></span></label>
        <div><b>สมัครแล้วต้องรอผู้ดูแลอนุมัติ</b>
          <div class="muted" id="regText">กำลังโหลด…</div></div>
      </div>
      <div id="codeReqs"></div>
      <form class="card filters" id="ef">
        <label class="field f-q" style="flex:1;max-width:340px"><span>ค้นหา</span><input name="q" placeholder="รหัส ชื่อ หรือเบอร์โทร"></label>
        <div class="actions"><button class="btn primary" type="submit">ค้นหา</button>
          <button type="button" class="btn ghost" id="expEmp">${icon('dl')}ส่งออก Excel</button></div>
      </form>
      <div class="act-filters" id="actF"></div>
      <div id="tbl"><div class="empty">กำลังโหลด…</div></div>`;
    const ef = document.getElementById('ef');
    const sw = document.getElementById('regSwitch');
    const regText = (mode) => {
      document.getElementById('regText').textContent = mode === 'approval'
        ? 'เปิดอยู่: พนักงานที่สมัครใหม่ต้องรออนุมัติในหน้านี้ก่อน จึงจะเข้าสู่ระบบได้'
        : 'ปิดอยู่: พนักงานสมัครแล้วเข้าใช้งานได้ทันที';
    };
    api('/api/admin/registration').then((r) => { if (!sw.isConnected) return; sw.checked = r.mode === 'approval'; sw.disabled = false; regText(r.mode); }).catch((e) => { if (sw.isConnected) toast(e.message, true); });
    sw.onchange = async () => {
      const mode = sw.checked ? 'approval' : 'open';
      sw.disabled = true;
      try { await api('/api/admin/registration', { method: 'PUT', body: { mode } }); regText(mode); toast(mode === 'approval' ? 'เปิดโหมดรออนุมัติแล้ว' : 'ปิดโหมดรออนุมัติแล้ว'); }
      catch (e) { sw.checked = !sw.checked; toast(e.message, true); }
      sw.disabled = false;
    };
    const loadCodeReqs = async () => {
      const box = document.getElementById('codeReqs');
      if (!box) return;
      try {
        const { items } = await api('/api/admin/code-requests?status=pending');
        if (!items.length) { box.innerHTML = ''; return; }
        box.innerHTML = `<div class="card table-card code-reqs"><div class="table-head"><b>คำขอแก้รหัสพนักงาน (${items.length})</b></div><div class="table-wrap"><table>
          <thead><tr><th>ชื่อ</th><th>รหัสเดิม → รหัสใหม่</th><th>เหตุผล</th><th>ส่งเมื่อ</th><th class="num">จัดการ</th></tr></thead>
          <tbody>${items.map((r) => `<tr>
            <td><b>${esc(r.name)}</b></td>
            <td class="nowrap mono">${esc(r.old_code)} → <b>${esc(r.new_code)}</b></td>
            <td>${esc(r.reason)}</td>
            <td class="nowrap">${esc(thDateTime(r.created_at))}</td>
            <td><div class="act"><button class="btn ok sm" data-cr="${r.id}" data-st="approved">อนุมัติ</button><button class="btn danger sm" data-cr="${r.id}" data-st="rejected">ไม่อนุมัติ</button></div></td>
          </tr>`).join('')}</tbody></table></div></div>`;
        box.querySelectorAll('[data-cr]').forEach((b) => (b.onclick = async () => {
          let review_note = '';
          if (b.dataset.st === 'rejected') {
            review_note = prompt('เหตุผลที่ไม่อนุมัติ (พนักงานจะเห็นข้อความนี้)', '');
            if (review_note === null) return;
          }
          try {
            await api(`/api/admin/code-requests/${b.dataset.cr}`, { method: 'PATCH', body: { status: b.dataset.st, review_note } });
            toast(b.dataset.st === 'approved' ? 'เปลี่ยนรหัสพนักงานแล้ว' : 'ไม่อนุมัติคำขอแล้ว');
            refreshCounts();
            load();
          } catch (err) { toast(err.message, true); }
        }));
      } catch (err) { box.innerHTML = ''; toast(err.message, true); }
    };
    // ---- สถานะการใช้งาน: กรอง/เรียง ฝั่งหน้าเว็บ ----
    const ACT_FILTERS = [
      { id: 'all', label: 'ทั้งหมด', fn: () => true },
      { id: 'online', label: '🟢 ออนไลน์', fn: (e) => e.online },
      { id: 'm3', label: 'ขาดสแกน ≥ 3 วัน', fn: (e) => e.status !== 'pending' && e.missed_workdays >= 3 },
      { id: 'm7', label: 'ขาดสแกน ≥ 7 วัน (อาจลาออก)', fn: (e) => e.status !== 'pending' && e.missed_workdays >= 7 },
      { id: 'm30', label: 'ขาดสแกน ≥ 30 วัน', fn: (e) => e.status !== 'pending' && e.missed_workdays >= 30 },
    ];
    let actFilter = 'all';
    let sortByMissed = false;
    let items = [];
    const ago = (iso) => {
      if (!iso) return '';
      const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
      if (min < 1) return 'เมื่อสักครู่';
      if (min < 60) return `${min} นาทีที่แล้ว`;
      if (min < 1440) return `${Math.round(min / 60)} ชม.ที่แล้ว`;
      return `${Math.round(min / 1440)} วันที่แล้ว`;
    };
    const missedBadge = (e) => {
      if (e.status === 'pending') return '<span class="muted">–</span>';
      const n = e.missed_workdays || 0;
      if (n >= 7) return `<span class="badge rejected">${n} วัน · อาจลาออก</span>`;
      if (n >= 3) return `<span class="badge pending">${n} วัน</span>`;
      return `<span class="badge approved">${n ? `${n} วัน` : 'ไม่ขาด'}</span>`;
    };

    const draw = () => {
      const t = document.getElementById('tbl');
      if (!t) return;
      document.querySelectorAll('#actF [data-f]').forEach((b) => {
        const f = ACT_FILTERS.find((x) => x.id === b.dataset.f);
        b.classList.toggle('active', b.dataset.f === actFilter);
        b.querySelector('i').textContent = items.filter(f.fn).length;
      });
      document.getElementById('sortMissed').classList.toggle('active', sortByMissed);
      if (!items.length) { t.innerHTML = '<div class="card empty">ยังไม่มีพนักงานลงทะเบียน</div>'; return; }
      let rows = items.filter(ACT_FILTERS.find((x) => x.id === actFilter).fn);
      if (sortByMissed) rows = [...rows].sort((a, b) => (b.missed_workdays || 0) - (a.missed_workdays || 0));
      if (!rows.length) { t.innerHTML = '<div class="card empty">ไม่มีพนักงานตามเงื่อนไขนี้</div>'; return; }
      const waiting = items.filter((e) => e.status === 'pending').length;
      t.innerHTML = `<div class="card table-card"><div class="table-wrap"><table>
        <thead><tr><th>รหัสพนักงาน</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>ออนไลน์</th><th>สแกนเข้างานล่าสุด</th><th>ขาดสแกน (วันทำงาน)</th><th>สถานะ</th><th class="num">จัดการ</th></tr></thead>
        <tbody>${rows.map((e) => `<tr class="${e.status === 'pending' ? 'row-pending' : e.missed_workdays >= 7 ? 'row-inactive' : ''}">
          <td class="t-time">${esc(e.emp_code)}</td>
          <td>${nameCell(e.id, e.title + e.first_name + ' ' + e.last_name, '', `<div class="sub">ลงทะเบียน ${esc(thDate(ymd(new Date(e.created_at))))} · ${e.devices} เครื่อง</div>`)}</td>
          <td class="nowrap">${esc(e.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'))}</td>
          <td class="nowrap">${e.online ? '<span class="dot-online"></span>ออนไลน์' : `<span class="dot-offline"></span><span class="muted">${e.last_seen_at ? `ใช้ล่าสุด ${esc(ago(e.last_seen_at))}` : 'ยังไม่เคยใช้'}</span>`}</td>
          <td class="nowrap">${e.last_checkin_date ? `${esc(thDate(e.last_checkin_date))}<div class="sub">${e.days_since_checkin === 0 ? 'วันนี้' : `${e.days_since_checkin} วันที่แล้ว`}</div>` : '<span class="muted">ยังไม่เคยสแกน</span>'}</td>
          <td class="nowrap">${missedBadge(e)}</td>
          <td>${e.status === 'pending' ? '<span class="badge pending">รออนุมัติ</span>' : `<span class="badge ${e.active ? 'approved' : 'rejected'}">${e.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span>`}</td>
          <td><div class="act">${e.status === 'pending' ? `
            <button class="btn ghost sm" data-code="${e.id}" data-name="${esc(e.emp_code)}">แก้รหัส</button>
            <button class="btn ok sm" data-approve="${e.id}" data-name="${esc(e.emp_code)}">อนุมัติ</button>
            <button class="btn danger sm" data-reject="${e.id}" data-name="${esc(e.emp_code)}">ไม่อนุมัติ</button>` : `
            <button class="btn ghost sm" data-code="${e.id}" data-name="${esc(e.emp_code)}">แก้รหัส</button>
            <button class="btn ghost sm" data-pw="${e.id}" data-name="${esc(e.emp_code)}">ตั้งรหัสผ่านใหม่</button>
            <button class="btn ghost sm" data-phone="${e.id}" data-cur="${esc(e.phone)}">แก้เบอร์</button>
            <button class="btn ${e.active ? 'danger' : 'ok'} sm" data-active="${e.id}" data-to="${e.active ? 0 : 1}">${e.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
            <button class="btn danger sm" data-del="${e.id}">ลบ</button>`}
          </div></td></tr>`).join('')}</tbody></table></div>
        <div class="table-foot"><span>แสดง ${rows.length} จาก ${items.length} คน${waiting ? ` · <b class="warn">รออนุมัติ ${waiting} คน</b>` : ''}</span>
          <span class="sub">ขาดสแกน = วันทำงานที่ผ่านมาแล้ว (ไม่นับวันหยุด) หลังสแกนเข้างานครั้งล่าสุด</span></div></div>`;
      bindRowActions(t);
    };

    const patch = async (id, body, msg) => {
      try { await api(`/api/admin/employees/${id}`, { method: 'PATCH', body }); toast(msg); load(); refreshCounts(); } catch (err) { toast(err.message, true); }
    };
    const bindRowActions = (t) => {
      t.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => {
        const v = prompt(`แก้รหัสพนักงาน ${b.dataset.name} เป็น (อักษรอังกฤษตัวใหญ่ ตามด้วยตัวเลข)\nประวัติลงเวลา/OT/คำร้องเดิมจะเปลี่ยนเป็นรหัสใหม่ทั้งหมด\nพนักงานต้องใช้รหัสใหม่ตอนเข้าสู่ระบบครั้งถัดไป`, b.dataset.name);
        if (v === null) return;
        const code = v.trim().toUpperCase();
        if (!/^[A-Z]+[0-9]+$/.test(code)) return toast('รหัสต้องเป็นอักษรอังกฤษตัวใหญ่ ตามด้วยตัวเลข เช่น EMP001', true);
        if (code === b.dataset.name) return;
        patch(b.dataset.code, { emp_code: code }, `เปลี่ยนรหัส ${b.dataset.name} เป็น ${code} แล้ว`);
      }));
      t.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = () => patch(b.dataset.approve, { approve: true }, `อนุมัติ ${b.dataset.name} แล้ว เข้าสู่ระบบได้ทันที`)));
      t.querySelectorAll('[data-reject]').forEach((b) => (b.onclick = () => {
        if (!confirm(`ไม่อนุมัติใบสมัคร ${b.dataset.name}?\nใบสมัครจะถูกลบ (สมัครใหม่ด้วยข้อมูลที่ถูกต้องได้)`)) return;
        patch(b.dataset.reject, { reject: true }, 'ลบใบสมัครแล้ว');
      }));
      t.querySelectorAll('[data-active]').forEach((b) => (b.onclick = () => {
        const on = b.dataset.to === '1';
        if (!on && !confirm('ปิดใช้งานพนักงานคนนี้? เครื่องที่ล็อกอินไว้จะถูกออกจากระบบ')) return;
        patch(b.dataset.active, { active: on }, on ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
      }));
      t.querySelectorAll('[data-pw]').forEach((b) => (b.onclick = () => {
        const pw = prompt(`ตั้งรหัสผ่านใหม่ให้ ${b.dataset.name} (อย่างน้อย 6 ตัว)\nพนักงานต้องเข้าสู่ระบบใหม่ด้วยรหัสนี้`);
        if (pw === null) return;
        if (pw.length < 6) return toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัว', true);
        patch(b.dataset.pw, { password: pw }, 'ตั้งรหัสผ่านใหม่แล้ว');
      }));
      t.querySelectorAll('[data-phone]').forEach((b) => (b.onclick = () => {
        const ph = prompt('เบอร์โทรใหม่ (10 หลัก ขึ้นต้นด้วย 0)', b.dataset.cur);
        if (ph === null) return;
        patch(b.dataset.phone, { phone: ph }, 'แก้เบอร์โทรแล้ว');
      }));
      t.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => openDelete(items.find((x) => String(x.id) === b.dataset.del))));
    };

    // ---- ลบพนักงาน = ลบทุกอย่างที่เกี่ยวข้องถาวร · แสดงจำนวนที่จะถูกลบ + ติ๊กยอมรับ + พิมพ์รหัสยืนยัน ----
    const openDelete = async (e) => {
      const fullName = e.title + e.first_name + ' ' + e.last_name;
      openModal(`<h2 style="margin:0 40px 6px 0">ลบพนักงาน</h2><div class="empty">กำลังตรวจสอบข้อมูลที่เกี่ยวข้อง…</div>`);
      let im;
      try { im = await api(`/api/admin/employees/${e.id}/impact`); } catch (err) { closeModal(); return toast(err.message, true); }
      const range = im.first_date ? `${thDate(im.first_date)}${im.last_date !== im.first_date ? ` – ${thDate(im.last_date)}` : ''}` : '';
      openModal(`
        <h2 style="margin:0 40px 10px 0">ลบพนักงานและข้อมูลทั้งหมด</h2>
        <div class="name-cell del-who">${avTag(e.id, fullName, 'lg')}<div><b>${esc(fullName)}</b><div class="sub">รหัส ${esc(e.emp_code)} · โทร ${esc(e.phone)}</div></div></div>
        <div class="del-warn">
          <b>⚠ ข้อมูลต่อไปนี้จะถูกลบถาวร กู้คืนไม่ได้</b>
          <ul>
            <li>บัญชีพนักงาน (เข้าสู่ระบบไม่ได้อีก)</li>
            <li>ประวัติลงเวลา <b>${im.attendance}</b> รายการ${range ? ` <span class="sub">(${esc(range)})</span>` : ''}</li>
            <li>รูปถ่ายตอนสแกนเข้า-ออกงาน <b>${im.photos}</b> รูป</li>
            <li>คำขอ OT <b>${im.ot}</b> รายการ · คำร้อง <b>${im.appeals}</b> รายการ</li>
            <li>รูปโปรไฟล์${im.avatar ? '' : ' (ไม่มี)'}</li>
          </ul>
          <div class="sub">ข้อมูลของคนนี้จะหายจากรายงาน สรุปรายคน แผนที่ และไฟล์ Excel ที่ส่งออกหลังจากนี้ · รูปที่ส่งเข้า Telegram ไปแล้ว ระบบลบให้ไม่ได้ ต้องลบในแอป Telegram เอง</div>
        </div>
        <form id="delf" class="del-form">
          <label class="del-ack"><input type="checkbox" name="ack"> ฉันเข้าใจว่าข้อมูลทั้งหมดของพนักงานคนนี้จะถูกลบถาวร และกู้คืนไม่ได้</label>
          <label class="field"><span>พิมพ์รหัสพนักงาน <b>${esc(e.emp_code)}</b> เพื่อยืนยัน</span><input name="confirm" autocomplete="off" spellcheck="false"></label>
          <div class="row"><button type="submit" class="btn danger" id="delBtn" disabled>ลบทั้งหมดถาวร</button><button type="button" class="btn ghost" id="delCancel">ยกเลิก</button></div>
          <p class="sub">ถ้าต้องการเก็บประวัติไว้เป็นหลักฐาน (เช่น ใช้คำนวณเงินเดือนย้อนหลัง) ให้กด "ยกเลิก" แล้วใช้ "ปิดใช้งาน" แทน พนักงานจะเข้าระบบไม่ได้แต่ข้อมูลยังอยู่</p>
        </form>`);
      const f = document.getElementById('delf');
      const btn = document.getElementById('delBtn');
      const check = () => { btn.disabled = !f.ack.checked || f.confirm.value.trim().toUpperCase() !== e.emp_code; };
      f.confirm.oninput = check;
      f.ack.onchange = check;
      document.getElementById('delCancel').onclick = closeModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        if (btn.disabled) return;
        if (!confirm(`ยืนยันครั้งสุดท้าย: ลบ ${fullName} (${e.emp_code}) และข้อมูลทั้งหมดถาวร?`)) return;
        btn.disabled = true;
        btn.textContent = 'กำลังลบ…';
        try {
          const r = await api(`/api/admin/employees/${e.id}?mode=all&confirm=${encodeURIComponent(f.confirm.value.trim())}`, { method: 'DELETE' });
          closeModal();
          toast(`ลบ ${e.emp_code} และข้อมูลทั้งหมดแล้ว (ลงเวลา ${r.removed.attendance} รายการ, รูป ${r.removed.photos} รูป, OT ${r.removed.ot}, คำร้อง ${r.removed.appeals})`);
          load();
          refreshCounts();
        } catch (err) { toast(err.message, true); btn.textContent = 'ลบทั้งหมดถาวร'; check(); }
      };
    };

    const load = async () => {
      loadCodeReqs();
      loadAvatars(true);
      const q = ef.q.value.trim();
      document.getElementById('expEmp').onclick = () => Backend.download(`/api/admin/export/employees?${new URLSearchParams(q ? { q } : {})}`, 'employees.csv').catch((e) => toast(e.message, true));
      try {
        ({ items } = await api(`/api/admin/employees?${new URLSearchParams(q ? { q } : {})}`));
        draw();
      } catch (err) { toast(err.message, true); }
    };
    document.getElementById('actF').innerHTML = ACT_FILTERS.map((f) => `<button type="button" class="btn ghost sm" data-f="${f.id}">${f.label} <i>0</i></button>`).join('')
      + '<button type="button" class="btn ghost sm" id="sortMissed">เรียง: ขาดสแกนนานสุดก่อน</button>';
    document.querySelectorAll('#actF [data-f]').forEach((b) => (b.onclick = () => { actFilter = b.dataset.f; draw(); }));
    document.getElementById('sortMissed').onclick = () => { sortByMissed = !sortByMissed; draw(); };
    ef.onsubmit = (e) => { e.preventDefault(); load(); };
    load();
    // อัปเดตสถานะออนไลน์ทุก 1 นาที ขณะเปิดหน้านี้
    dashTimer = setInterval(() => { if (page === 'emp' && modal.hidden) load(); }, 60000);
  }

  // ---------- ปฏิทินพนักงาน ----------
  const DAY_STATUS = {
    ok: 'ปกติ', problem: 'ไม่ถูกต้อง', absent: 'ไม่มีการสแกน', no_checkin: 'ไม่มีสแกนเข้า', no_checkout: 'ไม่มีสแกนออก',
    holiday: 'วันหยุด', holiday_work: 'ทำงานวันหยุด', working: 'กำลังทำงาน', pending: 'ยังไม่สแกน', future: '', none: '',
  };
  const APPEAL_TH = { pending: 'รอพิจารณา', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ' };
  const WEEK_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const thisMonth = () => ymd(new Date()).slice(0, 7);
  const calState = { employee_id: '', month: thisMonth() };

  async function decideAppeal(id, status, after) {
    let review_note = '';
    if (status === 'rejected') {
      review_note = prompt('เหตุผลที่ไม่อนุมัติ (พนักงานจะเห็นข้อความนี้)', '');
      if (review_note === null) return;
    }
    try {
      await api(`/api/admin/appeals/${id}`, { method: 'PATCH', body: { status, review_note } });
      toast(status === 'approved' ? 'อนุมัติคำร้องแล้ว' : status === 'rejected' ? 'ไม่อนุมัติคำร้องแล้ว' : 'บันทึกแล้ว');
      refreshCounts();
      after();
    } catch (err) { toast(err.message, true); }
  }

  async function pageCal() {
    const c = content();
    c.innerHTML = `<div class="page-head"><div><h1>ปฏิทินพนักงาน</h1><p>สีรายวันตามตารางกะ · คลิกวันที่เพื่อดูรายละเอียด รูปสแกน และคำร้อง</p></div></div>
      <form class="card filters" id="cf">
        <label class="field" style="flex:1;min-width:220px;max-width:380px"><span>พนักงาน</span><select name="emp"><option value="">กำลังโหลด…</option></select></label>
        <label class="field f-date"><span>เดือน</span><input type="month" name="month" value="${calState.month}"></label>
        <div class="quick"><button type="button" class="btn ghost sm" id="mPrev">‹ เดือนก่อน</button><button type="button" class="btn ghost sm" id="mNext">เดือนถัดไป ›</button></div>
      </form><div id="calOut"><div class="card empty">เลือกพนักงานเพื่อดูปฏิทิน</div></div>`;
    const f = document.getElementById('cf');
    try {
      const { items } = await api('/api/admin/employees');
      if (!f.isConnected) return; // เปลี่ยนไปหน้าอื่นระหว่างโหลด
      f.emp.innerHTML = `<option value="">— เลือกพนักงาน (${items.length} คน) —</option>` + items.map((e) => `<option value="${e.id}" ${String(e.id) === String(calState.employee_id) ? 'selected' : ''}>${esc(e.emp_code)} · ${esc(e.title + e.first_name + ' ' + e.last_name)}${e.active ? '' : ' (ปิดใช้งาน)'}</option>`).join('');
    } catch (err) { if (!f.isConnected) return; toast(err.message, true); }
    const load = async () => {
      if (!f.isConnected) return;
      calState.employee_id = f.emp.value;
      calState.month = f.month.value || thisMonth();
      const out = document.getElementById('calOut');
      if (!calState.employee_id) { out.innerHTML = '<div class="card empty">เลือกพนักงานเพื่อดูปฏิทิน</div>'; return; }
      out.innerHTML = '<div class="card empty">กำลังโหลด…</div>';
      try {
        const data = await api(`/api/admin/calendar?employee_id=${calState.employee_id}&month=${calState.month}`);
        if (!out.isConnected) return;
        drawAdminCal(out, data, load);
      } catch (err) { if (out.isConnected) out.innerHTML = `<div class="card empty">${esc(err.message)}</div>`; }
    };
    const shiftMonth = (n) => { const [y, m] = (f.month.value || thisMonth()).split('-').map(Number); f.month.value = ymd(new Date(y, m - 1 + n, 1)).slice(0, 7); load(); };
    f.emp.onchange = load;
    f.month.onchange = load;
    document.getElementById('mPrev').onclick = () => shiftMonth(-1);
    document.getElementById('mNext').onclick = () => shiftMonth(1);
    f.onsubmit = (e) => { e.preventDefault(); load(); };
    load();
  }

  function drawAdminCal(out, data, reload) {
    const { days, summary: s, schedule, employee } = data;
    const lead = new Date(`${days[0].date}T12:00:00Z`).getUTCDay();
    const today = ymd(new Date());
    out.innerHTML = `
      <div class="stats">
        <div class="card stat"><div class="k">วันทำงาน</div><div class="v">${s.work}</div></div>
        <div class="card stat in"><div class="k">ปกติ (เขียว)</div><div class="v">${s.ok}</div></div>
        <div class="card stat flagged"><div class="k">ไม่ถูกต้อง (แดง)</div><div class="v">${s.red}</div></div>
        <div class="card stat out"><div class="k">มาสาย</div><div class="v">${s.late}</div></div>
        <div class="card stat ot"><div class="k">OT คำนวณ (ชม.)</div><div class="v">${num(s.ot['1.5'] + s.ot['2'] + s.ot['3'])}</div></div>
      </div>
      <div class="card acal">
        <div class="acal-title"><b>${esc(employee.name)}</b> <span class="muted">รหัส ${esc(employee.emp_code)} · เริ่มใช้ระบบ ${esc(thDate(data.start_date))}</span></div>
        <div class="acal-grid acal-week">${WEEK_TH.map((w, i) => `<span class="${schedule.weekly_off.includes(i) ? 'off' : ''}">${w}</span>`).join('')}</div>
        <div class="acal-grid">${'<span></span>'.repeat(lead)}${days.map((d, i) => `
          <button class="acal-day c-${d.color}${d.date === today ? ' today' : ''}" data-i="${i}">
            <span class="n">${Number(d.date.slice(8))}</span>
            <span class="st">${esc(d.color === 'excused' ? 'อนุมัติคำร้อง' : d.holiday_name && !d.checkin ? d.holiday_name : DAY_STATUS[d.status] || '')}</span>
            ${d.checkin || d.checkout ? `<span class="tm">${esc(d.checkin || '--:--')} → ${esc(d.checkout || '--:--')}</span>` : ''}
            ${d.ot['1.5'] + d.ot['2'] + d.ot['3'] ? `<span class="tm">OT ${num(d.ot['1.5'] + d.ot['2'] + d.ot['3'])} ชม.</span>` : ''}
            ${d.appeal ? `<span class="ap ${d.appeal.status}">คำร้อง${APPEAL_TH[d.appeal.status]}</span>` : ''}
          </button>`).join('')}</div>
        <div class="cal-legend">
          <span><i class="c-green"></i>ปกติ</span><span><i class="c-red"></i>ไม่ถูกต้อง / ลืมสแกน / สาย / ออกก่อน</span><span><i class="c-gray"></i>วันหยุด</span>
          <span><i class="c-purple"></i>ทำงานวันหยุด</span><span><i class="c-excused"></i>อนุมัติคำร้อง</span><span><i class="c-blue"></i>วันนี้ / กำลังทำงาน</span>
        </div>
      </div>`;
    out.querySelectorAll('.acal-day').forEach((b) => (b.onclick = () => adminDay(days[b.dataset.i], employee, reload)));
  }

  function adminDay(d, employee, reload) {
    const ins = d.records.filter((r) => r.type === 'in').sort((a, b) => (a.captured_at || a.time).localeCompare(b.captured_at || b.time));
    const outs = d.records.filter((r) => r.type === 'out').sort((a, b) => (b.captured_at || b.time).localeCompare(a.captured_at || a.time));
    openModal(`
      <h2 style="margin:0 40px 4px 0">${esc(thDate(d.date))}${d.holiday_name ? ` <span class="badge">${esc(d.holiday_name)}</span>` : ''}</h2>
      <div class="muted">${esc(employee.name)} · รหัส ${esc(employee.emp_code)}</div>
      <div class="day-summary">
        <span class="badge day-${d.color}">${esc(d.color === 'excused' ? 'อนุมัติคำร้องแล้ว' : DAY_STATUS[d.status] || '–')}</span>
        ${d.shift ? `<span>${esc(d.shift.name)} ${esc(d.shift.start)}–${esc(d.shift.end)} น.</span>` : ''}
        <span>สแกนจริง เข้า <b>${esc(d.checkin || '—')}</b> · ออก <b>${esc(d.checkout || '—')}</b>${d.worked_hours != null ? ` · ${num(d.worked_hours)} ชม.` : ''}</span>
        ${d.calc_in ? `<span class="muted">คิดเวลางาน ${esc(d.calc_in)}–${esc(d.calc_out)}</span>` : ''}
      </div>
      ${d.issues.length ? `<div class="issue-box"><b>สาเหตุสีแดง:</b> ${d.issues.map((i) => esc(i.text)).join(', ')}</div>` : ''}
      ${d.ot_detail.length ? `<div class="ot-box"><b>เวลาทำงานเกิน (คิด OT ได้):</b> ${d.ot_detail.map((o) => `OT ${esc(o.type)} ${esc(o.start)}–${esc(o.end)} = ${num(o.hours)} ชม.`).join(', ')} <span class="sub">(คิด OT ได้ · พนักงานต้องกดขอเอง)</span></div>` : ''}
      ${d.appeal ? `<div class="appeal-box"><b>คำร้อง (${esc(APPEAL_TH[d.appeal.status])}):</b> ${esc(d.appeal.reason)}<div>${esc(d.appeal.note)}</div>
        ${d.appeal.review_note ? `<div class="sub">หมายเหตุผู้ดูแล: ${esc(d.appeal.review_note)}</div>` : ''}
        <div class="act" style="justify-content:flex-start;margin-top:8px">
          ${d.appeal.status !== 'approved' ? `<button class="btn ok sm" data-ap="approved">อนุมัติคำร้อง</button>` : ''}
          ${d.appeal.status !== 'rejected' ? `<button class="btn danger sm" data-ap="rejected">ไม่อนุมัติ</button>` : ''}
        </div></div>` : ''}
      ${d.records.length ? `<button class="btn primary" id="seeScan">ดูรูปและรายละเอียดการสแกน</button>` : '<p class="muted">ไม่มีการสแกนในวันนี้</p>'}`);
    modalBody.querySelectorAll('[data-ap]').forEach((b) => (b.onclick = () => decideAppeal(d.appeal.id, b.dataset.ap, () => { closeModal(); reload(); })));
    const see = document.getElementById('seeScan');
    if (see) see.onclick = () => attDetail({
      name: employee.name, emp_code: employee.emp_code, work_date: d.date, records: d.records,
      checkin: ins[0] || null, checkout: outs[0] || null, hours: d.worked_hours,
      status: ins[0] && outs[0] ? 'complete' : ins[0] ? 'no_checkout' : 'no_checkin',
    }, reload);
  }

  // ---------- คำร้อง ----------
  function pageAppeal() {
    const c = content();
    if (!filter.status) filter.status = 'pending';
    c.innerHTML = `<div class="page-head"><div><h1>คำร้อง</h1><p>คำร้องจากพนักงานสำหรับวันที่เป็นสีแดง · อนุมัติแล้ววันนั้นจะเปลี่ยนเป็นสี "อนุมัติคำร้อง"</p></div></div>
      ${filterBar({ status: true })}<div id="tbl"><div class="empty">กำลังโหลด…</div></div>`;
    const load = async () => {
      try {
        const { items } = await api(`/api/admin/appeals?${qs()}`);
        const t = document.getElementById('tbl');
        if (!t) return;
        if (!items.length) { t.innerHTML = '<div class="card empty">ไม่มีคำร้องในช่วงนี้</div>'; return; }
        t.innerHTML = `<div class="card table-card"><div class="table-wrap"><table>
          <thead><tr><th>วันที่</th><th>ชื่อ</th><th>ปัญหาของวันนั้น</th><th>เหตุผล / รายละเอียด</th><th>สถานะ</th><th class="num">จัดการ</th></tr></thead>
          <tbody>${items.map((a) => `<tr>
            <td class="nowrap">${esc(thDate(a.work_date))}<div class="sub">ส่ง ${esc(thDateTime(a.created_at))}</div></td>
            <td>${nameCell(a.employee_id, a.name, a.emp_code)}</td>
            <td><span class="sub" style="color:var(--bad)">${esc(a.issues || '-')}</span></td>
            <td><b>${esc(a.reason)}</b><div>${esc(a.note)}</div>${a.review_note ? `<div class="sub">ผู้ดูแล: ${esc(a.review_note)}</div>` : ''}</td>
            <td><span class="badge ${a.status}">${APPEAL_TH[a.status]}</span></td>
            <td><div class="act">
              ${a.status !== 'approved' ? `<button class="btn ok sm" data-id="${a.id}" data-st="approved">อนุมัติ</button>` : ''}
              ${a.status !== 'rejected' ? `<button class="btn danger sm" data-id="${a.id}" data-st="rejected">ไม่อนุมัติ</button>` : ''}
              <button class="btn ghost sm" data-cal="${a.employee_id}" data-month="${esc(a.work_date.slice(0, 7))}">ดูปฏิทิน</button>
              <button class="btn ghost sm" data-delap="${a.id}">ลบ</button>
            </div></td></tr>`).join('')}</tbody></table></div>
          <div class="table-foot"><span>${items.length} รายการ</span></div></div>`;
        t.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => decideAppeal(b.dataset.id, b.dataset.st, load)));
        t.querySelectorAll('[data-delap]').forEach((b) => (b.onclick = async () => {
          if (!confirm('ลบคำร้องนี้? (วันนั้นจะกลับเป็นสีตามข้อมูลการสแกนจริง)')) return;
          try { await api(`/api/admin/appeals/${b.dataset.delap}`, { method: 'DELETE' }); toast('ลบคำร้องแล้ว'); refreshCounts(); load(); } catch (err) { toast(err.message, true); }
        }));
        t.querySelectorAll('[data-cal]').forEach((b) => (b.onclick = () => { calState.employee_id = b.dataset.cal; calState.month = b.dataset.month; go('cal'); }));
      } catch (err) { toast(err.message, true); }
    };
    bindFilter(load);
    load();
  }

  async function pageSet() {
    const c = content();
    const { locations } = await api('/api/locations').catch(() => ({ locations: [] }));
    const empUrl = new URL('./', location.href).href; // หน้าแอปพนักงาน (โฟลเดอร์เดียวกับหน้านี้)
    c.innerHTML = `
      <div class="page-head"><div><h1>ตั้งค่า</h1></div></div>
      <div class="settings-grid">
        <form class="card sites-card" id="locf">
          <h2>สถานที่ทำงาน (พิกัด GPS)</h2>
          <p class="muted">พนักงานพิมพ์ชื่อสถานที่เองทุกครั้งที่สแกน (ชื่อในรายการนี้จะขึ้นเป็นคำแนะนำตอนพิมพ์) · ถ้าใส่พิกัดไว้ ระบบจะวัดระยะจากพิกัดจริง ถ้าอยู่นอกรัศมีจะแจ้งเตือน "นอกพื้นที่"
            · คัดลอกพิกัดจาก Google Maps (คลิกขวาที่จุด → คลิกตัวเลขพิกัด) มาวางได้เลย</p>
          <p class="hint">⚠ ควรใส่พิกัดให้ครบทุกสถานที่ ถ้ามีบางแห่งไม่มีพิกัด พนักงานที่อยู่แห่งนั้นจะถูกจับคู่กับสถานที่ใกล้สุดที่มีพิกัด และขึ้นว่า "นอกพื้นที่"</p>
          <div id="siteRows"></div>
          <div class="row" style="margin-top:10px;flex-wrap:wrap">
            <button class="btn ghost" type="button" id="addSite">+ เพิ่มสถานที่</button>
            <button class="btn primary" type="submit">บันทึกสถานที่</button>
          </div>
        </form>
        <div class="card">
          <h2>ลิงก์สำหรับพนักงาน</h2><p class="muted">ส่งลิงก์นี้ให้พนักงานเปิดในมือถือ แล้วกด “เพิ่มลงในหน้าจอหลัก” เพื่อใช้เป็นแอป</p>
          <div class="link-box"><input id="empUrl" value="${esc(empUrl)}" readonly><button class="btn ghost" id="copy" type="button">คัดลอก</button></div>
        </div>
        <form class="card tg-card" id="tgf" autocomplete="off">
          <h2>ส่งรูปสแกนไป Telegram</h2>
          <p class="muted">ทุกครั้งที่พนักงานสแกน ระบบส่งรูปพร้อมชื่อ เวลา สถานที่ และพิกัดเข้าช่อง Telegram ให้อัตโนมัติ
            · แนะนำใช้ <b>ช่อง (Channel)</b> เพราะสมาชิกดูได้อย่างเดียว ส่งรูปหรือข้อความไม่ได้ · บอทไม่รับคำสั่งใดๆ สั่งงานได้จากหน้านี้เท่านั้น</p>
          <details class="tg-help"><summary>วิธีตั้งค่าครั้งแรก (ประมาณ 5 นาที)</summary>
            <ol>
              <li>ใน Telegram ค้นหา <b>@BotFather</b> → กด Start → พิมพ์ <code>/newbot</code> → ตั้งชื่อบอท → ตั้งชื่อผู้ใช้ที่ลงท้ายด้วย <code>bot</code> → คัดลอก <b>Token</b> ที่ได้มาวางในช่องด้านล่าง</li>
              <li>สร้าง <b>ช่อง (New Channel)</b> แบบส่วนตัว (Private) เช่น "รูปลงเวลา"</li>
              <li>เข้าช่อง → ตั้งค่า → ผู้ดูแล (Administrators) → เพิ่มผู้ดูแล → ค้นหาชื่อบอท → เปิดสิทธิ์ <b>โพสต์ข้อความ</b> และ <b>ลบข้อความ (Delete messages)</b></li>
              <li>โพสต์ข้อความอะไรก็ได้ 1 ครั้งในช่อง แล้วกด <b>ค้นหากลุ่ม/ช่อง</b> ด้านล่าง → เลือกช่อง</li>
              <li>กด <b>ส่งข้อความทดสอบ</b> → เลือกว่าจะส่งรูปเมื่อไร → กด <b>บันทึก</b></li>
              <li>ส่งลิงก์เชิญของช่องให้พนักงาน พนักงานจะดูรูปได้อย่างเดียว</li>
            </ol></details>
          <label class="field"><span>Bot Token</span><input name="token" type="password" autocomplete="new-password" spellcheck="false"></label>
          <div class="row" style="flex-wrap:wrap;gap:8px;margin:-4px 0 10px"><button class="btn ghost sm" type="button" id="tgFind">ค้นหากลุ่ม/ช่อง</button></div>
          <div id="tgChats" class="tg-chats"></div>
          <label class="field"><span>Chat ID ของช่อง/กลุ่ม <small>ซ่อนไว้เพื่อความปลอดภัย</small></span><input name="chat_id" type="password" autocomplete="off" placeholder="-1001234567890" spellcheck="false"></label>
          <div class="tg-modes">
            <label><input type="radio" name="mode" value="all"> ส่งทั้งเข้างานและออกงาน</label>
            <label><input type="radio" name="mode" value="in"> ส่งเฉพาะเข้างาน</label>
            <label><input type="radio" name="mode" value="off"> ไม่ส่ง (ปิด)</label>
          </div>
          <label class="tg-caption"><input type="checkbox" name="caption"> <span><b>ใส่ข้อความรายละเอียดใต้รูป</b><span class="sub">ชื่อ เวลา สถานที่ ลิงก์แผนที่ รหัสตรวจสอบ · ปิด = ส่งรูปอย่างเดียว (ข้อมูลประทับอยู่ในรูปแล้ว)</span></span></label>
          <div id="tgState" class="tg-state">กำลังโหลด…</div>
          <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:12px">
            <button class="btn ghost" type="button" id="tgTest">ส่งข้อความทดสอบ</button>
            <button class="btn primary" type="submit">บันทึก</button>
            <button class="btn ghost" type="button" id="tgClear">ลบการเชื่อมต่อ</button>
          </div>
          <div class="tg-wipe">
            <b>ล้างข้อความทั้งหมดในกลุ่ม</b>
            <p class="sub">ให้บอทลบทุกข้อความและรูปในกลุ่ม/ช่องที่ตั้งไว้ เหมือนไม่เคยส่งอะไรเลย · บอทต้องเป็นผู้ดูแลที่เปิดสิทธิ์ <b>Delete messages</b></p>
            <button class="btn danger" type="button" id="tgWipe">ล้างข้อความทั้งหมด…</button>
          </div>
        </form>
        <form class="card reset-card" id="rsf">
          <h2>ล้างข้อมูล (สำหรับทดสอบระบบ)</h2>
          <p class="muted">ใช้ล้างข้อมูลที่ทดลองไว้ก่อนเปิดให้พนักงานใช้จริง · <b>การตั้งค่าจะไม่ถูกลบ</b> (รหัสผ่านผู้ดูแล, สถานที่ทำงาน, ตารางกะ, วันหยุด)</p>
          <div class="reset-opts">
            <label><input type="checkbox" name="scope" value="attendance" checked> การลงเวลาเข้า-ออก + รูปสแกนทั้งหมด</label>
            <label><input type="checkbox" name="scope" value="ot" checked> คำขอ OT ทั้งหมด</label>
            <label><input type="checkbox" name="scope" value="appeals" checked> คำร้องทั้งหมด</label>
            <label><input type="checkbox" name="scope" value="employees" checked> บัญชีพนักงานทั้งหมด (ทุกคนต้องสมัครใหม่)</label>
          </div>
          <label class="field"><span>พิมพ์ <b>ลบข้อมูลทั้งหมด</b> เพื่อยืนยัน</span><input name="confirm" autocomplete="off"></label>
          <button class="btn danger" type="submit" id="rsBtn" disabled>ล้างข้อมูลที่เลือก</button>
          <p class="sub">⚠ ลบแล้วกู้คืนไม่ได้ · ห้ามใช้หลังเปิดใช้งานจริงแล้ว</p>
        </form>
        <form class="card" id="pwf">
          <h2>เปลี่ยนรหัสผ่านผู้ดูแล</h2><p class="muted">อย่างน้อย 8 ตัวอักษร</p>
          <label class="field"><span>รหัสผ่านเดิม</span><input type="password" name="current" autocomplete="current-password" required></label>
          <label class="field"><span>รหัสผ่านใหม่</span><input type="password" name="next" autocomplete="new-password" required></label>
          <label class="field"><span>ยืนยันรหัสผ่านใหม่</span><input type="password" name="next2" autocomplete="new-password" required></label>
          <button class="btn primary" type="submit">เปลี่ยนรหัสผ่าน</button>
        </form>
        <form class="card sites-card" id="schf">
          <h2>ตารางงาน (กะ / วันหยุด)</h2>
          <p class="muted">ใช้คำนวณสีปฏิทิน มาสาย และ OT อัตโนมัติ · ระบบแยกกะจากเวลาสแกนเข้าที่ใกล้เวลาเริ่มกะที่สุด</p>
          <div id="shiftRows"></div>
          <div class="sch-row">
            <label class="field"><span>ผ่อนผันมาสาย (นาที)</span><input type="number" name="grace" min="0" max="120" step="1"></label>
            <label class="field"><span>เวลาพักในกะ (ชม.) <small>หักตอนคิด OT 2</small></span><input type="number" name="brk" min="0" max="3" step="0.5"></label>
          </div>
          <div class="field"><span class="field-label">วันหยุดประจำสัปดาห์</span>
            <div class="wk">${WEEK_TH.map((w, i) => `<label><input type="checkbox" name="off" value="${i}"> ${w}</label>`).join('')}</div></div>
          <div class="field"><span class="field-label">วันหยุดบริษัท (วันสำคัญ) <small>วันที่กำหนดจะเป็นสีเทา ใครมาทำงานจะคิดเป็น OT 2/3 และส่งให้อนุมัติ</small></span>
            <div class="hol-add">
              ${thDateInput('holDate')}
              <input id="holName" placeholder="ชื่อวันหยุด เช่น วันปิยมหาราช" maxlength="60">
              <button type="button" class="btn ghost" id="holAdd">+ เพิ่มวันหยุด</button>
            </div>
            <div id="holList" class="hol-list"></div></div>
          <div class="field"><span class="field-label">เริ่มนับสถิติตั้งแต่วันที่ <small>วันก่อนหน้านี้จะไม่ขึ้นสีแดงและไม่นับเป็นวันขาด · ระบบตั้งเป็นวันนี้ให้อัตโนมัติเมื่อล้างข้อมูลการลงเวลา · ว่างไว้ = นับตั้งแต่วันที่พนักงานได้รับอนุมัติ</small></span>
            <div class="hol-add">${thDateInput('cntFrom')}<button type="button" class="btn ghost sm" id="cntToday">วันนี้</button><button type="button" class="btn ghost sm" id="cntClear">ล้าง</button></div></div>
          <small class="err" id="schErr"></small>
          <button class="btn primary" type="submit">บันทึกตารางงาน</button>
        </form>
      </div>`;
    // ---- ตารางงาน ----
    const schf = document.getElementById('schf');
    const fillSchedule = (s) => {
      document.getElementById('shiftRows').innerHTML = s.shifts.map((x, i) => `
        <div class="sch-row" data-shift="${i}" data-id="${esc(x.id)}">
          <label class="field"><span>ชื่อกะ</span><input name="sname" value="${esc(x.name)}" maxlength="40"></label>
          <div class="field"><span class="field-label">เข้างาน</span>${time24Input('sstart', x.start)}</div>
          <div class="field"><span class="field-label">เลิกงาน</span>${time24Input('send', x.end)}</div>
        </div>`).join('');
      schf.grace.value = s.grace_min;
      schf.brk.value = s.break_hours;
      schf.querySelectorAll('[name=off]').forEach((cb) => (cb.checked = s.weekly_off.includes(Number(cb.value))));
      holidays = [...s.holidays];
      drawHolidays();
      setThDate('cntFrom', s.count_from || '');
    };
    // ---- วันหยุดบริษัท: เพิ่ม/ลบทีละวัน แล้วกด "บันทึกตารางงาน" ----
    let holidays = [];
    const drawHolidays = () => {
      holidays.sort((a, b) => a.date.localeCompare(b.date));
      const today = ymd(new Date());
      const el = document.getElementById('holList');
      el.innerHTML = holidays.length
        ? holidays.map((h, i) => `<div class="hol-item${h.date < today ? ' past' : ''}">
            <span class="hol-date">${esc(thDate(h.date))}</span><span class="hol-name">${esc(h.name)}</span>
            <button type="button" class="btn danger sm" data-del-hol="${i}">ลบ</button></div>`).join('')
        : '<div class="muted">ยังไม่มีวันหยุดบริษัท</div>';
      el.querySelectorAll('[data-del-hol]').forEach((b) => (b.onclick = () => { holidays.splice(Number(b.dataset.delHol), 1); drawHolidays(); }));
    };
    document.getElementById('holAdd').onclick = () => {
      const date = readThDate('holDate');
      const name = document.getElementById('holName').value.trim() || 'วันหยุดบริษัท';
      if (date === null) return toast('วันที่ไม่ถูกต้อง กรุณาเลือกวัน เดือน ปี ให้ครบ', true);
      if (!date) return toast('กรุณาเลือกวันที่', true);
      if (holidays.some((h) => h.date === date)) return toast('วันนี้เป็นวันหยุดอยู่แล้ว', true);
      holidays.push({ date, name });
      setThDate('holDate', '');
      document.getElementById('holName').value = '';
      drawHolidays();
      toast('เพิ่มแล้ว อย่าลืมกด "บันทึกตารางงาน"');
    };
    document.getElementById('cntToday').onclick = () => setThDate('cntFrom', ymd(new Date()));
    document.getElementById('cntClear').onclick = () => setThDate('cntFrom', '');
    api('/api/admin/schedule').then((r) => { if (schf.isConnected) fillSchedule(r.schedule); }).catch((err) => { if (schf.isConnected) toast(err.message, true); });
    schf.onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById('schErr');
      err.textContent = '';
      const shifts = [...schf.querySelectorAll('[data-shift]')].map((r) => ({
        id: r.dataset.id, name: r.querySelector('[name=sname]').value.trim(), start: readTime24(r, 'sstart'), end: readTime24(r, 'send'),
      }));
      if (shifts.some((s) => !s.start || !s.end || s.start === s.end)) { err.textContent = 'กรุณาใส่เวลาเข้างานและเลิกงานของทุกกะให้ถูกต้อง'; return; }
      const countFrom = readThDate('cntFrom');
      if (countFrom === null) { err.textContent = 'วันที่เริ่มนับสถิติไม่ถูกต้อง กรุณาเลือกวัน เดือน ปี ให้ครบ'; return; }
      try {
        const r = await api('/api/admin/schedule', { method: 'PUT', body: { schedule: {
          shifts, grace_min: Number(schf.grace.value) || 0, break_hours: Number(schf.brk.value) || 0,
          weekly_off: [...schf.querySelectorAll('[name=off]:checked')].map((cb) => Number(cb.value)), holidays, count_from: countFrom,
        } } });
        fillSchedule(r.schedule);
        toast('บันทึกตารางงานแล้ว');
      } catch (er) { toast(er.message, true); }
    };

    const rowsEl = document.getElementById('siteRows');
    const siteRow = (s = {}) => {
      const div = document.createElement('div');
      div.className = 'site-row';
      div.innerHTML = `
        <label class="field"><span>ชื่อสถานที่</span><input name="name" value="${esc(s.name || '')}" placeholder="เช่น ไซต์งาน A - บางนา" maxlength="200"></label>
        <label class="field"><span>พิกัด (ละติจูด, ลองจิจูด)</span><input name="coord" value="${s.lat != null ? `${s.lat}, ${s.lng}` : ''}" placeholder="13.668217, 100.634545" inputmode="decimal"></label>
        <label class="field f-radius"><span>รัศมี (ม.)</span><input name="radius" type="number" min="20" max="50000" step="10" value="${esc(s.radius || 200)}"></label>
        <button type="button" class="btn danger sm del-site" title="ลบ">ลบ</button>
        <small class="err"></small>`;
      div.querySelector('.del-site').onclick = () => div.remove();
      rowsEl.appendChild(div);
    };
    locations.forEach(siteRow);
    if (!locations.length) siteRow();
    document.getElementById('addSite').onclick = () => siteRow();
    const parseCoord = (v) => {
      const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(v || '');
      if (!m) return null;
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
    };
    document.getElementById('locf').onsubmit = async (e) => {
      e.preventDefault();
      const list = [];
      let bad = false;
      rowsEl.querySelectorAll('.site-row').forEach((r) => {
        const name = r.querySelector('[name=name]').value.trim();
        const coordRaw = r.querySelector('[name=coord]').value.trim();
        const err = r.querySelector('.err');
        err.textContent = '';
        if (!name && !coordRaw) return;
        const c = coordRaw ? parseCoord(coordRaw) : null;
        if (!name) { err.textContent = 'กรุณากรอกชื่อสถานที่'; bad = true; return; }
        if (coordRaw && !c) { err.textContent = 'รูปแบบพิกัดไม่ถูกต้อง ตัวอย่าง: 13.668217, 100.634545'; bad = true; return; }
        list.push({ name, lat: c?.lat ?? null, lng: c?.lng ?? null, radius: Number(r.querySelector('[name=radius]').value) || 200 });
      });
      if (bad) return toast('กรุณาแก้ไขข้อมูลสถานที่ที่ผิด', true);
      try {
        const r = await api('/api/admin/locations', { method: 'PUT', body: { locations: list } });
        rowsEl.innerHTML = '';
        r.locations.forEach(siteRow);
        if (!r.locations.length) siteRow();
        toast('บันทึกสถานที่แล้ว');
      } catch (err) { toast(err.message, true); }
    };
    document.getElementById('copy').onclick = async () => {
      try { await navigator.clipboard.writeText(empUrl); toast('คัดลอกลิงก์แล้ว'); } catch { document.getElementById('empUrl').select(); }
    };
    // ---- Telegram ----
    const tgf = document.getElementById('tgf');
    const tgState = document.getElementById('tgState');
    const tgShow = (t) => {
      if (!tgf.isConnected) return; // ผู้ดูแลเปลี่ยนไปหน้าอื่นแล้ว
      tgf.mode.forEach((r) => (r.checked = r.value === t.mode));
      // Chat ID ไม่ส่งมาที่หน้าเว็บ แสดงแค่ 4 ตัวท้าย · ไม่พิมพ์ใหม่ = ใช้ค่าเดิม
      tgf.chat_id.value = '';
      tgf.chat_id.placeholder = t.has_chat ? `บันทึกไว้แล้ว (${t.chat_hint}) · ใส่ใหม่ถ้าต้องการเปลี่ยน` : '-1001234567890';
      tgf.caption.checked = t.caption === true;
      tgf.token.value = '';
      tgf.token.placeholder = t.has_token ? `บันทึกไว้แล้ว (${t.token_hint}) · พิมพ์ใหม่ถ้าต้องการเปลี่ยน` : '123456789:AAH…';
      const st = [];
      st.push(t.mode === 'off' || !t.has_token ? '<span class="badge">ปิดอยู่</span>' : `<span class="badge approved">เปิด · ${t.mode === 'in' ? 'เฉพาะเข้างาน' : 'เข้างานและออกงาน'}</span>`);
      if (t.last_ok_at) st.push(`<span class="sub">ส่งสำเร็จล่าสุด ${esc(thDateTime(t.last_ok_at))}</span>`);
      if (t.last_error) st.push(`<div class="tg-err">⚠ ส่งไม่สำเร็จล่าสุด ${esc(thDateTime(t.last_error_at))}: ${esc(t.last_error)}</div>`);
      tgState.innerHTML = st.join(' ');
    };
    api('/api/admin/telegram').then(tgShow).catch((e) => { if (tgState.isConnected) tgState.textContent = e.message; });
    const tgBusy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (err) { toast(err.message, true); } finally { btn.disabled = false; } };
    document.getElementById('tgFind').onclick = (e) => tgBusy(e.currentTarget, async () => {
      const { chats } = await api('/api/admin/telegram/chats', { method: 'POST', body: { token: tgf.token.value.trim() } });
      const box = document.getElementById('tgChats');
      if (!chats.length) { box.innerHTML = '<div class="hint">ยังไม่พบ: เพิ่มบอทเป็นผู้ดูแลของช่อง/กลุ่ม แล้วโพสต์ข้อความอะไรก็ได้ 1 ครั้งในช่อง/กลุ่มนั้น แล้วกดค้นหาอีกครั้ง</div>'; return; }
      box.innerHTML = chats.map((c) => `<button type="button" class="btn ghost sm" data-chat="${esc(c.id)}">${c.type === 'channel' ? '📢' : '👥'} ${esc(c.title)}</button>`).join(' ');
      box.querySelectorAll('[data-chat]').forEach((b) => (b.onclick = () => {
        tgf.chat_id.value = b.dataset.chat;
        box.querySelectorAll('[data-chat]').forEach((x) => x.classList.toggle('on', x === b));
        toast('เลือกแล้ว กด "บันทึก" เพื่อใช้งาน');
      }));
    });
    document.getElementById('tgTest').onclick = (e) => tgBusy(e.currentTarget, async () => {
      await api('/api/admin/telegram/test', { method: 'POST', body: { token: tgf.token.value.trim(), chat_id: tgf.chat_id.value.trim() } });
      toast('ส่งข้อความทดสอบแล้ว ลองเปิดดูใน Telegram');
    });
    tgf.onsubmit = (e) => {
      e.preventDefault();
      tgBusy(tgf.querySelector('[type=submit]'), async () => {
        const body = { mode: tgf.mode.value, caption: tgf.caption.checked };
        if (tgf.chat_id.value.trim()) body.chat_id = tgf.chat_id.value.trim();
        if (tgf.token.value.trim()) body.token = tgf.token.value.trim();
        tgShow(await api('/api/admin/telegram', { method: 'PUT', body }));
        toast('บันทึกการตั้งค่า Telegram แล้ว');
      });
    };
    // ล้างข้อความทั้งหมดในกลุ่ม Telegram (ระบบทำเป็นรอบ ๆ จนเสร็จ)
    document.getElementById('tgWipe').onclick = () => {
      openModal(`
        <h2 style="margin:0 40px 10px 0">ล้างข้อความทั้งหมดในกลุ่ม Telegram</h2>
        <div class="del-warn">
          <b>⚠ บอทจะลบทุกข้อความในกลุ่ม/ช่องนี้ถาวร กู้คืนไม่ได้</b>
          <ul>
            <li>รูปสแกนเข้า-ออกงานทั้งหมดที่ระบบเคยส่ง</li>
            <li>ข้อความทดสอบ และข้อความของคนอื่นในกลุ่ม (ถ้ามี)</li>
          </ul>
          <div class="sub">ข้อมูลในระบบลงเวลาไม่ถูกลบ (ประวัติและรูปยังอยู่ครบในหน้านี้) · ข้อความระบบของ Telegram เช่น "สร้างกลุ่ม" อาจลบไม่ได้ · ถ้ากลุ่มมีข้อความเยอะ อาจใช้เวลาหลายนาที อย่าปิดหน้านี้จนกว่าจะเสร็จ</div>
        </div>
        <form id="wpf" class="del-form">
          <label class="field"><span>พิมพ์ <b>ลบทั้งหมด</b> เพื่อยืนยัน</span><input name="confirm" autocomplete="off"></label>
          <div id="wpProg" class="wipe-prog" hidden><div class="bar"><span></span></div><div class="sub" id="wpTxt"></div></div>
          <div class="row"><button type="submit" class="btn danger" id="wpBtn" disabled>ล้างข้อความทั้งหมด</button><button type="button" class="btn ghost" id="wpCancel">ยกเลิก</button></div>
        </form>`);
      const f = document.getElementById('wpf');
      const btn = document.getElementById('wpBtn');
      let running = false;
      let stop = false;
      f.confirm.oninput = () => { btn.disabled = running || f.confirm.value.trim() !== 'ลบทั้งหมด'; };
      document.getElementById('wpCancel').onclick = () => { if (running) { stop = true; return; } closeModal(); };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        if (btn.disabled) return;
        running = true;
        btn.disabled = true;
        btn.textContent = 'กำลังลบ…';
        f.confirm.disabled = true;
        document.getElementById('wpCancel').textContent = 'หยุด';
        const prog = document.getElementById('wpProg');
        const bar = prog.querySelector('.bar span');
        const txt = document.getElementById('wpTxt');
        prog.hidden = false;
        txt.textContent = 'กำลังเริ่ม…';
        let restart = true;
        try {
          for (;;) {
            const r = await api('/api/admin/telegram/wipe', { method: 'POST', body: { confirm: 'ลบทั้งหมด', restart } });
            restart = false;
            const pct = r.total ? Math.round(((r.total - r.remaining) / r.total) * 100) : 100;
            bar.style.width = pct + '%';
            if (r.done) {
              closeModal();
              toast(r.failed ? `ล้างข้อความเสร็จแล้ว (มี ${r.failed} รายการที่ Telegram ไม่ยอมให้ลบ)` : 'ล้างข้อความในกลุ่ม Telegram เสร็จแล้ว');
              api('/api/admin/telegram').then(tgShow).catch(() => {});
              return;
            }
            if (stop) { closeModal(); toast('หยุดแล้ว กด "ล้างข้อความทั้งหมด" อีกครั้งเพื่อเริ่มใหม่', true); return; }
            txt.textContent = r.wait ? `Telegram ให้รอ ${r.wait} วินาที แล้วจะลบต่อเอง… (${pct}%)` : `กำลังลบ… ${pct}%`;
            if (r.wait) await new Promise((res) => setTimeout(res, r.wait * 1000 + 300));
          }
        } catch (err) {
          toast(err.message, true);
          running = false;
          btn.textContent = 'ลองอีกครั้ง';
          f.confirm.disabled = false;
          btn.disabled = false;
          document.getElementById('wpCancel').textContent = 'ปิด';
        }
      };
    };
    document.getElementById('tgClear').onclick = (e) => {
      if (!confirm('ลบ Bot Token และปิดการส่งรูปไป Telegram?')) return;
      tgBusy(e.currentTarget, async () => { tgShow(await api('/api/admin/telegram', { method: 'PUT', body: { clear_token: true, mode: 'off' } })); toast('ลบการเชื่อมต่อแล้ว'); });
    };
    // ---- ล้างข้อมูล ----
    const rsf = document.getElementById('rsf');
    const rsBtn = document.getElementById('rsBtn');
    const rsCheck = () => { rsBtn.disabled = rsf.confirm.value.trim() !== 'ลบข้อมูลทั้งหมด' || !rsf.querySelector('[name=scope]:checked'); };
    rsf.confirm.oninput = rsCheck;
    rsf.querySelectorAll('[name=scope]').forEach((cb) => (cb.onchange = rsCheck));
    rsf.onsubmit = async (e) => {
      e.preventDefault();
      const scopes = [...rsf.querySelectorAll('[name=scope]:checked')].map((cb) => cb.value);
      const names = { attendance: 'การลงเวลา+รูป', ot: 'คำขอ OT', appeals: 'คำร้อง', employees: 'บัญชีพนักงาน' };
      if (!confirm(`ยืนยันลบ: ${scopes.map((x) => names[x]).join(', ')}\nลบแล้วกู้คืนไม่ได้`)) return;
      rsBtn.disabled = true;
      rsBtn.textContent = 'กำลังลบ…';
      try {
        const r = await api('/api/admin/reset', { body: { confirm: rsf.confirm.value.trim(), scopes } });
        const x = r.removed;
        toast(`ล้างข้อมูลแล้ว${x.attendance != null ? ` · ลงเวลา ${x.attendance} รายการ (รูป ${x.photos})` : ''}${x.ot != null ? ` · OT ${x.ot}` : ''}${x.appeals != null ? ` · คำร้อง ${x.appeals}` : ''}${x.employees != null ? ` · พนักงาน ${x.employees} คน` : ''}`);
        rsf.confirm.value = '';
        refreshCounts();
      } catch (err) { toast(err.message, true); }
      rsBtn.textContent = 'ล้างข้อมูลที่เลือก';
      rsCheck();
    };

    document.getElementById('pwf').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.next.value !== f.next2.value) return toast('รหัสผ่านใหม่ไม่ตรงกัน', true);
      try { await api('/api/admin/password', { body: { current: f.current.value, next: f.next.value } }); f.reset(); toast('เปลี่ยนรหัสผ่านแล้ว'); }
      catch (err) { toast(err.message, true); }
    };
  }

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (document.getElementById('content') && id !== page && PAGES.some((p) => p.id === id)) go(id);
  });

  boot();
})();
