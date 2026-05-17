/* ============================================================
 * LyraSkeleton Step3 - 동적 강의 페이지 컨트롤러
 * - 사이드바 자동 주입 / 활성 페이지 강조 / 방문 기록 (localStorage)
 * - 본문 헤더(h2/h3) 스캔 후 우측 TOC 자동 생성 + 스크롤스파이
 * - 코드블록 자동 복사 버튼
 * - 체크리스트 토글 + 진행률 보존
 * - 테마 토글 (다크 <-> 라이트)
 * - 키보드 단축키: J/K = 이전/다음, /, Ctrl+K = 검색 (인덱스 한정)
 * - 파일 프로토콜(file://) 환경에서도 fetch 없이 동작
 * ============================================================ */
(function () {
  'use strict';

  // ----------------------------------------------------------
  // 0. 강의 섹션 메타 (한 곳에서만 관리)
  // ----------------------------------------------------------
  const SECTIONS = [
    { num: '01', file: '01_overview.html',           title: 'Step 3 개요 · 주요 기능',  tag: '오리엔테이션' },
    { num: '02', file: '02_direction-model.html',    title: '방향 데이터 모델',         tag: 'Enum/Struct' },
    { num: '03', file: '03_direction-pipeline.html', title: '방향 판정 파이프라인',      tag: 'AnimBP' },
    { num: '04', file: '04_cycle-anims-debug.html',  title: '방향성 사이클 + Debug',    tag: 'AnimBP/Debug' },
    { num: '05', file: '05_author-comments.html',    title: '저자 코멘트 심층 분석',     tag: '의도 분석' },
    { num: '06', file: '06_step2-diff.html',         title: 'Step 2 대비 변경점',       tag: 'Diff' },
  ];

  const LS_VISIT = 'ls_step3_visited';
  const LS_THEME = 'ls_step3_theme';
  const LS_CK    = 'ls_step3_checklist';

  // ----------------------------------------------------------
  // 1. 공통 유틸
  // ----------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function loadJSON(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { /* quota / private mode 무시 */ }
  }
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1400);
  }
  function slugify(text) {
    return text.trim().toLowerCase()
      .replace(/[^\w\s\-가-힣]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  function currentSectionIndex() {
    const here = (location.pathname.split('/').pop() || '').toLowerCase();
    return SECTIONS.findIndex(s => s.file.toLowerCase() === here);
  }

  // ----------------------------------------------------------
  // 2. 테마 토글
  // ----------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = $('#theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀' : '☾';
  }
  function initTheme() {
    const saved = localStorage.getItem(LS_THEME) || 'dark';
    applyTheme(saved);
    const btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      localStorage.setItem(LS_THEME, now);
      applyTheme(now);
    });
  }

  // ----------------------------------------------------------
  // 3. 사이드바 주입 (섹션 페이지 전용)
  // ----------------------------------------------------------
  function buildSidebar() {
    const slot = $('#sidebar-slot');
    if (!slot) return;
    const visited = loadJSON(LS_VISIT, []);
    const here = (location.pathname.split('/').pop() || '').toLowerCase();
    const html = [
      '<h4>섹션 목차</h4>',
      '<a class="s-link" href="../index.html"><span class="s-num">⌂</span><span>허브로 돌아가기</span></a>',
      '<div class="s-divider"></div>',
      ...SECTIONS.map(s => {
        const active = s.file.toLowerCase() === here ? ' active' : '';
        const v = visited.indexOf(s.file) >= 0 ? ' visited' : '';
        return `<a class="s-link${active}${v}" href="${s.file}"><span class="s-num">${s.num}</span><span>${s.title}</span></a>`;
      }),
    ].join('');
    slot.innerHTML = html;
  }

  // 현재 페이지 방문 기록
  function markVisited() {
    const here = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!SECTIONS.some(s => s.file.toLowerCase() === here)) return;
    const visited = loadJSON(LS_VISIT, []);
    if (visited.indexOf(here) < 0) {
      visited.push(here);
      saveJSON(LS_VISIT, visited);
    }
  }

  // ----------------------------------------------------------
  // 4. 본문 헤더 슬러그화 + 우측 TOC 생성 + 스크롤스파이
  // ----------------------------------------------------------
  function buildToc() {
    const toc = $('#toc-list');
    const content = $('#content');
    if (!toc || !content) return;
    const heads = $$('h2, h3', content);
    if (heads.length === 0) { toc.parentElement.style.display = 'none'; return; }
    const taken = new Set();
    heads.forEach(h => {
      if (!h.id) {
        let base = slugify(h.textContent);
        let id = base, i = 1;
        while (taken.has(id) || document.getElementById(id)) { id = base + '-' + (++i); }
        taken.add(id);
        h.id = id;
      }
    });
    toc.innerHTML = heads.map(h => {
      const lv = h.tagName === 'H3' ? 'lv-3' : 'lv-2';
      return `<li><a class="${lv}" href="#${h.id}">${h.textContent}</a></li>`;
    }).join('');
    // 스크롤스파이
    const links = $$('a', toc);
    function spy() {
      const y = window.scrollY + 120;
      let active = heads[0];
      for (const h of heads) { if (h.offsetTop <= y) active = h; else break; }
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + active.id));
    }
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // ----------------------------------------------------------
  // 5. 코드블록 복사 버튼
  // ----------------------------------------------------------
  function attachCopyButtons() {
    $$('.term, pre.code').forEach(box => {
      if ($('.copy-btn', box)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'copy';
      btn.addEventListener('click', () => {
        const src = $('.term-body, .code-body, code', box) || box;
        const txt = src.innerText;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(txt).then(() => {
            btn.textContent = 'copied';
            btn.classList.add('ok');
            setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1200);
          });
        } else {
          const ta = document.createElement('textarea');
          ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); btn.textContent = 'copied'; btn.classList.add('ok'); }
          catch (e) {}
          document.body.removeChild(ta);
          setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1200);
        }
      });
      box.appendChild(btn);
    });
  }

  // ----------------------------------------------------------
  // 6. 체크리스트 토글 + localStorage 진행률
  // ----------------------------------------------------------
  function initChecklists() {
    const here = (location.pathname.split('/').pop() || '');
    const all = loadJSON(LS_CK, {});
    const mine = all[here] || {};
    $$('.ck li').forEach((li, i) => {
      const text = li.querySelector('.text') ? li.querySelector('.text').textContent : li.textContent;
      const key = slugify(text).slice(0, 80) + ':' + i;
      li.dataset.ckKey = key;
      if (mine[key]) li.classList.add('done');
      li.addEventListener('click', () => {
        li.classList.toggle('done');
        const cur = loadJSON(LS_CK, {});
        cur[here] = cur[here] || {};
        if (li.classList.contains('done')) cur[here][key] = 1;
        else delete cur[here][key];
        saveJSON(LS_CK, cur);
        updateProgressBar();
      });
    });
  }

  // ----------------------------------------------------------
  // 7. 상단 진행률 바 (전체 섹션 중 방문한 비율)
  // ----------------------------------------------------------
  function updateProgressBar() {
    const fill = $('#progress-fill');
    const txt = $('#progress-text');
    if (!fill) return;
    const visited = loadJSON(LS_VISIT, []);
    const pct = Math.round((visited.length / SECTIONS.length) * 100);
    fill.style.width = pct + '%';
    if (txt) txt.textContent = visited.length + '/' + SECTIONS.length;
  }

  // ----------------------------------------------------------
  // 8. Foot Nav (prev / next) 자동 채우기
  // ----------------------------------------------------------
  function fillFootNav() {
    const wrap = $('#footnav');
    if (!wrap) return;
    const idx = currentSectionIndex();
    if (idx < 0) return;
    const prev = SECTIONS[idx - 1];
    const next = SECTIONS[idx + 1];
    wrap.innerHTML = `
      <a class="prev${prev ? '' : ' disabled'}" ${prev ? 'href="' + prev.file + '"' : ''}>
        <div class="label">← 이전 섹션</div>
        <div class="title">${prev ? prev.num + '. ' + prev.title : '없음'}</div>
      </a>
      <a class="next${next ? '' : ' disabled'}" ${next ? 'href="' + next.file + '"' : 'href="../index.html"'}>
        <div class="label">${next ? '다음 섹션 →' : '목차로 →'}</div>
        <div class="title">${next ? next.num + '. ' + next.title : '허브로 돌아가기'}</div>
      </a>`;
  }

  // ----------------------------------------------------------
  // 9. 키보드 단축키
  // ----------------------------------------------------------
  function initKeys() {
    document.addEventListener('keydown', (e) => {
      const isInput = /input|textarea|select/i.test(document.activeElement && document.activeElement.tagName || '');
      if (isInput) return;
      const idx = currentSectionIndex();
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') {
        const next = SECTIONS[idx + 1];
        if (next) { location.href = next.file; }
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowLeft') {
        const prev = SECTIONS[idx - 1];
        if (prev) { location.href = prev.file; }
      } else if (e.key === 'h' || e.key === 'H') {
        const back = idx >= 0 ? '../index.html' : '#';
        if (back !== '#') location.href = back;
      } else if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        const s = $('#hub-search');
        if (s) { e.preventDefault(); s.focus(); s.select(); }
      }
    });
  }

  // ----------------------------------------------------------
  // 10. 인덱스 허브 - 검색 + 진행 칩 + 방문 표시
  // ----------------------------------------------------------
  function initHubSearch() {
    const input = $('#hub-search');
    if (!input) return;
    const cards = $$('.part-card');
    function apply() {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const hay = (card.dataset.search || card.textContent).toLowerCase();
        const ok = !q || hay.indexOf(q) >= 0;
        card.classList.toggle('hidden', !ok);
        card.classList.toggle('match', !!q && ok);
        if (ok) visible++;
      });
      const status = $('#hub-search-status');
      if (status) status.textContent = q ? `${visible}/${cards.length}개 일치` : '';
    }
    input.addEventListener('input', apply);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; apply(); }
    });
  }

  function markVisitedOnHub() {
    const visited = loadJSON(LS_VISIT, []);
    $$('.part-card').forEach(card => {
      const f = card.getAttribute('href') || '';
      const name = f.split('/').pop().toLowerCase();
      if (visited.indexOf(name) >= 0) card.classList.add('visited');
    });
  }

  function initHubResetBtn() {
    const btn = $('#hub-reset');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!confirm('학습 진행 상태(방문/체크리스트)를 모두 초기화할까요?')) return;
      localStorage.removeItem(LS_VISIT);
      localStorage.removeItem(LS_CK);
      $$('.part-card').forEach(c => c.classList.remove('visited'));
      updateProgressBar();
      toast('진행 상태를 초기화했습니다');
    });
  }

  // ----------------------------------------------------------
  // 11. 부팅
  // ----------------------------------------------------------
  function boot() {
    initTheme();
    buildSidebar();
    markVisited();
    buildToc();
    attachCopyButtons();
    initChecklists();
    fillFootNav();
    updateProgressBar();
    initKeys();
    initHubSearch();
    markVisitedOnHub();
    initHubResetBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
