/* =====================================================================
   Legendure motion
   Load after assets/site.js on every page:
     <script src="assets/site.js" defer></script>
     <script src="assets/motion.js" defer></script>
   No libraries. Uses the Web Animations API and IntersectionObserver.

   Rules this file follows:
   - Content is fully visible without JavaScript. Entrances animate FROM a
     hidden state (fill: backwards), so nothing is left invisible.
   - One entrance move: rise and fade, ease-out, never tied to the scrollbar.
   - Things that travel (the cycle runner, the process rail, green bars)
     use ease-in-out.
   - Loops run only while their section is on screen and the tab is visible.
   - Reduced motion or "Pause motion" = still mode: no entrances, no loops,
     every section shows a finished frame, every control still works.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var EASE_OUT = 'cubic-bezier(.215,.61,.355,1)';
  var EASE_INOUT = 'cubic-bezier(.645,.045,.355,1)';
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var stored = null;
  try { stored = localStorage.getItem('legendure-motion'); } catch (e) {}
  var still = reduceMQ.matches || stored === 'off';
  var paused = stored === 'off';

  if (!still) root.classList.add('js-motion');
  if (paused) root.classList.add('motion-paused');

  /* ---------------- helpers ---------------- */
  function canAnimate(el) { return !still && el && typeof el.animate === 'function'; }

  function rise(el, opts) {
    if (!canAnimate(el)) return null;
    opts = opts || {};
    var y = opts.y == null ? 24 : opts.y;
    return el.animate(
      [{ opacity: 0, transform: 'translateY(' + y + (typeof y === 'number' ? 'px' : '') + ')' }, { opacity: 1, transform: 'none' }],
      { duration: opts.duration || 800, delay: opts.delay || 0, easing: EASE_OUT, fill: 'backwards' }
    );
  }

  /* Wrap each word in .word so a headline can rise word by word. Keeps <em> etc. */
  function splitWords(el) {
    if (!el || el.dataset.split) return $$('.word', el);
    el.dataset.split = '1';
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'word'; w.textContent = part; frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('word')) { walk(n); }
      });
    })(el);
    return $$('.word', el);
  }

  function riseWords(el, start) {
    splitWords(el).forEach(function (w, i) {
      rise(w, { y: '40%', duration: 900, delay: (start || 0) + i * 50 });
    });
  }

  /* Run fn once when el scrolls into view (top passes 88% of the screen). */
  var onceObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      onceObserver.unobserve(e.target);
      var fn = e.target.__onEnter; e.target.__onEnter = null;
      if (fn) fn(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;

  function whenSeen(el, fn) {
    if (!el) return;
    if (!onceObserver) { fn(el); return; }
    el.__onEnter = fn; onceObserver.observe(el);
  }

  /* Track whether a looping section is on screen. */
  function visibility(el) {
    var state = { on: false };
    if (!('IntersectionObserver' in window)) { state.on = true; return state; }
    new IntersectionObserver(function (es) { state.on = es[0].isIntersecting; }).observe(el);
    return state;
  }
  function loopAllowed(vis) { return !still && !paused && vis.on && !document.hidden; }

  /* A tiny clock for loops: calls tick(dt) each frame while allowed. */
  function runLoop(vis, tick) {
    var last = performance.now();
    (function frame(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (loopAllowed(vis)) tick(dt);
      requestAnimationFrame(frame);
    })(last);
  }

  /* ---------------- 1. header ---------------- */
  var header = $('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------------- 2. hero load sequence ---------------- */
  // Order: photo opens along the diagonal, headline rises word by word,
  // green rule draws, subhead and buttons follow, then the cycle card.
  var inner = $('.inner-hero');
  if (inner && !still) {
    var photo = $('.hero-photo', inner) || $('.inner-art', inner);
    if (photo && photo.animate) {
      photo.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1200, easing: EASE_INOUT, fill: 'backwards' });
      var img = $('img', photo);
      if (img) img.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 1800, easing: EASE_OUT, fill: 'backwards' });
    }
    riseWords($('h1', inner), 250);
    var rule = $('.hero-rule-line', inner);
    if (rule) rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 500, easing: EASE_INOUT, fill: 'backwards' });
    $$('.subhead, .inner-actions', inner).forEach(function (el, i) { rise(el, { y: 16, duration: 700, delay: 600 + i * 80 }); });
    rise($('.hero-graphic', inner), { y: 30, duration: 900, delay: 900 });
  }
  var home = $('.hero--approved');
  if (home && !still) {
    var art = $('.hero-art', home);
    if (art) art.animate([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, easing: EASE_OUT, fill: 'backwards' });
    riseWords($('h1', home), 250);
    var hr = $('.hero-rule', home);
    if (hr) hr.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 500, easing: EASE_INOUT, fill: 'backwards' });
    $$('.hero-description, .hero-pillar, .hero-actions', home).forEach(function (el, i) { rise(el, { y: 16, duration: 700, delay: 600 + i * 80 }); });
  }

  /* ---------------- 3. the cycle card, live ---------------- */
  // Markup: see HANDOFF.md section "Hero cycle card".
  var graphic = $('.hero-graphic');
  if (graphic && $('.hg-runner', graphic)) {
    var pills = $$('.hg-pill', graphic);
    var runner = $('.hg-runner', graphic);
    var status = $('.hg-status', graphic);
    var stepName = status && $('.hg-step', status), stepText = status && $('.hg-work', status);
    var bar = status && $('.hg-progress', status);
    var CX = 120, CY = 70, R = 44;
    var ANGLES = [-90, 0, 90, 180];                     // Discover top, Prioritize right, Enable bottom, Improve left
    var WORK = pills.map(function (p) { return p.getAttribute('data-work') || ''; });
    var NAMES = pills.map(function (p) { return (p.textContent || '').trim(); });
    var TRAVEL = .9, FILL = 1.5, HOLD = .7, STEP = TRAVEL + FILL + HOLD;
    var step = 0, t = 0, fromA = ANGLES[3] - 360;

    var placeRunner = function (deg) {
      var a = deg * Math.PI / 180;
      runner.setAttribute('cx', (CX + R * Math.cos(a)).toFixed(2));
      runner.setAttribute('cy', (CY + R * Math.sin(a)).toFixed(2));
    };
    var easeIO = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var setStep = function (i) {
      pills.forEach(function (p, k) {
        p.classList.toggle('is-active', k === i);
        p.classList.toggle('is-done', k < i);
      });
      if (status) { stepName.textContent = NAMES[i]; stepText.textContent = WORK[i]; status.classList.remove('is-done'); }
    };
    var render = function () {
      var to = ANGLES[step]; while (to <= fromA) to += 360;
      var u = Math.min(1, t / TRAVEL);
      placeRunner(fromA + (to - fromA) * easeIO(u));
      var p = Math.max(0, Math.min(1, (t - TRAVEL) / FILL));
      if (bar) bar.style.setProperty('--p', p.toFixed(3));
      if (status) status.classList.toggle('is-done', t >= TRAVEL + FILL);
    };

    if (still) {                                        // a composed frame: step 2 in progress
      step = 1; setStep(1); placeRunner(ANGLES[1]); if (bar) bar.style.setProperty('--p', .6);
    } else {
      setStep(0); placeRunner(ANGLES[0] - 1);
      var gVis = visibility(graphic);
      runLoop(gVis, function (dt) {
        t += dt;
        if (t >= STEP) {
          t -= STEP;
          var prev = ANGLES[step]; fromA = prev;
          step = (step + 1) % ANGLES.length;
          setStep(step);
        }
        render();
      });
    }
  }

  /* ---------------- 4. section headlines and standard reveals ---------------- */
  $$('.section-head h2, .section-title, .feature-two h2, .end-cta h2').forEach(function (h) {
    if (h.closest('.inner-hero, .hero--approved')) return;
    whenSeen(h, function (el) { riseWords(el, 0); });
  });

  // groups that reveal one after another
  var GROUPS = [
    ['.line-items', '.line-item'],
    ['.phase-grid', '.phase'],
    ['.faq-list', 'details'],
    ['.exp-split', '.exp-inline'],
    ['.footer-link-cols', ':scope > div'],
    ['.core-grid, .core-tiles', '.core-tile'],
    ['.exp-stats, .exp-stat-grid', '.exp-stat'],
    ['.end-cta .shell', '.btn']
  ];
  GROUPS.forEach(function (g) {
    $$(g[0]).forEach(function (parent) {
      var items; try { items = $$(g[1], parent); } catch (e) { items = []; }
      if (!items.length) return;
      whenSeen(parent, function () { items.forEach(function (el, i) { rise(el, { delay: i * 80 }); }); });
    });
  });

  /* ---------------- 5. the delivery line ---------------- */
  $$('.phase').forEach(function (p) { p.classList.add('dl'); });
  $$('.dl').forEach(function (el, i) { whenSeen(el, function (x) { x.classList.add('is-in'); }); });

  /* ---------------- 6. process track ---------------- */
  var track = $('.process-track');
  if (track) {
    var phases = $$('.phase', track);
    var rail = $('.process-rail i', track);
    var PHASE_SECONDS = 3.6;
    var cur = -1, elapsed = 0, hold = false;
    phases.forEach(function (p, i) {
      p.tabIndex = 0;
      if (!$('.phase-timer', p)) { var tm = document.createElement('span'); tm.className = 'phase-timer'; tm.innerHTML = '<i></i>'; p.appendChild(tm); }
      p.addEventListener('click', function () { select(i); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
    });
    track.addEventListener('focusin', function () { hold = true; });
    track.addEventListener('focusout', function (e) { if (!track.contains(e.relatedTarget)) hold = false; });
    function select(i) {
      cur = i; elapsed = 0;
      phases.forEach(function (p, k) {
        p.classList.toggle('is-active', k === i);
        var timer = $('.phase-timer i', p); if (timer) timer.style.transform = 'scaleX(0)';
      });
      if (rail) rail.parentNode.style.setProperty('--rail', ((i + 1) / phases.length).toFixed(3));
      if (rail) rail.style.transform = 'scaleX(' + ((i + 1) / phases.length) + ')';
    }
    track.classList.add('is-live');
    if (still) { select(1); }
    else {
      var tVis = visibility(track);
      whenSeen(track, function () { select(0); });
      runLoop(tVis, function (dt) {
        if (cur < 0 || hold) return;
        elapsed += dt;
        var timer = $('.phase-timer i', phases[cur]);
        if (timer) timer.style.transform = 'scaleX(' + Math.min(1, elapsed / PHASE_SECONDS).toFixed(3) + ')';
        if (elapsed >= PHASE_SECONDS) select((cur + 1) % phases.length);
      });
    }
  }

  /* ---------------- 7. starting points: rows check in ---------------- */
  $$('.feature-two ul').forEach(function (ul) {
    var rows = $$('li', ul);
    if (still) { ul.classList.add('is-played'); return; }
    whenSeen(ul, function () {
      rows.forEach(function (li, i) {
        setTimeout(function () {
          li.classList.add('is-lit', 'is-on');
          setTimeout(function () { li.classList.remove('is-on'); }, 420);
          if (i === rows.length - 1) ul.classList.add('is-played');
        }, 200 + i * 260);
      });
    });
  });

  /* ---------------- 8. network art draws in ---------------- */
  $$('.feature-art').forEach(function (artEl) {
    var svg = $('svg', artEl);
    if (!svg) return;
    $$('.net-edge', svg).forEach(function (edge, i) {
      var len = edge.getTotalLength ? Math.ceil(edge.getTotalLength()) : 400;
      edge.style.setProperty('--len', len);
      edge.style.setProperty('--d', (i * .06).toFixed(2) + 's');
    });
    $$('.net-node', svg).forEach(function (n, i) { n.style.setProperty('--d', (.5 + i * .07).toFixed(2) + 's'); });
    whenSeen(artEl, function (x) { x.classList.add('is-in'); });
  });

  /* ---------------- 9. figures flicker and settle ---------------- */
  // Each digit spins, then locks in left to right. Runs once.
  var settleGroups = new Map();
  $$('[data-settle]').forEach(function (el) {
    var host = el.closest('section') || el.parentNode;
    if (!settleGroups.has(host)) settleGroups.set(host, []);
    settleGroups.get(host).push(el);
  });
  settleGroups.forEach(function (els, host) {
    var finals = els.map(function (el) { return el.getAttribute('data-settle') || el.textContent; });
    if (still) return;
    whenSeen(host, function () {
      var t0 = performance.now();
      var roll = function (str, e) {
        var d = 0;
        return str.replace(/\d/g, function (digit) {
          var lock = .3 + d++ * .15;
          if (e >= lock) return digit;
          return String(Math.floor(Math.max(0, e) / lock * (Number(digit) + 10)) % 10);
        });
      };
      (function frame(now) {
        var e = (now - t0) / 1000;
        els.forEach(function (el, i) { el.textContent = e >= 1.6 + i * .1 ? finals[i] : roll(finals[i], e - i * .1); });
        if (e < 1.6 + els.length * .1) requestAnimationFrame(frame);
      })(t0);
    });
  });

  /* ---------------- 10. FAQ opens smoothly ---------------- */
  $$('.faq-list details').forEach(function (d) {
    var summary = $('summary', d);
    if (!summary || $('.faq-body', d)) return;
    var body = document.createElement('div'); body.className = 'faq-body';
    var innerDiv = document.createElement('div'); body.appendChild(innerDiv);
    Array.prototype.slice.call(d.childNodes).forEach(function (n) { if (n !== summary) innerDiv.appendChild(n); });
    d.appendChild(body);
    if (still) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (d.open) {
        d.classList.add('is-closing');
        setTimeout(function () { d.open = false; d.classList.remove('is-closing'); }, 450);
      } else {
        d.open = true;
        requestAnimationFrame(function () { d.classList.add('is-opening'); });
        setTimeout(function () { d.classList.remove('is-opening'); }, 500);
      }
    });
  });

  /* ---------------- 11. footer line ---------------- */
  var footer = $('.page-footer');
  if (footer && !still) {
    footer.style.setProperty('--foot', 0);
    whenSeen(footer, function () {
      var line = footer;
      var t0 = performance.now(), dur = 1200;
      (function frame(now) {
        var x = Math.min(1, (now - t0) / dur);
        var e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        line.style.setProperty('--foot', e.toFixed(3));
        if (x < 1) requestAnimationFrame(frame);
      })(t0);
    });
  }

  /* ---------------- 12. pause motion ---------------- */
  var bottom = $('.page-footer .bottom');
  if (bottom && !$('.motion-toggle', bottom)) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'motion-toggle';
    btn.textContent = paused ? 'Play motion' : 'Pause motion';
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    btn.addEventListener('click', function () {
      paused = !paused;
      root.classList.toggle('motion-paused', paused);
      btn.textContent = paused ? 'Play motion' : 'Pause motion';
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      try { localStorage.setItem('legendure-motion', paused ? 'off' : 'on'); } catch (e) {}
    });
    bottom.appendChild(btn);
  }
})();
