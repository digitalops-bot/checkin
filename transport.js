// ช่องทางคุยกับระบบหลังบ้าน — โค้ดหน้าเว็บชุดเดียวใช้ได้ 2 แบบ
//  - node: เซิร์ฟเวอร์ Node.js (server.js) บนเครื่อง/เซิร์ฟเวอร์ของเราเอง
//  - gas : Google Apps Script (ตั้ง APP_CONFIG.GAS_URL ใน config.js)
(() => {
  const CFG = window.APP_CONFIG || {};
  const GAS_URL = CFG.GAS_URL || '';
  const mode = GAS_URL ? 'gas' : 'node';
  const ADMIN_KEY = 'adm_token';

  const adminToken = {
    get() { try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; } },
    set(t) { try { t ? sessionStorage.setItem(ADMIN_KEY, t) : sessionStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ } },
  };

  // คืนค่า { status, data } เสมอ (ไม่โยน error เมื่อสถานะไม่ใช่ 200)
  async function request(method, path, { body, token, admin } = {}) {
    if (mode === 'node') {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const res = await fetch(path.replace(/^\//, ''), {
        method, headers, credentials: 'same-origin', body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    }
    // Google Apps Script: ส่งทุกอย่างเป็น POST แบบ text/plain (ไม่ต้องผ่าน CORS preflight)
    const payload = { method, path, body, token: token || undefined, admin_token: admin ? adminToken.get() || undefined : undefined };
    let res;
    try {
      res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
    } catch {
      return { status: 0, data: { error: 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต' } };
    }
    const out = await res.json().catch(() => null);
    if (!out) return { status: 502, data: { error: 'ระบบไม่ตอบสนอง กรุณาลองใหม่' } };
    if (admin && out.data && out.data.admin_token) adminToken.set(out.data.admin_token);
    if (admin && out.status === 401) adminToken.set('');
    return { status: out.status, data: out.data || {} };
  }

  // รูปสแกน (ผู้ดูแลเท่านั้น) → Blob
  async function photo(file) {
    if (mode === 'node') {
      const r = await fetch(`uploads/${encodeURIComponent(file)}`, { headers: { 'X-Photo-Request': '1' }, cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error('โหลดรูปไม่ได้');
      return r.blob();
    }
    const { status, data } = await request('GET', `/api/admin/photo?file=${encodeURIComponent(file)}`, { admin: true });
    if (status !== 200 || !data.base64) throw new Error(data.error || 'โหลดรูปไม่ได้');
    const bin = atob(data.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: data.mime || 'image/jpeg' });
  }

  // ดาวน์โหลดไฟล์ CSV (ผู้ดูแล)
  async function download(path, fallbackName) {
    let blob;
    let name = fallbackName;
    if (mode === 'node') {
      const r = await fetch(path.replace(/^\//, ''), { credentials: 'same-origin' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'ดาวน์โหลดไม่ได้');
      const cd = r.headers.get('content-disposition') || '';
      const m = /filename\*=UTF-8''([^;]+)/.exec(cd);
      if (m) name = decodeURIComponent(m[1]);
      blob = await r.blob();
    } else {
      const { status, data } = await request('GET', path, { admin: true });
      if (status !== 200) throw new Error(data.error || 'ดาวน์โหลดไม่ได้');
      name = data.filename || name;
      blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  window.Backend = { mode, request, photo, download, adminToken };
})();
