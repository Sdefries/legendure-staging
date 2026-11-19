(() => {
  // ---- Mobile navigation
  const toggle = document.querySelector('.menu-button');
  const menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    const setOpen = (open, { focusToggle = false } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.classList.toggle('open', open);
      if (!open && focusToggle) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) setOpen(false, { focusToggle: true });
    });
    // Close if the viewport grows past the mobile breakpoint while open.
    window.matchMedia('(min-width: 1051px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
  }

  // ---- Desktop "Our expertise" dropdown: close on outside click / Escape
  const drop = document.querySelector('.nav-expertise');
  if (drop) {
    document.addEventListener('click', (e) => { if (drop.open && !drop.contains(e.target)) drop.open = false; });
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drop.open) { drop.open = false; drop.querySelector('summary').focus(); }
    });
    drop.addEventListener('focusout', (e) => { if (drop.open && !drop.contains(e.relatedTarget)) drop.open = false; });
  }

  for (const el of document.querySelectorAll('[data-year]')) el.textContent = new Date().getFullYear();

  // ---- Inquiry form
  const form = document.getElementById('inquiry-form');
  if (!form) return;
  const select = form.querySelector('#need');
  const need = new URLSearchParams(location.search).get('need');
  if (need && select && [...select.options].some((o) => o.value === need)) select.value = need;

  const status = document.getElementById('form-status');
  const say = (msg, kind) => { status.textContent = msg; status.dataset.kind = kind || ''; status.hidden = false; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.dataset.mode !== 'live') {
      // Preview mode: never imply that anything was sent.
      say('Preview mode: this form is not connected yet, so nothing was sent or saved. Please email, call or book a meeting using the details on this page.', 'warn');
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return; // honeypot filled — silently drop
    delete data.website;
    data.needLabel = select.options[select.selectedIndex].text;
    data.page = location.pathname;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say("Thanks. Your inquiry has been received. We'll review the scope and follow up through the contact information you provided.", 'ok');
    } catch {
      say('Your inquiry could not be sent. Please try again in a moment.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
