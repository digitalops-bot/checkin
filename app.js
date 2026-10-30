// แอปพนักงาน: สมัคร / เข้าสู่ระบบ / เช็คอิน / เช็คเอ้าท์ / ขอ OT / ประวัติ
(() => {
  // ---------- รองรับกล้องทุกอุปกรณ์ ----------
  // เบราว์เซอร์ในแอป (LINE / Facebook / Messenger / Instagram ฯลฯ) บน iPhone ไม่ให้เว็บใช้กล้อง
  const UA = navigator.userAgent || '';
  const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IN_APP = /\bLine\//i.test(UA) ? 'LINE' : /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(UA) ? 'Facebook/Messenger'
    : /Instagram/i.test(UA) ? 'Instagram' : /musical_ly|TikTok|BytedanceWebview/i.test(UA) ? 'TikTok'
      : /MicroMessenger/i.test(UA) ? 'WeChat' : /KAKAOTALK/i.test(UA) ? 'KakaoTalk' : '';
  // LINE: เติม ?openExternalBrowser=1 แล้ว LINE จะเปิดลิงก์ใน Safari/Chrome ให้เอง
  if (IN_APP === 'LINE' && !/[?&]openExternalBrowser=1/.test(location.search)) {
    location.replace(`${location.pathname}${location.search ? `${location.search}&` : '?'}openExternalBrowser=1${location.hash}`);
    return;
  }
  // เบราว์เซอร์รุ่นเก่า: ใช้ getUserMedia แบบเดิมแทน
  try {
    if (!navigator.mediaDevices) navigator.mediaDevices = {};
    if (!navigator.mediaDevices.getUserMedia) {
      const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (legacy) navigator.mediaDevices.getUserMedia = (c) => new Promise((res, rej) => legacy.call(navigator, c, res, rej));
    }
  } catch { /* เบราว์เซอร์ไม่ให้แก้ */ }
  const hasCameraApi = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const IOS_VER = (() => { const m = /OS (\d+)_(\d+)/.exec(UA); return m ? Number(m[1]) + Number(m[2]) / 100 : 0; })();
  const IOS_OTHER = IS_IOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA) ? (/CriOS/.test(UA) ? 'Chrome' : /FxiOS/.test(UA) ? 'Firefox' : /EdgiOS/.test(UA) ? 'Edge' : 'Opera') : '';
  const IOS_STANDALONE = IS_IOS && navigator.standalone === true; // เปิดจากไอคอนบนหน้าจอหลัก
  // หน้าเว็บที่เปิดในแอปอื่น (Telegram, Gmail ฯลฯ) หน้าตาเหมือน Safari แต่ไม่มีคำว่า Safari ใน UA
  const IOS_WEBVIEW = IS_IOS && !IN_APP && !IOS_OTHER && !IOS_STANDALONE && !/Safari\//.test(UA);
  // สาเหตุที่เว็บใช้กล้องไม่ได้ (บอกให้ตรงกับเครื่องจริง ไม่บอก "เปิดใน Safari" กับคนที่อยู่ใน Safari แล้ว)
  function noCamReason() {
    const v = IOS_VER ? ` (iOS ${IOS_VER.toFixed(2).replace(/\.?0+$/, '')})` : '';
    if (IN_APP) return { text: `คุณเปิดลิงก์จากในแอป ${IN_APP} ซึ่งไม่อนุญาตให้เว็บใช้กล้อง`, fix: 'browser' };
    if (IOS_OTHER) return { text: `${IOS_OTHER} บน iPhone เครื่องนี้${v} ใช้กล้องในเว็บไม่ได้ (ต้องเป็น iOS 14.3 ขึ้นไป)`, fix: 'browser' };
    if (IOS_STANDALONE) return { text: `เปิดจากไอคอนบนหน้าจอหลัก ซึ่ง iPhone เครื่องนี้${v} ไม่ให้ใช้กล้องในโหมดนี้`, fix: 'safari-app' };
    if (IOS_WEBVIEW) return { text: 'หน้านี้เปิดอยู่ในแอปอื่น (เช่น Telegram, Gmail, Facebook) ไม่ใช่ Safari โดยตรง แม้หน้าตาจะคล้าย Safari', fix: 'browser' };
    if (IS_IOS && IOS_VER && IOS_VER < 11) return { text: `iPhone เครื่องนี้${v} เก่าเกินไป Safari ใช้กล้องในเว็บได้ตั้งแต่ iOS 11`, fix: 'update' };
    if (IS_IOS) return { text: `Safari ในเครื่องนี้${v} ถูกตั้งค่าปิดกล้องสำหรับเว็บไว้ (เช่น เวลาหน้าจอ หรือโหมดล็อกดาวน์)`, fix: 'ios-settings' };
    return { text: 'เบราว์เซอร์นี้ไม่อนุญาตให้เว็บใช้กล้อง', fix: 'browser' };
  }
  const deviceOs = () => (IS_IOS ? `iPhone/iPad iOS ${(/OS (\d+)_(\d+)/.exec(UA) || []).slice(1).join('.') || '?'}` : (/Android ([\d.]+)/.exec(UA) || [])[1] ? `Android ${(/Android ([\d.]+)/.exec(UA) || [])[1]}` : 'คอมพิวเตอร์/อื่นๆ');
  const deviceBrowser = () => (IN_APP ? `ในแอป ${IN_APP}` : /CriOS|Chrome\//.test(UA) && !/Edg|SamsungBrowser|OPR/.test(UA) ? 'Chrome' : /SamsungBrowser/.test(UA) ? 'Samsung Internet' : /FxiOS|Firefox/.test(UA) ? 'Firefox' : /EdgiOS|Edg\//.test(UA) ? 'Edge' : /Safari/.test(UA) ? 'Safari' : 'อื่นๆ');
  const deviceSummary = () => {
    const model = (/Android [\d.]+; ([^;)]+?)(?: Build|\))/.exec(UA) || [])[1] || '';
    const ver = (/(?:CriOS|Chrome|FxiOS|Firefox|EdgiOS|Edg|SamsungBrowser|Version)\/(\d+)/.exec(UA) || [])[1] || '';
    const pwa = window.matchMedia?.('(display-mode: standalone)').matches ? ' · แอปบนหน้าจอหลัก' : '';
    return `${deviceOs()}${model && model !== 'K' ? ` (${model.trim()})` : ''} · ${deviceBrowser()}${ver ? ` ${ver}` : ''}${pwa} · จอ ${screen.width}×${screen.height}`;
  };

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

  async function api(url, body, method) {
    const { status, data } = await Backend.request(method || (body ? 'POST' : 'GET'), url, { body, token });
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
    password: (v) => (!v ? 'กรุณาตั้งรหัสผ่าน' : /\s/.test(v) ? 'ห้ามเว้นวรรค' : !/^[!-~]+$/.test(v) ? 'ห้ามภาษาไทย ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข สัญลักษณ์' : v.length >= 6 ? '' : 'อย่างน้อย 6 ตัว'),
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
    if (!me.avatar) api('/api/me').then((d) => { me = d.employee; store.set('emp_profile', me); refreshWho(); }).catch(() => {});
  }
  function signOut(msg) {
    stopGps();
    clearInterval(liveTimer);
    clearInterval(beatTimer);
    document.querySelector('.scanner .scan-x')?.click();
    token = null;
    me = null;
    document.getElementById('bellBtn')?.setAttribute('hidden', '');
    notifAutoShown = false;
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
      <div class="auth-alt"><span class="muted">ยังไม่มีบัญชี?</span><button class="btn ghost big" id="reg">ลงทะเบียนครั้งแรก</button></div>
      ${helpLink('pbLogin', 'เข้าสู่ระบบไม่ได้ / พบปัญหา? แจ้งผู้ดูแล')}`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('reg').onclick = renderRegister;
    document.getElementById('pbLogin').onclick = () => openProblemForm('login', { emp_code: f.emp_code.value });
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
        ${cameraBanner()}
        <div class="field av-field"><span class="field-label">รูปโปรไฟล์ <b class="bad">*</b></span>
          <button type="button" class="av-pick" id="avPick"><span class="avatar xl" id="avCircle">📷</span>
            <span><b id="avPickTxt">แตะเพื่อถ่ายรูปโปรไฟล์</b><small>ถ่ายจากกล้องหน้า หน้าตรง เห็นหน้าชัด ใช้แสดงในระบบ</small></span></button>
          <em class="err" id="avErr" hidden>กรุณาถ่ายรูปโปรไฟล์</em></div>
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
      </form>
      ${helpLink('pbReg', 'สมัครไม่ได้ / พบปัญหา? แจ้งผู้ดูแล')}`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('back').onclick = renderLogin;
    document.getElementById('pbReg').onclick = () => openProblemForm('register', {
      emp_code: f.emp_code.value, name: `${f.first_name.value} ${f.last_name.value}`.trim(), contact: f.phone.value, category: 'สมัครสมาชิก/ลงทะเบียน',
    });
    let avatarData = '';
    document.getElementById('avPick').onclick = async () => {
      const a = await captureAvatar();
      if (!a) return;
      avatarData = a;
      document.getElementById('avCircle').outerHTML = `<img class="avatar xl" id="avCircle" src="${a}" alt="">`;
      document.getElementById('avPickTxt').textContent = 'ถ่ายใหม่';
      document.getElementById('avErr').hidden = true;
      document.getElementById('avPick').classList.remove('invalid');
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = {
        emp_code: f.emp_code.value.trim(),
        title: f.title.value,
        first_name: f.first_name.value.trim(),
        last_name: f.last_name.value.trim(),
        phone: f.phone.value.trim(),
        password: f.password.value,
        avatar: avatarData,
      };
      let ok = true;
      if (!avatarData) { document.getElementById('avErr').hidden = false; document.getElementById('avPick').classList.add('invalid'); ok = false; }
      for (const k of ['emp_code', 'first_name', 'last_name', 'phone', 'password']) ok = setErr(f[k], RULES[k](d[k])) && ok;
      ok = setErr(f.password2, f.password2.value === d.password ? '' : 'รหัสผ่านไม่ตรงกัน') && ok;
      const seg = f.querySelector('.seg');
      ok = setErr(seg.querySelector('input'), d.title ? '' : 'กรุณาเลือกคำนำหน้า') && ok;
      if (!ok) { f.querySelector('.invalid')?.focus(); f.querySelector('.invalid')?.scrollIntoView({ block: 'center' }); return toast('กรุณาตรวจสอบข้อมูลที่ทำเครื่องหมายสีแดง', true); }
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
      </div>
      ${helpLink('pbPend', 'รอนานเกินไป / พบปัญหา? แจ้งผู้ดูแล')}`;
    document.getElementById('toLogin').onclick = renderLogin;
    document.getElementById('pbPend').onclick = () => openProblemForm('pending', { emp_code: emp.emp_code, name: emp.name, contact: emp.phone, category: 'สมัครสมาชิก/ลงทะเบียน' });
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
      </form>
      ${helpLink('pbForgotPw', 'ยืนยันตัวตนไม่ผ่าน / จำเบอร์ไม่ได้? แจ้งผู้ดูแล')}`;
    const f = document.getElementById('f');
    bindInputs(f);
    document.getElementById('back').onclick = renderLogin;
    document.getElementById('pbForgotPw').onclick = () => openProblemForm('login', { emp_code: f.emp_code.value, category: 'เข้าสู่ระบบ/รหัสผ่าน' });
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
  let cpuDetectorPromise = null;
  const makeDetector = async (delegate) => {
    const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    return vision.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate }, runningMode: 'VIDEO', minDetectionConfidence: 0.5,
    });
  };
  // cpu = true: ใช้เมื่อโหมด GPU ของเครื่องนั้นตรวจหน้าไม่เจอ
  function loadFaceDetector(cpu) {
    if (cpu) {
      if (!cpuDetectorPromise) cpuDetectorPromise = makeDetector('CPU').catch((e) => { cpuDetectorPromise = null; throw e; });
      return cpuDetectorPromise;
    }
    if (!detectorPromise) {
      detectorPromise = makeDetector('GPU').catch(() => makeDetector('CPU')).catch((e) => { detectorPromise = null; throw e; });
    }
    return detectorPromise;
  }
  // เปิดกล้องหน้า: ลองตั้งค่าละเอียดก่อน ถ้าเครื่องรุ่นเก่าไม่รองรับ ค่อยลดเงื่อนไขลง
  async function openCamera() {
    if (!hasCameraApi()) throw Object.assign(new Error('อุปกรณ์นี้ไม่รองรับกล้อง'), { name: 'NoCameraApi' });
    const tries = [
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
      { video: { facingMode: 'user' }, audio: false },
      { video: true, audio: false },
    ];
    let last;
    for (const c of tries) {
      try { return await navigator.mediaDevices.getUserMedia(c); } catch (e) {
        last = e;
        lastCamErr = e;
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break; // ไม่ได้อนุญาต ลองซ้ำไม่ช่วย
      }
    }
    throw last;
  }
  // จัดการเมื่อเปิดกล้องไม่ได้: บอกสาเหตุและวิธีแก้ให้ชัด
  function cameraError(e) {
    if (e && (e.name === 'NoCameraApi' || ((IN_APP || IOS_WEBVIEW) && e.name === 'NotAllowedError'))) return showCameraHelp();
    if (e && e.name === 'NotAllowedError') return toast('ไม่ได้อนุญาตให้ใช้กล้อง กรุณาเปิดสิทธิ์กล้องให้แอปนี้ในการตั้งค่า', true);
    if (e && e.name === 'NotReadableError') return toast('กล้องถูกแอปอื่นใช้อยู่ กรุณาปิดแอปกล้อง/วิดีโอคอลแล้วลองใหม่', true);
    if (e && e.name === 'NotFoundError') return toast('ไม่พบกล้องในอุปกรณ์นี้', true);
    return toast('เปิดกล้องไม่ได้ กรุณาลองใหม่', true);
  }
  const appUrl = () => `${location.origin}${location.pathname}`;
  function showCameraHelp(nativeGo) {
    const why = noCamReason();
    const steps = why.fix === 'ios-settings'
      ? `<li>ถ้าเปิดลิงก์มาจาก<b>แอปอื่น</b> (Telegram, LINE, Gmail, Facebook) หน้าอาจดูเหมือน Safari แต่ไม่ใช่ → กด <b>คัดลอกลิงก์</b> ด้านล่าง แล้วเปิด<b>แอป Safari</b> (เข็มทิศสีฟ้า) วางลิงก์</li>
         <li><b>ตั้งค่า → เวลาหน้าจอ → ข้อจำกัดเนื้อหาและความเป็นส่วนตัว → แอปที่อนุญาต</b> → เปิด <b>"กล้อง"</b> (ถ้าปิดอยู่ เว็บจะใช้กล้องไม่ได้เลย)</li>
         <li><b>ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → โหมดล็อกดาวน์</b> → ถ้าเปิดอยู่ ให้ปิด หรือยกเว้นเว็บไซต์นี้</li>
         <li><b>ตั้งค่า → Safari → กล้อง</b> → เลือก <b>"ถาม"</b> หรือ <b>"อนุญาต"</b> แล้วกด ⟳ มุมขวาบน</li>
         <li>ปิดแท็บนี้ ปิด-เปิดเครื่องใหม่ แล้วเปิดลิงก์ใน Safari อีกครั้ง</li>`
      : why.fix === 'safari-app'
        ? `<li>เปิด<b>แอป Safari</b> (เข็มทิศสีฟ้า) แทนการกดไอคอนบนหน้าจอหลัก</li>
           <li>กด <b>คัดลอกลิงก์</b> ด้านล่าง แล้ววางในช่องที่อยู่ของ Safari → เข้าสู่ระบบ</li>
           <li>หรืออัปเดต iPhone (ตั้งค่า → ทั่วไป → รายการอัปเดตซอฟต์แวร์) แล้วใช้ไอคอนบนหน้าจอหลักได้ตามเดิม</li>`
        : why.fix === 'update'
          ? '<li>อัปเดต iPhone: <b>ตั้งค่า → ทั่วไป → รายการอัปเดตซอฟต์แวร์</b></li><li>ถ้าอัปเดตไม่ได้ ใช้ปุ่มถ่ายรูปด้วยกล้องของเครื่องด้านล่างแทน</li>'
          : IS_IOS
            ? `<li>${IOS_OTHER ? 'กด <b>คัดลอกลิงก์</b> ด้านล่าง → เปิดแอป <b>Safari</b> (เข็มทิศสีฟ้า) → วางลิงก์ในช่องที่อยู่ → เข้าสู่ระบบ' : 'กดปุ่ม <b>⋯</b> หรือ <b>⤴︎</b> หรือไอคอน <b>เข็มทิศ</b> (มุมขวาบน/ล่าง) → เลือก <b>"เปิดใน Safari"</b> (Open in Safari / Open in Browser)'}</li>
               <li>หรือกด <b>คัดลอกลิงก์</b> ด้านล่าง แล้วเปิดแอป <b>Safari</b> วางลิงก์ในช่องที่อยู่</li>
               <li>หรืออัปเดต iPhone และแอปที่ใช้อยู่ แล้วลองใหม่ <b>แนะนำใช้ Safari</b></li>`
            : `<li>กดปุ่ม <b>⋮</b> มุมขวาบน → เลือก <b>"เปิดใน Chrome"</b> (Open in browser) หรือกดปุ่มด้านล่าง</li>
               <li>หรือกด <b>คัดลอกลิงก์</b> แล้วเปิดแอป <b>Chrome</b> วางลิงก์ในช่องที่อยู่</li>`;
    const el = openSheet(`
      <h2 class="sheet-title">เปิดกล้องในหน้าเว็บไม่ได้</h2>
      <p class="muted">${esc(why.text)}</p>
      ${nativeGo ? '<div class="native-box"><b>📷 ลงเวลาได้เลยตอนนี้</b><p>ใช้กล้องของมือถือถ่ายรูปหน้าตรงแทน ระบบประทับเวลาจริงและพิกัดให้เหมือนเดิม (ผู้ดูแลจะตรวจรูปนี้)</p><button class="btn primary big" id="nativeGo">📷 ถ่ายรูปด้วยกล้องของเครื่อง</button></div><b class="cam-help-sub">หรือแก้ให้สแกนในหน้าเว็บได้ตามปกติ:</b>' : ''}
      <ol class="cam-help">${steps}</ol>
      <div class="cam-help-actions">
        ${!IS_IOS && /Android/i.test(UA) ? `<a class="btn primary" href="intent://${esc(location.host + location.pathname)}#Intent;scheme=https;package=com.android.chrome;end">เปิดใน Chrome</a>` : ''}
        <button class="btn ${IS_IOS ? 'primary' : 'ghost'}" id="copyAppUrl">คัดลอกลิงก์</button>
        <button class="btn ghost" data-close>ปิด</button>
      </div>
      ${!IS_IOS || IOS_VER >= 13.4 ? '<p class="hint">เปิดใน Safari/Chrome แล้วกด "เพิ่มลงในหน้าจอหลัก" ครั้งต่อไปเปิดจากไอคอนได้เลย</p>' : ''}
      ${token && !nativeGo ? '<button class="btn ghost big" id="camToForgot">📝 สแกนไม่ได้ตอนนี้? ขอบันทึกเวลา (แนบรูปใบลงเวลา)</button>' : ''}
      <button class="btn ghost big" id="camToProblem" style="margin-top:8px">📤 ทำตามแล้วยังไม่ได้? ส่งข้อมูลเครื่องให้ผู้ดูแล</button>
      <p class="hint pb-dev">ข้อมูลเครื่อง (ถ่ายภาพหน้าจอส่งผู้ดูแลได้): ${esc(deviceSummary())} · กล้องเว็บ ${hasCameraApi() ? 'มี' : 'ไม่มี'} · ${IOS_STANDALONE ? 'ไอคอนหน้าจอหลัก' : IOS_WEBVIEW ? 'ในแอปอื่น' : 'เบราว์เซอร์'} · ${window.isSecureContext ? 'https' : 'ไม่ปลอดภัย'}</p>`);
    el.querySelector('#nativeGo')?.addEventListener('click', nativeGo || (() => {}));
    el.querySelector('#camToProblem').onclick = () => sendCamDiag(why.text);
    el.querySelector('#camToForgot')?.addEventListener('click', () => { closeSheet(); renderForgotScan(); });
    el.querySelector('#copyAppUrl').onclick = async () => {
      try { await navigator.clipboard.writeText(appUrl()); toast('คัดลอกลิงก์แล้ว นำไปวางใน ' + (IS_IOS ? 'Safari' : 'Chrome')); }
      catch { prompt('คัดลอกลิงก์นี้ไปเปิดใน ' + (IS_IOS ? 'Safari' : 'Chrome'), appUrl()); }
    };
  }
  // แถบเตือนล่วงหน้า (ก่อนกดสแกน/ถ่ายรูป) ถ้าเบราว์เซอร์นี้ใช้กล้องไม่ได้
  const cameraBanner = () => ((IN_APP && IS_IOS) || !hasCameraApi()
    ? `<div class="cam-warn">⚠ ${esc(noCamReason().text)}${token ? ' · ยังลงเวลาได้ด้วยการถ่ายรูปจากกล้องของเครื่อง' : ''} <button type="button" class="linkbtn" data-cam-help>วิธีแก้</button></div>`
    : '');
  document.addEventListener('click', (e) => { if (e.target.closest('[data-cam-help]')) showCameraHelp(); });

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

  const avatarHtml = (cls = '') => (me.avatar
    ? `<img class="avatar ${cls}" src="${esc(me.avatar)}" alt="" draggable="false">`
    : `<span class="avatar ${cls}">${esc(me.first_name.slice(0, 1))}</span>`);
  const whoChip = () => `<div class="who">${avatarHtml()}<div><b>${esc(me.name)}</b><small>รหัส ${esc(me.emp_code)}</small>
    ${me.avatar ? '' : '<button type="button" class="linkbtn" data-add-avatar>+ เพิ่มรูปโปรไฟล์</button>'}</div></div>`;
  function refreshWho() {
    document.querySelectorAll('.who').forEach((w) => { if (w.querySelector('.avatar')) w.outerHTML = whoChip(); });
    const b = document.getElementById('chAvatar');
    if (b) b.textContent = me.avatar ? 'เปลี่ยนรูปโปรไฟล์' : 'ถ่ายรูปโปรไฟล์';
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-add-avatar]')) changeAvatar(); });

  // เปลี่ยนรูปโปรไฟล์: รูปใหม่เขียนทับรูปเก่า (รูปเก่าถูกลบ)
  async function changeAvatar() {
    const a = await captureAvatar();
    if (!a) return;
    try {
      const r = await api('/api/me/avatar', { avatar: a }, 'PUT');
      me = { ...me, avatar: r.avatar };
      store.set('emp_profile', me);
      refreshWho();
      toast('บันทึกรูปโปรไฟล์แล้ว');
    } catch (err) { toast(err.message, true); }
  }

  // ถ่ายรูปโปรไฟล์จากกล้องหน้า (ไม่มีเลือกจากคลังรูป) · ได้รูปสี่เหลี่ยมจัตุรัส 320px แบบกระจก
  function captureAvatar() {
    if (!hasCameraApi()) {
      toast('เบราว์เซอร์นี้เปิดกล้องไม่ได้ เลือกรูปหน้าตรงจากเครื่อง หรือถ่ายรูปแทน');
      return pickAvatarFile();
    }
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'scanner avatar-cam';
      ov.innerHTML = `
        <div class="scan-top"><b>ถ่ายรูปโปรไฟล์</b><button class="scan-x" type="button">ยกเลิก</button></div>
        <div class="scan-stage"><video playsinline muted autoplay></video><div class="av-ring"></div><img class="av-preview" alt="" hidden></div>
        <div class="scan-status" id="avSt">กำลังเปิดกล้อง…</div>
        <div class="av-actions">
          <button class="btn primary big" id="avShot" type="button" disabled>📸 ถ่ายรูป</button>
          <button class="btn ghost big" id="avRetake" type="button" hidden>ถ่ายใหม่</button>
          <button class="btn primary big" id="avUse" type="button" hidden>ใช้รูปนี้</button>
        </div>
        <div class="av-fallback" id="avFallback" hidden>
          <p id="avFbMsg"></p>
          <button class="btn primary big" id="avPickFile" type="button">🖼️ เลือกรูปจากเครื่องแทน</button>
          <button class="btn ghost big" id="avRetry" type="button">ลองเปิดกล้องอีกครั้ง</button>
        </div>`;
      document.body.appendChild(ov);
      document.body.classList.add('scanning');
      const video = ov.querySelector('video');
      const st = ov.querySelector('#avSt');
      const shot = ov.querySelector('#avShot');
      const retake = ov.querySelector('#avRetake');
      const use = ov.querySelector('#avUse');
      const preview = ov.querySelector('.av-preview');
      let stream = null;
      let timer = 0;
      let detector = null;
      let face = null;
      let result = '';
      const finish = (val) => {
        clearInterval(timer);
        stream?.getTracks().forEach((t) => t.stop());
        ov.remove();
        document.body.classList.remove('scanning');
        resolve(val);
      };
      ov.querySelector('.scan-x').onclick = () => finish(null);
      // เปิดกล้องไม่ได้: ให้เลือกรูปจากเครื่องแทน (กดปุ่มเอง เพื่อให้เบราว์เซอร์ยอมเปิดหน้าเลือกไฟล์)
      const showFallback = (msg) => {
        clearInterval(timer);
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        ov.querySelector('.av-actions').hidden = true;
        ov.querySelector('#avFbMsg').textContent = msg;
        ov.querySelector('#avFallback').hidden = false;
        st.textContent = 'เปิดกล้องไม่ได้';
      };
      ov.querySelector('#avPickFile').onclick = async () => { const a = await pickAvatarFile(); if (a) finish(a); };
      ov.querySelector('#avRetry').onclick = () => {
        ov.querySelector('#avFallback').hidden = true;
        ov.querySelector('.av-actions').hidden = false;
        start();
      };
      let startedAt = 0;

      const watch = () => {
        clearInterval(timer);
        startedAt = Date.now();
        timer = setInterval(() => {
          if (!preview.hidden) return;
          // กล้องไม่ส่งภาพภายใน 10 วินาที
          if (!video.videoWidth) { if (Date.now() - startedAt > 10000) showFallback('กล้องไม่ส่งภาพ (อาจถูกแอปอื่นใช้อยู่) ปิดแอปกล้อง/วิดีโอคอลแล้วลองใหม่ หรือเลือกรูปจากเครื่องแทน'); return; }
          // บางรุ่นระบบจับหน้าไม่ได้: เกิน 8 วินาทีให้กดถ่ายได้เลย
          if (detector && Date.now() - startedAt > 8000 && shot.disabled) { shot.disabled = false; st.textContent = 'ถ้าระบบจับหน้าไม่ได้ กดถ่ายรูปได้เลย (หน้าตรง ให้หน้าอยู่ในวงกลม)'; return; }
          if (detector && Date.now() - startedAt > 8000) return;
          if (!detector) { shot.disabled = false; st.textContent = 'หน้าตรง ให้หน้าอยู่ในวงกลม แล้วกดถ่ายรูป'; return; }
          try {
            const faces = (detector.detectForVideo(video, performance.now()).detections || []).filter((d) => (d.categories?.[0]?.score ?? 0) >= 0.5);
            face = faces.length === 1 ? faces[0].boundingBox : null;
            const small = face && face.width / Math.min(video.videoWidth, video.videoHeight) < 0.2;
            shot.disabled = !face || small;
            st.textContent = faces.length > 1 ? 'พบหลายใบหน้า ให้มีเพียงคุณคนเดียว'
              : !face ? 'ยังไม่เจอใบหน้า หันหน้าตรงเข้ากล้อง ในที่มีแสงสว่าง'
              : small ? 'ขยับมือถือเข้าใกล้อีกนิด' : 'พร้อมแล้ว กดถ่ายรูปได้เลย';
          } catch { shot.disabled = false; }
        }, 200);
      };
      shot.onclick = () => {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        // ครอปสี่เหลี่ยมรอบใบหน้า (ถ้าตรวจเจอ) ไม่งั้นใช้กลางภาพ
        let side = Math.min(vw, vh) * 0.85;
        let cx = vw / 2;
        let cy = vh / 2;
        if (face) { side = Math.min(Math.min(vw, vh), face.width * 2.2); cx = face.originX + face.width / 2; cy = face.originY + face.height / 2; }
        const sx = Math.max(0, Math.min(vw - side, cx - side / 2));
        const sy = Math.max(0, Math.min(vh - side, cy - side / 2));
        const c = document.createElement('canvas');
        c.width = c.height = 320;
        const g = c.getContext('2d');
        g.translate(320, 0);
        g.scale(-1, 1);
        g.drawImage(video, sx, sy, side, side, 0, 0, 320, 320);
        let q = 0.85;
        result = c.toDataURL('image/jpeg', q);
        while (result.length > 38000 && q > 0.4) { q -= 0.1; result = c.toDataURL('image/jpeg', q); }
        preview.src = result;
        preview.hidden = false;
        shot.hidden = true;
        retake.hidden = false;
        use.hidden = false;
        st.textContent = 'รูปนี้ใช้ได้ไหม?';
      };
      retake.onclick = () => { preview.hidden = true; shot.hidden = false; retake.hidden = true; use.hidden = true; st.textContent = 'หน้าตรง ให้หน้าอยู่ในวงกลม แล้วกดถ่ายรูป'; };
      use.onclick = () => finish(result);

      const start = async () => {
        st.textContent = 'กำลังเปิดกล้อง…';
        try {
          stream = await openCamera();
        } catch (e) {
          if (!ov.isConnected) return;
          if (e && e.name === 'NotAllowedError') return showFallback(IN_APP ? `แอป ${IN_APP} ไม่อนุญาตให้ใช้กล้อง เลือกรูปจากเครื่องแทน หรือเปิดลิงก์ใน ${IS_IOS ? 'Safari' : 'Chrome'}` : 'ไม่ได้อนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในการตั้งค่าแล้วลองใหม่ หรือเลือกรูปจากเครื่องแทน');
          if (e && e.name === 'NotReadableError') return showFallback('กล้องถูกแอปอื่นใช้อยู่ ปิดแอปกล้อง/วิดีโอคอลแล้วลองใหม่ หรือเลือกรูปจากเครื่องแทน');
          return showFallback('เปิดกล้องไม่ได้ เลือกรูปจากเครื่องแทน');
        }
        if (!ov.isConnected) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (VIRTUAL_CAM_RE.test(stream.getVideoTracks()[0]?.label || '')) { finish(null); return toast('ไม่อนุญาตให้ใช้กล้องเสมือน', true); }
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.srcObject = stream;
        video.play().catch(() => {});
        st.textContent = 'กำลังเตรียมกล้อง…';
        if (!detector) { try { detector = await withTimeout(loadFaceDetector(), 10000); } catch { detector = null; } }
        if (ov.isConnected) watch();
      };
      start();
    });
  }


  // ---------- Check-in / Check-out ----------
  let liveTimer = null;
  // หน้าลงเวลา: สแกนครั้งแรก = เข้างาน, ครั้งที่สอง = ออกงาน (ระบบกำหนดให้ เลือกเองไม่ได้ กันเข้างานซ้ำ)
  let scanStatus = null;
  async function renderScan() {
    view.innerHTML = '<h1 class="screen-title"><span class="dot"></span>ลงเวลา</h1><div class="card empty">กำลังตรวจสอบว่าครั้งนี้เป็นเข้างานหรือออกงาน…</div>';
    try { scanStatus = await api('/api/me/scan-status'); } catch { scanStatus = { next: 'in', last: null, reason: 'offline' }; }
    if (current !== 'scan') return;
    renderAttendance(scanStatus.next);
  }
  function scanBanner(mode) {
    const st = scanStatus || {};
    const last = st.last;
    const when = last ? `${last.work_date !== today() ? `${thDate(last.work_date)} ` : ''}${last.time} น.` : '';
    let text;
    if (mode === 'out' && st.reason === 'recent_checkout') text = `ออกงานแล้วเมื่อ <b>${esc(when)}</b> · สแกนอีกครั้งจะ<b>อัปเดตเวลาออกงาน</b>`;
    else if (mode === 'out') text = `เข้างานแล้วเมื่อ <b>${esc(when)}</b> · ครั้งนี้คือ <b>สแกนออกงาน</b>`;
    else if (st.reason === 'stale_checkin') text = `มีการเข้างานเมื่อ ${esc(when)} ที่ไม่ได้สแกนออก (เกิน 18 ชม.) · ครั้งนี้นับเป็น<b>เข้างานใหม่</b> · ถ้าลืมสแกนออก ยื่นคำร้องได้ที่ปฏิทิน`;
    else text = 'ยังไม่ได้สแกนเข้างาน · ครั้งนี้คือ <b>สแกนเข้างาน</b>';
    return `<div class="scan-banner ${mode}">${text}</div>`;
  }

  function renderAttendance(mode) {
    const isIn = mode === 'in';
    const label = isIn ? 'เช็คอิน' : 'เช็คเอ้าท์';
    view.innerHTML = `
      <h1 class="screen-title ${mode}"><span class="dot"></span>ลงเวลา · ${isIn ? 'เข้างาน' : 'ออกงาน'}</h1>
      <div class="card">
        ${whoChip()}
        ${cameraBanner()}
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
        <p class="hint">กดแล้วมองตรงเข้ากล้อง ค้างไว้นิ่งๆ 5 วินาที (ไม่ต้องขยับหน้า) ระบบจะถ่ายรูปพร้อมประทับเวลาจริง พิกัด และสถานที่ทำงานให้อัตโนมัติ</p>
        <div class="req-entries">
          <button type="button" class="btn ghost fr-entry" id="frEntryScan">📝 ลืมสแกน<small>ทำงานจริงแต่ลืมสแกน</small></button>
          <button type="button" class="btn ghost fr-entry" id="apEntryScan">🏳️ ยื่นคำร้อง<small>หยุดตามคำสั่ง / ลา / มาสาย</small></button>
        </div>
        <p class="hint warn-hint">⚠ ห้ามใช้แอปจำลองตำแหน่ง (Fake GPS) ระบบตรวจจับพิกัดปลอมและรายงานผู้ดูแลพร้อมหลักฐานทุกครั้ง</p>
      </div>
      ${helpLink('pbScan', 'ใช้งานไม่ได้ / พบปัญหา? แจ้งผู้ดูแล')}`;
    document.getElementById('pbScan').onclick = () => openProblemForm('app');

    document.getElementById('frEntryScan').onclick = () => renderForgotScan();
    document.getElementById('apEntryScan').onclick = () => renderAppeals();
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
      if (!hasCameraApi()) return showCameraHelp(() => runNativeScan(mode, choice));
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
      if (!permWatch[name]) { permWatch[name] = true; st.onchange = () => { if (current === 'scan') renderScan(); }; }
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
      renderScan();
      return;
    }
    if (btn) busy(btn, false);
    // เบราว์เซอร์ในแอป/ไม่รองรับกล้อง: เปิดสิทธิ์ในตั้งค่าไม่ช่วย ต้องเปิดใน Safari/Chrome
    if (!hasCameraApi() || ((IN_APP || IOS_WEBVIEW) && !camOk)) return showCameraHelp();
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
    if (current === 'scan') renderScan();
  }
  function openPermGuide() {
    const ios = IS_IOS;
    const iosChrome = IS_IOS && /CriOS/.test(UA);
    const gIosChrome = `<div class="guide${iosChrome ? ' first' : ''}"><b>🍎 iPhone (Chrome)</b><ol>
        <li>ออกจาก Chrome ไปที่แอป <b>ตั้งค่า</b> ของ iPhone (ไอคอนเฟือง) → เลื่อนลงล่างสุดหา <b>"Chrome"</b> (iOS 18: ตั้งค่า → แอป → Chrome)</li>
        <li>เปิด <b>กล้อง</b> ให้เป็นสีเขียว · <b>ตำแหน่ง</b> → <b>"ขณะใช้แอป"</b> และเปิด <b>"ตำแหน่งที่แน่นอน"</b></li>
        <li>กลับมาที่ Chrome กด <b>⟳</b> มุมขวาบนของแอปลงเวลา → กดสแกน → ถ้าขึ้นถามให้กด <b>"อนุญาต"</b></li>
        <li>ถ้าไม่มีคำว่า "กล้อง" ในหน้าตั้งค่า Chrome แปลว่า Chrome ยังไม่เคยขอกล้อง → กดสแกนใน Chrome 1 ครั้งก่อน แล้วกลับมาดูใหม่</li>
      </ol></div>`;
    const gDevice = ios ? `<div class="guide"><b>⚠ ถ้า Safari และ Chrome เปิดกล้องไม่ได้ทั้งคู่</b><ol>
        <li>ลองเปิดแอป <b>กล้อง</b> ของ iPhone ว่าใช้ได้ไหม ถ้าไม่มีแอปกล้องหรือเปิดไม่ได้ = กล้องถูกล็อกที่ตัวเครื่อง</li>
        <li><b>ตั้งค่า → เวลาหน้าจอ → ข้อจำกัดเนื้อหาและความเป็นส่วนตัว → แอปที่อนุญาต</b> → เปิด <b>"กล้อง"</b></li>
        <li><b>ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → โหมดล็อกดาวน์</b> → ปิด</li>
        <li>ปิดแอปที่ใช้กล้องอยู่ (วิดีโอคอล, LINE, Facebook) แล้วปิด-เปิดเครื่องใหม่</li>
        <li>มือถือของบริษัทที่มีการจัดการอุปกรณ์ (MDM) อาจถูกล็อกกล้องไว้ ต้องให้ฝ่าย IT ปลดล็อก</li>
      </ol></div>` : '';
    openSheet(`
      <h2 class="sheet-title">ตั้งให้อนุญาตตำแหน่งและกล้องตลอด</h2>
      <p class="hint" style="margin-top:0">ตั้งครั้งเดียว มือถือจะไม่ถามสิทธิ์ซ้ำทุกครั้งที่สแกน · ต้องเปิด GPS ของมือถือไว้ด้วย</p>
      ${iosChrome ? gIosChrome : ''}
      <div class="guide ${ios ? '' : 'first'}"><b>📱 Android (Chrome)</b><ol>
        <li>แตะไอคอน <b>🔒 หรือ ⓘ</b> หน้าช่องที่อยู่เว็บด้านบน → <b>สิทธิ์ (Permissions)</b></li>
        <li><b>ตำแหน่ง</b> → <b>อนุญาต</b> · <b>กล้อง</b> → <b>อนุญาต</b></li>
        <li>ถ้าติดตั้งแอปไว้ที่หน้าจอหลัก: <b>ตั้งค่ามือถือ → แอป → Chrome → สิทธิ์</b> → ตำแหน่ง <b>"อนุญาตขณะใช้แอป"</b> และเปิด <b>"ใช้ตำแหน่งที่แม่นยำ"</b>, กล้อง <b>"อนุญาตขณะใช้แอป"</b></li>
      </ol></div>
      <div class="guide ${ios && !iosChrome ? 'first' : ''}"><b>🍎 iPhone (Safari)</b><ol>
        <li><b>ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → บริการหาตำแหน่ง</b> → เปิด → <b>เว็บไซต์ Safari</b> → <b>"ขณะใช้แอป"</b> และเปิด <b>"ตำแหน่งที่แน่นอน"</b></li>
        <li><b>ตั้งค่า → Safari</b> (iOS 18: ตั้งค่า → แอป → Safari) → เลื่อนลงที่ "การตั้งค่าสำหรับเว็บไซต์" → <b>กล้อง: อนุญาต</b> และ <b>ตำแหน่ง: อนุญาต</b></li>
        <li>หรือในหน้าแอป แตะ <b>"AA"</b> หรือไอคอน <b>☰</b> ที่ช่องที่อยู่ → <b>การตั้งค่าเว็บไซต์</b> → กล้องและตำแหน่ง: <b>อนุญาต</b></li>
        <li>ตั้งเสร็จแล้ว <b>ปิดแท็บนี้แล้วเปิดลิงก์ใหม่</b> (Safari จำค่าเดิมไว้จนกว่าจะเปิดหน้าใหม่)</li>
      </ol></div>
      ${ios && !iosChrome ? gIosChrome : ''}
      ${gDevice}
      <button class="btn ghost big" id="permDiag" style="margin-bottom:8px">📤 ทำครบแล้วยังไม่ได้? ส่งข้อมูลเครื่องให้ผู้ดูแล</button>
      <button class="btn primary big" data-close>เข้าใจแล้ว</button>`).querySelector('#permDiag').onclick = () => sendCamDiag('เปิดสิทธิ์ตามขั้นตอนแล้วยังใช้กล้อง/ตำแหน่งไม่ได้');
  }

  // ---------- หน้าจอสแกนใบหน้า 5 วินาที ----------
  // ตรวจว่ามือถือเครื่องนี้พร้อมใช้งานไหม: กล้อง, ตรวจใบหน้า, GPS (ไม่บันทึกอะไร)
  async function deviceCheck() {
    const el = openSheet('<h2 class="sheet-title">ตรวจอุปกรณ์</h2><div class="dev-list" id="devList"></div><button class="btn ghost big" data-close style="margin-top:10px">ปิด</button>');
    const list = el.querySelector('#devList');
    const row = (label) => {
      list.insertAdjacentHTML('beforeend', `<div class="dev-row"><span>${esc(label)}</span><b class="muted">กำลังตรวจ…</b></div>`);
      const b = list.lastElementChild.querySelector('b');
      return (ok, text) => { b.className = ok === true ? 'ok' : ok === false ? 'bad' : 'warn'; b.textContent = text; };
    };
    row('อุปกรณ์')(null, deviceOs());
    row('เบราว์เซอร์')(IN_APP || IOS_WEBVIEW ? false : null, (IOS_WEBVIEW ? 'ในแอปอื่น (ไม่ใช่ Safari โดยตรง)' : deviceBrowser()) + (window.matchMedia?.('(display-mode: standalone)').matches ? ' (แอปบนหน้าจอหลัก)' : ''));
    row('การเชื่อมต่อปลอดภัย (https)')(window.isSecureContext, window.isSecureContext ? 'ผ่าน' : 'ไม่ผ่าน');
    const cam = row('กล้อง');
    if (!hasCameraApi()) cam(false, `${noCamReason().text} (ลงเวลาได้ด้วยกล้องของเครื่อง)`);
    else {
      try {
        const stx = await openCamera();
        const set = stx.getVideoTracks()[0]?.getSettings?.() || {};
        stx.getTracks().forEach((t) => t.stop());
        cam(true, `ผ่าน${set.width ? ` (${set.width}×${set.height})` : ''}`);
      } catch (e) {
        cam(false, e && e.name === 'NotAllowedError' ? 'ไม่ได้อนุญาต → เปิดสิทธิ์กล้องในการตั้งค่า' : e && e.name === 'NotReadableError' ? 'กล้องถูกแอปอื่นใช้อยู่' : `เปิดไม่ได้ (${esc(e && e.name || 'error')})`);
      }
    }
    const fd = row('ระบบตรวจใบหน้า');
    try { await withTimeout(loadFaceDetector(), 15000); fd(true, 'ผ่าน'); } catch { fd(null, 'โหลดไม่ได้ (ยังสแกนได้ แต่ระบบจะแจ้งผู้ดูแลตรวจสอบ)'); }
    const gps = row('ตำแหน่ง GPS');
    if (!('geolocation' in navigator)) gps(false, 'อุปกรณ์ไม่รองรับ');
    else {
      await new Promise((res) => navigator.geolocation.getCurrentPosition(
        (p) => { gps(true, `ผ่าน (แม่นยำ ±${Math.round(p.coords.accuracy)} ม.)`); res(); },
        (e) => { gps(false, e.code === 1 ? 'ไม่ได้อนุญาต → เปิดสิทธิ์ตำแหน่งในการตั้งค่า' : 'หาตำแหน่งไม่ได้ → ออกไปที่โล่งแล้วลองใหม่'); res(); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
    }
    list.insertAdjacentHTML('beforeend', '<p class="hint">ถ้ามีข้อใดไม่ผ่าน ให้ถ่ายภาพหน้าจอนี้ แล้วกด "แจ้งปัญหา" แนบรูปส่งให้ผู้ดูแล</p><button class="btn ghost big" id="devToProblem">🆘 แจ้งปัญหาให้ผู้ดูแล</button>');
    list.querySelector('#devToProblem').onclick = () => openProblemForm('app');
  }

  // สแกนไม่สำเร็จ: บอกวิธีแก้ และทางเลือก "ลืมสแกน" (แนบรูปใบลงเวลา)
  function scanHelp(reason) {
    const el = openSheet(`
      <h2 class="sheet-title">สแกนไม่สำเร็จ</h2>
      <p class="muted">${esc(reason || 'ระบบจับใบหน้าไม่ได้ภายในเวลาที่กำหนด')}</p>
      <ol class="cam-help">
        <li>ไปที่ที่มีแสงสว่าง หันหน้าเข้าหาแสง ไม่ยืนย้อนแสง</li>
        <li>ถือมือถือระดับสายตา ห่างประมาณ 1 ศอก ให้หน้าอยู่ในกรอบวงรี</li>
        <li>ถอดหน้ากาก/แว่นดำ/หมวก แล้วมองตรงค้างไว้นิ่งๆ</li>
        <li>ถ้ายังไม่ได้ กดปุ่ม ⟳ มุมขวาบน แล้วลองใหม่</li>
      </ol>
      <button class="btn primary big" data-close>ลองสแกนใหม่</button>
      <button class="btn ghost big" id="helpToForgot" style="margin-top:8px">📝 สแกนไม่ได้จริงๆ? ขอบันทึกเวลา (ลืมสแกน)</button>
      <button class="btn ghost big" id="helpToProblem" style="margin-top:8px">🆘 แจ้งปัญหาให้ผู้ดูแล</button>`);
    el.querySelector('#helpToForgot').onclick = () => { closeSheet(); renderForgotScan(); };
    el.querySelector('#helpToProblem').onclick = () => openProblemForm('app', { category: 'กล้อง/สแกนใบหน้า', title: 'สแกนใบหน้าไม่ผ่าน', detail: reason ? `ระบบแจ้งว่า: ${reason}\n` : '' });
  }

  // iPhone รุ่นเก่าเปิดกล้อง/คลังรูปได้เฉพาะช่องเลือกไฟล์ที่อยู่ในหน้า
  const attachPicker = (inp) => {
    document.querySelectorAll('input.picker-tmp').forEach((x) => x.remove());
    inp.className = 'picker-tmp';
    inp.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(inp);
  };

  // เวลาที่ถ่ายจริงจากข้อมูล EXIF ในไฟล์รูป (นาฬิกาเครื่อง, ms) · ไม่มีข้อมูล = null
  async function exifTakenAt(file) {
    try {
      const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (v.getUint16(0) !== 0xffd8) return null;
      let o = 2;
      while (o + 10 < v.byteLength) {
        const mk = v.getUint16(o);
        if ((mk & 0xff00) !== 0xff00 || mk === 0xffda) return null;
        const len = v.getUint16(o + 2);
        if (mk === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { // "Exif"
          const t = o + 10;
          const le = v.getUint16(t) === 0x4949;
          const u16 = (q) => v.getUint16(t + q, le);
          const u32 = (q) => v.getUint32(t + q, le);
          const find = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12; return -1; };
          const str = (e) => { const n = Math.min(u32(e + 4), 32); const off = n > 4 ? u32(e + 8) : e + 8; let r = ''; for (let i = 0; i < n; i++) r += String.fromCharCode(v.getUint8(t + off + i)); return r; };
          const ifd0 = u32(4);
          let when = '';
          const ex = find(ifd0, 0x8769);
          if (ex >= 0) { const d = find(u32(ex + 8), 0x9003); if (d >= 0) when = str(d); } // DateTimeOriginal
          if (!when) { const d = find(ifd0, 0x0132); if (d >= 0) when = str(d); } // DateTime
          const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(when);
          return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null;
        }
        o += 2 + len;
      }
    } catch { /* อ่านไม่ได้ */ }
    return null;
  }
  // ข้อมูลวินิจฉัยกล้อง: ลองเปิดกล้องจริงแล้วจดผล → ใส่ในเรื่องแจ้งปัญหาให้ผู้ดูแล
  let lastCamErr = null;
  async function camDiag(why) {
    const lines = [`สาเหตุที่ระบบพบ: ${why || '-'}`];
    lines.push(`อุปกรณ์: ${deviceSummary()}`);
    lines.push(`โหมด: ${IOS_STANDALONE ? 'ไอคอนหน้าจอหลัก' : IOS_WEBVIEW ? 'ในแอปอื่น (ไม่ใช่ Safari)' : IN_APP ? `ในแอป ${IN_APP}` : 'เบราว์เซอร์'} · ${window.isSecureContext ? 'https' : 'ไม่ปลอดภัย'}`);
    lines.push(`mediaDevices: ${navigator.mediaDevices ? 'มี' : 'ไม่มี'} · getUserMedia: ${hasCameraApi() ? 'มี' : 'ไม่มี'}`);
    for (const n of ['camera', 'geolocation']) lines.push(`สิทธิ์ ${n}: ${await (navigator.permissions?.query({ name: n }).then((x) => x.state).catch(() => '?')) || '?'}`);
    if (lastCamErr) lines.push(`ผิดพลาดล่าสุด: ${lastCamErr.name || '?'} ${String(lastCamErr.message || '').slice(0, 120)}`);
    if (hasCameraApi()) {
      try {
        const st = await withTimeout(navigator.mediaDevices.getUserMedia({ video: true, audio: false }), 10000);
        lines.push(`ทดลองเปิดกล้อง: สำเร็จ (${st.getVideoTracks()[0]?.label || 'ไม่ทราบชื่อกล้อง'})`);
        st.getTracks().forEach((x) => x.stop());
      } catch (e) { lines.push(`ทดลองเปิดกล้อง: ไม่สำเร็จ ${e && e.name} ${String(e && e.message || '').slice(0, 120)}`); }
      try { const ds = await navigator.mediaDevices.enumerateDevices(); lines.push(`กล้องที่พบ: ${ds.filter((d) => d.kind === 'videoinput').length}`); } catch { /* ไม่รองรับ */ }
    }
    lines.push(`UA: ${UA}`);
    return lines.join('\n');
  }
  async function sendCamDiag(why) {
    toast('กำลังตรวจกล้อง…');
    const detail = await camDiag(why);
    openProblemForm(token ? 'app' : 'register', { category: 'กล้อง/สแกนใบหน้า', title: 'เปิดกล้องไม่ได้', detail: `(ข้อมูลจากระบบ ไม่ต้องแก้)\n${detail}` });
  }

  // ---------- ทางสำรอง: ถ่ายรูปด้วยแอปกล้องของเครื่อง (เมื่อหน้าเว็บเปิดกล้องสดไม่ได้) ----------
  // ใช้ได้ทุกเบราว์เซอร์/ทุกรุ่น · ประทับเวลาจากเซิร์ฟเวอร์และพิกัดเหมือนเดิม · ผู้ดูแลเห็นธง "ถ่ายด้วยแอปกล้องของเครื่อง" ให้ตรวจรูป
  function camFallback(mode, locationChoice, e) {
    const name = e && e.name;
    if (name === 'NoCameraApi' || ((IN_APP || IOS_WEBVIEW) && name === 'NotAllowedError')) return showCameraHelp(() => runNativeScan(mode, locationChoice));
    const why = name === 'NotAllowedError' ? 'มือถือไม่อนุญาตให้หน้าเว็บใช้กล้อง (บางเครื่องยังบล็อกอยู่แม้เปิดสิทธิ์ในตั้งค่าแล้ว)'
      : name === 'NotReadableError' || name === 'NoFrames' ? 'กล้องไม่ส่งภาพ อาจถูกแอปอื่นใช้อยู่ (กล้อง, วิดีโอคอล, LINE, Facebook)'
        : name === 'NotFoundError' ? 'ไม่พบกล้องหน้าในเครื่องนี้' : `เปิดกล้องในหน้าเว็บไม่ได้${name ? ` (${name})` : ''}`;
    const el = openSheet(`
      <h2 class="sheet-title">เปิดกล้องในหน้าเว็บไม่ได้</h2>
      <p class="muted">${esc(why)}</p>
      <div class="native-box"><b>📷 ลงเวลาได้เลยตอนนี้</b><p>ใช้กล้องของมือถือถ่ายรูปหน้าตรงแทน ระบบประทับเวลาจริงและพิกัดให้เหมือนเดิม (ผู้ดูแลจะตรวจรูปนี้)</p>
        <button class="btn primary big" id="nativeGo">📷 ถ่ายรูปด้วยกล้องของเครื่อง</button></div>
      <button class="btn ghost big" id="camRetry" style="margin-top:8px">ลองสแกนในหน้าเว็บอีกครั้ง</button>
      ${name === 'NotAllowedError' ? '<button class="btn ghost big" id="camPerm" style="margin-top:8px">วิธีเปิดสิทธิ์กล้อง</button>' : ''}
      <button class="btn ghost big" id="camDiag" style="margin-top:8px">📤 ยังไม่ได้? ส่งข้อมูลเครื่องให้ผู้ดูแล</button>
      <button class="btn ghost big" data-close style="margin-top:8px">ยกเลิก</button>
      <p class="hint pb-dev">ข้อมูลเครื่อง: ${esc(deviceSummary())} · ${esc(name || '-')}</p>`);
    el.querySelector('#nativeGo').onclick = () => runNativeScan(mode, locationChoice);
    el.querySelector('#camRetry').onclick = () => { closeSheet(); runScanner(mode, locationChoice); };
    el.querySelector('#camPerm')?.addEventListener('click', openPermGuide);
    el.querySelector('#camDiag').onclick = () => sendCamDiag(why);
  }
  // ต้องเรียกจากการแตะปุ่มโดยตรง (มือถือเปิดกล้องได้เฉพาะตอนผู้ใช้แตะ)
  function runNativeScan(mode, locationChoice) {
    if (!lastFix) return toast('ยังไม่พบพิกัด GPS กรุณารอให้ขึ้นพิกัดก่อน แล้วลองใหม่', true);
    const label = mode === 'in' ? 'เช็คอิน' : 'เช็คเอ้าท์';
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    inp.setAttribute('capture', 'user');
    const tapAt = Date.now();
    // ขอรหัสสแกนพร้อมกับเปิดกล้อง = จุดเริ่มนับเวลาจริงจากเซิร์ฟเวอร์
    const capP = api('/api/capture/start', { type: mode }).then((cap) => ({ cap, got: Date.now() }));
    capP.catch(() => {});
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      inp.remove();
      if (!file) return;
      const pickedAt = Date.now();
      const el = openSheet('<h2 class="sheet-title">กำลังตรวจรูป</h2><div class="empty" id="nvSt">กำลังตรวจรูปและพิกัด GPS…</div>');
      const say = (t) => { const x = el.querySelector('#nvSt'); if (x) x.textContent = t; };
      try {
        let cap;
        let got;
        try { ({ cap, got } = await capP); } catch (err) {
          if (/ต้องสแกน|ได้เฉพาะออกงาน/.test(err.message || '')) { scanStatus = null; renderScan(); }
          throw err;
        }
        if (file.lastModified && file.lastModified < tapAt - 60000) throw new Error('ต้องถ่ายรูปใหม่ตอนนี้เท่านั้น ใช้รูปเก่าในเครื่องไม่ได้');
        // เวลาที่ถ่ายจริงในไฟล์ (EXIF) ต้องหลังกดปุ่ม → กันเลือกรูปเก่าจากคลังรูป
        const takenAt = await exifTakenAt(file);
        if (takenAt && takenAt < tapAt - 60000) throw new Error('รูปนี้ถ่ายไว้ก่อนแล้ว ต้องถ่ายรูปใหม่ตอนนี้เท่านั้น ใช้รูปจากคลังรูปไม่ได้');
        const src = await imageFileToCanvas(file, 1280);
        if (Math.min(src.width, src.height) < 240) throw new Error('รูปเล็กเกินไป กรุณาถ่ายใหม่');
        say('กำลังตรวจใบหน้าในรูป…');
        let faceCheck = 'unavailable';
        try {
          const det = await withTimeout(loadFaceDetector(), 10000);
          const res = det.detectForVideo(src, performance.now());
          const n = (res.detections || []).filter((d) => (d.categories?.[0]?.score ?? 0) >= 0.5).length;
          faceCheck = n === 1 ? 'ok' : n > 1 ? 'many' : 'none';
        } catch { faceCheck = 'unavailable'; }
        if (faceCheck === 'many') throw new Error('พบหลายใบหน้าในรูป ให้มีเพียงคุณคนเดียว แล้วถ่ายใหม่');
        if (faceCheck === 'none' && !confirm('ไม่พบใบหน้าในรูปนี้\n\nกด "ตกลง" เพื่อใช้รูปนี้ (ผู้ดูแลจะตรวจสอบ)\nกด "ยกเลิก" แล้วถ่ายใหม่ให้เห็นหน้าชัด')) { closeSheet(); return; }
        // ต้องผ่านไปอย่างน้อยเท่าเวลาสแกนปกติ (เซิร์ฟเวอร์ตรวจ)
        const SCAN_MS = cap.scan_ms || 5000;
        if (Date.now() - got < SCAN_MS + 300) await new Promise((r) => setTimeout(r, SCAN_MS + 300 - (Date.now() - got)));
        const elapsed = Math.max(SCAN_MS + 300, Math.min(pickedAt - got, Date.now() - got));
        const shotAt = new Date(Date.parse(cap.server_time) + elapsed);
        say('กำลังยืนยันพิกัด GPS ตอนถ่าย…');
        let fix = await freshFix(12000);
        if (!fix) fix = [...gpsLog].reverse().find((x) => x.got >= tapAt) || null;
        if (!fix) throw new Error('ยืนยันพิกัด GPS ไม่ได้ กรุณาออกไปที่โล่งแล้วลองใหม่');
        const samples = gpsLog.filter((x) => x.got >= tapAt - 1000 && x !== fix).slice(-20).map((x) => ({ lat: x.lat, lng: x.lng, accuracy: x.accuracy }));
        closeSheet();
        const m = matchSite(fix.lat, fix.lng);
        const placeName = locationChoice || (m.configured ? m.site.name : 'ไม่ระบุสถานที่');
        const photo = stampPhoto(src, [
          { text: `${label} · ${me.name}`, bold: true },
          { text: `รหัสพนักงาน ${me.emp_code}` },
          { text: fmtStamp(shotAt), bold: true, color: '#ffd166' },
          { text: `สถานที่ ${placeName}${m.configured && !m.inside ? ' (นอกพื้นที่)' : ''}` },
          { text: `พิกัด ${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)} (±${Math.round(fix.accuracy)} ม.)` },
          { text: `รหัสตรวจสอบ ${cap.verify_code} · กล้องของเครื่อง`, color: '#9be9df' },
        ]);
        const tc = document.createElement('canvas');
        const ts = 128 / Math.max(src.width, src.height);
        tc.width = Math.round(src.width * ts);
        tc.height = Math.round(src.height * ts);
        tc.getContext('2d').drawImage(src, 0, 0, tc.width, tc.height);
        renderConfirm({
          mode, label, photo, placeName, shotAt, fix,
          payload: {
            nonce: cap.nonce, elapsed_ms: Math.round(elapsed), photo, thumb: tc.toDataURL('image/jpeg', 0.7),
            lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, gps_samples: samples, gps_pos_age_ms: Math.round(fix.got - fix.at),
            face_check: faceCheck === 'ok' ? 'ok' : 'unavailable', face_ratio: faceCheck === 'ok' ? 1 : 0,
            camera_label: 'native-camera', capture_mode: 'native', photo_time: takenAt ? 'exif' : 'none', touch: navigator.maxTouchPoints > 0, location_choice: locationChoice,
          },
          verify: cap.verify_code,
        });
      } catch (err) { closeSheet(); toast(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', true); }
    };
    attachPicker(inp);
    inp.click();
  }

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
      <div class="scan-status" id="st">กำลังเปิดกล้อง…</div>
      <ul class="scan-tips">
        <li>📱 ถือมือถือระดับสายตา ห่างประมาณ 1 ศอก</li>
        <li>🙂 มองตรงเข้ากล้อง ค้างไว้นิ่งๆ <b>ไม่ต้องขยับหรือหันซ้ายขวา</b></li>
        <li>💡 หันหน้าเข้าหาแสง ไม่ยืนย้อนแสง · ถอดหน้ากาก/แว่นดำ</li>
        <li>🟢 กรอบเป็นสีเขียว = จับหน้าได้ ระบบนับ 5 วินาทีเอง</li>
      </ul>`;
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
      try {
        stream = await openCamera();
      } catch (e) {
        close();
        return camFallback(mode, locationChoice, e);
      }
      if (closed) return close();
      const track = stream.getVideoTracks()[0];
      const cameraLabel = track?.label || '';
      if (VIRTUAL_CAM_RE.test(cameraLabel)) return fail('ไม่อนุญาตให้ใช้กล้องเสมือนหรือโปรแกรมปลอมภาพ');
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      video.play().catch(() => {}); // ไม่รอ play() เพราะจะค้างถ้ากล้องไม่ส่งภาพ (มีตัวจับเวลาด้านล่าง)
      // รอภาพจากกล้องไม่เกิน 10 วินาที (กันค้างถ้ากล้องถูกแอปอื่นใช้อยู่)
      const camReady = await Promise.race([
        new Promise((r) => (video.readyState >= 2 ? r(true) : video.addEventListener('loadeddata', () => r(true), { once: true }))),
        new Promise((r) => setTimeout(() => r(false), 10000)),
      ]);
      if (closed) return;
      if (!camReady) { close(); return camFallback(mode, locationChoice, { name: 'NoFrames' }); }

      st.textContent = 'กำลังเตรียมระบบตรวจใบหน้า…';
      let detector = null;
      try { detector = await withTimeout(loadFaceDetector(), 15000); } catch { detector = null; }
      if (closed) return;
      if (!lastFix) return fail('ไม่พบพิกัด GPS กรุณารอสักครู่แล้วสแกนใหม่');

      // ขอรหัสสแกนจากเซิร์ฟเวอร์ = จุดเริ่มนับเวลาจริง
      let cap;
      try { cap = await api('/api/capture/start', { type: mode }); } catch (err) {
        fail(err.message || 'เริ่มสแกนไม่ได้ กรุณาลองใหม่');
        // สถานะเปลี่ยน (เช่น สแกนเข้างานไปแล้วจากอีกเครื่อง) → โหลดหน้าลงเวลาใหม่ให้ตรงกับระบบ
        if (/ต้องสแกน|ได้เฉพาะออกงาน/.test(err.message || '')) { scanStatus = null; renderScan(); }
        return;
      }
      if (closed) return;
      const t0 = performance.now();
      const scanWall = Date.now();
      const serverStart = Date.parse(cap.server_time);
      let okMs = 0;
      let okFrames = 0;
      let frames = 0;
      let seenFace = false;
      let last = t0;
      let lastDetect = -1e9;
      let lastOkAt = -1e9;
      let detState = 'none';
      let anyFaceEver = false;
      let triedCpu = false;
      let lightAt = -1e9;
      let dark = false;
      const lightCanvas = document.createElement('canvas');
      lightCanvas.width = lightCanvas.height = 24;
      const lightCtx = lightCanvas.getContext('2d', { willReadFrequently: true });

      // วิธีตรวจ: ต้องเจอใบหน้าเดียว ขนาดพอดี อยู่กลางภาพ รวมแล้วครบ 5 วินาที (ไม่ต้องขยับหน้า ไม่ต้องหันซ้ายขวา)
      const detectFace = (now) => {
        const res = detector.detectForVideo(video, now);
        const faces = (res.detections || []).filter((d) => (d.categories?.[0]?.score ?? 0) >= 0.5);
        if (faces.length) anyFaceEver = true;
        if (faces.length > 1) return 'many';
        if (!faces.length) return 'none';
        const bb = faces[0].boundingBox;
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        if (bb.width / Math.min(vw, vh) < 0.16) return 'far';
        const cx = (bb.originX + bb.width / 2) / vw;
        const cy = (bb.originY + bb.height / 2) / vh;
        if (cx < 0.2 || cx > 0.8 || cy < 0.15 || cy > 0.85) return 'offcenter';
        return 'ok';
      };
      const step = () => {
        if (closed) return;
        const now = performance.now();
        const dt = Math.min(now - last, 200);
        last = now;
        // ตรวจทุก ~90ms (ลดภาระเครื่อง) และจำผลไว้ระหว่างรอบ ไม่ให้วงแหวนกระพริบ
        if (detector && now - lastDetect >= 90) {
          lastDetect = now;
          try { detState = detectFace(now); } catch { detState = 'none'; }
          if (detState === 'ok') lastOkAt = now;
          // บางเครื่องโหมด GPU ตรวจหน้าไม่เจอเลย → สลับไปใช้ CPU อัตโนมัติ
          if (!anyFaceEver && !triedCpu && now - t0 > 5000) {
            triedCpu = true;
            loadFaceDetector(true).then((d) => { if (d && !closed) { detector = d; detectorPromise = cpuDetectorPromise; } }).catch(() => {});
          }
        }
        // ตรวจความสว่างทุกครึ่งวินาที
        if (now - lightAt > 500 && video.videoWidth) {
          lightAt = now;
          try {
            lightCtx.drawImage(video, 0, 0, 24, 24);
            const px = lightCtx.getImageData(0, 0, 24, 24).data;
            let sum = 0;
            for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
            dark = sum / (px.length / 4) < 45;
          } catch { dark = false; }
        }
        const state = !detector ? 'ok' : now - lastOkAt < 350 ? 'ok' : detState;
        // นับสัดส่วนใบหน้าตั้งแต่เจอหน้าครั้งแรก (ช่วงจัดท่าก่อนหน้านั้นไม่นับ)
        if (state === 'ok') { seenFace = true; okFrames++; okMs += dt; }
        if (seenFace) frames++;
        const remain = Math.max(0, SCAN_MS - okMs);
        prog.style.strokeDashoffset = String(100 - (okMs / SCAN_MS) * 100);
        ov.classList.toggle('face-ok', state === 'ok');
        cnt.textContent = Math.ceil(remain / 1000) || '';
        const waited = now - t0;
        st.textContent = !detector ? 'ค้างไว้นิ่งๆ… (ระบบตรวจใบหน้าไม่พร้อม จะแจ้งผู้ดูแลตรวจสอบ)'
          : state === 'ok' ? 'พบใบหน้าแล้ว ค้างไว้นิ่งๆ ไม่ต้องขยับ…'
          : state === 'many' ? 'พบหลายใบหน้า ให้มีเพียงคุณคนเดียวในกล้อง'
          : state === 'far' ? 'ขยับมือถือเข้าใกล้หน้าอีกนิด ให้หน้าเต็มกรอบวงรี'
          : state === 'offcenter' ? 'เลื่อนหน้าให้อยู่กลางกรอบวงรี'
          : dark ? 'แสงน้อยเกินไป ไปที่สว่างขึ้น หรือหันหน้าเข้าหาแสง'
          : waited > 8000 ? 'ยังไม่เจอใบหน้า: หน้าตรง ไม่ย้อนแสง ถอดหน้ากาก/แว่นดำ แล้วค้างไว้นิ่งๆ'
          : 'มองตรงเข้ากล้อง ให้หน้าอยู่ในกรอบวงรี';

        if (okMs >= SCAN_MS && now - t0 >= SCAN_MS) return finish(now - t0, okFrames / Math.max(1, frames));
        if (now - t0 > 90000) { close(); return scanHelp(); }
        raf = requestAnimationFrame(step);
      };
      const SCAN_MS = cap.scan_ms || 5000;
      st.textContent = 'หันหน้าเข้ากล้องให้อยู่ในกรอบ';
      raf = requestAnimationFrame(step);

      const finish = (elapsed, faceRatio) => capture(elapsed, faceRatio).catch((err) => fail(err.message || 'เกิดข้อผิดพลาด กรุณาสแกนใหม่'));
      const capture = async (elapsed, faceRatio) => {
        // ถ่ายภาพจากกล้องจริง: กลับด้านแบบกระจกให้เหมือนภาพที่เห็นตอนสแกน (และเหมือนแอปกล้องในมือถือ)
        // ภาพแนวนอนจะตัดเป็นแนวตั้ง 3:4 ตรงกลาง ไม่ยืด/บีบภาพ
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const sw = vw > vh * 0.75 ? Math.round(vh * 0.75) : vw;
        const sx = Math.round((vw - sw) / 2);
        const scale = Math.min(1, 1280 / Math.max(sw, vh));
        const c = document.createElement('canvas');
        c.width = Math.round(sw * scale);
        c.height = Math.round(vh * scale);
        const g = c.getContext('2d');
        g.translate(c.width, 0);
        g.scale(-1, 1);
        g.drawImage(video, sx, 0, sw, vh, 0, 0, c.width, c.height);
        g.setTransform(1, 0, 0, 1, 0, 0);
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
    ok: 'ปกติ', problem: 'ต้องตรวจสอบ', absent: 'ไม่มีการสแกนในวันทำงาน', no_checkin: 'ไม่มีรูปสแกนเข้างาน', no_checkout: 'ไม่มีรูปสแกนออกงาน',
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
      // ย้อนดูได้ถึงเดือนที่เริ่มใช้ระบบ หรือ 60 วันย้อนหลัง (เผื่อวันที่ขอลืมสแกนก่อนสมัคร)
      const back60 = new Date(Date.parse(`${todayTHStr()}T12:00:00Z`) - 60 * 86400000).toISOString().slice(0, 7);
      document.getElementById('prevM').disabled = !!calData.start_date && calMonth <= [calData.start_date.slice(0, 7), back60].sort()[0];
      drawCalendar();
    } catch (err) {
      const b = document.getElementById('calBody');
      if (!b) return;
      b.innerHTML = `<div class="card empty">${esc(err.message)}<div style="margin-top:12px"><button class="btn primary" id="calRetry">ลองใหม่</button></div></div>`;
      document.getElementById('calRetry').onclick = () => renderCalendar(calMonth);
    }
  }

  function drawCalendar() {
    const { days, summary: s, schedule } = calData;
    const lead = new Date(`${days[0].date}T12:00:00Z`).getUTCDay();
    const today = serverNow().toLocaleDateString('en-CA', { timeZone: TZ });
    const otTotal = s.ot['1.5'] + s.ot['2'] + s.ot['3'];
    const mark = (d) => (d.appeal?.status === 'pending' ? '⏳' : d.manual ? '📝' : d.color === 'excused' ? '✓' : d.status === 'holiday_work' ? 'OT' : d.color === 'red' ? '!' : d.color === 'green' ? '✓' : '');
    document.getElementById('calBody').innerHTML = `
      <div class="cal-stats">
        <div><b>${s.work}</b><small>วันทำงาน</small></div>
        <div class="c-green"><b>${s.ok}</b><small>ปกติ</small></div>
        <div class="c-red"><b>${s.red}</b><small>ต้องตรวจสอบ</small></div>
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
          <span><i class="c-green"></i>ปกติ</span><span><i class="c-red"></i>ต้องตรวจสอบ (ไม่มีการสแกน/สาย/ออกก่อน)</span>
          <span><i class="c-gray"></i>วันหยุด</span><span><i class="c-purple"></i>ทำงานวันหยุด</span>
          <span><i class="c-excused"></i>อนุมัติคำร้อง</span><span><i class="c-blue"></i>วันนี้/กำลังทำงาน</span>
        </div>
      </div>
      <p class="hint">${schedule.shifts.map((x) => `${esc(x.name)} ${esc(x.start)}–${esc(x.end)} น.`).join(' · ')}<br>
        แตะวันที่เป็น<b class="bad"> สีแดง </b>เพื่อดูสาเหตุและยื่นคำร้อง</p>
      <div class="req-entries">
        <button class="btn ghost fr-entry" id="frEntryCal">📝 ลืมสแกน<small>ทำงานจริงแต่ลืมสแกน</small></button>
        <button class="btn ghost fr-entry" id="apEntryCal">🏳️ ยื่นคำร้อง<small>หยุดตามคำสั่ง / ลา / มาสาย</small></button>
      </div>`;
    document.getElementById('frEntryCal').onclick = () => renderForgotScan(calMonth);
    document.getElementById('apEntryCal').onclick = () => renderAppeals(calMonth);
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

  // ---------- รูปจากไฟล์ (ใบลงเวลา / รูปโปรไฟล์กรณีเปิดกล้องไม่ได้) → JPEG ย่อขนาด ----------
  function imageFileToCanvas(file, max) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('ไม่ได้เลือกไฟล์'));
      if (file.type && !/^image\//.test(file.type)) return reject(new Error('กรุณาเลือกไฟล์รูปภาพ (JPG/PNG)'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ กรุณาถ่ายรูปใหม่ หรือเลือกรูป JPG/PNG')); };
      img.src = url;
    });
  }
  const canvasJpeg = (c, maxLen) => {
    let q = 0.85;
    let d = c.toDataURL('image/jpeg', q);
    while (d.length > maxLen && q > 0.35) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    return d;
  };
  // เลือกรูปโปรไฟล์จากเครื่อง (ใช้เฉพาะเมื่อเบราว์เซอร์เปิดกล้องไม่ได้) → ครอปสี่เหลี่ยมกลางภาพ 320px
  function pickAvatarFile() {
    return new Promise((resolve) => {
      const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
      inp.setAttribute('capture', 'user');
      inp.onchange = async () => {
        inp.remove();
        try {
          const src = await imageFileToCanvas(inp.files[0], 1200);
          const side = Math.min(src.width, src.height);
          const c = document.createElement('canvas');
          c.width = c.height = 320;
          c.getContext('2d').drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, 320, 320);
          resolve(canvasJpeg(c, 38000));
        } catch (err) { toast(err.message, true); resolve(null); }
      };
      attachPicker(inp);
      inp.click();
    });
  }

  // ---------- การแจ้งเตือนถึงพนักงาน (กระดิ่งมุมขวาบน) ----------
  const bellBtn = document.getElementById('bellBtn');
  let notifAutoShown = false;
  function setUnread(n) {
    if (!bellBtn) return;
    bellBtn.hidden = !token;
    const b = bellBtn.querySelector('.bell-badge');
    b.hidden = !n;
    b.textContent = n > 9 ? '9+' : String(n || '');
    // เปิดหน้าต่างแจ้งเตือนให้อัตโนมัติ 1 ครั้ง เมื่อมีเรื่องใหม่ที่ยังไม่อ่าน
    if (n && !notifAutoShown && !document.querySelector('.sheet-back') && !document.body.classList.contains('scanning')) {
      notifAutoShown = true;
      openNotifications();
    }
  }
  async function openNotifications() {
    const el = openSheet('<h2 class="sheet-title">การแจ้งเตือน</h2><div class="empty">กำลังโหลด…</div>');
    let d;
    try { d = await api('/api/me/notifications'); } catch (err) { closeSheet(); return toast(err.message, true); }
    const sheet = el.querySelector('.sheet');
    if (!sheet) return;
    sheet.innerHTML = `<div class="sheet-grip"></div>
      <div class="notif-head"><h2 class="sheet-title">การแจ้งเตือน</h2>${d.unread ? '<button class="linkbtn" id="nAll">อ่านทั้งหมด</button>' : ''}</div>
      ${d.items.length ? `<div class="notif-list">${d.items.map((n) => `
        <button type="button" class="notif-item${n.read_at ? '' : ' unread'}" data-n="${n.id}" data-kind="${esc(n.kind)}">
          <span class="ic">${n.kind === 'problem' ? (/^แก้ไขปัญหาแล้ว/.test(n.title) ? '✅' : '🛠️') : /ไม่อนุมัติ/.test(n.title) ? '❌' : /อนุมัติ/.test(n.title) ? '✅' : '🔔'}</span>
          <span><b>${esc(n.title)}</b><span class="body">${esc(n.body)}</span><small>${esc(new Date(n.created_at).toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }))}</small></span>
        </button>`).join('')}</div>` : '<div class="empty">ยังไม่มีการแจ้งเตือน</div>'}
      <button class="btn ghost big" data-close style="margin-top:10px">ปิด</button>`;
    const markRead = async (body) => { try { const r = await api('/api/me/notifications/read', body); setUnread(r.unread); } catch { /* ไม่สำคัญ */ } };
    sheet.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => {
      if (b.classList.contains('unread')) {
        b.classList.remove('unread');
        markRead({ ids: [Number(b.dataset.n)] });
      }
      if (b.dataset.kind === 'problem') openMyProblems();
    }));
    sheet.querySelector('#nAll')?.addEventListener('click', (e) => {
      e.target.remove();
      sheet.querySelectorAll('.notif-item.unread').forEach((x) => x.classList.remove('unread'));
      markRead({ all: true });
    });
  }
  if (bellBtn) bellBtn.onclick = openNotifications;

  // ---------- แจ้งปัญหาการใช้งาน: ส่งได้ทั้งก่อนเข้าสู่ระบบ (กรอกรหัส+ชื่อ) และหลังเข้าสู่ระบบ (ระบบรู้ตัวตนเอง) ----------
  const PROBLEM_CATS = [
    { v: 'สมัครสมาชิก/ลงทะเบียน', ic: '📝' }, { v: 'เข้าสู่ระบบ/รหัสผ่าน', ic: '🔑' }, { v: 'กล้อง/สแกนใบหน้า', ic: '📷' },
    { v: 'GPS/ตำแหน่ง', ic: '📍' }, { v: 'ลงเวลา/ปฏิทิน', ic: '🕒' }, { v: 'OT/คำร้อง/ลืมสแกน', ic: '📄' },
    { v: 'แอปช้า/ค้าง/เปิดไม่ได้', ic: '🐢' }, { v: 'อื่นๆ', ic: '💬' },
  ];
  const PB_TH = { open: 'รอรับเรื่อง', in_progress: 'กำลังแก้ไข', resolved: 'แก้ไขแล้ว' };
  const helpLink = (id, text) => `<button type="button" class="help-link" id="${id}"><span>🆘</span>${esc(text)}</button>`;
  const fmtWhen = (iso) => new Date(iso).toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
  const readDataUrl = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์ใหม่'));
    fr.readAsDataURL(file);
  });
  function openProblemForm(source, pre = {}) {
    const anon = !token;
    const el = openSheet(`
      <h2 class="sheet-title">🆘 แจ้งปัญหาการใช้งาน</h2>
      ${anon ? `<p class="hint pb-lead">ยังไม่ได้เข้าสู่ระบบ กรุณากรอก<b>รหัสพนักงาน</b>และ<b>ชื่อ</b> เพื่อให้ผู้ดูแลรู้ว่าใครแจ้ง</p>
        <label class="field"><span>รหัสพนักงาน <b class="bad">*</b></span><input name="emp_code" id="pbCode" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="เช่น EMP001" value="${esc(pre.emp_code || store.get('last_emp_code', ''))}"></label>
        <label class="field"><span>ชื่อ-นามสกุล <b class="bad">*</b></span><input id="pbName" maxlength="80" autocomplete="name" placeholder="เช่น สมชาย ใจดี" value="${esc(pre.name || '')}"></label>
        <label class="field"><span>เบอร์โทร / LINE สำหรับติดต่อกลับ <small>(ไม่บังคับ แต่แนะนำ)</small></span><input id="pbContact" maxlength="60" autocomplete="tel" placeholder="เช่น 0812345678" value="${esc(pre.contact || '')}"></label>`
    : `<div class="fr-who">ผู้แจ้ง: <b>${esc(me.name)}</b> · รหัส ${esc(me.emp_code)} <small class="muted">(ระบบแนบให้อัตโนมัติ)</small></div>`}
      <div class="field"><span class="field-label">ประเภทปัญหา <b class="bad">*</b></span>
        <div class="pb-cats">${PROBLEM_CATS.map((c) => `<label class="pb-cat"><input type="radio" name="pbCat" value="${esc(c.v)}"${pre.category === c.v ? ' checked' : ''}><span><i>${c.ic}</i>${esc(c.v)}</span></label>`).join('')}</div>
        <em class="err" id="pbCatErr" hidden>กรุณาเลือกประเภทปัญหา</em></div>
      <label class="field"><span>หัวข้อปัญหา <b class="bad">*</b></span><input id="pbTitle" maxlength="100" placeholder="เช่น กดสแกนแล้วกล้องไม่ขึ้น" value="${esc(pre.title || '')}"></label>
      <label class="field"><span>รายละเอียด <b class="bad">*</b> <small>เกิดอะไรขึ้น ทำอะไรอยู่ มีข้อความอะไรขึ้นบนจอ</small></span><textarea id="pbDetail" rows="4" maxlength="1500" placeholder="เช่น กดปุ่มสแกนใบหน้าแล้วจอดำ ขึ้นว่า เปิดกล้องไม่ได้ ลองปิดเปิดแอปแล้วก็ยังเป็น">${esc(pre.detail || '')}</textarea></label>
      <div class="field"><span class="field-label">รูปภาพ / ไฟล์ประกอบ <small>(ไม่บังคับ · สูงสุด 3 ไฟล์ · รูป หรือ PDF)</small></span>
        <div class="fr-evi">
          <label class="btn ghost"><input type="file" accept="image/*" capture="environment" id="pbCam" hidden>📷 ถ่ายรูป</label>
          <label class="btn ghost"><input type="file" accept="image/*,application/pdf,.pdf" multiple id="pbFile" hidden>📎 เลือกรูป/ไฟล์</label>
        </div>
        <div class="pb-files" id="pbFiles"></div>
        <p class="hint">แนะนำ: แคปหน้าจอตอนที่เกิดปัญหาแนบมาด้วย ผู้ดูแลจะแก้ไขได้เร็วขึ้น</p></div>
      <p class="hint pb-dev">📱 แนบข้อมูลอุปกรณ์ให้อัตโนมัติ: ${esc(deviceSummary())}</p>
      <button class="btn primary big" id="pbSend">ส่งเรื่องให้ผู้ดูแล</button>
      <button class="btn ghost big" data-close style="margin-top:8px">ยกเลิก</button>`);
    const sheet = el.querySelector('.sheet');
    if (anon) bindInputs(sheet);
    sheet.querySelectorAll('#pbName, #pbTitle, #pbDetail').forEach((x) => x.addEventListener('input', () => { if (x.classList.contains('invalid')) setErr(x, ''); }));
    const q = (sel) => sheet.querySelector(sel);
    const files = []; // { data, name, pdf }
    const drawFiles = () => {
      q('#pbFiles').innerHTML = files.map((x, i) => `<div class="pb-file">${x.pdf ? `<span class="pb-pdf">📄<small>${esc(x.name)}</small></span>` : `<img src="${x.data}" alt="">`}<button type="button" class="pb-x" data-i="${i}" aria-label="ลบไฟล์">×</button></div>`).join('');
      q('#pbFiles').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { files.splice(Number(b.dataset.i), 1); drawFiles(); }));
    };
    const addFiles = async (inp) => {
      const list = [...inp.files];
      inp.value = '';
      for (const f of list) {
        if (files.length >= 3) { toast('แนบได้สูงสุด 3 ไฟล์', true); break; }
        try {
          if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
            if (f.size > 4 * 1024 * 1024) throw new Error('ไฟล์ PDF ใหญ่เกิน 4 MB');
            const d = (await readDataUrl(f)).replace(/^data:[^;]*;base64,/, 'data:application/pdf;base64,');
            files.push({ data: d, name: f.name, pdf: true });
          } else if (!f.type || /^image\//.test(f.type)) {
            files.push({ data: canvasJpeg(await imageFileToCanvas(f, 1600), 1500000), name: f.name });
          } else throw new Error('แนบได้เฉพาะรูปภาพหรือ PDF (วิดีโอส่งไม่ได้ ให้แคปหน้าจอแทน)');
        } catch (err) { toast(err.message, true); }
      }
      drawFiles();
    };
    q('#pbCam').onchange = (e) => addFiles(e.target);
    q('#pbFile').onchange = (e) => addFiles(e.target);
    sheet.querySelectorAll('[name=pbCat]').forEach((r) => (r.onchange = () => { q('#pbCatErr').hidden = true; }));
    q('#pbSend').onclick = async () => {
      const cat = q('[name=pbCat]:checked')?.value || '';
      const title = q('#pbTitle').value.replace(/\s+/g, ' ').trim();
      const detail = q('#pbDetail').value.trim();
      let ok = true;
      if (anon) {
        ok = setErr(q('#pbCode'), RULES.emp_code(q('#pbCode').value.trim())) && ok;
        ok = setErr(q('#pbName'), q('#pbName').value.trim().length >= 2 ? '' : 'กรุณากรอกชื่อ-นามสกุล') && ok;
      }
      q('#pbCatErr').hidden = !!cat;
      ok = !!cat && ok;
      ok = setErr(q('#pbTitle'), title.length >= 3 ? '' : 'กรุณากรอกหัวข้อปัญหา (อย่างน้อย 3 ตัวอักษร)') && ok;
      ok = setErr(q('#pbDetail'), detail.length >= 5 ? '' : 'กรุณาอธิบายรายละเอียด (อย่างน้อย 5 ตัวอักษร)') && ok;
      if (!ok) {
        const bad = sheet.querySelector('.invalid') || (!cat && q('.pb-cats'));
        bad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return toast('กรุณากรอกข้อมูลที่ทำเครื่องหมายสีแดง', true);
      }
      const btn = q('#pbSend');
      busy(btn, true, files.length ? 'กำลังส่ง (อัปโหลดไฟล์)…' : 'กำลังส่ง…');
      const body = { category: cat, title, detail, files: files.map((x) => x.data), device: deviceSummary(), source };
      if (anon) Object.assign(body, { emp_code: q('#pbCode').value.trim(), name: q('#pbName').value.trim(), contact: q('#pbContact').value.trim() });
      try {
        const r = await api('/api/problems', body);
        if (anon) store.set('last_emp_code', body.emp_code);
        sheet.innerHTML = `<div class="sheet-grip"></div>
          <div class="pb-done"><div class="check">✓</div><h2>ส่งเรื่องถึงผู้ดูแลแล้ว</h2>
            <p class="pb-no">เลขที่เรื่อง <b>#${esc(r.problem.id)}</b> · ${esc(title)}</p>
            ${r.identified
    ? '<p class="muted">เมื่อผู้ดูแลรับเรื่องหรือแก้ไขเสร็จ จะแจ้งผลที่กระดิ่ง 🔔 มุมขวาบน · ดูสถานะได้ที่ เมนูประวัติ → "เรื่องที่ฉันแจ้ง"</p>'
    : `<p class="muted">ผู้ดูแลได้รับเรื่องแล้ว จะแก้ไขหรือติดต่อกลับ${body.contact ? ` ทาง <b>${esc(body.contact)}</b>` : ''} โดยเร็ว</p>`}
          </div>
          ${r.identified ? '<button class="btn ghost big" id="pbToMine">ดูเรื่องที่ฉันแจ้ง</button>' : ''}
          <button class="btn primary big" data-close style="margin-top:8px">ปิด</button>`;
        sheet.querySelector('#pbToMine')?.addEventListener('click', openMyProblems);
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
  }
  async function openMyProblems() {
    const el = openSheet('<h2 class="sheet-title">เรื่องที่ฉันแจ้ง</h2><div class="empty">กำลังโหลด…</div>');
    let d;
    try { d = await api('/api/me/problems'); } catch (err) { closeSheet(); return toast(err.message, true); }
    const sheet = el.querySelector('.sheet');
    if (!sheet || !sheet.isConnected) return;
    sheet.innerHTML = `<div class="sheet-grip"></div><h2 class="sheet-title">เรื่องที่ฉันแจ้ง</h2>
      ${d.items.length ? `<div class="pb-list">${d.items.map((x) => `
        <div class="pb-item ${x.status}">
          <div class="pb-item-top"><span class="pb-st ${x.status}">${PB_TH[x.status] || esc(x.status)}</span><small class="muted">#${esc(x.id)} · ${esc(fmtWhen(x.created_at))}</small></div>
          <b>${esc(x.title)}</b>
          <div class="sub">${esc(x.category)}${x.files ? ` · 📎 ${esc(x.files)} ไฟล์` : ''}</div>
          ${x.status === 'in_progress' ? `<div class="pb-reply">🛠️ <b>${esc(x.taken_by || 'ผู้ดูแล')}</b> รับเรื่องแล้ว กำลังแก้ไข</div>` : ''}
          ${x.status === 'resolved' ? `<div class="pb-reply ok">✅ แก้ไขแล้วโดย <b>${esc(x.resolved_by || 'ผู้ดูแล')}</b>${x.resolve_note ? `<p>${esc(x.resolve_note)}</p>` : ''}</div>
            <small class="muted">เรื่องนี้จะลบอัตโนมัติ ${esc(fmtWhen(x.expires_at))}</small>` : ''}
        </div>`).join('')}</div>` : '<div class="empty">ยังไม่เคยแจ้งปัญหา</div>'}
      <p class="hint">เรื่องที่แก้ไขแล้วจะถูกลบอัตโนมัติหลัง 7 วัน เพื่อประหยัดพื้นที่</p>
      <button class="btn primary big" id="pbNew2">แจ้งปัญหาใหม่</button>
      <button class="btn ghost big" data-close style="margin-top:8px">ปิด</button>`;
    sheet.querySelector('#pbNew2').onclick = () => openProblemForm('app');
  }

  // ---------- ลืมสแกน: ขอบันทึกเวลาย้อนหลัง (แนบรูปใบลงเวลา) ----------
  let forgotMonth = null;
  const SR_TH = { pending: 'รอผู้ดูแลตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
  const todayTHStr = () => serverNow().toLocaleDateString('en-CA', { timeZone: TZ });
  async function renderForgotScan(month) {
    const from = current;
    forgotMonth = month || forgotMonth || ymOf(serverNow());
    view.innerHTML = `
      <button class="back" id="frBack">‹ กลับ</button>
      <h1 class="screen-title"><span class="dot"></span>ลืมสแกน · ขอบันทึกเวลา</h1>
      <p class="hint fr-hint">แตะวันที่ทำงานจริงแต่ลืมสแกน · ขอย้อนหลังได้ 60 วัน (รวมวันก่อนสมัครใช้ระบบ) · วันที่สแกนครบแล้วเลือกไม่ได้<br>
        ถ้าวันนั้น<b>หยุดงานตามคำสั่งหัวหน้างาน หรือลา</b> ไม่ต้องขอลืมสแกน ให้ <button type="button" class="linkbtn" id="frToAppeal">🏳️ ยื่นคำร้อง</button> แทน</p>
      <div class="cal-head">
        <button class="btn ghost cal-nav" id="frPrevM" aria-label="เดือนก่อน">‹</button>
        <h2 class="fr-month">${esc(monthTH(forgotMonth))}</h2>
        <button class="btn ghost cal-nav" id="frNextM" aria-label="เดือนถัดไป">›</button>
      </div>
      <div id="frBody"><div class="card empty">กำลังโหลด…</div></div>`;
    document.getElementById('frBack').onclick = () => go(from);
    document.getElementById('frPrevM').onclick = () => renderForgotScan(shiftYm(forgotMonth, -1));
    document.getElementById('frNextM').onclick = () => renderForgotScan(shiftYm(forgotMonth, 1));
    document.getElementById('frToAppeal').onclick = () => renderAppeals(forgotMonth);
    let cal;
    let mine;
    try {
      [cal, mine] = await Promise.all([api(`/api/me/calendar?month=${forgotMonth}`), api('/api/me/scan-requests')]);
    } catch (err) {
      const b = document.getElementById('frBody');
      if (b) b.innerHTML = `<div class="card empty">${esc(err.message)}<div style="margin-top:12px"><button class="btn primary" id="frRetry">ลองใหม่</button></div></div>`;
      document.getElementById('frRetry')?.addEventListener('click', () => renderForgotScan(forgotMonth));
      return;
    }
    const body = document.getElementById('frBody');
    if (!body) return;
    const todayStr = todayTHStr();
    document.getElementById('frNextM').disabled = forgotMonth >= todayStr.slice(0, 7);
    // ขอย้อนหลังได้ 60 วัน (รวมวันก่อนสมัครใช้ระบบ)
    const oldest = new Date(Date.parse(`${todayStr}T12:00:00Z`) - 60 * 86400000).toISOString().slice(0, 10);
    document.getElementById('frPrevM').disabled = forgotMonth <= oldest.slice(0, 7);
    const reqBy = {};
    mine.items.forEach((r) => { if (!reqBy[r.work_date] || r.status !== 'rejected') reqBy[r.work_date] = reqBy[r.work_date] && reqBy[r.work_date].status !== 'rejected' ? reqBy[r.work_date] : r; });
    const lead = new Date(`${cal.days[0].date}T12:00:00Z`).getUTCDay();
    const stateOf = (d) => {
      const r = reqBy[d.date];
      if (d.date > todayStr || d.date < oldest) return 'off';
      if (r && r.status === 'pending') return 'pending';
      if (r && r.status === 'approved') return 'approved';
      if (d.checkin && d.checkout) return 'done';
      return d.color === 'red' ? 'need' : 'open';
    };
    const MARK = { pending: '⏳', approved: '✓', done: '✓', need: '!', open: '', off: '' };
    body.innerHTML = `
      <div class="card cal-card">
        <div class="cal-grid cal-week">${WEEK_TH.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">
          ${'<span></span>'.repeat(lead)}
          ${cal.days.map((d) => { const st = stateOf(d); return `<button class="cal-day fr-day fr-${st}${d.date === todayStr ? ' today' : ''}" data-date="${d.date}" ${st === 'off' || st === 'done' ? 'disabled' : ''}>
            <span class="n">${Number(d.date.slice(8))}</span><span class="m">${MARK[st]}</span></button>`; }).join('')}
        </div>
        <div class="cal-legend">
          <span><i class="fr-need"></i>สแกนไม่ครบ</span><span><i class="fr-open"></i>ขอได้</span>
          <span><i class="fr-pending"></i>รอตรวจสอบ</span><span><i class="fr-done"></i>สแกนครบ/อนุมัติแล้ว</span>
        </div>
      </div>
      <h2 class="section-title">คำขอของฉัน</h2>
      ${mine.items.length ? mine.items.slice(0, 15).map((r) => `
        <div class="card fr-item">
          <div class="fr-item-top"><b>${esc(thDate(r.work_date))}</b><span class="badge ${r.status}">${SR_TH[r.status]}</span></div>
          <div class="sub">${r.location ? `🏢 ${esc(r.location)} · ` : ''}${esc(r.shift_name || '')} · ขอ ${[r.req_in && `เข้างาน ${esc(r.req_in)}`, r.req_out && `ออกงาน ${esc(r.req_out)}`].filter(Boolean).join(' · ')} น.</div>
          ${r.status === 'approved' && (r.approved_in !== r.req_in || r.approved_out !== r.req_out) ? `<div class="sub">ผู้ดูแลบันทึก ${[r.approved_in && `เข้างาน ${esc(r.approved_in)}`, r.approved_out && `ออกงาน ${esc(r.approved_out)}`].filter(Boolean).join(' · ')} น.</div>` : ''}
          ${r.review_note ? `<div class="sub">ผู้ดูแล: ${esc(r.review_note)}</div>` : ''}
        </div>`).join('') : '<div class="card empty">ยังไม่มีคำขอ</div>'}`;
    body.querySelectorAll('.fr-day:not([disabled])').forEach((b) => (b.onclick = () => openForgotForm(b.dataset.date)));
  }

  // ฟอร์มขอบันทึกเวลาของวันที่เลือก
  const timeSel = (side, value) => {
    const [h, m] = (value || '08:00').split(':');
    return `<span class="time24" data-side="${side}">
      <select data-p="h" aria-label="ชั่วโมง">${Array.from({ length: 24 }, (_, i) => `<option${pad(i) === h ? ' selected' : ''}>${pad(i)}</option>`).join('')}</select><b>:</b>
      <select data-p="m" aria-label="นาที">${Array.from({ length: 60 }, (_, i) => `<option${pad(i) === m ? ' selected' : ''}>${pad(i)}</option>`).join('')}</select> <small>น.</small></span>`;
  };
  async function openForgotForm(date) {
    const el = openSheet('<h2 class="sheet-title">ขอบันทึกเวลา</h2><div class="empty">กำลังโหลด…</div>');
    let info;
    try { info = await api(`/api/me/scan-request?date=${date}`); } catch (err) { closeSheet(); return toast(err.message, true); }
    const sheet = el.querySelector('.sheet');
    if (!sheet || !sheet.isConnected) return;
    const head = `<div class="sheet-grip"></div><h2 class="sheet-title">ลืมสแกน · ${esc(thDate(date))}</h2>
      <div class="fr-who">ผู้ยื่น: <b>${esc(me.name)}</b> · รหัส ${esc(me.emp_code)}</div>`;
    const scanRow = (label, t) => `<div class="fr-side ${t ? 'has' : 'miss'}"><span>${label}</span><b>${t ? `สแกนแล้ว ${esc(t)} น. ✓` : 'ยังไม่ได้สแกน'}</b></div>`;
    if (info.block) {
      const ex = info.existing;
      sheet.innerHTML = `${head}${scanRow('เข้างาน', info.scans.in)}${scanRow('ออกงาน', info.scans.out)}
        <div class="fr-block">${esc(info.block)}</div>
        ${ex ? `<div class="sub" style="margin-top:8px">คำขอ: ${[ex.req_in && `เข้างาน ${esc(ex.req_in)}`, ex.req_out && `ออกงาน ${esc(ex.req_out)}`].filter(Boolean).join(' · ')} น. · ${SR_TH[ex.status]}</div>` : ''}
        <button class="btn ghost big" data-close style="margin-top:12px">ปิด</button>`;
      return;
    }
    const needIn = !info.scans.in;
    const needOut = !info.scans.out;
    const shift0 = info.shifts.find((s) => s.id === info.shift_id) || info.shifts[0];
    sheet.innerHTML = `${head}
      <div class="fr-scans">
        ${scanRow('เข้างาน', info.scans.in)}${scanRow('ออกงาน', info.scans.out)}
      </div>
      <label class="field"><span>สถานที่ทำงานวันนั้น <b class="bad">*</b></span><input id="frPlace" maxlength="100" autocomplete="off" list="frSiteList" placeholder="พิมพ์ชื่อสถานที่ เช่น ไซต์งานบางนา"><datalist id="frSiteList">${sites.map((x) => `<option value="${esc(x.name)}">`).join('')}</datalist></label>
      ${store.get('last_location', '') ? `<div class="site-quick"><button type="button" class="chip-btn" id="frLastPlace">ใช้ที่เดิม: <b>${esc(store.get('last_location', ''))}</b></button></div>` : ''}
      <div class="field"><span class="field-label">กะที่ทำงานวันนั้น</span>
        <div class="fr-shifts">${info.shifts.map((s) => `<label class="fr-chip"><input type="radio" name="frShift" value="${esc(s.id)}"${s.id === shift0.id ? ' checked' : ''}><span>${esc(s.name)} ${esc(s.start)}–${esc(s.end)}</span></label>`).join('')}</div></div>
      <div class="fr-times">
        ${needIn ? `<div class="fr-time"><label class="fr-check"><input type="checkbox" id="wantIn" checked> ลืมสแกน<b>เข้างาน</b></label>${timeSel('in', shift0.start)}</div>` : ''}
        ${needOut ? `<div class="fr-time"><label class="fr-check"><input type="checkbox" id="wantOut" checked> ลืมสแกน<b>ออกงาน</b></label>${timeSel('out', shift0.end)}</div>` : ''}
        <p class="hint">ระบบใส่เวลาตามกะให้ ถ้าไม่ตรงกับเวลาจริง แก้ตัวเลขได้</p>
      </div>
      <div class="field"><span class="field-label">หลักฐาน <small>(แนะนำ) รูปใบลงเวลา / ใบเซ็นชื่อ / เอกสารยืนยัน</small></span>
        <div class="fr-evi">
          <label class="btn ghost"><input type="file" accept="image/*" capture="environment" id="frCam" hidden>📷 ถ่ายรูปใบลงเวลา</label>
          <label class="btn ghost"><input type="file" accept="image/*" id="frFile" hidden>📎 เลือกรูปจากเครื่อง</label>
        </div>
        <img id="frPreview" class="fr-preview" alt="" hidden>
        <p class="hint">แนะนำให้แนบรูปใบลงเวลาของวันที่ขอ จะช่วยให้ผู้ดูแลอนุมัติได้ง่ายขึ้น</p>
        <div class="fr-nowarn" id="frNoEvi" hidden>
          <b>⚠ ยังไม่ได้แนบรูปหลักฐาน</b>
          <p>การไม่แนบหลักฐานอาจทำให้คำขอ<b>ถูกปฏิเสธ</b>ได้ ถ้ามีรูปใบลงเวลาของวันที่ขอ แนะนำให้แนบไปด้วยจะดีมาก</p>
          <div class="fr-nowarn-act"><button type="button" class="btn primary" id="frGoAttach">กลับไปแนบรูป</button><button type="button" class="btn ghost" id="frSendAnyway">ส่งโดยไม่แนบ</button></div>
        </div></div>
      <label class="field"><span>เหตุผลที่ลืมสแกน <small>(ไม่บังคับ)</small></span><textarea id="frReason" maxlength="300" rows="2" placeholder="เช่น โทรศัพท์แบตหมด / ลืมกดสแกน"></textarea></label>
      <button class="btn primary big" id="frSend">ส่งคำขอ</button>
      <button class="btn ghost big" data-close style="margin-top:8px">ยกเลิก</button>`;
    let evidence = '';
    const placeIn = sheet.querySelector('#frPlace');
    sheet.querySelector('#frLastPlace')?.addEventListener('click', () => { placeIn.value = store.get('last_location', ''); placeIn.classList.remove('input-bad'); });
    placeIn.addEventListener('input', () => placeIn.classList.remove('input-bad'));
    const getT = (side) => { const t = sheet.querySelector(`.time24[data-side="${side}"]`); return t ? `${t.querySelector('[data-p=h]').value}:${t.querySelector('[data-p=m]').value}` : ''; };
    const setT = (side, v) => { const t = sheet.querySelector(`.time24[data-side="${side}"]`); if (!t) return; const [h, m] = v.split(':'); t.querySelector('[data-p=h]').value = h; t.querySelector('[data-p=m]').value = m; };
    sheet.querySelectorAll('[name=frShift]').forEach((r) => (r.onchange = () => {
      const s = info.shifts.find((x) => x.id === r.value);
      if (needIn) setT('in', s.start);
      if (needOut) setT('out', s.end);
    }));
    ['in', 'out'].forEach((side) => {
      const cb = sheet.querySelector(side === 'in' ? '#wantIn' : '#wantOut');
      if (cb) cb.onchange = () => sheet.querySelectorAll(`.time24[data-side="${side}"] select`).forEach((x) => (x.disabled = !cb.checked));
    });
    const onFile = async (inp) => {
      const f = inp.files[0];
      inp.value = '';
      if (!f) return;
      try {
        evidence = canvasJpeg(await imageFileToCanvas(f, 1600), 3000000);
        const pv = sheet.querySelector('#frPreview');
        pv.src = evidence;
        pv.hidden = false;
        sheet.querySelector('#frNoEvi').hidden = true;
      } catch (err) { toast(err.message, true); }
    };
    sheet.querySelector('#frCam').onchange = (e) => onFile(e.target);
    sheet.querySelector('#frFile').onchange = (e) => onFile(e.target);
    const send = async (allowNoEvidence) => {
      const btn = sheet.querySelector('#frSend');
      const wantIn = needIn && sheet.querySelector('#wantIn').checked;
      const wantOut = needOut && sheet.querySelector('#wantOut').checked;
      if (!wantIn && !wantOut) return toast('กรุณาเลือกอย่างน้อย 1 รายการที่ลืมสแกน', true);
      const place = placeIn.value.replace(/\s+/g, ' ').trim();
      if (place.length < 2) { placeIn.classList.add('input-bad'); placeIn.focus(); placeIn.scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('กรุณาระบุสถานที่ทำงาน', true); }
      // ไม่บังคับแนบหลักฐาน แต่เตือนก่อนส่ง
      if (!evidence && !allowNoEvidence) {
        const w = sheet.querySelector('#frNoEvi');
        w.hidden = false;
        w.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      sheet.querySelector('#frNoEvi').hidden = true;
      busy(btn, true, 'กำลังส่ง…');
      store.set('last_location', place);
      try {
        await api('/api/me/scan-requests', {
          date, shift_id: sheet.querySelector('[name=frShift]:checked').value, location: place,
          in_time: wantIn ? getT('in') : '', out_time: wantOut ? getT('out') : '',
          reason: sheet.querySelector('#frReason').value.trim(), evidence,
        });
        closeSheet();
        toast('ส่งคำขอแล้ว รอผู้ดูแลตรวจสอบ ผลจะแจ้งที่กระดิ่ง 🔔');
        if (document.getElementById('frBody')) renderForgotScan(forgotMonth);
        else if (current === 'cal') renderCalendar(calMonth);
      } catch (err) { toast(err.message, true); busy(btn, false); }
    };
    sheet.querySelector('#frSend').onclick = () => send(false);
    sheet.querySelector('#frSendAnyway').onclick = () => send(true);
    sheet.querySelector('#frGoAttach').onclick = () => { sheet.querySelector('#frNoEvi').hidden = true; sheet.querySelector('.fr-evi').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  }

  // ---------- ยื่นคำร้อง: วันสีแดงที่ไม่ได้ทำงาน/มีเหตุ (หยุดตามคำสั่งหัวหน้างาน, ลา, มาสาย ฯลฯ) ----------
  let appealMonth = null;
  async function renderAppeals(month) {
    const from = current;
    appealMonth = month || appealMonth || ymOf(serverNow());
    view.innerHTML = `
      <button class="back" id="apBack">‹ กลับ</button>
      <h1 class="screen-title"><span class="dot"></span>ยื่นคำร้อง</h1>
      <p class="hint fr-hint">ใช้เมื่อวัน<b class="bad">สีแดง</b>ไม่ได้เกิดจากความผิดของคุณ เช่น <b>หยุดงานตามคำสั่งหัวหน้างาน (ไม่มีงาน)</b>, ลา, มาสาย/ออกก่อนมีเหตุจำเป็น · อนุมัติแล้ววันนั้นจะไม่นับเป็นวันแดง<br>
        ถ้า<b>ทำงานจริงแต่ลืมสแกน</b> ให้ใช้ <button type="button" class="linkbtn" id="apToForgot">📝 ลืมสแกน</button> แทน เพื่อให้ได้เวลาทำงาน</p>
      <div class="cal-head">
        <button class="btn ghost cal-nav" id="apPrevM" aria-label="เดือนก่อน">‹</button>
        <h2 class="fr-month">${esc(monthTH(appealMonth))}</h2>
        <button class="btn ghost cal-nav" id="apNextM" aria-label="เดือนถัดไป">›</button>
      </div>
      <div id="apBody"><div class="card empty">กำลังโหลด…</div></div>`;
    document.getElementById('apBack').onclick = () => go(from);
    document.getElementById('apToForgot').onclick = () => renderForgotScan(appealMonth);
    document.getElementById('apPrevM').onclick = () => renderAppeals(shiftYm(appealMonth, -1));
    document.getElementById('apNextM').onclick = () => renderAppeals(shiftYm(appealMonth, 1));
    let cal;
    try { cal = await api(`/api/me/calendar?month=${appealMonth}`); } catch (err) {
      const b = document.getElementById('apBody');
      if (b) b.innerHTML = `<div class="card empty">${esc(err.message)}<div style="margin-top:12px"><button class="btn primary" id="apRetry">ลองใหม่</button></div></div>`;
      document.getElementById('apRetry')?.addEventListener('click', () => renderAppeals(appealMonth));
      return;
    }
    const body = document.getElementById('apBody');
    if (!body) return;
    calData = cal; // ฟอร์มคำร้องใช้รายการเหตุผลจากข้อมูลปฏิทิน
    const todayStr = todayTHStr();
    document.getElementById('apNextM').disabled = appealMonth >= todayStr.slice(0, 7);
    document.getElementById('apPrevM').disabled = !!cal.start_date && appealMonth <= cal.start_date.slice(0, 7);
    const lead = new Date(`${cal.days[0].date}T12:00:00Z`).getUTCDay();
    const stateOf = (d) => (d.appeal?.status === 'pending' ? 'pending' : d.color === 'excused' ? 'approved' : d.color === 'red' ? 'need' : 'off');
    const MARK = { pending: '⏳', approved: '✓', need: '!', off: '' };
    const mineDays = cal.days.filter((d) => d.appeal);
    const reds = cal.days.filter((d) => d.color === 'red').length;
    body.innerHTML = `
      <div class="card cal-card">
        <div class="cal-grid cal-week">${WEEK_TH.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">
          ${'<span></span>'.repeat(lead)}
          ${cal.days.map((d) => { const st = stateOf(d); return `<button class="cal-day fr-day ap-${st}${d.date === todayStr ? ' today' : ''}" data-date="${d.date}" ${st === 'off' ? 'disabled' : ''}>
            <span class="n">${Number(d.date.slice(8))}</span><span class="m">${MARK[st]}</span></button>`; }).join('')}
        </div>
        <div class="cal-legend">
          <span><i class="fr-need"></i>วันสีแดง (ยื่นคำร้องได้)</span><span><i class="fr-pending"></i>รอพิจารณา</span><span><i class="c-excused"></i>อนุมัติคำร้องแล้ว</span>
        </div>
      </div>
      ${reds ? '' : '<p class="hint">เดือนนี้ไม่มีวันสีแดง ไม่ต้องยื่นคำร้อง</p>'}
      <h2 class="section-title">คำร้องของฉัน (เดือนนี้)</h2>
      ${mineDays.length ? mineDays.map((d) => `
        <div class="card fr-item">
          <div class="fr-item-top"><b>${esc(thDate(d.date))}</b><span class="badge ${d.appeal.status}">${esc(APPEAL_TH[d.appeal.status])}</span></div>
          <div class="sub">${esc(d.appeal.reason)}${d.appeal.note ? ` · ${esc(d.appeal.note)}` : ''}</div>
          ${d.appeal.review_note ? `<div class="sub">ผู้ดูแล: ${esc(d.appeal.review_note)}</div>` : ''}
        </div>`).join('') : '<div class="card empty">ยังไม่มีคำร้องในเดือนนี้</div>'}`;
    body.querySelectorAll('.fr-day:not([disabled])').forEach((b) => (b.onclick = () => openDay(cal.days.find((d) => d.date === b.dataset.date))));
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
      ${d.manual ? '<div class="fr-manual">📝 เวลาของวันนี้บันทึกจากคำขอลืมสแกนที่ผู้ดูแลอนุมัติแล้ว</div>' : ''}
      ${d.issues.length ? `<div class="issue-box"><b>สาเหตุที่เป็นสีแดง</b><ul>${d.issues.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul><small>สีแดงไม่ได้แปลว่าทำผิด · ทำงานแต่ลืมสแกน → กด "ลืมสแกน" · หยุดตามคำสั่งหัวหน้างาน/ลา/มาสายมีเหตุ → ยื่นคำร้องด้านล่าง</small></div>` : ''}
      ${otRows ? `<div class="ot-box"><b>เวลาทำงานเกิน (คิดเป็น OT ได้)</b><ul>${otRows}</ul><small>ถ้าทำ OT จริง ต้องกดขอ OT เอง</small><button class="btn primary sm" id="askOt" style="margin-top:8px">ขอ OT ของวันนี้</button></div>` : ''}
      ${!(d.checkin && d.checkout) && d.date <= todayTHStr() ? `<button class="btn primary big fr-open-btn" id="frFromDay">📝 ลืมสแกน? ขอบันทึกเวลาวันนี้</button>` : ''}
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
    el.querySelector('#frFromDay')?.addEventListener('click', () => { closeSheet(); openForgotForm(d.date); });
    const f = el.querySelector('#apf');
    if (!f) return;
    f.reason.addEventListener('change', () => {
      let tip = f.querySelector('.ap-tip');
      if (/^ลืมสแกน/.test(f.reason.value)) {
        if (!tip) {
          f.reason.closest('.field').insertAdjacentHTML('afterend', '<div class="ap-tip">ถ้าวันนั้น<b>ทำงานจริง</b>แต่ลืมสแกน แนะนำใช้ <button type="button" class="linkbtn">📝 ลืมสแกน</button> แทน ระบบจะบันทึกเวลาทำงานให้ (คำร้องไม่บันทึกเวลา)</div>');
          f.querySelector('.ap-tip button').onclick = () => { closeSheet(); openForgotForm(d.date); };
        }
      } else if (tip) tip.remove();
    });
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!f.reason.value) return toast('กรุณาเลือกเหตุผล', true);
      if (f.note.value.trim().length < 5) return toast('กรุณาอธิบายรายละเอียด', true);
      const btn = el.querySelector('#apBtn');
      busy(btn, true);
      try {
        await api('/api/me/appeals', { date: d.date, reason: f.reason.value, note: f.note.value.trim() });
        closeSheet();
        toast('ส่งคำร้องแล้ว รอผู้ดูแลพิจารณา ผลจะแจ้งที่กระดิ่ง 🔔');
        if (document.getElementById('apBody')) renderAppeals(appealMonth);
        else renderCalendar(calMonth);
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
        ${request.review_note ? `<div class="sub">เหตุผลผู้อนุมัติ: ${esc(request.review_note)}</div>` : ''}</div>`;
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
          <button class="btn ghost sm" id="chAvatar">${me.avatar ? 'เปลี่ยนรูปโปรไฟล์' : 'ถ่ายรูปโปรไฟล์'}</button>
          <button class="btn ghost sm" id="chPhone">เปลี่ยนเบอร์โทร</button>
          <button class="btn ghost sm" id="devCheck">ตรวจอุปกรณ์</button>
          <button class="btn ghost sm" id="chCode">แจ้งรหัสพนักงานผิด</button>
        </div>
        <button class="linkbtn danger" id="logout">ออกจากระบบ</button>
      </div>
      <div class="card pb-card">
        <span class="pb-card-ic">🆘</span>
        <div class="pb-card-txt"><b>พบปัญหาการใช้งาน?</b><small>แจ้งผู้ดูแลพร้อมแนบรูปได้ · ผลการแก้ไขจะแจ้งที่กระดิ่ง 🔔</small></div>
        <div class="pb-card-act"><button class="btn primary sm" id="pbNew">แจ้งปัญหา</button><button class="btn ghost sm" id="pbMine">เรื่องที่ฉันแจ้ง</button></div>
      </div>
      <h1 class="screen-title"><span class="dot"></span>ประวัติของฉัน</h1>
      <div id="hist"><div class="card empty">กำลังโหลด…</div></div>`;
    document.getElementById('chAvatar').onclick = changeAvatar;
    document.getElementById('chPhone').onclick = openPhoneSheet;
    document.getElementById('devCheck').onclick = deviceCheck;
    document.getElementById('chCode').onclick = openCodeSheet;
    document.getElementById('pbNew').onclick = () => openProblemForm('app');
    document.getElementById('pbMine').onclick = openMyProblems;
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
            ${o.review_note ? `<div class="meta">เหตุผลผู้อนุมัติ: ${esc(o.review_note)}</div>` : ''}</div></div>` })),
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
  const heartbeat = () => { if (token && !document.hidden) api('/api/me').then((d) => { const changed = d.employee.avatar !== me.avatar; me = d.employee; store.set('emp_profile', me); if (changed) refreshWho(); setUnread(d.notif_unread || 0); }).catch(() => {}); };
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
    api('/api/me').then((d) => { const changed = d.employee.avatar !== me.avatar; me = d.employee; store.set('emp_profile', me); store.set('last_emp_code', me.emp_code); authLayout(false); if (changed) refreshWho(); setUnread(d.notif_unread || 0); }).catch(() => {});
  } else {
    renderLogin();
  }

  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
