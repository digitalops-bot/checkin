// แอปพนักงาน: สมัคร / เข้าสู่ระบบ / เช็คอิน / เช็คเอ้าท์ / ขอ OT / ประวัติ
(() => {
  const view = document.getElementById('view');
  const toastEl = document.getElementById('toast');
  const tabbar = document.querySelector('.tabbar');
  const tabs = [...tabbar.querySelectorAll('button')];
  const userBox = document.getElementById('user');
  // ⟳ รีเฟรชระบบ: โหลดหน้าใหม่ (ได้เวอร์ชันล่าสุด และสิทธิ์ที่เพิ่งเปิดในการตั้งค่า) — ไม่ต้องล็อกอินใหม่
  document.getElementById('refreshBtn').onclick = () => {
    document.getElementById('refreshBtn').classList.add('spin');
    location.reload();
  };

  const OT_TYPES = [
    { v: '1.5', title: 'OT 1.5', desc: 'โอทีหลังเลิกงาน วันทำงานปกติ' },
    { v: '2', title: 'OT 2', desc: 'โอทีวันหยุด' },
    { v: '3', title: 'OT 3', desc: 'โอทีหลังเลิกงานของวันหยุด' },
  ];
  const STATUS_TH = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
  const TITLES = ['นาย', 'นาง', 'นางสาว'];
  const ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  // ---------- storage (ล็อกอินค้างไว้ในเครื่องถาวร) ----------
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } },
    del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };
  let token = store.get('emp_token', null);
  let me = store.get('emp_profile', null);
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  // ---------- utils ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const thDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  const diffHours = (a, b) => {
    if (!a || !b) return '';
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    let m = bh * 60 + bm - (ah * 60 + am);
    if (m <= 0) m += 1440;
    return Math.round((m / 60) * 100) / 100;
  };

  let toastTimer;
  function toast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = ''), 3500);
  }

  async function api(url, body) {
    const { status, data } = await Backend.request(body ? 'POST' : 'GET', url, { body, token });
    if ((status === 401 || status === 403) && token && !url.startsWith('/api/auth/')) {
      signOut(data.error || 'กรุณาเข้าสู่ระบบอีกครั้ง');
      throw new Error(data.error || 'กรุณาเข้าสู่ระบบ');
    }
    if (status < 200 || status >= 300) throw Object.assign(new Error(data.error || 'ส่งข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต'), { status });
    return data;
  }

  // ---------- validation (ตรงกับฝั่งเซิร์ฟเวอร์) ----------
  const RULES = {
    emp_code: (v) => (!v ? 'กรุณากรอกรหัสพนักงาน' : /^[A-Z]+[0-9]+$/.test(v) ? '' : 'ต้องเป็นอักษรอังกฤษตัวใหญ่ ตามด้วยตัวเลข เช่น EMP001'),
    first_name: (v) => (!v ? 'กรุณากรอกชื่อ' : /^[ก-๎]+$/.test(v) ? '' : 'ภาษาไทยเท่านั้น'),
    last_name: (v) => (!v ? 'กรุณากรอกนามสกุล' : /^[ก-๎]+$/.test(v) ? '' : 'ภาษาไทยเท่านั้น'),
    phone: (v) => (!v ? 'กรุณากรอกเบอร์โทร' : /^0\d{9}$/.test(v) ? '' : v[0] !== '0' ? 'ต้องขึ้นต้นด้วย 0' : `ต้องมี 10 หลัก (ตอนนี้ ${v.length} หลัก)`),
    password: (v) => (!v ? 'กรุณาตั้งรหัสผ่าน' : v.length >= 6 ? '' : 'อย่างน้อย 6 ตัว'),
  };
  function setErr(input, msg) {
    const box = input.closest('.field');
    let el = box.querySelector('.err');
    if (!el) { el = document.createElement('small'); el.className = 'err'; box.appendChild(el); }
    el.textContent = msg || '';
    input.classList.toggle('invalid', !!msg);
    return !msg;
  }
  // ปรับค่าระหว่างพิมพ์: รหัสพนักงานเป็นตัวใหญ่, เบอร์เป็นตัวเลข, ชื่อเป็นภาษาไทย
  function bindInputs(form) {
    const code = form.querySelector('[name="emp_code"]');
    if (code) code.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.classList.contains('invalid')) setErr(code, RULES.emp_code(code.value)); });
    const phone = form.querySelector('[name="phone"]');
    if (phone) phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); if (phone.classList.contains('invalid')) setErr(phone, RULES.phone(phone.value)); });
    form.querySelectorAll('[data-thai]').forEach((inp) => inp.addEventListener('input', () => {
      const clean = inp.value.replace(/[^ก-๎]/g, '');
      if (clean !== inp.value) { inp.value = clean; setErr(inp, 'พิมพ์ได้เฉพาะภาษาไทย (เปลี่ยนแป้นพิมพ์เป็นภาษาไทย)'); }
      else setErr(inp, '');
    }));
    form.querySelectorAll('.pw-toggle').forEach((b) => (b.onclick = () => {
      const inp = b.previousElementSibling;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    }));
  }
  const pwField = (name, label, auto, hint = '') => `
    <label class="field"><span>${label}${hint ? ` <small>${hint}</small>` : ''}</span>
      <div class="pw"><input type="password" name="${name}" autocomplete="${auto}" required><button type="button" class="pw-toggle" aria-label="แสดงรหัสผ่าน">${ICON_EYE}</button></div></label>`;

  function busy(btn, on, label) {
    btn.disabled = on;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'กำลังส่ง…'; }
    else btn.textContent = btn.dataset.label || btn.textContent;
  }

  // ---------- Session ----------
  function signIn(data) {
    token = data.token;
    me = data.employee;
    store.set('emp_token', token);
    store.set('emp_profile', me);
    store.set('last_emp_code', me.emp_code);
    startApp();
  }
  function signOut(msg) {
    stopGps();
    clearInterval(liveTimer);
    clearInterval(beatTimer);
    document.querySelector('.scanner .scan-x')?.click();
    token = null;
    me = null;
    store.del('emp_token');
    store.del('emp_profile');
    renderLogin();
    if (msg) toast(msg, true);
  }

  function authLayout(on) {
    document.body.classList.toggle('authing', on);
    tabbar.hidden = on;
    userBox.textContent = on || !me ? '' : me.emp_code;
  }

  // ---------- Login ----------
  function renderLogin() {
    authLayout(true);
    view.innerHTML = `
      <div class="auth-hero"><img src="icon.svg" alt=""><h1>เข้าสู่ระบบ</h1><p class="muted">ลงเวลาทำงาน พนักงานนอก</p></div>
      <div class="card warn-box" id="tooMany" hidden>
        <b>กรอกรหัสผ่านผิด <span id="failN">5</span> ครั้งแล้ว</b>
        <p>ถ้าจำรหัสผ่านไม่ได้ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ด้วยรหัสพนักงานและเบอร์โทร</p>
        <button type="button" class="btn primary big" id="forgot2">ลืมรหัสผ่าน ตั้งรหัสใหม่</button>
      </div>
      <form class="card" id="f" novalidate>
        <label class="field"><span>รหัสพนักงาน</span>
          <input name="emp_code" autocapitalize="characters" autocomplete="username" spellcheck="false" placeholder="เช่น EMP001" value="${esc(store.get('last_emp_code', ''))}" required></label>
        ${pwField('password', 'รหัสผ่าน', 'current-password')}
        <button class="btn primary big" type="submit" id="submit">เข้าสู่ระบบ</button>
        <button type="button" class="linkbtn" id="forgot">ลืมรหัสผ่าน?</button>
      </form>
      <div class="auth-alt"><span class="muted">ยังไม่มีบัญชี?</span><button class="btn ghost big" id="reg">ลงทะเบียนครั้งแรก</button></div>`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('reg').onclick = renderRegister;
    document.getElementById('forgot').onclick = () => renderForgot(f.emp_code.value);
    document.getElementById('forgot2').onclick = () => renderForgot(f.emp_code.value);

    // นับจำนวนครั้งที่กรอกผิด (กรอกผิดได้ไม่จำกัด แต่ครบ 5 ครั้งจะแนะนำให้กดลืมรหัสผ่าน)
    const FAIL_ALERT_AT = 5;
    let fails = 0;
    const showTooMany = () => {
      const box = document.getElementById('tooMany');
      document.getElementById('failN').textContent = fails;
      box.hidden = fails < FAIL_ALERT_AT;
    };
    f.emp_code.addEventListener('change', () => { fails = 0; showTooMany(); });

    f.onsubmit = async (e) => {
      e.preventDefault();
      const ok = setErr(f.emp_code, f.emp_code.value ? '' : 'กรุณากรอกรหัสพนักงาน') & setErr(f.password, f.password.value ? '' : 'กรุณากรอกรหัสผ่าน');
      if (!ok) return;
      const btn = document.getElementById('submit');
      busy(btn, true, 'กำลังเข้าสู่ระบบ…');
      try { signIn(await api('/api/auth/login', { emp_code: f.emp_code.value, password: f.password.value })); }
      catch (err) {
        busy(btn, false);
        if (err.status !== 401) return toast(err.message, true);
        fails++;
        f.password.value = '';
        showTooMany();
        if (fails === FAIL_ALERT_AT) {
          window.scrollTo(0, 0);
          if (confirm(`กรอกรหัสผ่านผิด ${FAIL_ALERT_AT} ครั้งแล้ว\nต้องการตั้งรหัสผ่านใหม่ด้วย “ลืมรหัสผ่าน” หรือไม่?`)) return renderForgot(f.emp_code.value);
        } else {
          toast(fails < FAIL_ALERT_AT ? `${err.message} (ครั้งที่ ${fails})` : err.message, true);
        }
        f.password.focus();
      }
    };
  }

  // ---------- Register ----------
  function renderRegister() {
    authLayout(true);
    view.innerHTML = `
      <button class="back" id="back">‹ กลับไปหน้าเข้าสู่ระบบ</button>
      <h1 class="screen-title"><span class="dot"></span>ลงทะเบียนพนักงาน</h1>
      <form class="card" id="f" novalidate>
        <label class="field"><span>รหัสพนักงาน <small>อักษรอังกฤษตัวใหญ่ ตามด้วยตัวเลข</small></span>
          <input name="emp_code" autocapitalize="characters" autocomplete="username" spellcheck="false" maxlength="20" placeholder="เช่น EMP001" required></label>
        <div class="field"><span class="field-label">คำนำหน้าชื่อ</span>
          <div class="seg" role="radiogroup">${TITLES.map((t) => `<label><input type="radio" name="title" value="${t}"><span>${t}</span></label>`).join('')}</div></div>
        <label class="field"><span>ชื่อ <small>ภาษาไทยเท่านั้น</small></span>
          <input name="first_name" data-thai autocomplete="given-name" lang="th" placeholder="เช่น สมชาย" maxlength="60" required></label>
        <label class="field"><span>นามสกุล <small>ภาษาไทยเท่านั้น</small></span>
          <input name="last_name" data-thai autocomplete="family-name" lang="th" placeholder="เช่น ใจดี" maxlength="60" required></label>
        <label class="field"><span>เบอร์โทรศัพท์ <small>10 หลัก ขึ้นต้นด้วย 0</small></span>
          <input name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="0812345678" required></label>
        ${pwField('password', 'ตั้งรหัสผ่าน', 'new-password', 'อย่างน้อย 6 ตัว')}
        ${pwField('password2', 'ยืนยันรหัสผ่าน', 'new-password')}
        <p class="hint">จดรหัสพนักงานและเบอร์โทรไว้ ถ้าลืมรหัสผ่านจะใช้ 2 อย่างนี้ตั้งรหัสใหม่ได้</p>
        <button class="btn primary big" type="submit" id="submit">ลงทะเบียน</button>
      </form>`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('back').onclick = renderLogin;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = {
        emp_code: f.emp_code.value.trim(),
        title: f.title.value,
        first_name: f.first_name.value.trim(),
        last_name: f.last_name.value.trim(),
        phone: f.phone.value.trim(),
        password: f.password.value,
      };
      let ok = true;
      for (const k of ['emp_code', 'first_name', 'last_name', 'phone', 'password']) ok = setErr(f[k], RULES[k](d[k])) && ok;
      ok = setErr(f.password2, f.password2.value === d.password ? '' : 'รหัสผ่านไม่ตรงกัน') && ok;
      const seg = f.querySelector('.seg');
      ok = setErr(seg.querySelector('input'), d.title ? '' : 'กรุณาเลือกคำนำหน้า') && ok;
      if (!ok) { f.querySelector('.invalid')?.focus(); return toast('กรุณาตรวจสอบข้อมูลที่ทำเครื่องหมายสีแดง', true); }
      const btn = document.getElementById('submit');
      busy(btn, true, 'กำลังลงทะเบียน…');
      try {
        const r = await api('/api/auth/register', d);
        if (r.pending) return renderPending(r.employee); // โหมดต้องรอผู้ดูแลอนุมัติ
        signIn(r);
        toast('ลงทะเบียนสำเร็จ');
      }
      catch (err) { toast(err.message, true); busy(btn, false); }
    };
    f.querySelectorAll('.seg input').forEach((r) => (r.onchange = () => setErr(r, '')));
  }

  // ---------- สมัครแล้ว รอผู้ดูแลอนุมัติ ----------
  function renderPending(emp) {
    authLayout(true);
    store.set('last_emp_code', emp.emp_code);
    view.innerHTML = `
      <div class="card success">
        <div class="check pending-icon">⏳</div>
        <h2>ส่งใบสมัครแล้ว</h2>
        <p class="muted">กำลังรอผู้ดูแลอนุมัติ</p>
        <dl>
          <dt>ชื่อ</dt><dd>${esc(emp.name)}</dd>
          <dt>รหัสพนักงาน</dt><dd>${esc(emp.emp_code)}</dd>
          <dt>เบอร์โทร</dt><dd>${esc(emp.phone)}</dd>
        </dl>
        <p class="hint">เมื่อผู้ดูแลอนุมัติแล้ว ให้เข้าสู่ระบบด้วย <b>รหัสพนักงาน</b> และ <b>รหัสผ่าน</b> ที่ตั้งไว้ · ไม่ต้องสมัครซ้ำ</p>
        <button class="btn primary big" id="toLogin">ไปหน้าเข้าสู่ระบบ</button>
      </div>`;
    document.getElementById('toLogin').onclick = renderLogin;
  }

  // ---------- Forgot password ----------
  function renderForgot(prefill = '') {
    authLayout(true);
    view.innerHTML = `
      <button class="back" id="back">‹ กลับไปหน้าเข้าสู่ระบบ</button>
      <h1 class="screen-title"><span class="dot"></span>ลืมรหัสผ่าน</h1>
      <form class="card" id="f" novalidate>
        <p class="hint" style="margin-top:0">กรอกรหัสพนักงานและเบอร์โทรที่ใช้ตอนลงทะเบียน เพื่อตั้งรหัสผ่านใหม่</p>
        <label class="field"><span>รหัสพนักงาน</span>
          <input name="emp_code" autocapitalize="characters" spellcheck="false" placeholder="เช่น EMP001" value="${esc(prefill || store.get('last_emp_code', ''))}" required></label>
        <label class="field"><span>เบอร์โทรศัพท์</span>
          <input name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="0812345678" required></label>
        <button class="btn primary big" type="submit" id="submit">ยืนยัน</button>
      </form>`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('back').onclick = renderLogin;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const ok = setErr(f.emp_code, RULES.emp_code(f.emp_code.value)) & setErr(f.phone, RULES.phone(f.phone.value));
      if (!ok) return;
      const btn = document.getElementById('submit');
      busy(btn, true, 'กำลังตรวจสอบ…');
      try {
        const r = await api('/api/auth/forgot', { emp_code: f.emp_code.value, phone: f.phone.value });
        renderNewPassword(r.reset_token, r.name);
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
  }

  function renderNewPassword(resetToken, name) {
    view.innerHTML = `
      <h1 class="screen-title"><span class="dot"></span>ตั้งรหัสผ่านใหม่</h1>
      <form class="card" id="f" novalidate>
        <div class="who"><span class="badge approved">ยืนยันตัวตนแล้ว</span><b>${esc(name)}</b></div>
        ${pwField('password', 'รหัสผ่านใหม่', 'new-password', 'อย่างน้อย 6 ตัว')}
        ${pwField('password2', 'ยืนยันรหัสผ่านใหม่', 'new-password')}
        <button class="btn primary big" type="submit" id="submit">บันทึกและเข้าสู่ระบบ</button>
      </form>`;
    const f = document.getElementById('f');
    bindInputs(f);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const ok = setErr(f.password, RULES.password(f.password.value)) & setErr(f.password2, f.password2.value === f.password.value ? '' : 'รหัสผ่านไม่ตรงกัน');
      if (!ok) return;
      const btn = document.getElementById('submit');
      busy(btn, true, 'กำลังบันทึก…');
      try { signIn(await api('/api/auth/reset', { reset_token: resetToken, password: f.password.value })); toast('ตั้งรหัสผ่านใหม่แล้ว'); }
      catch (err) { toast(err.message, true); busy(btn, false); if (/หมดเวลา/.test(err.message)) renderForgot(); }
    };
  }

  // ---------- เวลาจริงจากเซิร์ฟเวอร์ (ไม่ใช้เวลาในเครื่อง ป้องกันการตั้งเวลาเอง) ----------
  const TZ = 'Asia/Bangkok';
  let clockOffset = 0; // serverTime - Date.now()
  const serverNow = () => new Date(Date.now() + clockOffset);
  async function syncClock() {
    try {
      const t0 = Date.now();
      const { now } = await api('/api/time');
      const t1 = Date.now();
      clockOffset = Date.parse(now) + (t1 - t0) / 2 - t1;
    } catch { /* ออฟไลน์: ใช้ค่าเดิม */ }
  }
  const fmtClock = (d) => d.toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtDay = (d) => d.toLocaleDateString('th-TH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtStamp = (d) => `${d.toLocaleDateString('th-TH', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })} ${fmtClock(d)} น.`;

  // ---------- Locations (พิกัด + รัศมี ตั้งโดยผู้ดูแล) ----------
  let sites = [];
  const loadSites = () => api('/api/locations').then((d) => { sites = d.locations || []; }).catch(() => {});
  loadSites();
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  // คำนวณเหมือนฝั่งเซิร์ฟเวอร์ (เซิร์ฟเวอร์คำนวณซ้ำเองตอนบันทึก)
  function matchSite(lat, lng) {
    const list = sites.filter((s) => s.lat != null && s.lng != null);
    if (!list.length) return { configured: false };
    let best = null;
    for (const s of list) {
      const d = haversine(lat, lng, s.lat, s.lng);
      if (!best || d - s.radius < best.distance - best.site.radius) best = { site: s, distance: d };
    }
    return { ...best, inside: best.distance <= best.site.radius, configured: true };
  }
  const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${Math.round(m)} ม.`);

  // header clock
  const clock = document.getElementById('clock');
  const tick = () => (clock.textContent = serverNow().toLocaleString('th-TH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }));
  tick();
  setInterval(tick, 15000);
  syncClock().then(tick);

  // ---------- ตรวจจับใบหน้า (MediaPipe) ----------
  const MP_VER = '0.10.14';
  const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
  const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
  let detectorPromise = null;
  function loadFaceDetector() {
    if (!detectorPromise) {
      detectorPromise = (async () => {
        const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
        const make = (delegate) => vision.FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate }, runningMode: 'VIDEO', minDetectionConfidence: 0.6,
        });
        try { return await make('GPU'); } catch { return await make('CPU'); }
      })().catch((e) => { detectorPromise = null; throw e; });
    }
    return detectorPromise;
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const VIRTUAL_CAM_RE = /virtual|obs|manycam|snap camera|xsplit|droidcam|epoccam|iriun|camo|ndi|splitcam|youcam|e2esoft|vcam/i;

  // ---------- GPS (บังคับ: ใช้พิกัดจริงตอนสแกน) ----------
  let geoWatch = null;
  let lastFix = null;
  const gpsLog = []; // เก็บพิกัดทุกจุดที่ได้รับ เพื่อส่งให้เซิร์ฟเวอร์ตรวจการปลอมตำแหน่ง
  const toFix = (p) => {
    const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp, got: Date.now() };
    gpsLog.push(fix);
    if (gpsLog.length > 60) gpsLog.shift();
    return fix;
  };
  // ขอพิกัดใหม่ ณ ตอนนี้ (ไม่ใช้ค่าที่เครื่องจำไว้)
  const freshFix = (timeout) => new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve(toFix(p)), () => resolve(null), { enableHighAccuracy: true, maximumAge: 0, timeout });
  });
  function startGps(onUpdate) {
    stopGps();
    if (!('geolocation' in navigator)) return onUpdate(null, 'อุปกรณ์นี้ไม่รองรับ GPS');
    geoWatch = navigator.geolocation.watchPosition(
      (p) => {
        lastFix = toFix(p);
        onUpdate(lastFix);
      },
      (err) => onUpdate(null, err.code === 1 ? 'ไม่ได้อนุญาตให้ใช้ตำแหน่ง กรุณาเปิดสิทธิ์ตำแหน่งที่ตั้งให้แอปนี้' : 'หาตำแหน่ง GPS ไม่ได้ กรุณาเปิด GPS ในมือถือแล้วลองใหม่', err.code),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
  }
  function stopGps() {
    if (geoWatch !== null) navigator.geolocation.clearWatch(geoWatch);
    geoWatch = null;
  }

  // ---------- ประทับข้อมูลลงรูป (มุมขวาล่าง) ----------
  function stampPhoto(canvas, lines) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const fs = Math.max(15, Math.round(Math.min(w, h) / 30));
    const lh = Math.round(fs * 1.38);
    ctx.font = `600 ${fs}px "IBM Plex Sans Thai", Tahoma, sans-serif`;
    const maxText = Math.min(w * 0.9, Math.max(...lines.map((l) => ctx.measureText(l.text).width)));
    const pad = Math.round(fs * 0.7);
    const boxW = maxText + pad * 2;
    const boxH = lh * lines.length + pad * 1.4;
    const x = w - boxW - pad;
    const y = h - boxH - pad;
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, fs * 0.5); ctx.fill(); } else ctx.fillRect(x, y, boxW, boxH);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => {
      ctx.font = `${l.bold ? 700 : 500} ${fs}px "IBM Plex Sans Thai", Tahoma, sans-serif`;
      ctx.fillStyle = l.color || '#fff';
      ctx.fillText(l.text, w - pad * 2, y + pad * 0.7 + i * lh, maxText);
    });
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  const whoChip = () => `<div class="who"><span class="avatar">${esc(me.first_name.slice(0, 1))}</span><div><b>${esc(me.name)}</b><small>รหัส ${esc(me.emp_code)}</small></div></div>`;

  // ---------- Check-in / Check-out ----------
  let liveTimer = null;
  // หน้าลงเวลา: สแกนครั้งแรก = เข้างาน, ครั้งที่สอง = ออกงาน (ระบบเลือกให้ สลับเองได้ถ้าจำเป็น)
  let scanOverride = null;
  let scanStatus = null;
  async function renderScan(override) {
    scanOverride = override || null;
    if (!scanStatus || !override) {
      view.innerHTML = '<h1 class="screen-title"><span class="dot"></span>ลงเวลา</h1><div class="card empty">กำลังตรวจสอบว่าครั้งนี้เป็นเข้างานหรือออกงาน…</div>';
      try { scanStatus = await api('/api/me/scan-status'); } catch { scanStatus = { next: 'in', last: null, reason: 'offline' }; }
      if (current !== 'scan') return;
    }
    renderAttendance(scanOverride || scanStatus.next);
  }
  function scanBanner(mode) {
    const st = scanStatus || {};
    const last = st.last;
    const when = last ? `${last.work_date !== today() ? `${thDate(last.work_date)} ` : ''}${last.time} น.` : '';
    let text;
    if (scanOverride) text = mode === 'in' ? 'คุณเลือกสแกน <b>เข้างาน</b> เอง' : 'คุณเลือกสแกน <b>ออกงาน</b> เอง';
    else if (mode === 'out' && st.reason === 'recent_checkout') text = `ออกงานแล้วเมื่อ <b>${esc(when)}</b> · สแกนอีกครั้งจะ<b>อัปเดตเวลาออกงาน</b>`;
    else if (mode === 'out') text = `เข้างานแล้วเมื่อ <b>${esc(when)}</b> · ครั้งนี้คือ <b>สแกนออกงาน</b>`;
    else if (st.reason === 'stale_checkin') text = `มีการเข้างานเมื่อ ${esc(when)} ที่ไม่ได้สแกนออก · ครั้งนี้นับเป็น<b>เข้างานใหม่</b>`;
    else text = 'ยังไม่ได้สแกนเข้างาน · ครั้งนี้คือ <b>สแกนเข้างาน</b>';
    const other = mode === 'in' ? 'out' : 'in';
    return `<div class="scan-banner ${mode}">${text}
      <button class="linkbtn" id="swapMode" type="button">${scanOverride ? 'กลับไปใช้ที่ระบบเลือกให้' : `ต้องการสแกน${other === 'in' ? 'เข้างาน' : 'ออกงาน'}แทน?`}</button></div>`;
  }

  function renderAttendance(mode) {
    const isIn = mode === 'in';
    const label = isIn ? 'เช็คอิน' : 'เช็คเอ้าท์';
    view.innerHTML = `
      <h1 class="screen-title ${mode}"><span class="dot"></span>ลงเวลา · ${isIn ? 'เข้างาน' : 'ออกงาน'}</h1>
      <div class="card">
        ${whoChip()}
        ${scanBanner(mode)}
        <div class="live-clock"><small>เวลาจริงจากระบบ (ตั้งเองไม่ได้)</small><b id="lc">--:--:--</b><span id="ld"></span></div>
        <div id="permBox"></div>
        <div class="info-row" id="gpsRow"><span class="ico">📍</span><div><b>พิกัด GPS</b><div id="gpsText" class="muted">กำลังหาตำแหน่ง…</div></div></div>
        <div class="info-row" id="siteRow"><span class="ico">🏢</span><div><b>สถานที่ทำงาน</b><div id="siteText" class="muted">รอพิกัด GPS…</div></div></div>
        <label class="field" id="siteChoose"><span>พิมพ์สถานที่ทำงานครั้งนี้ <b class="bad">*</b></span><input name="site" maxlength="100" autocomplete="off" list="siteList" placeholder="พิมพ์ชื่อสถานที่ เช่น ไซต์งานบางนา" enterkeyhint="done"><datalist id="siteList"></datalist></label>
        <div class="site-quick" id="siteQuick" hidden></div>
        <button class="btn primary big scan-btn" id="scanBtn" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="10" r="3"/><path d="M7 18a5 5 0 0 1 10 0"/></svg>
          สแกนใบหน้า${isIn ? 'เข้างาน' : 'ออกงาน'}</button>
        <p class="hint">กดแล้วหันหน้าเข้ากล้องค้างไว้ 5 วินาที ระบบจะถ่ายรูปพร้อมประทับเวลาจริง พิกัด และสถานที่ทำงานให้อัตโนมัติ</p>
        <p class="hint warn-hint">⚠ ห้ามใช้แอปจำลองตำแหน่ง (Fake GPS) ระบบตรวจจับพิกัดปลอมและรายงานผู้ดูแลพร้อมหลักฐานทุกครั้ง</p>
      </div>`;

    document.getElementById('swapMode').onclick = () => {
      if (scanOverride) return renderScan();
      const other = mode === 'in' ? 'out' : 'in';
      if (!confirm(`ยืนยันสแกน${other === 'in' ? 'เข้างาน' : 'ออกงาน'}แทน?\nใช้เฉพาะกรณีที่ระบบเลือกไม่ตรง เช่น ลืมสแกนออกงานเมื่อวาน`)) return;
      renderScan(other);
    };
    const lc = document.getElementById('lc');
    const ld = document.getElementById('ld');
    const drawClock = () => { const d = serverNow(); lc.textContent = fmtClock(d); ld.textContent = fmtDay(d); };
    drawClock();
    clearInterval(liveTimer);
    liveTimer = setInterval(() => { if (document.getElementById('lc')) drawClock(); else clearInterval(liveTimer); }, 1000);

    const scanBtn = document.getElementById('scanBtn');
    const gpsText = document.getElementById('gpsText');
    const siteText = document.getElementById('siteText');
    const siteChoose = document.getElementById('siteChoose');
    const siteInput = siteChoose.querySelector('input');
    const siteList = document.getElementById('siteList');
    // ไม่ใส่ค่าเดิมให้อัตโนมัติ (เข้างานกับออกงานอาจคนละที่) แต่มีปุ่มให้แตะใช้ที่เดิมได้
    const lastLoc = store.get('last_location', '');
    const siteQuick = document.getElementById('siteQuick');
    if (lastLoc) {
      siteQuick.hidden = false;
      siteQuick.innerHTML = `<button type="button" class="chip-btn">ใช้ที่เดิม: <b>${esc(lastLoc)}</b></button>`;
      siteQuick.firstElementChild.onclick = () => { siteInput.value = lastLoc; siteInput.classList.remove('input-bad'); };
    }
    siteInput.addEventListener('input', () => siteInput.classList.remove('input-bad'));

    if (!window.isSecureContext) {
      gpsText.innerHTML = '<span class="bad">ต้องเปิดแอปผ่าน https:// เท่านั้น จึงจะใช้กล้องและ GPS ได้</span>';
      siteText.textContent = '–';
      return;
    }

    const refresh = () => {
      if (!lastFix) return;
      gpsText.innerHTML = `${lastFix.lat.toFixed(6)}, ${lastFix.lng.toFixed(6)} <span class="${lastFix.accuracy > 150 ? 'warn' : 'ok'}">(±${Math.round(lastFix.accuracy)} ม.)</span>`;
      const m = matchSite(lastFix.lat, lastFix.lng);
      siteList.innerHTML = sites.map((s) => `<option value="${esc(s.name)}">`).join('');
      if (m.configured) {
        siteText.innerHTML = m.inside
          ? `<b class="ok">${esc(m.site.name)}</b> <span class="muted">· อยู่ในพื้นที่ (${fmtDist(m.distance)})</span>`
          : `<b class="warn">${esc(m.site.name)}</b> <span class="warn">· นอกพื้นที่ ห่าง ${fmtDist(m.distance)}</span><div class="sub">ยังลงเวลาได้ แต่ระบบจะแจ้งผู้ดูแลให้ตรวจสอบ</div>`;
      } else {
        siteText.textContent = 'พิมพ์ชื่อสถานที่ทำงานด้านล่าง';
      }
      scanBtn.disabled = permBlocked;
    };

    renderPermBox();
    loadSites().then(refresh);
    startGps((fix, err, code) => {
      if (!document.getElementById('gpsText')) return stopGps();
      if (err) {
        gpsText.innerHTML = `<span class="bad">${esc(err)}</span>`;
        document.getElementById('gpsRow').classList.add('row-bad');
        scanBtn.disabled = true;
        if (code === 1) renderPermBox(true);
        return;
      }
      document.getElementById('gpsRow').classList.remove('row-bad');
      refresh();
    });
    if (lastFix && Date.now() - lastFix.got < 60000) refresh();
    loadFaceDetector().catch(() => {}); // โหลดล่วงหน้า

    scanBtn.onclick = () => {
      const choice = siteInput.value.replace(/s+/g, ' ').trim();
      if (choice.length < 2) { siteInput.classList.add('input-bad'); siteInput.focus(); return toast('กรุณาพิมพ์สถานที่ทำงานก่อนสแกน', true); }
      store.set('last_location', choice);
      runScanner(mode, choice);
    };
  }

  // ---------- สิทธิ์ตำแหน่ง / กล้อง ----------
  let permBlocked = false;
  const permWatch = {};
  async function permState(name) {
    try {
      const st = await navigator.permissions.query({ name });
      // ผู้ใช้เปลี่ยนสิทธิ์ในตั้งค่า → อัปเดตกล่องสถานะทันที
      if (!permWatch[name]) { permWatch[name] = true; st.onchange = () => { if (current === 'scan') renderScan(scanOverride); }; }
      return st.state;
    } catch { return 'unknown'; } // เบราว์เซอร์บางรุ่น (เช่น Safari รุ่นเก่า) ไม่บอกสถานะ
  }
  async function renderPermBox(gpsDenied = false) {
    const box = document.getElementById('permBox');
    if (!box) return;
    let geo = await permState('geolocation');
    const cam = await permState('camera');
    if (gpsDenied) geo = 'denied';
    if (!document.getElementById('permBox')) return;
    const denied = [geo === 'denied' && 'ตำแหน่ง (GPS)', cam === 'denied' && 'กล้อง'].filter(Boolean);
    const scanBtn = document.getElementById('scanBtn');
    permBlocked = denied.length > 0;
    if (permBlocked) {
      scanBtn.disabled = true;
      box.innerHTML = `<div class="perm-box denied">
        <b>⛔ ไม่ได้อนุญาต${denied.join(' และ ')}</b>
        <div>ลงเวลาไม่ได้จนกว่าจะเปิดสิทธิ์ เพราะระบบต้องใช้รูปและพิกัดตอนสแกน</div>
        <div class="perm-note">เมื่อกด "ไม่อนุญาต" ไปแล้ว มือถือจะไม่ถามซ้ำ ต้องเปิดสิทธิ์ในการตั้งค่า แล้วกด "ตรวจสอบสิทธิ์อีกครั้ง" หรือ ⟳ รีเฟรช</div>
        <div class="perm-actions"><button class="btn danger sm" id="permHow">วิธีเปิดสิทธิ์</button><button class="btn ghost sm" id="permRetry">ตรวจสอบสิทธิ์อีกครั้ง</button></div>
      </div>`;
    } else if (geo === 'prompt' || cam === 'prompt') {
      box.innerHTML = `<div class="perm-box ask">
        <b>แอปต้องใช้ตำแหน่งและกล้องตอนสแกน</b>
        <div>กดปุ่มด้านล่าง แล้วเลือก <b>"อนุญาต"</b> (ถ้ามีตัวเลือก ให้เลือก <b>"อนุญาตทุกครั้ง / ขณะใช้แอป"</b> จะได้ไม่ต้องถามบ่อย)</div>
        <div class="perm-actions"><button class="btn primary sm" id="permAsk">อนุญาตตำแหน่งและกล้อง</button><button class="btn ghost sm" id="permHow">วิธีตั้งให้อนุญาตตลอด</button></div>
      </div>`;
    } else if (geo === 'granted' && cam === 'granted') {
      box.innerHTML = '<div class="perm-box ok">✅ อนุญาตตำแหน่งและกล้องแล้ว</div>';
    } else {
      box.innerHTML = '<div class="perm-link"><button class="linkbtn" id="permHow">ไม่อยากให้ถามสิทธิ์บ่อย? ตั้งให้อนุญาตตลอด</button></div>';
    }
    box.querySelector('#permHow')?.addEventListener('click', openPermGuide);
    box.querySelector('#permRetry')?.addEventListener('click', recheckPerms);
    box.querySelector('#permAsk')?.addEventListener('click', requestPerms);
  }
  // ตรวจสิทธิ์ซ้ำโดยไม่โหลดหน้าใหม่: ลองขอพิกัด/กล้องอีกครั้ง ถ้ายังถูกบล็อก → บอกวิธีเปิดในการตั้งค่า
  async function recheckPerms() {
    const btn = document.getElementById('permRetry');
    if (btn) busy(btn, true, 'กำลังตรวจสอบ…');
    const geoOk = await new Promise((res) => {
      if (!('geolocation' in navigator)) return res(false);
      navigator.geolocation.getCurrentPosition(() => res(true), (e) => res(e.code !== 1), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
    let camOk = true;
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      st.getTracks().forEach((t) => t.stop());
    } catch (e) { camOk = !(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')); }
    if (current !== 'scan') return;
    if (geoOk && camOk) {
      toast('เปิดสิทธิ์แล้ว สแกนได้เลย');
      renderScan(scanOverride);
      return;
    }
    if (btn) busy(btn, false);
    const miss = [!geoOk && 'ตำแหน่ง', !camOk && 'กล้อง'].filter(Boolean).join(' และ ');
    toast(`ยังไม่ได้อนุญาต${miss} — ต้องเปิดในการตั้งค่ามือถือตามขั้นตอนนี้`, true);
    openPermGuide();
  }

  async function requestPerms() {
    const btn = document.getElementById('permAsk');
    if (btn) busy(btn, true, 'กำลังขอสิทธิ์…');
    await new Promise((res) => navigator.geolocation.getCurrentPosition(() => res(), () => res(), { enableHighAccuracy: true, timeout: 15000 }));
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      st.getTracks().forEach((t) => t.stop());
    } catch { /* ผู้ใช้ไม่อนุญาต → กล่องจะเป็นสีแดง */ }
    if (current === 'scan') renderScan(scanOverride);
  }
  function openPermGuide() {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    openSheet(`
      <h2 class="sheet-title">ตั้งให้อนุญาตตำแหน่งและกล้องตลอด</h2>
      <p class="hint" style="margin-top:0">ตั้งครั้งเดียว มือถือจะไม่ถามสิทธิ์ซ้ำทุกครั้งที่สแกน · ต้องเปิด GPS ของมือถือไว้ด้วย</p>
      <div class="guide ${ios ? '' : 'first'}"><b>📱 Android (Chrome)</b><ol>
        <li>แตะไอคอน <b>🔒 หรือ ⓘ</b> หน้าช่องที่อยู่เว็บด้านบน → <b>สิทธิ์ (Permissions)</b></li>
        <li><b>ตำแหน่ง</b> → <b>อนุญาต</b> · <b>กล้อง</b> → <b>อนุญาต</b></li>
        <li>ถ้าติดตั้งแอปไว้ที่หน้าจอหลัก: <b>ตั้งค่ามือถือ → แอป → Chrome → สิทธิ์</b> → ตำแหน่ง <b>"อนุญาตขณะใช้แอป"</b> และเปิด <b>"ใช้ตำแหน่งที่แม่นยำ"</b>, กล้อง <b>"อนุญาตขณะใช้แอป"</b></li>
      </ol></div>
      <div class="guide ${ios ? 'first' : ''}"><b>🍎 iPhone (Safari)</b><ol>
        <li><b>ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → บริการหาตำแหน่ง</b> → เปิด → <b>เว็บไซต์ Safari</b> → <b>"ขณะใช้แอป"</b> และเปิด <b>"ตำแหน่งที่แน่นอน"</b></li>
        <li><b>ตั้งค่า → Safari</b> → เลื่อนลงที่ "การตั้งค่าสำหรับเว็บไซต์" → <b>กล้อง: อนุญาต</b> และ <b>ตำแหน่ง: อนุญาต</b></li>
        <li>หรือในหน้าแอป แตะ <b>"AA"</b> ที่ช่องที่อยู่ → <b>การตั้งค่าเว็บไซต์</b> → กล้องและตำแหน่ง: <b>อนุญาต</b></li>
      </ol></div>
      <button class="btn primary big" data-close>เข้าใจแล้ว</button>`);
  }

  // ---------- หน้าจอสแกนใบหน้า 5 วินาที ----------
  async function runScanner(mode, locationChoice) {
    const label = mode === 'in' ? 'เช็คอิน' : 'เช็คเอ้าท์';
    const ov = document.createElement('div');
    ov.className = 'scanner';
    ov.innerHTML = `
      <div class="scan-top"><b>สแกนใบหน้า${mode === 'in' ? 'เข้างาน' : 'ออกงาน'}</b><button class="scan-x" aria-label="ยกเลิก">ยกเลิก</button></div>
      <div class="scan-stage">
        <video playsinline muted autoplay></video>
        <svg class="scan-ring" viewBox="0 0 100 130" preserveAspectRatio="none"><ellipse class="track" cx="50" cy="62" rx="36" ry="48"/><ellipse class="prog" id="prog" cx="50" cy="62" rx="36" ry="48" pathLength="100"/></svg>
        <div class="scan-count" id="cnt"></div>
      </div>
      <div class="scan-status" id="st">กำลังเปิดกล้อง…</div>`;
    document.body.appendChild(ov);
    document.body.classList.add('scanning');

    const video = ov.querySelector('video');
    const st = ov.querySelector('#st');
    const cnt = ov.querySelector('#cnt');
    const prog = ov.querySelector('#prog');
    let stream = null;
    let raf = 0;
    let closed = false;
    const close = () => {
      closed = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ov.remove();
      document.body.classList.remove('scanning');
    };
    ov.querySelector('.scan-x').onclick = close;
    const fail = (msg) => { close(); toast(msg, true); };

    try {
      if (!navigator.mediaDevices?.getUserMedia) return fail('อุปกรณ์นี้ไม่รองรับกล้อง');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      } catch (e) {
        return fail(e.name === 'NotAllowedError' ? 'ไม่ได้อนุญาตให้ใช้กล้อง กรุณาเปิดสิทธิ์กล้องให้แอปนี้' : 'เปิดกล้องไม่ได้ กรุณาลองใหม่');
      }
      if (closed) return close();
      const track = stream.getVideoTracks()[0];
      const cameraLabel = track?.label || '';
      if (VIRTUAL_CAM_RE.test(cameraLabel)) return fail('ไม่อนุญาตให้ใช้กล้องเสมือนหรือโปรแกรมปลอมภาพ');
      video.srcObject = stream;
      video.play().catch(() => {}); // ไม่รอ play() เพราะจะค้างถ้ากล้องไม่ส่งภาพ (มีตัวจับเวลาด้านล่าง)
      // รอภาพจากกล้องไม่เกิน 10 วินาที (กันค้างถ้ากล้องถูกแอปอื่นใช้อยู่)
      const camReady = await Promise.race([
        new Promise((r) => (video.readyState >= 2 ? r(true) : video.addEventListener('loadeddata', () => r(true), { once: true }))),
        new Promise((r) => setTimeout(() => r(false), 10000)),
      ]);
      if (closed) return;
      if (!camReady) return fail('กล้องไม่ส่งภาพ กรุณาปิดแอปอื่นที่ใช้กล้องอยู่ แล้วลองใหม่');

      st.textContent = 'กำลังเตรียมระบบตรวจใบหน้า…';
      let detector = null;
      try { detector = await withTimeout(loadFaceDetector(), 15000); } catch { detector = null; }
      if (closed) return;
      if (!lastFix) return fail('ไม่พบพิกัด GPS กรุณารอสักครู่แล้วสแกนใหม่');

      // ขอรหัสสแกนจากเซิร์ฟเวอร์ = จุดเริ่มนับเวลาจริง
      const cap = await api('/api/capture/start', { type: mode });
      if (closed) return;
      const t0 = performance.now();
      const scanWall = Date.now();
      const serverStart = Date.parse(cap.server_time);
      let okMs = 0;
      let okFrames = 0;
      let frames = 0;
      let seenFace = false;
      let last = t0;
      let lastDetect = -1;

      const step = () => {
        if (closed) return;
        const now = performance.now();
        const dt = Math.min(now - last, 200);
        last = now;
        let state = 'none';
        if (detector) {
          if (now > lastDetect) {
            try {
              const res = detector.detectForVideo(video, now);
              lastDetect = now;
              const faces = (res.detections || []).filter((d) => (d.categories?.[0]?.score ?? 0) >= 0.6);
              if (faces.length > 1) state = 'many';
              else if (faces.length === 1) state = faces[0].boundingBox.width / video.videoWidth >= 0.18 ? 'ok' : 'far';
            } catch { state = 'none'; }
          }
        } else state = 'ok';
        // นับสัดส่วนใบหน้าตั้งแต่เจอหน้าครั้งแรก (ช่วงจัดท่าก่อนหน้านั้นไม่นับ)
        if (state === 'ok') { seenFace = true; okFrames++; okMs += dt; }
        if (seenFace) frames++;
        const remain = Math.max(0, SCAN_MS - okMs);
        prog.style.strokeDashoffset = String(100 - (okMs / SCAN_MS) * 100);
        ov.classList.toggle('face-ok', state === 'ok');
        cnt.textContent = Math.ceil(remain / 1000) || '';
        st.textContent = !detector ? 'ค้างไว้นิ่งๆ… (ระบบตรวจใบหน้าไม่พร้อม จะแจ้งผู้ดูแลตรวจสอบ)'
          : state === 'ok' ? 'พบใบหน้า ค้างไว้นิ่งๆ…'
          : state === 'many' ? 'พบหลายใบหน้า ให้มีเพียงคุณคนเดียวในกล้อง'
          : state === 'far' ? 'ขยับหน้าเข้าใกล้กล้องอีกนิด'
          : 'หันหน้าเข้ากล้องให้อยู่ในกรอบ';

        if (okMs >= SCAN_MS && now - t0 >= SCAN_MS) return finish(now - t0, okFrames / Math.max(1, frames));
        if (now - t0 > 90000) return fail('สแกนไม่สำเร็จภายในเวลา กรุณาลองใหม่ในที่มีแสงสว่าง');
        raf = requestAnimationFrame(step);
      };
      const SCAN_MS = cap.scan_ms || 5000;
      st.textContent = 'หันหน้าเข้ากล้องให้อยู่ในกรอบ';
      raf = requestAnimationFrame(step);

      const finish = (elapsed, faceRatio) => capture(elapsed, faceRatio).catch((err) => fail(err.message || 'เกิดข้อผิดพลาด กรุณาสแกนใหม่'));
      const capture = async (elapsed, faceRatio) => {
        // ถ่ายภาพจากกล้องจริง (ไม่กลับด้าน)
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.min(1, 1280 / Math.max(vw, vh));
        const c = document.createElement('canvas');
        c.width = Math.round(vw * scale);
        c.height = Math.round(vh * scale);
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        const shotAt = new Date(serverStart + elapsed);
        stream?.getTracks().forEach((t) => t.stop());

        // ขอพิกัดใหม่ ณ วินาทีที่ถ่าย (ไม่ใช้ค่าเก่า) ถ้าไม่ได้ ใช้จุดล่าสุดที่ได้ระหว่างสแกนเท่านั้น
        cnt.textContent = '';
        ov.classList.remove('face-ok');
        st.textContent = 'ถ่ายรูปแล้ว กำลังยืนยันพิกัด GPS ตอนถ่าย…';
        let fix = await freshFix(12000);
        if (closed) return;
        if (!fix) fix = [...gpsLog].reverse().find((s) => s.got >= scanWall) || null;
        if (!fix) return fail('ยืนยันพิกัด GPS ตอนถ่ายไม่ได้ กรุณาออกไปที่โล่งแล้วสแกนใหม่');
        const samples = gpsLog.filter((s) => s.got >= scanWall - 1000 && s !== fix).slice(-20)
          .map((s) => ({ lat: s.lat, lng: s.lng, accuracy: s.accuracy }));
        close();

        const m = matchSite(fix.lat, fix.lng);
        const placeName = locationChoice || (m.configured ? m.site.name : 'ไม่ระบุสถานที่');
        const photo = stampPhoto(c, [
          { text: `${label} · ${me.name}`, bold: true },
          { text: `รหัสพนักงาน ${me.emp_code}` },
          { text: fmtStamp(shotAt), bold: true, color: '#ffd166' },
          { text: `สถานที่ ${placeName}${m.configured && !m.inside ? ' (นอกพื้นที่)' : ''}` },
          { text: `พิกัด ${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)} (±${Math.round(fix.accuracy)} ม.)` },
          { text: `รหัสตรวจสอบ ${cap.verify_code}`, color: '#9be9df' },
        ]);
        // รูปย่อสำหรับตารางผู้ดูแล (ไม่ต้องโหลดรูปเต็มทุกแถว)
        const tc = document.createElement('canvas');
        const ts = 128 / Math.max(c.width, c.height);
        tc.width = Math.round(c.width * ts);
        tc.height = Math.round(c.height * ts);
        tc.getContext('2d').drawImage(c, 0, 0, tc.width, tc.height);
        const thumb = tc.toDataURL('image/jpeg', 0.7);
        renderConfirm({
          mode, label, photo, placeName, shotAt, fix,
          payload: {
            nonce: cap.nonce, elapsed_ms: Math.round(elapsed), photo, thumb,
            lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, gps_samples: samples,
            gps_pos_age_ms: Math.round(fix.got - fix.at), // เวลาที่พิกัดถูกวัด เทียบกับเวลาที่ได้รับ (แอปปลอมมักค้าง)
            face_check: detector ? 'ok' : 'unavailable', face_ratio: Math.round(faceRatio * 1000) / 1000,
            camera_label: cameraLabel, touch: navigator.maxTouchPoints > 0, location_choice: locationChoice,
          },
          verify: cap.verify_code,
        });
      };
    } catch (err) {
      fail(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }

  function renderConfirm(s) {
    stopGps();
    view.innerHTML = `
      <h1 class="screen-title ${s.mode}"><span class="dot"></span>ตรวจสอบรูป${s.label}</h1>
      <div class="card">
        <div class="shot protect"><img id="shot" alt="รูปสแกน" draggable="false"></div>
        <dl class="kv">
          <dt>เวลา</dt><dd>${esc(fmtStamp(s.shotAt))}</dd>
          <dt>สถานที่</dt><dd>${esc(s.placeName)}</dd>
          <dt>พิกัด</dt><dd>${s.fix.lat.toFixed(6)}, ${s.fix.lng.toFixed(6)}</dd>
          <dt>รหัสตรวจสอบ</dt><dd>${esc(s.verify)}</dd>
        </dl>
        <button class="btn primary big" id="send">ยืนยันส่ง${s.label}</button>
        <button class="btn ghost big" id="again" style="margin-top:10px">สแกนใหม่</button>
        <p class="hint">ต้องกดส่งภายใน 5 นาที ไม่เช่นนั้นต้องสแกนใหม่</p>
      </div>`;
    document.getElementById('shot').src = s.photo;
    document.getElementById('again').onclick = () => go('scan');
    const btn = document.getElementById('send');
    btn.onclick = async () => {
      busy(btn, true, 'กำลังส่ง…');
      try {
        const saved = await api('/api/attendance', s.payload);
        scanStatus = null;
        scanOverride = null;
        const rows = [
          ['ชื่อ', me.name], ['วันที่ทำงาน', thDate(saved.work_date)], ['เวลา', `${fmtClock(new Date(saved.captured_at))} น.`],
          ['สถานที่', saved.location], ['รหัสตรวจสอบ', saved.verify_code],
        ];
        if (saved.day?.shift) rows.push(['กะ', `${saved.day.shift.name} (${saved.day.shift.start}–${saved.day.shift.end} น.)`]);
        if (saved.day?.issues?.length) rows.push(['หมายเหตุ', saved.day.issues.map((i) => i.text).join(', ')]);
        for (const o of saved.ot_available || []) rows.push([`ทำเกินเวลา (OT ${o.type})`, `${o.start}–${o.end} น. = ${o.hours} ชม. · ถ้าทำ OT กด “ขอ OT”`]);
        renderSuccess(`${s.label}สำเร็จ`, rows, s.photo);
        // ทำงานเกินเวลา → แนะนำให้ขอ OT (ระบบไม่ขอให้เอง)
        if (saved.ot_available?.length) {
          const b = document.createElement('button');
          b.className = 'btn primary big';
          b.style.marginBottom = '10px';
          b.textContent = 'ขอ OT ของวันนี้';
          b.onclick = () => { otDate = saved.work_date; go('ot'); };
          document.getElementById('back').before(b);
        }
      } catch (err) {
        toast(err.message, true);
        busy(btn, false);
        if (/สแกนใหม่|หมดเวลา/.test(err.message)) setTimeout(() => go('scan'), 1500);
      }
    };
    window.scrollTo(0, 0);
  }

  // ---------- OT: เลือกวัน → ระบบคำนวณจากเวลาสแกน → ติ๊กรายการที่ต้องการขอ ----------
  const OT_DESC = Object.fromEntries(OT_TYPES.map((t) => [t.v, t.desc]));
  let otDate = null;
  function renderOT(date) {
    otDate = date || otDate || today();
    view.innerHTML = `
      <h1 class="screen-title ot"><span class="dot"></span>ขอทำโอที (OT)</h1>
      <div class="card">
        ${whoChip()}
        <label class="field"><span>วันที่ทำโอที</span>
          <input type="date" id="otDate" value="${otDate}" max="${today()}"></label>
        <div id="otBody"><div class="empty">กำลังคำนวณจากเวลาสแกน…</div></div>
      </div>
      <p class="hint">ระบบคำนวณ OT จากเวลาสแกนจริงให้เอง ไม่ต้องกรอกเวลา · มาก่อนเวลานับตั้งแต่เริ่มกะ · เวลาออก OT ปัดลงทีละ 30 นาที (เช่น 20:03 → 20:00)</p>`;
    const inp = document.getElementById('otDate');
    inp.onchange = () => { if (inp.value) renderOT(inp.value); };
    loadOtPreview();
  }

  async function loadOtPreview() {
    const box = document.getElementById('otBody');
    try {
      const pv = await api(`/api/me/ot-preview?date=${otDate}`);
      if (current !== 'ot' || !document.getElementById('otBody')) return;
      const dayType = pv.holiday_name ? `<span class="badge purple-badge">วันหยุด · ${esc(pv.holiday_name)}</span>` : '<span class="badge in">วันทำงานปกติ</span>';
      const times = `
        <div class="ot-times">
          <div>${dayType}${pv.shift ? ` <span class="muted">${esc(pv.shift.name)} ${esc(pv.shift.start)}–${esc(pv.shift.end)} น.</span>` : ''}</div>
          <dl class="kv">
            <dt>สแกนเข้า (จริง)</dt><dd>${pv.scan_in ? `${esc(pv.scan_in)} น.` : '<span class="bad">ไม่มี</span>'}${pv.calc_in && pv.calc_in !== pv.scan_in ? ` <span class="muted">→ นับเป็น ${esc(pv.calc_in)}</span>` : ''}</dd>
            <dt>สแกนออก (จริง)</dt><dd>${pv.scan_out ? `${esc(pv.scan_out)} น.` : '<span class="bad">ไม่มี</span>'}${pv.calc_out && pv.calc_out !== pv.scan_out ? ` <span class="muted">→ เลิกงาน ${esc(pv.calc_out)}</span>` : ''}</dd>
          </dl>
        </div>`;
      if (pv.reason) {
        box.innerHTML = `${times}<div class="${pv.reason === 'no_ot' ? 'info-box' : 'issue-box'}">${esc(pv.reason_text)}</div>
          ${pv.reason !== 'no_ot' && pv.reason !== 'no_checkout' ? '<button class="btn ghost big" id="toCal">ไปที่ปฏิทินเพื่อยื่นคำร้อง</button>' : ''}`;
        document.getElementById('toCal')?.addEventListener('click', () => go('cal'));
        return;
      }
      const free = pv.items.filter((i) => !i.request);
      box.innerHTML = `${times}
        <div class="field-label" style="margin:14px 0 8px">รายการ OT ที่ขอได้ <small class="muted">(ติ๊กเฉพาะที่ทำ OT จริง)</small></div>
        <div class="ot-items">${pv.items.map((i) => `
          <label class="ot-item${i.request ? ' done' : ''}">
            <input type="checkbox" name="ot" value="${esc(i.type)}" ${i.request ? 'disabled' : 'checked'}>
            <span class="rate">${esc(i.type)}</span>
            <span><b>OT ${esc(i.type)} · ${esc(i.start)}–${esc(i.end)} น. = ${i.hours} ชม.</b><small>${esc(OT_DESC[i.type] || '')}</small>
              ${i.request ? `<span class="badge ${i.request.status}">ขอแล้ว · ${STATUS_TH[i.request.status]}</span>` : ''}</span>
          </label>`).join('')}</div>
        ${free.length ? `
          <label class="field" style="margin-top:12px"><span>รายละเอียดงาน <small>(ไม่บังคับ)</small></span>
            <textarea id="otNote" maxlength="500" placeholder="งานที่ทำช่วงโอที"></textarea></label>
          <button class="btn primary big" id="otSend">ส่งคำขอ OT</button>` : '<div class="info-box">ขอ OT ของวันนี้ครบแล้ว ดูสถานะได้ที่เมนูประวัติ</div>'}`;
      const send = document.getElementById('otSend');
      if (!send) return;
      send.onclick = async () => {
        const types = [...box.querySelectorAll('input[name=ot]:checked:not(:disabled)')].map((c) => c.value);
        if (!types.length) return toast('กรุณาติ๊กรายการ OT ที่ต้องการขอ', true);
        busy(send, true);
        try {
          const r = await api('/api/ot', { ot_date: otDate, types, note: document.getElementById('otNote').value.trim() });
          renderSuccess('ส่งคำขอ OT แล้ว', [
            ['ชื่อ', me.name], ['วันที่', thDate(otDate)],
            ['สแกนจริง', `${r.scan_in} – ${r.scan_out} น.`],
            ...r.created.map((o) => [`OT ${o.ot_type}`, `${o.start_time}–${o.end_time} น. = ${o.hours} ชม.`]),
            ['สถานะ', 'รอผู้ดูแลอนุมัติ'],
          ]);
        } catch (err) { toast(err.message, true); busy(send, false); }
      };
    } catch (err) {
      if (box) box.innerHTML = `<div class="issue-box">${esc(err.message)}</div>`;
    }
  }

  // ---------- Success ----------
  function renderSuccess(title, rows, photo = null) {
    view.innerHTML = `
      <div class="card success">
        <div class="check">${ICON_CHECK}</div>
        <h2>${esc(title)}</h2>
        <p class="muted">${esc(serverNow().toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }))}</p>
        ${photo ? '<div class="shot protect"><img id="shot" alt="" draggable="false"></div>' : ''}
        <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <button class="btn ghost big" id="back">เสร็จสิ้น</button>
      </div>`;
    if (photo) document.getElementById('shot').src = photo;
    document.getElementById('back').onclick = () => go('history');
    window.scrollTo(0, 0);
  }

  // ---------- ปฏิทินการทำงาน (ดูสีรายวัน ไม่แสดงรูป) ----------
  const DAY_STATUS = {
    ok: 'ปกติ', problem: 'ไม่ถูกต้อง', absent: 'ไม่มีการสแกนในวันทำงาน', no_checkin: 'ไม่มีรูปสแกนเข้างาน', no_checkout: 'ไม่มีรูปสแกนออกงาน',
    holiday: 'วันหยุด', holiday_work: 'ทำงานวันหยุด (OT)', working: 'กำลังทำงาน', pending: 'ยังไม่สแกนวันนี้', future: 'ยังไม่ถึง', none: '–',
  };
  const APPEAL_TH = { pending: 'คำร้องรอพิจารณา', approved: 'คำร้องได้รับอนุมัติ', rejected: 'คำร้องไม่ได้รับอนุมัติ' };
  const WEEK_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const ymOf = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7);
  const shiftYm = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const monthTH = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }); };
  let calMonth = null;
  let calData = null;

  async function renderCalendar(month) {
    calMonth = month || calMonth || ymOf(serverNow());
    view.innerHTML = `
      <div class="cal-head">
        <button class="btn ghost cal-nav" id="prevM" aria-label="เดือนก่อน">‹</button>
        <h1 class="screen-title" style="margin:0"><span class="dot"></span>${esc(monthTH(calMonth))}</h1>
        <button class="btn ghost cal-nav" id="nextM" aria-label="เดือนถัดไป">›</button>
      </div>
      <div id="calBody"><div class="card empty">กำลังโหลด…</div></div>`;
    document.getElementById('prevM').onclick = () => renderCalendar(shiftYm(calMonth, -1));
    document.getElementById('nextM').onclick = () => renderCalendar(shiftYm(calMonth, 1));
    try {
      calData = await api(`/api/me/calendar?month=${calMonth}`);
      if (current !== 'cal') return;
      // ย้อนดูได้ถึงเดือนที่เริ่มใช้ระบบ
      document.getElementById('prevM').disabled = !!calData.start_date && calMonth <= calData.start_date.slice(0, 7);
      drawCalendar();
    } catch (err) {
      const b = document.getElementById('calBody');
      if (b) b.innerHTML = `<div class="card empty">${esc(err.message)}</div>`;
    }
  }

  function drawCalendar() {
    const { days, summary: s, schedule } = calData;
    const lead = new Date(`${days[0].date}T12:00:00Z`).getUTCDay();
    const today = serverNow().toLocaleDateString('en-CA', { timeZone: TZ });
    const otTotal = s.ot['1.5'] + s.ot['2'] + s.ot['3'];
    const mark = (d) => (d.appeal?.status === 'pending' ? '⏳' : d.color === 'excused' ? '✓' : d.status === 'holiday_work' ? 'OT' : d.color === 'red' ? '!' : d.color === 'green' ? '✓' : '');
    document.getElementById('calBody').innerHTML = `
      <div class="cal-stats">
        <div><b>${s.work}</b><small>วันทำงาน</small></div>
        <div class="c-green"><b>${s.ok}</b><small>ปกติ</small></div>
        <div class="c-red"><b>${s.red}</b><small>ไม่ถูกต้อง</small></div>
        <div class="c-purple"><b>${otTotal}</b><small>ชม. OT</small></div>
      </div>
      <div class="card cal-card">
        <div class="cal-grid cal-week">${WEEK_TH.map((w, i) => `<span class="${schedule.weekly_off.includes(i) ? 'off' : ''}">${w}</span>`).join('')}</div>
        <div class="cal-grid">
          ${'<span></span>'.repeat(lead)}
          ${days.map((d) => `<button class="cal-day c-${d.color}${d.date === today ? ' today' : ''}" data-date="${d.date}" aria-label="${esc(thDate(d.date))} ${esc(DAY_STATUS[d.status] || '')}">
            <span class="n">${Number(d.date.slice(8))}</span><span class="m">${mark(d)}</span></button>`).join('')}
        </div>
        <div class="cal-legend">
          <span><i class="c-green"></i>ปกติ</span><span><i class="c-red"></i>ไม่ถูกต้อง/ลืมสแกน/สาย</span>
          <span><i class="c-gray"></i>วันหยุด</span><span><i class="c-purple"></i>ทำงานวันหยุด</span>
          <span><i class="c-excused"></i>อนุมัติคำร้อง</span><span><i class="c-blue"></i>วันนี้/กำลังทำงาน</span>
        </div>
      </div>
      <p class="hint">${schedule.shifts.map((x) => `${esc(x.name)} ${esc(x.start)}–${esc(x.end)} น.`).join(' · ')}<br>
        แตะวันที่เป็น<b class="bad"> สีแดง </b>เพื่อดูสาเหตุและยื่นคำร้อง</p>`;
    document.querySelectorAll('.cal-day').forEach((b) => (b.onclick = () => openDay(days.find((d) => d.date === b.dataset.date))));
  }

  function openSheet(html) {
    closeSheet();
    const el = document.createElement('div');
    el.className = 'sheet-back';
    el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) closeSheet(); });
    document.body.appendChild(el);
    document.body.classList.add('sheet-open');
    return el;
  }
  function closeSheet() {
    document.querySelector('.sheet-back')?.remove();
    document.body.classList.remove('sheet-open');
  }

  function openDay(d) {
    const otRows = d.ot_detail.map((o) => `<li>OT ${esc(o.type)} · ${esc(o.start)}–${esc(o.end)} น. = <b>${o.hours} ชม.</b></li>`).join('');
    const canAppeal = d.color === 'red' && d.appeal?.status !== 'pending';
    const el = openSheet(`
      <h2 class="sheet-title">${esc(thDate(d.date))}</h2>
      <div class="day-badges"><span class="badge day-${d.color}">${esc(d.color === 'excused' ? 'อนุมัติคำร้องแล้ว' : DAY_STATUS[d.status] || '')}</span>
        ${d.holiday_name ? `<span class="badge">${esc(d.holiday_name)}</span>` : ''}
        ${d.appeal ? `<span class="badge ${d.appeal.status}">${esc(APPEAL_TH[d.appeal.status])}</span>` : ''}</div>
      <dl class="kv">
        ${d.shift ? `<dt>กะ</dt><dd>${esc(d.shift.name)} (${esc(d.shift.start)}–${esc(d.shift.end)} น.)</dd>` : ''}
        <dt>สแกนเข้างาน</dt><dd>${d.checkin ? `${esc(d.checkin)} น.${d.calc_in && d.calc_in !== d.checkin ? ` <span class="muted">(นับเป็น ${esc(d.calc_in)})</span>` : ''}` : '<span class="bad">ไม่มี</span>'}</dd>
        <dt>สแกนออกงาน</dt><dd>${d.checkout ? `${esc(d.checkout)} น.${d.calc_out && d.calc_out !== d.checkout ? ` <span class="muted">(เลิกงาน ${esc(d.calc_out)})</span>` : ''}` : '<span class="bad">ไม่มี</span>'}</dd>
        ${d.worked_hours != null ? `<dt>เวลาทำงาน</dt><dd>${d.worked_hours} ชม.</dd>` : ''}
      </dl>
      ${d.issues.length ? `<div class="issue-box"><b>สาเหตุที่เป็นสีแดง</b><ul>${d.issues.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul></div>` : ''}
      ${otRows ? `<div class="ot-box"><b>เวลาทำงานเกิน (คิดเป็น OT ได้)</b><ul>${otRows}</ul><small>ถ้าทำ OT จริง ต้องกดขอ OT เอง</small><button class="btn primary sm" id="askOt" style="margin-top:8px">ขอ OT ของวันนี้</button></div>` : ''}
      ${d.appeal ? `<div class="appeal-box"><b>คำร้องของคุณ:</b> ${esc(d.appeal.reason)}<div>${esc(d.appeal.note)}</div>
        ${d.appeal.review_note ? `<div class="sub">ผู้ดูแล: ${esc(d.appeal.review_note)}</div>` : ''}</div>` : ''}
      ${canAppeal ? `
        <form id="apf" class="appeal-form" novalidate>
          <b>${d.appeal?.status === 'rejected' ? 'ยื่นคำร้องใหม่' : 'ยื่นคำร้องสำหรับวันนี้'}</b>
          <label class="field"><span>เหตุผล</span><select name="reason" required><option value="">— เลือกเหตุผล —</option>
            ${calData.reasons.map((r) => `<option>${esc(r)}</option>`).join('')}</select></label>
          <label class="field"><span>รายละเอียด</span><textarea name="note" maxlength="500" placeholder="อธิบายเหตุการณ์ เช่น โทรศัพท์แบตหมด สแกนไม่ได้ เข้างาน 07:55 น."></textarea></label>
          <button class="btn primary big" type="submit" id="apBtn">ส่งคำร้อง</button>
        </form>` : ''}
      <button class="btn ghost big" data-close style="margin-top:10px">ปิด</button>`);
    el.querySelector('#askOt')?.addEventListener('click', () => { otDate = d.date; go('ot'); });
    const f = el.querySelector('#apf');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!f.reason.value) return toast('กรุณาเลือกเหตุผล', true);
      if (f.note.value.trim().length < 5) return toast('กรุณาอธิบายรายละเอียด', true);
      const btn = el.querySelector('#apBtn');
      busy(btn, true);
      try {
        await api('/api/me/appeals', { date: d.date, reason: f.reason.value, note: f.note.value.trim() });
        closeSheet();
        toast('ส่งคำร้องแล้ว รอผู้ดูแลพิจารณา');
        renderCalendar(calMonth);
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
  }

  // ---------- เปลี่ยนเบอร์โทร / แจ้งรหัสพนักงานผิด ----------
  const CODE_REQ_TH = { pending: 'รอผู้ดูแลพิจารณา', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
  let codeReq = null;
  async function loadCodeRequest() {
    try {
      const { request } = await api('/api/me/code-request');
      codeReq = request;
      const box = document.getElementById('codeReqBox');
      if (!box || !request) return;
      // แสดงคำขอที่รออยู่ หรือผลที่ยังไม่ผ่านมานาน (7 วัน)
      if (request.status !== 'pending' && Date.now() - Date.parse(request.created_at) > 7 * 86400000) return;
      box.innerHTML = `<div class="code-req ${request.status}">คำขอแก้รหัสเป็น <b>${esc(request.new_code)}</b>: ${esc(CODE_REQ_TH[request.status])}
        ${request.review_note ? `<div class="sub">ผู้ดูแล: ${esc(request.review_note)}</div>` : ''}</div>`;
    } catch { /* ไม่แสดง */ }
  }

  function openPhoneSheet() {
    const el = openSheet(`
      <h2 class="sheet-title">เปลี่ยนเบอร์โทรศัพท์</h2>
      <p class="hint" style="margin-top:0">เบอร์โทรใช้ตอนลืมรหัสผ่าน จึงต้องใส่รหัสผ่านปัจจุบันเพื่อยืนยันว่าเป็นคุณ</p>
      <form id="pf" novalidate>
        <label class="field"><span>เบอร์โทรเดิม</span><input value="${esc(me.phone)}" disabled></label>
        <label class="field"><span>เบอร์โทรใหม่ <small>10 หลัก ขึ้นต้นด้วย 0</small></span>
          <input name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="0812345678" required></label>
        ${pwField('password', 'รหัสผ่านปัจจุบัน', 'current-password')}
        <button class="btn primary big" type="submit" id="pfBtn">บันทึกเบอร์ใหม่</button>
      </form>
      <button class="btn ghost big" data-close style="margin-top:10px">ยกเลิก</button>`);
    const f = el.querySelector('#pf');
    bindInputs(f);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const ok = setErr(f.phone, RULES.phone(f.phone.value)) & setErr(f.password, f.password.value ? '' : 'กรุณาใส่รหัสผ่าน');
      if (!ok) return;
      const btn = el.querySelector('#pfBtn');
      busy(btn, true, 'กำลังบันทึก…');
      try {
        const r = await api('/api/me/phone', { phone: f.phone.value, password: f.password.value });
        me = r.employee;
        store.set('emp_profile', me);
        closeSheet();
        toast('เปลี่ยนเบอร์โทรแล้ว');
        renderHistory();
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
  }

  function openCodeSheet() {
    if (codeReq?.status === 'pending') return toast(`มีคำขอแก้รหัสเป็น ${codeReq.new_code} รอผู้ดูแลพิจารณาอยู่แล้ว`, true);
    const el = openSheet(`
      <h2 class="sheet-title">แจ้งรหัสพนักงานผิด</h2>
      <p class="hint" style="margin-top:0">ส่งคำขอให้ผู้ดูแลแก้รหัสพนักงาน เมื่ออนุมัติแล้ว ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสใหม่ (รหัสผ่านเดิม)</p>
      <form id="cf" novalidate>
        <label class="field"><span>รหัสปัจจุบัน</span><input value="${esc(me.emp_code)}" disabled></label>
        <label class="field"><span>รหัสพนักงานที่ถูกต้อง <small>อักษรอังกฤษตัวใหญ่ ตามด้วยตัวเลข</small></span>
          <input name="emp_code" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="เช่น EMP001" required></label>
        <label class="field"><span>เหตุผล</span><textarea name="reason" maxlength="300" placeholder="เช่น ตอนสมัครพิมพ์รหัสผิด รหัสจริงตามบัตรพนักงานคือ ..."></textarea></label>
        <button class="btn primary big" type="submit" id="cfBtn">ส่งคำขอ</button>
      </form>
      <button class="btn ghost big" data-close style="margin-top:10px">ยกเลิก</button>`);
    const f = el.querySelector('#cf');
    bindInputs(f);
    f.onsubmit = async (e) => {
      e.preventDefault();
      let ok = setErr(f.emp_code, RULES.emp_code(f.emp_code.value) || (f.emp_code.value === me.emp_code ? 'รหัสใหม่เหมือนรหัสเดิม' : ''));
      ok = setErr(f.reason, f.reason.value.trim().length >= 3 ? '' : 'กรุณาบอกเหตุผล') && ok;
      if (!ok) return;
      const btn = el.querySelector('#cfBtn');
      busy(btn, true);
      try {
        await api('/api/me/code-request', { new_code: f.emp_code.value, reason: f.reason.value.trim() });
        closeSheet();
        toast('ส่งคำขอแล้ว รอผู้ดูแลพิจารณา');
        renderHistory();
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
  }

  // ---------- History + profile ----------
  async function renderHistory() {
    view.innerHTML = `
      <div class="card profile">
        ${whoChip()}
        <div class="muted">โทร ${esc(me.phone)}</div>
        <div id="codeReqBox"></div>
        <div class="profile-actions">
          <button class="btn ghost sm" id="chPhone">เปลี่ยนเบอร์โทร</button>
          <button class="btn ghost sm" id="chCode">แจ้งรหัสพนักงานผิด</button>
        </div>
        <button class="linkbtn danger" id="logout">ออกจากระบบ</button>
      </div>
      <h1 class="screen-title"><span class="dot"></span>ประวัติของฉัน</h1>
      <div id="hist"><div class="card empty">กำลังโหลด…</div></div>`;
    document.getElementById('chPhone').onclick = openPhoneSheet;
    document.getElementById('chCode').onclick = openCodeSheet;
    loadCodeRequest();
    document.getElementById('logout').onclick = async () => {
      if (!confirm('ออกจากระบบ?\nครั้งต่อไปต้องใส่รหัสพนักงานและรหัสผ่านใหม่')) return;
      await api('/api/auth/logout', {}).catch(() => {});
      signOut();
    };
    try {
      const { attendance, ot } = await api('/api/me/history');
      if (current !== 'history') return;
      const items = [
        ...attendance.map((a) => ({ at: a.created_at, html: `
          <div class="card hist-item"><div class="main">
            <div class="top"><span class="badge ${a.type}">${a.type === 'in' ? 'เช็คอิน' : 'เช็คเอ้าท์'}</span><span class="muted">${esc(a.captured_at ? fmtClock(new Date(a.captured_at)) : a.time)} น.</span></div>
            <div><b>${esc(thDate(a.work_date))}</b></div>
            <div class="meta">${esc(a.location)}${a.verify_code ? ` · รหัสตรวจสอบ ${esc(a.verify_code)}` : ''}</div></div></div>` })),
        ...ot.map((o) => ({ at: o.created_at, html: `
          <div class="card hist-item"><div class="main">
            <div class="top"><span><span class="badge ot">OT ${esc(o.ot_type)}</span>${o.scan_in ? ` <span class="badge">สแกน ${esc(o.scan_in)}–${esc(o.scan_out)}</span>` : ''}</span><span class="badge ${o.status}">${STATUS_TH[o.status]}</span></div>
            <div><b>${esc(thDate(o.ot_date))}</b> · ${esc(o.start_time)}–${esc(o.end_time)} น. (${esc(o.hours)} ชม.)</div>
            ${o.review_note ? `<div class="meta">หมายเหตุผู้อนุมัติ: ${esc(o.review_note)}</div>` : ''}</div></div>` })),
      ].sort((a, b) => b.at.localeCompare(a.at));
      document.getElementById('hist').innerHTML = items.length ? `<div class="hist">${items.map((i) => i.html).join('')}</div>` : '<div class="card empty">ยังไม่มีประวัติ</div>';
    } catch (err) {
      const h = document.getElementById('hist');
      if (h) h.innerHTML = `<div class="card empty">${esc(err.message)}</div>`;
    }
  }

  // ---------- Router ----------
  let current = null;
  function go(tab) {
    current = tab;
    stopGps();
    clearInterval(liveTimer);
    closeSheet();
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'scan') renderScan();
    else if (tab === 'ot') renderOT();
    else if (tab === 'cal') renderCalendar();
    else renderHistory();
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    window.scrollTo(0, 0);
  }
  tabs.forEach((b) => (b.onclick = () => { if (b.dataset.tab === 'ot') otDate = null; go(b.dataset.tab); }));
  // ลิงก์เดิม #in / #out ยังใช้ได้ → ไปหน้าลงเวลา
  const fromHash = () => { const t = location.hash.slice(1); return ['scan', 'ot', 'cal', 'history'].includes(t) ? t : 'scan'; };
  window.addEventListener('hashchange', () => { if (token && me && fromHash() !== current) go(fromHash()); });

  // ส่งสัญญาณ "ออนไลน์" ให้ผู้ดูแลเห็น: ทุก 5 นาทีขณะเปิดแอปอยู่ และทุกครั้งที่กลับมาที่แอป
  let beatTimer = null;
  const heartbeat = () => { if (token && !document.hidden) api('/api/me').then((d) => { me = d.employee; store.set('emp_profile', me); }).catch(() => {}); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });

  function startApp() {
    authLayout(false);
    go(fromHash());
    clearInterval(beatTimer);
    beatTimer = setInterval(heartbeat, 5 * 60 * 1000);
  }

  if (token && me) {
    startApp();
    // ตรวจสอบบัญชีเบื้องหลัง (ถ้าออฟไลน์ก็ยังใช้งานค้างไว้ได้)
    // ถ้าผู้ดูแลแก้รหัส/เบอร์ให้ แอปจะอัปเดตเอง (รวมรหัสที่เติมไว้หน้าเข้าสู่ระบบ)
    api('/api/me').then((d) => { me = d.employee; store.set('emp_profile', me); store.set('last_emp_code', me.emp_code); authLayout(false); }).catch(() => {});
  } else {
    renderLogin();
  }

  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
