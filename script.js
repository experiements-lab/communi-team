(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- Starfield background ---------- */
  function starfield() {
    var canvas = document.getElementById('stars-canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var stars = [];
    var width = 0;
    var height = 0;
    var lastFrame = 0;

    function setup() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(260, Math.floor((width * height) / 5200));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 0.9 + 0.25,
          a: Math.random() * 0.45 + 0.2,
          s: (Math.random() * 0.0025 + 0.0008) * (Math.random() > 0.5 ? 1 : -1)
        });
      }
      draw(false);
    }

    function draw(twinkle) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (twinkle) {
          s.a += s.s;
          if (s.a > 0.7 || s.a < 0.12) s.s *= -1;
        }
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop(time) {
      // About 30 frames a second is plenty for a slow twinkle and easier on batteries.
      if (time - lastFrame > 33) {
        lastFrame = time;
        draw(true);
      }
      if (!reduceMotion.matches) window.requestAnimationFrame(loop);
    }

    setup();
    if (!reduceMotion.matches) window.requestAnimationFrame(loop);

    // Only rebuild when the width changes, so mobile address bars showing
    // and hiding while scrolling don't reshuffle the sky.
    var lastWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      setup();
    });
  }

  /* ---------- Mobile navigation ---------- */
  function navigation() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 901px)').addEventListener('change', function (event) {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- Hero constellation: scattered questions, one route, one beacon ---------- */
  function constellation() {
    var hero = document.querySelector('.hero');
    var svg = hero && hero.querySelector('.constellation');
    var beacon = hero && hero.querySelector('.beacon');
    var title = hero && hero.querySelector('.hero-title');
    if (!svg || !beacon || !title) return;

    var wide = window.matchMedia('(min-width: 960px)');

    // Stars sit in the open space to the right of the headline. u/v are
    // fractions of that space; the route visits them in order, then lands on
    // the headline's full stop.
    var STARS = [
      { u: 0.30, v: 0.00, label: 'Hire someone?', dx: 0, dy: -18, anchor: 'middle' },
      { u: 0.92, v: 0.12, label: 'Try AI?', dx: 0, dy: -18, anchor: 'middle' },
      { u: 0.80, v: 0.78, label: 'Outsource it?', dx: -16, dy: 5, anchor: 'end' },
      { u: 0.36, v: 1.00, label: 'Fix our IT?', dx: 0, dy: 30, anchor: 'middle' },
      { u: 0.06, v: null, label: 'New software?', dx: 0, dy: -18, anchor: 'middle' }
    ];

    var hasPlayed = false;

    function textRight(el) {
      var range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    }

    function el(name, attrs) {
      var node = document.createElementNS(SVG_NS, name);
      for (var key in attrs) node.setAttribute(key, attrs[key]);
      return node;
    }

    function build(animate) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!wide.matches) return;

      var box = svg.getBoundingClientRect();
      var cs = window.getComputedStyle(hero);
      var b = beacon.getBoundingClientRect();
      var lines = title.querySelectorAll('.line');
      var lede = hero.querySelector('.hero-lede');
      var actions = hero.querySelector('.hero-actions');

      var beaconX = b.left + b.width / 2 - box.left;
      var beaconY = b.top + b.height / 2 - box.top;

      // Free space: right of the second line and the intro text, down to the buttons.
      var left = Math.max(textRight(lines[1]), textRight(lede)) - box.left + 60;
      var right = box.width - parseFloat(cs.paddingRight) - 8;
      var top = lines[1].getBoundingClientRect().top - box.top + 12;
      var bottom = actions.getBoundingClientRect().bottom - box.top - 8;
      // Not enough open sky at this width: leave the hero clean.
      if (right - left < 200 || bottom - top < 220) return;

      var points = STARS.map(function (s) {
        var v = s.v === null ? (beaconY - top) / (bottom - top) : s.v;
        return { x: left + s.u * (right - left), y: top + v * (bottom - top), star: s };
      });
      points.push({ x: beaconX, y: beaconY, star: null });

      var defs = el('defs', {});
      var grad = el('linearGradient', {
        id: 'route-gradient',
        gradientUnits: 'userSpaceOnUse',
        x1: points[0].x, y1: points[0].y,
        x2: beaconX, y2: beaconY
      });
      [['0%', '#1aa3d6'], ['55%', '#c27bc6'], ['100%', '#f8a01a']].forEach(function (stop) {
        grad.appendChild(el('stop', { offset: stop[0], 'stop-color': stop[1] }));
      });
      defs.appendChild(grad);
      svg.appendChild(defs);

      var d = points.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
      var path = el('path', { d: d, class: 'route-line', stroke: 'url(#route-gradient)' });
      svg.appendChild(path);

      // Distance along the route to each star, so each one lights as the line reaches it.
      var total = 0;
      var reach = [0];
      for (var i = 1; i < points.length; i++) {
        total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        reach.push(total);
      }

      var starNodes = [];
      points.forEach(function (p, i) {
        if (!p.star) return;
        var g = el('g', { class: 'star' });
        g.appendChild(el('circle', { class: 'star-halo', cx: p.x, cy: p.y, r: 11 }));
        g.appendChild(el('circle', { class: 'star-core', cx: p.x, cy: p.y, r: 3.2 }));
        var label = el('text', {
          class: 'star-label',
          x: p.x + p.star.dx,
          y: p.y + p.star.dy,
          'text-anchor': p.star.anchor
        });
        label.textContent = p.star.label;
        g.appendChild(label);
        svg.appendChild(g);
        starNodes.push({ node: g, at: reach[i] / total });
      });

      if (!animate || reduceMotion.matches) {
        starNodes.forEach(function (s) { s.node.classList.add('is-on'); });
        return;
      }

      var duration = 2600;
      path.style.strokeDasharray = total;
      path.style.strokeDashoffset = total;
      path.getBoundingClientRect();
      path.classList.add('is-animating');
      path.style.strokeDashoffset = '0';

      starNodes.forEach(function (s) {
        window.setTimeout(function () { s.node.classList.add('is-on'); }, s.at * duration);
      });
      window.setTimeout(function () { beacon.classList.add('is-lit'); }, duration);
    }

    function play() {
      if (hasPlayed) return;
      hasPlayed = true;
      window.setTimeout(function () { build(true); }, 350);
    }

    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(play, play);

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { build(false); }, 150);
    });
  }

  /* ---------- Looping illustrations: play only while visible ---------- */
  function videos() {
    var PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>';
    var PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11a.8.8 0 0 0 1.2.7l9-5.5a.8.8 0 0 0 0-1.4l-9-5.5A.8.8 0 0 0 4 2.5z" fill="currentColor"/></svg>';

    document.querySelectorAll('.loop-video').forEach(function (video) {
      var button = video.parentElement.querySelector('.video-toggle');
      var userPaused = reduceMotion.matches;
      var visible = false;

      function sync() {
        if (!button) return;
        var playing = !video.paused;
        button.innerHTML = playing ? PAUSE : PLAY;
        button.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
      }

      function start() {
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});
      }

      if (button) {
        button.hidden = false;
        sync();
        button.addEventListener('click', function () {
          if (video.paused) {
            userPaused = false;
            start();
          } else {
            userPaused = true;
            video.pause();
          }
        });
      }

      video.addEventListener('play', sync);
      video.addEventListener('pause', sync);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible && !userPaused) start();
            else if (!visible) video.pause();
          });
        }, { threshold: 0.35 }).observe(video);
      } else if (!userPaused) {
        start();
      }
    });
  }

  /* ---------- Enquiry form ---------- */
  function enquiry() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var status = form.querySelector('.form-status');
    var message = form.querySelector('#f-message');
    var to = form.getAttribute('data-to');

    var ERRORS = {
      name: { valueMissing: 'Enter your name.' },
      email: {
        valueMissing: 'Enter an email address we can reply to.',
        typeMismatch: 'Enter a valid email address, like name@company.co.za.'
      },
      message: { valueMissing: 'Tell us a little about what’s going on.' }
    };

    // "Ask us about this" buttons carry the visitor's situation into the form.
    document.querySelectorAll('[data-situation]').forEach(function (button) {
      button.addEventListener('click', function () {
        var text = button.getAttribute('data-situation');
        if (text) message.value = text + ' ';
        var smooth = !reduceMotion.matches;
        form.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        window.setTimeout(function () {
          var firstEmpty = Array.prototype.find.call(form.querySelectorAll('[required]'), function (f) {
            return !f.value.trim();
          });
          var target = firstEmpty || message;
          target.focus({ preventScroll: true });
          if (target === message) message.setSelectionRange(message.value.length, message.value.length);
        }, smooth ? 500 : 0);
      });
    });

    function clearError(field) {
      field.removeAttribute('aria-invalid');
      var existing = document.getElementById(field.id + '-error');
      if (existing) existing.remove();
      field.removeAttribute('aria-describedby');
    }

    function showError(field, text) {
      field.setAttribute('aria-invalid', 'true');
      var note = document.createElement('p');
      note.className = 'field-error';
      note.id = field.id + '-error';
      note.textContent = text;
      field.insertAdjacentElement('afterend', note);
      field.setAttribute('aria-describedby', note.id);
    }

    function validate() {
      var firstInvalid = null;
      form.querySelectorAll('input, textarea').forEach(function (field) {
        clearError(field);
        if (field.required && !field.value.trim()) field.value = '';
        if (field.checkValidity()) return;
        var messages = ERRORS[field.name] || {};
        var text = field.validity.valueMissing ? messages.valueMissing : messages.typeMismatch;
        showError(field, text || field.validationMessage);
        if (!firstInvalid) firstInvalid = field;
      });
      return firstInvalid;
    }

    form.querySelectorAll('input, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true' && field.checkValidity()) clearError(field);
      });
    });

    function value(name) {
      var field = form.elements[name];
      return field ? field.value.trim() : '';
    }

    function openEmail() {
      var name = value('name');
      var company = value('company');
      var subject = 'Website enquiry from ' + name + (company ? ' (' + company + ')' : '');
      var body = [
        'Name: ' + name,
        'Email: ' + value('email'),
        'Company: ' + (company || '-'),
        'Phone or WhatsApp: ' + (value('phone') || '-'),
        'What I think I need: ' + value('need'),
        '',
        'What’s going on:',
        value('message')
      ].join('\r\n');

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      status.classList.remove('is-success');
      status.innerHTML = 'Your email app should now open with your message ready. Press send there to reach us. ' +
        'Nothing opened? Email us at <a href="mailto:' + to + '">' + to + '</a>.';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = '';
      var invalid = validate();
      if (invalid) {
        invalid.focus();
        return;
      }

      // Optional: set data-endpoint on the form (for example a Formspree or
      // Zoho Forms URL) to send messages directly instead of via email.
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint || !window.fetch) {
        openEmail();
        return;
      }

      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed');
          form.reset();
          status.classList.add('is-success');
          status.textContent = 'Message sent. We’ll get back to you shortly.';
        })
        .catch(openEmail)
        .then(function () { button.disabled = false; });
    });
  }

  starfield();
  navigation();
  constellation();
  videos();
  enquiry();
})();
