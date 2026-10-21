// ป้องกันการซูม / คัดลอกข้อความ / บันทึกรูป / แคปหน้าจอ / พิมพ์ (ใช้ทั้งหน้าพนักงานและผู้ดูแล)
// หมายเหตุ: เว็บเบราว์เซอร์ไม่สามารถบล็อกการแคปหน้าจอของระบบปฏิบัติการได้ 100%
// ระบบนี้จึงใช้หลายชั้น: ซ่อนข้อมูลเมื่อออกจากหน้าต่าง, ล้างคลิปบอร์ดเมื่อกด PrintScreen, ห้ามพิมพ์, ลายน้ำบนรูป
(() => {
  const isField = (el) => el && (el.closest?.('input, textarea, select, [contenteditable="true"]'));
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };

  // ---------- กันซูม: หน้าจอพอดีกับอุปกรณ์เสมอ ----------
  // iOS Safari ไม่สน user-scalable=no จึงต้องกัน gesture เอง
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, stop, { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  // การแตะสองครั้งเพื่อซูมกันด้วย CSS touch-action: manipulation (ไม่ทำให้ปุ่มกดช้า)
  document.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });

  // ---------- กันคัดลอก / ลากรูป / คลิกขวา ----------
  document.addEventListener('contextmenu', (e) => { if (!isField(e.target)) stop(e); });
  document.addEventListener('dragstart', stop);
  document.addEventListener('selectstart', (e) => { if (!isField(e.target)) stop(e); });
  document.addEventListener('copy', (e) => { if (!isField(e.target)) { stop(e); e.clipboardData?.setData('text/plain', ''); } });
  document.addEventListener('cut', (e) => { if (!isField(e.target)) stop(e); });

  // ---------- กันปุ่มลัด: ซูม, บันทึก, พิมพ์, ดูซอร์ส, เครื่องมือนักพัฒนา ----------
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (mod && ['+', '-', '=', '0', '_'].includes(k)) return stop(e);
    if (mod && ['s', 'p', 'u'].includes(k)) return stop(e);
    if (mod && ['c', 'x', 'a'].includes(k) && !isField(e.target)) return stop(e);
    if (k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c', 's'].includes(k))) return stop(e);
    if (k === 'printscreen') { shield('ไม่อนุญาตให้แคปหน้าจอ'); clearClipboard(); }
  }, true);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') { shield('ไม่อนุญาตให้แคปหน้าจอ'); clearClipboard(); }
  }, true);

  function clearClipboard() {
    try { navigator.clipboard?.writeText(''); } catch { /* ไม่มีสิทธิ์ */ }
  }

  // ---------- ซ่อนข้อมูลเมื่อออกจากหน้าต่าง (เช่นเปิดโปรแกรมแคปจอ Win+Shift+S) ----------
  let shieldEl;
  function shield(msg = 'ซ่อนข้อมูลเพื่อความปลอดภัย') {
    if (!shieldEl) {
      shieldEl = document.createElement('div');
      shieldEl.className = 'guard-shield';
      document.body.appendChild(shieldEl);
    }
    shieldEl.textContent = msg;
    document.body.classList.add('guarded');
  }
  function unshield() { document.body.classList.remove('guarded'); }
  window.addEventListener('blur', () => { if (document.body.dataset.guard === 'strict') shield(); });
  window.addEventListener('focus', unshield);
  // กลับมาที่แอป: หน้าพนักงานเปิดข้อมูลทันที / หน้าผู้ดูแล (strict) ต้องโฟกัสหน้าต่างก่อน
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) shield();
    else if (document.body.dataset.guard !== 'strict' || document.hasFocus()) unshield();
  });
  document.addEventListener('pointerdown', () => { if (document.hasFocus()) unshield(); });

  // ห้ามพิมพ์หน้าเว็บ
  window.addEventListener('beforeprint', () => shield('ไม่อนุญาตให้พิมพ์'));
  window.addEventListener('afterprint', unshield);

  window.Guard = { shield, unshield };
})();
