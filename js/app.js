/* AI教科書 - PWA App Logic */
(function () {
  'use strict';

  const state = {
    chapters: [],
    newsChapter: null,
    current: 0,
    read: new Set(),
    theme: 'dark',
    version: 'v1.0',
    lastUpdated: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- Storage helpers ----------
  const LS = {
    getRead() {
      try {
        const raw = localStorage.getItem('ai-textbook:read');
        return new Set(raw ? JSON.parse(raw) : []);
      } catch { return new Set(); }
    },
    setRead(set) {
      localStorage.setItem('ai-textbook:read', JSON.stringify([...set]));
    },
    getTheme() { return localStorage.getItem('ai-textbook:theme') || 'dark'; },
    setTheme(t) { localStorage.setItem('ai-textbook:theme', t); },
    getCurrent() {
      const v = parseInt(localStorage.getItem('ai-textbook:current') || '0', 10);
      return isNaN(v) ? 0 : v;
    },
    setCurrent(i) { localStorage.setItem('ai-textbook:current', String(i)); },
  };

  // ---------- Data loading ----------
  async function loadContent() {
    const [chaptersRes, newsRes] = await Promise.all([
      fetch('content/chapters.json', { cache: 'no-cache' }).then((r) => r.json()),
      fetch('content/news.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null),
    ]);

    state.version = chaptersRes.version || 'v1.0';

    // Convert news.json into a chapter-like object
    let newsChapter = null;
    if (newsRes && newsRes.chapter) {
      newsChapter = {
        id: newsRes.chapter.id || 'news',
        number: newsRes.chapter.number ?? 10,
        title: newsRes.chapter.title || '最新ニュース',
        emoji: newsRes.chapter.emoji || '📰',
        summary: newsRes.chapter.summary || '週次更新',
        weekly: true,
        headline: newsRes.headline,
        overview: newsRes.overview,
        items: newsRes.items || [],
        lastUpdated: newsRes.lastUpdated,
      };
      state.newsChapter = newsChapter;
      state.lastUpdated = newsRes.lastUpdated;
    }

    // Merge static chapters with dynamic news chapter, sorted by number
    const all = [...(chaptersRes.chapters || [])];
    if (newsChapter) all.push(newsChapter);
    all.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    state.chapters = all;
  }

  // ---------- Rendering ----------
  function renderDrawer() {
    const list = $('#chapterList');
    list.innerHTML = '';
    state.chapters.forEach((ch, idx) => {
      const li = document.createElement('li');
      if (idx === state.current) li.classList.add('active');
      if (state.read.has(ch.id)) li.classList.add('done');
      if (ch.weekly) li.classList.add('weekly');
      li.innerHTML = `
        <span class="chap-emoji">${ch.emoji || '📘'}</span>
        <div>
          <div class="chap-title">${escapeHtml(ch.title)}</div>
          <div class="chap-summary">${escapeHtml(ch.summary || '')}</div>
        </div>
      `;
      li.addEventListener('click', () => {
        goTo(idx);
        closeDrawer();
      });
      list.appendChild(li);
    });
    updateProgress();
  }

  function renderChapter() {
    const ch = state.chapters[state.current];
    if (!ch) return;
    const el = $('#content');
    $('#chapterIndicator').textContent = `${ch.number != null ? 'Ch.' + ch.number + ' ' : ''}${ch.title}`;

    const heroBadge = ch.weekly
      ? `<div class="weekly-badge">🔄 週次で自動更新 ${ch.lastUpdated ? '・最終更新 ' + ch.lastUpdated : ''}</div>`
      : '';

    let bodyHtml = '';
    if (ch.id === 'news' && ch.items) {
      bodyHtml += `<div class="news-overview">${escapeHtml(ch.overview || '')}</div>`;
      bodyHtml += ch.items.map((it) => `
        <div class="news-item">
          <div class="news-item-head">
            <span class="news-tag">${escapeHtml(it.tag || 'NEWS')}</span>
            <span class="news-date">${escapeHtml(it.date || '')}</span>
          </div>
          <div class="news-title">${escapeHtml(it.title || '')}</div>
          <p class="news-body">${escapeHtml(it.body || '')}</p>
          ${it.source ? `<a class="news-source" href="${encodeURI(it.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.sourceLabel || it.source)} ↗</a>` : ''}
        </div>
      `).join('');
    } else if (ch.sections) {
      bodyHtml += ch.sections.map((s) => `
        <section class="sec">
          <h3>${escapeHtml(s.heading || '')}</h3>
          <p>${escapeHtml(s.body || '')}</p>
        </section>
      `).join('');
    }

    const keypointsHtml = (ch.keyPoints && ch.keyPoints.length) ? `
      <div class="keypoints">
        <h4>Key Points</h4>
        <ul>${ch.keyPoints.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ul>
      </div>
    ` : '';

    el.innerHTML = `
      <div class="chapter-hero">
        ${ch.number != null ? `<div class="chapter-number">Chapter ${ch.number}</div>` : ''}
        <h2 class="chapter-title"><span class="emoji">${ch.emoji || '📘'}</span>${escapeHtml(ch.title)}</h2>
        ${ch.summary ? `<p class="chapter-summary">${escapeHtml(ch.summary)}</p>` : ''}
        ${heroBadge}
      </div>
      ${bodyHtml}
      ${keypointsHtml}
    `;

    // Scroll to top when changing chapters
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    updateNavButtons();
    applySearchHighlight();
  }

  function updateNavButtons() {
    const prev = $('#prevBtn');
    const next = $('#nextBtn');
    prev.disabled = state.current <= 0;
    next.disabled = state.current >= state.chapters.length - 1;

    const markBtn = $('#markBtn');
    const ch = state.chapters[state.current];
    if (ch && state.read.has(ch.id)) {
      markBtn.classList.add('done');
      markBtn.textContent = '読了済み';
    } else {
      markBtn.classList.remove('done');
      markBtn.textContent = '読了';
    }
  }

  function updateProgress() {
    const total = state.chapters.length;
    const readCount = state.chapters.filter((c) => state.read.has(c.id)).length;
    const pct = total ? Math.round((readCount / total) * 100) : 0;
    $('#progressFill').style.width = pct + '%';
    $('#progressText').textContent = `${readCount} / ${total} 章`;
  }

  // ---------- Navigation ----------
  function goTo(idx) {
    if (idx < 0 || idx >= state.chapters.length) return;
    state.current = idx;
    LS.setCurrent(idx);
    renderDrawer();
    renderChapter();
  }

  function toggleRead() {
    const ch = state.chapters[state.current];
    if (!ch) return;
    if (state.read.has(ch.id)) {
      state.read.delete(ch.id);
    } else {
      state.read.add(ch.id);
    }
    LS.setRead(state.read);
    renderDrawer();
    updateNavButtons();
  }

  function resetProgress() {
    if (!confirm('読了の進捗をリセットしますか？')) return;
    state.read.clear();
    LS.setRead(state.read);
    renderDrawer();
    updateNavButtons();
  }

  // ---------- Drawer ----------
  function openDrawer() {
    $('#drawer').setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#searchInput').value = '';
    filterChapters('');
    applySearchHighlight('');
  }

  // ---------- Search ----------
  function filterChapters(query) {
    const q = (query || '').trim().toLowerCase();
    const items = $$('#chapterList li');
    items.forEach((li, i) => {
      if (!q) { li.style.display = ''; return; }
      const ch = state.chapters[i];
      if (!ch) { li.style.display = 'none'; return; }
      const hay = [
        ch.title, ch.summary,
        ...(ch.sections || []).map((s) => s.heading + ' ' + s.body),
        ...(ch.keyPoints || []),
        ch.overview, ch.headline,
        ...((ch.items || []).map((it) => (it.title || '') + ' ' + (it.body || '') + ' ' + (it.tag || '')))
      ].filter(Boolean).join(' ').toLowerCase();
      li.style.display = hay.includes(q) ? '' : 'none';
    });
  }

  let currentHighlight = '';
  function applySearchHighlight(forceQuery) {
    if (forceQuery !== undefined) currentHighlight = forceQuery;
    const q = currentHighlight.trim();
    if (!q) return;
    const content = $('#content');
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentNode && n.parentNode.nodeName !== 'MARK' && re.test(n.nodeValue)) {
        nodes.push(n);
      }
      re.lastIndex = 0;
    }
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      const parts = node.nodeValue.split(re);
      const matches = node.nodeValue.match(re) || [];
      parts.forEach((p, i) => {
        frag.appendChild(document.createTextNode(p));
        if (i < matches.length) {
          const mk = document.createElement('mark');
          mk.textContent = matches[i];
          frag.appendChild(mk);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ---------- Theme ----------
  function applyTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', t === 'light' ? '#f7f9fc' : '#0b0f1a');
  }
  function toggleTheme() {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    LS.setTheme(next);
  }

  // ---------- Footer update time ----------
  function renderFooter() {
    $('#version').textContent = `v${state.version}`;
    if (state.lastUpdated) {
      $('#updatedAt').textContent = `最終更新: ${state.lastUpdated}`;
    } else {
      $('#updatedAt').textContent = '最終更新: -';
    }
  }

  // ---------- Utils ----------
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------- Keyboard ----------
  function onKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowLeft') goTo(state.current - 1);
    else if (e.key === 'ArrowRight') goTo(state.current + 1);
  }

  // ---------- Service Worker ----------
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    // file:// では登録不可なのでスキップ
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }

  // ---------- PWA install prompt ----------
  let deferredPrompt = null;
  function setupInstallPrompt() {
    const btn = document.createElement('button');
    btn.className = 'install-hint';
    btn.textContent = '📲 ホーム画面に追加';
    btn.id = 'installBtn';
    document.body.appendChild(btn);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.classList.add('visible');
    });
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.classList.remove('visible');
    });
    window.addEventListener('appinstalled', () => btn.classList.remove('visible'));
  }

  // ---------- Init ----------
  async function init() {
    try {
      applyTheme(LS.getTheme());
      state.read = LS.getRead();
      state.current = LS.getCurrent();

      await loadContent();

      if (state.current >= state.chapters.length) state.current = 0;

      renderDrawer();
      renderChapter();
      renderFooter();

      // Event listeners
      $('#menuBtn').addEventListener('click', openDrawer);
      $('#closeDrawer').addEventListener('click', closeDrawer);
      $('#drawerScrim').addEventListener('click', closeDrawer);
      $('#themeBtn').addEventListener('click', toggleTheme);
      $('#prevBtn').addEventListener('click', () => goTo(state.current - 1));
      $('#nextBtn').addEventListener('click', () => goTo(state.current + 1));
      $('#markBtn').addEventListener('click', toggleRead);
      $('#resetProgressBtn').addEventListener('click', resetProgress);
      $('#searchInput').addEventListener('input', (e) => {
        filterChapters(e.target.value);
        currentHighlight = e.target.value;
        renderChapter();
      });
      document.addEventListener('keydown', onKeyDown);

      // Swipe (touch)
      let touchStartX = null;
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
      }, { passive: true });
      document.addEventListener('touchend', (e) => {
        if (touchStartX == null) return;
        const dx = (e.changedTouches[0].clientX - touchStartX);
        if (Math.abs(dx) > 80) {
          if (dx < 0) goTo(state.current + 1);
          else goTo(state.current - 1);
        }
        touchStartX = null;
      }, { passive: true });

      registerSW();
      setupInstallPrompt();
    } catch (err) {
      console.error(err);
      $('#content').innerHTML = `<div class="loading">コンテンツの読み込みに失敗しました。<br><small>${escapeHtml(err.message || '')}</small></div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
