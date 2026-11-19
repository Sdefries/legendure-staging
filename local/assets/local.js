// Legendure Local: free check form. Preview mode never claims anything was sent.
(() => {
  const form = document.getElementById('check-form');
  if (!form) return;
  const trade = new URLSearchParams(location.search).get('trade');
  const select = form.querySelector('#f-trade');
  if (trade && [...select.options].some((o) => o.value === trade)) select.value = trade;

  const status = document.getElementById('form-status');
  const say = (msg, kind) => { status.textContent = msg; status.dataset.kind = kind || ''; status.hidden = false; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.dataset.mode !== 'live') {
      say('Preview mode: this form is not connected yet, so nothing was sent or saved.', 'warn');
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return; // honeypot
    delete data.website;
    data.page = location.pathname;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say("Thanks. We'll run your check and email the results.", 'ok');
    } catch {
      say('Your request could not be sent. Please try again in a moment.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();

// Growth path: select a stage to show its detail. ?for=Company&stage=id = "Prepared for" view.
(() => {
  const map = document.querySelector('.gp-map');
  if (!map) return;
  const root = document.getElementById('path');
  root.classList.add('js-gp');
  const buttons = [...root.querySelectorAll('[data-stage]')].filter((b) => b.tagName === 'BUTTON');
  const details = [...root.querySelectorAll('.gp-detail')];
  const select = (id, scroll) => {
    buttons.forEach((b) => { const on = b.dataset.stage === id; b.classList.toggle('is-on', on); b.setAttribute('aria-expanded', String(on)); });
    details.forEach((d) => d.classList.toggle('is-on', d.dataset.stage === id));
    if (scroll) document.getElementById('gp-' + id).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.stage, true)));

  const q = new URLSearchParams(location.search);
  const who = (q.get('for') || '').slice(0, 80).trim();
  const start = q.get('stage');
  const valid = buttons.some((b) => b.dataset.stage === start);
  if (who) {
    const p = root.querySelector('.gp-prepared');
    p.querySelector('strong').textContent = who;
    p.hidden = false;
  }
  if (valid) {
    const btn = buttons.find((b) => b.dataset.stage === start);
    const mark = btn.querySelector('.gp-mark');
    if (mark) { mark.textContent = 'Start here'; mark.hidden = false; }
    const flag = document.querySelector('#gp-' + start + ' .gp-start');
    if (flag) flag.hidden = false;
  }
  select(valid ? start : buttons[0].dataset.stage, false);
})();
