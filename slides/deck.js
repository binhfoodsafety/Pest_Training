// Pest Training — điều hướng slide + thuyết minh tiếng Việt (Google Translate TTS)
(function () {
  var deck = document.querySelector('.deck');
  var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  var moduleName = document.body.getAttribute('data-module') || '';
  var idx = 0;

  function load(k, d) { try { var v = localStorage.getItem('pt_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('pt_' + k, JSON.stringify(v)); } catch (e) {} }

  // Theme theo trang cha (index) nếu được nhúng trong iframe
  try {
    var t = new URLSearchParams(location.search).get('theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}

  slides.forEach(function (s, i) {
    s.setAttribute('data-module', moduleName);
    var n = document.createElement('div');
    n.className = 'num';
    n.textContent = (i + 1) + ' / ' + slides.length;
    s.appendChild(n);
  });

  var stage = document.createElement('div');
  stage.className = 'stage';
  deck.parentNode.insertBefore(stage, deck);
  stage.appendChild(deck);

  var nav = document.createElement('div');
  nav.className = 'nav';
  nav.innerHTML =
    '<div class="grp">' +
      '<button type="button" data-go="first" title="Slide đầu (Home)" aria-label="Slide đầu">⏮</button>' +
      '<button type="button" data-go="prev" title="Slide trước (←)">‹ Trước</button>' +
      '<span class="count"></span>' +
      '<button type="button" data-go="next" title="Slide tiếp (→)">Tiếp ›</button>' +
    '</div>' +
    '<div class="grp audio">' +
      '<button type="button" class="primary" data-tts="play" title="Phát / tạm dừng thuyết minh (P)">▶ Phát</button>' +
      '<button type="button" data-tts="replay" title="Đọc lại slide này">↻ Đọc lại</button>' +
      '<button type="button" data-tts="stop" title="Dừng đọc">■</button>' +
      '<button type="button" data-tts="mute" aria-pressed="false" title="Tắt / bật tiếng">🔊</button>' +
      '<label title="Tốc độ đọc">Tốc độ <select data-tts="rate">' +
        [0.9, 1, 1.2, 1.4].map(function (r) { return '<option value="' + r + '">' + String(r).replace('.', ',') + '×</option>'; }).join('') +
      '</select></label>' +
      '<label title="Đọc xong tự chuyển slide"><input type="checkbox" data-tts="auto"> Tự chuyển</label>' +
      '<button type="button" data-tts="text" aria-pressed="false" title="Xem lời thuyết minh">📝</button>' +
      '<span class="status" role="status"></span>' +
    '</div>' +
    '<div class="grp end">' +
      '<button type="button" data-go="read" title="Xem dạng cuộn">☰</button>' +
      '<button type="button" data-go="full" title="Toàn màn hình (F)">⛶</button>' +
    '</div>' +
    '<div class="tts-track"><i></i></div>';
  document.body.appendChild(nav);
  // App đã cài không có nút Back của trình duyệt: thêm đường về trang chủ
  if (window.top === window && (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches)) {
    var home = document.createElement('a');
    home.id = 'appHome';
    home.href = '../index.html';
    home.textContent = '‹ Trang chủ';
    document.body.appendChild(home);
  }
  var bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  var textBox = document.createElement('div');
  textBox.className = 'say-box';
  textBox.hidden = true;
  stage.appendChild(textBox);
  var disclosure = document.createElement('div');
  disclosure.className = 'tts-note';
  disclosure.textContent = 'Thuyết minh dùng Google Translate TTS · cần Internet · lời đọc được gửi tới Google';
  document.body.appendChild(disclosure);

  var countEl = nav.querySelector('.count');
  var prevBtn = nav.querySelector('[data-go="prev"]');
  var nextBtn = nav.querySelector('[data-go="next"]');
  var statusEl = nav.querySelector('.status');
  var playBtn = nav.querySelector('[data-tts="play"]');
  var muteBtn = nav.querySelector('[data-tts="mute"]');
  var rateSel = nav.querySelector('[data-tts="rate"]');
  var autoChk = nav.querySelector('[data-tts="auto"]');
  var textBtn = nav.querySelector('[data-tts="text"]');
  var trackEl = nav.querySelector('.tts-track i');

  // ── Lời thuyết minh ──
  // Ưu tiên <div class="say"> viết sẵn trong slide; nếu không có thì lấy chữ trên slide,
  // bỏ thuật ngữ tiếng Anh in nghiêng (<i>, .en) để giọng tiếng Việt đọc tự nhiên.
  function narration(s) {
    var say = s.querySelector('.say');
    if (say) return say.textContent.replace(/\s+/g, ' ').trim();
    var c = s.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.num, .eyebrow, .meta, .no-say, .flow > div > b + i'), function (el) { el.remove(); });
    // Ngắt câu trước các khối con hiển thị xuống dòng (VD: <small> trong kim tự tháp, nhãn trong bước)
    Array.prototype.forEach.call(c.querySelectorAll('small, br'), function (el) { el.parentNode.insertBefore(document.createTextNode('. '), el); });
    Array.prototype.forEach.call(c.querySelectorAll('.flow > div > b, .scale-labels > span, .formula > span, .formula > em'), function (el) {
      el.appendChild(document.createTextNode(' '));
      if (el.matches('.flow > div > b, .scale-labels > span')) el.appendChild(document.createTextNode('. '));
    });
    // Bỏ thuật ngữ tiếng Anh đặt trong ngoặc, hoặc dòng chỉ toàn chữ nghiêng; giữ tên loài nằm giữa câu
    var italics = Array.prototype.slice.call(c.querySelectorAll('i, .en'));
    var parents = [];
    italics.forEach(function (el) {
      var prev = el.previousSibling;
      if (prev && prev.nodeType === 3 && /\(\s*$/.test(prev.textContent)) el.setAttribute('data-drop', '');
      if (parents.indexOf(el.parentNode) < 0) parents.push(el.parentNode);
    });
    parents.forEach(function (p) {
      var rest = Array.prototype.map.call(p.childNodes, function (n) {
        return (n.nodeType === 1 && (n.matches('i, .en'))) ? '' : n.textContent;
      }).join('');
      if (/^[\s·,()\/:;–-]*$/.test(rest)) Array.prototype.forEach.call(p.querySelectorAll(':scope > i, :scope > .en'), function (el) { el.setAttribute('data-drop', ''); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-drop]'), function (el) { el.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll('h1,h2,h3,p,li,td,th,div,small'), function (el) {
      el.appendChild(document.createTextNode('. '));
    });
    return c.textContent
      .replace(/\s+/g, ' ')
      .replace(/\(\s*[·,/]?\s*\)/g, '')
      .replace(/\s+([.,:;!?])/g, '$1')
      .replace(/([.:;!?])(\s*[·,]?\s*\.)+/g, '$1')
      .replace(/\s*·\s*(?=[.:;!?])/g, '')
      .replace(/^[.\s]+/, '')
      .trim();
  }

  var SAY = [
    [/\bIPM\b/g, 'ai pi em'], [/\bSRA\b/g, 'ét a ây'], [/\bSPI\b/g, 'ét pi ai'], [/\bILT\b/g, 'ai eo ti'],
    [/\bPPE\b/g, 'pi pi i'], [/\bSDS\b/g, 'ét đi ét'], [/\bGMP\b/g, 'gi em pi'], [/\bFEFO\b/g, 'phe phô'],
    [/\bFIFO\b/g, 'phai phô'], [/\bKPI\b/g, 'kê pi ai'], [/\bSHE\b/g, 'ét hát i'], [/\bNSF\b/g, 'en ét ép'],
    [/\bHDPE\b/g, 'hát đê pê e'], [/\bPP\b/g, 'pê pê'], [/\bLED\b/g, 'đèn lét'], [/\bUV\b/g, 'u vê'],
    [/\bIR\b/g, 'hồng ngoại'], [/\bQA\b/g, 'kiu ây'], [/\bCAPA\b/g, 'ca pa'], [/\bATTP\b/g, 'an toàn thực phẩm'],
    [/\bISPM\b/g, 'i ét pê em'], [/\bVD:/g, 'Ví dụ:'], [/\b5S\b/g, 'năm ét'], [/\b3K\b/g, 'ba ca'],
    [/\bHTRP\b/g, 'chỗ khó tiếp cận'], [/\bNL\b/g, 'nguyên liệu'], [/\bTP\b/g, 'thành phẩm'],
    [/CO₂/g, 'cê ô hai'], [/O₂/g, 'ô xy'], [/N₂/g, 'ni tơ'], [/µm/g, ' mi crô mét'],
    [/(\d)\s*°C/g, '$1 độ C'], [/(\d)\s*°/g, '$1 độ'], [/(\d)\s*m²/g, '$1 mét vuông'], [/(\d)\s*mm\b/g, '$1 mi li mét'],
    [/(\d)\s*cm\b/g, '$1 xen ti mét'], [/(\d)\s*km\b/g, '$1 ki lô mét'], [/(\d)\s*ml\b/g, '$1 mi li lít'],
    [/(\d)\s*g\b/g, '$1 gam'], [/(\d)\s*m\b/g, '$1 mét'], [/(\d)\s*h\b/g, '$1 giờ'], [/(\d)\s*nm\b/g, '$1 na nô mét'],
    [/\bRH\b/g, 'độ ẩm tương đối'], [/½/g, 'nửa'],
    [/(\d)\s*[–-]\s*(\d)/g, '$1 đến $2'], [/(\d),(\d)/g, '$1 phẩy $2'],
    [/≥/g, ' từ '], [/≤/g, ' không quá '], [/≠/g, ' khác '], [/×/g, ' nhân '], [/~/g, 'khoảng '],
    [/>/g, ' trên '], [/</g, ' dưới '], [/→/g, ', '], [/&/g, ' và '], [/=/g, ' bằng '],
    [/(\d)\s*\/\s*(\d)/g, '$1 trên $2'], [/(\d)\s*\/\s*(\p{L})/gu, '$1 mỗi $2'], [/\s\/\s(?=\d)/g, ' trên '],
    [/\s\/\s/g, ' hoặc '], [/(\p{L})\/(\d)/gu, '$1 trên $2'], [/(\p{L})\/(\p{L})/gu, '$1 mỗi $2'],
    [/[✗✓·•]/g, ', '], [/“|”|"/g, '']
  ];
  function normalize(t) {
    SAY.forEach(function (p) { t = t.replace(p[0], p[1]); });
    return t.replace(/\s*,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }
  function splitText(t) {
    var sentences = normalize(t).match(/[^.!?;:]+[.!?;:]?/g) || [];
    var out = [];
    sentences.forEach(function (sentence) {
      var line = '';
      sentence.trim().split(/\s+/).forEach(function (word) {
        if ((line + ' ' + word).trim().length > 170) { if (line) out.push(line); line = ''; }
        line = (line + ' ' + word).trim();
      });
      if (line && /[\p{L}\p{N}]/u.test(line)) out.push(line);
    });
    return out;
  }

  // ── Trình phát (cùng endpoint và cơ chế dự phòng tw-ob → gtx như khoá CIP) ──
  var tts = {
    audio: new Audio(), token: 0, active: false, paused: false, pending: null, timer: null, advanceTimer: null,
    parts: [], index: 0, muted: load('muted', false), rate: load('rate', 1.2), auto: load('auto', true),
    url: function (text, client) {
      return 'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&total=1&idx=0&client=' + client +
        '&q=' + encodeURIComponent(text) + '&textlen=' + text.length;
    },
    status: function (m) { statusEl.textContent = m; this.sync(); },
    sync: function () {
      playBtn.textContent = this.active ? (this.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng') : '▶ Phát';
      muteBtn.textContent = this.muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(this.muted));
      trackEl.style.width = (this.parts.length ? this.index / this.parts.length * 100 : 0) + '%';
    },
    settle: function (ok) {
      clearTimeout(this.timer); this.timer = null;
      var r = this.pending; this.pending = null;
      var a = this.audio; a.onended = a.onerror = a.onplaying = a.onwaiting = a.onstalled = null;
      if (r) r(ok);
    },
    stop: function (msg) {
      this.token++; clearTimeout(this.advanceTimer);
      this.active = false; this.paused = false;
      this.audio.pause(); this.settle(false);
      this.audio.removeAttribute('src'); this.audio.load();
      this.index = 0;
      this.status(msg || 'Đã dừng đọc.');
    },
    speak: function (text, token) {
      var self = this;
      return new Promise(function (resolve) {
        self.pending = resolve;
        var attemptId = 0;
        function attempt(client) {
          var my = ++attemptId;
          if (token !== self.token) { self.settle(false); return; }
          var valid = function () { return token === self.token && my === attemptId && !!self.pending; };
          var a = self.audio;
          var fail = function (err) {
            if (!valid()) return;
            clearTimeout(self.timer);
            if (err && err.name === 'NotAllowedError') { self.settle(false); self.status('Trình duyệt chặn âm thanh. Bấm ▶ Phát để tiếp tục.'); return; }
            if (client === 'tw-ob') attempt('gtx');
            else { self.settle(false); self.status('Không phát được Google TTS. Kiểm tra Internet rồi bấm Đọc lại.'); }
          };
          var arm = function () { clearTimeout(self.timer); if (valid() && !self.paused) self.timer = setTimeout(fail, 25000); };
          self.arm = arm;
          a.pause();
          a.onended = function () { if (valid()) self.settle(true); };
          a.onerror = fail;
          a.onplaying = function () { if (valid()) { clearTimeout(self.timer); self.timer = null; } };
          a.onwaiting = arm; a.onstalled = arm;
          a.src = self.url(text, client);
          a.playbackRate = self.rate; a.preservesPitch = true; a.muted = self.muted;
          arm();
          if (!self.paused) { try { a.play().catch(fail); } catch (e) { fail(e); } }
        }
        attempt('tw-ob');
      });
    },
    start: async function () {
      this.stop('');
      var token = this.token, n = idx;
      this.parts = splitText(narration(slides[n]));
      this.active = true;
      for (this.index = 0; this.index < this.parts.length; this.index++) {
        if (token !== this.token) return;
        while (this.paused) { await new Promise(function (r) { setTimeout(r, 80); }); if (token !== this.token) return; }
        this.status('Đang đọc slide ' + (n + 1) + ' · đoạn ' + (this.index + 1) + '/' + this.parts.length);
        var ok = await this.speak(this.parts[this.index], token);
        if (token !== this.token) return;
        if (!ok) { this.active = false; this.paused = false; this.audio.pause(); this.sync(); return; }
      }
      this.sync();
      if (!this.auto) { this.active = false; this.status('Đã đọc xong slide ' + (n + 1) + '.'); return; }
      if (n === slides.length - 1) { this.active = false; this.status('Đã trình chiếu hết module.'); return; }
      this.status('Đọc xong, sắp chuyển slide…');
      var self = this;
      var advance = function () {
        if (token !== self.token || !self.auto) { self.active = false; self.sync(); return; }
        if (self.paused) { self.advanceTimer = setTimeout(advance, 100); return; }
        show(n + 1, true);
        self.start();
      };
      this.advanceTimer = setTimeout(advance, 900);
    },
    toggle: function () {
      if (!this.active) { this.start(); return; }
      if (this.paused) {
        this.paused = false; this.status('Đang tiếp tục đọc');
        if (this.pending) { if (this.arm) this.arm(); var self = this; this.audio.play().catch(function (e) { if (e.name === 'NotAllowedError') self.stop('Âm thanh bị chặn. Bấm ▶ Phát.'); }); }
      } else {
        this.paused = true; clearTimeout(this.timer); this.audio.pause(); this.status('Đã tạm dừng');
      }
      this.sync();
    }
  };

  rateSel.value = String(tts.rate);
  autoChk.checked = tts.auto;
  tts.status('Sẵn sàng · bấm ▶ Phát để nghe thuyết minh');

  function slideTitle(s) {
    var h = s.querySelector('h1, h2');
    return h ? h.textContent.trim() : '';
  }

  function show(i, fromTts) {
    var target = Math.max(0, Math.min(slides.length - 1, i));
    var changed = target !== idx;
    idx = target;
    slides.forEach(function (s, k) { s.classList.toggle('active', k === idx); });
    countEl.textContent = (idx + 1) + ' / ' + slides.length;
    countEl.title = slideTitle(slides[idx]);
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === slides.length - 1;
    bar.style.width = ((idx + 1) / slides.length * 100) + '%';
    if (history.replaceState) history.replaceState(null, '', location.search + '#' + (idx + 1));
    if (!textBox.hidden) textBox.textContent = narration(slides[idx]);
    fit(slides[idx]);
    // Chuyển slide bằng tay khi đang đọc: đọc slide mới
    if (changed && !fromTts && tts.active && !tts.paused) tts.start();
    else if (changed && !fromTts && tts.active) tts.stop('Đã dừng đọc vì chuyển slide.');
  }

  // Co chữ cho slide dài: giảm --fs đến khi nội dung vừa khung (tối thiểu 0.7)
  function fit(s) {
    if (document.body.classList.contains('reading')) return;
    var fs = 1;
    s.style.setProperty('--fs', fs);
    while (s.scrollHeight > s.clientHeight + 1 && fs > 0.7) {
      fs = Math.round((fs - 0.04) * 100) / 100;
      s.style.setProperty('--fs', fs);
    }
  }

  function scale() {
    var reading = window.innerWidth < 640 || document.body.classList.contains('reading-forced');
    if (reading && tts.active) tts.stop();
    document.body.classList.toggle('reading', reading);
    if (reading) {
      slides.forEach(function (s) { s.style.removeProperty('--fs'); });
      return;
    }
    var w = stage.clientWidth - 24, h = stage.clientHeight - 24;
    var k = Math.min(w / 1280, h / 720);
    deck.style.transform = 'translate(-50%, -50%) scale(' + k + ')';
    fit(slides[idx]);
  }

  nav.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var go = b.getAttribute('data-go'), act = b.getAttribute('data-tts');
    if (go === 'prev') show(idx - 1);
    else if (go === 'next') show(idx + 1);
    else if (go === 'first') show(0);
    else if (go === 'full') toggleFull();
    else if (go === 'read') { document.body.classList.add('reading-forced'); scale(); exitBtn(); }
    else if (act === 'play') tts.toggle();
    else if (act === 'replay') tts.start();
    else if (act === 'stop') tts.stop();
    else if (act === 'mute') { tts.muted = !tts.muted; tts.audio.muted = tts.muted; save('muted', tts.muted); tts.sync(); }
    else if (act === 'text') {
      textBox.hidden = !textBox.hidden;
      b.setAttribute('aria-pressed', String(!textBox.hidden));
      if (!textBox.hidden) textBox.textContent = narration(slides[idx]);
    }
  });
  rateSel.addEventListener('change', function () { tts.rate = Number(rateSel.value); tts.audio.playbackRate = tts.rate; save('rate', tts.rate); });
  autoChk.addEventListener('change', function () { tts.auto = autoChk.checked; save('auto', tts.auto); });

  function exitBtn() {
    if (document.getElementById('exitRead')) return;
    var b = document.createElement('button');
    b.id = 'exitRead';
    b.type = 'button';
    b.textContent = '▶ Trình chiếu';
    b.onclick = function () { document.body.classList.remove('reading-forced'); b.remove(); scale(); show(idx); };
    document.body.appendChild(b);
  }

  function toggleFull() {
    var el = document.documentElement;
    if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen(); }
    else if (document.exitFullscreen) document.exitFullscreen();
  }

  document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('reading')) return;
    if (e.target.closest && e.target.closest('select, input')) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); show(idx + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); show(idx - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'p' || k === 'P') tts.toggle();
  });

  // Vuốt trái/phải trên màn hình cảm ứng
  var x0 = null;
  stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  window.addEventListener('resize', scale);
  var start = parseInt((location.hash || '').slice(1), 10);
  idx = -1;
  show(isNaN(start) ? 0 : start - 1);
  scale();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(slides[idx]); });

  // Cho trang chủ điều khiển khi nhúng trong iframe (VD: bấm "Trình chiếu có thuyết minh")
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'pt-play' && !document.body.classList.contains('reading')) { show(0); tts.start(); }
    if (e.data.type === 'pt-stop') tts.stop();
  });
})();
