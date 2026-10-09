/* Stillnote is a local-first study workspace. Notes, decks, preferences and session history stay in this browser. */
(function () {
  'use strict';

  const STORAGE_KEY = 'stillnote.workspace.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const workspace = $('#workspace');
  const overlayRoot = $('#overlay-root');
  const toastRegion = $('#toast-region');
  const starterNote = {
    id: makeId(),
    title: 'A calm place to think',
    body: 'Welcome to Stillnote. Your notes are saved on this device as you type.\n\nA few ways to make this space yours:\n- Create collections for each class or project.\n- Dictate a thought with the microphone button.\n- Turn your notes into flashcards and review them over time.\n- Use Focus room for a quiet study session.\n\nTip: use **⌘ / Ctrl + K** to find a note, and **⌘ / Ctrl + N** to start one.',
    folder: 'General',
    tags: ['Getting started'],
    pinned: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false
  };

  function makeId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `sn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function blankData() {
    return {
      notes: [starterNote],
      folders: ['General', 'Ideas'],
      flashcards: [],
      settings: { theme: 'light', focusMinutes: 25, breakMinutes: 5, voiceLanguage: 'en-US' },
      stats: { focusSessions: [], dailyReviews: {} }
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankData();
      const parsed = JSON.parse(raw);
      const defaults = blankData();
      const notes = Array.isArray(parsed.notes) ? parsed.notes : defaults.notes;
      const settings = { ...(parsed.settings || {}) };
      delete settings.aiEndpoint;
      delete settings.aiModel;
      return {
        ...defaults,
        ...parsed,
        notes: notes.map(note => note && typeof note === 'object' ? {
          ...note,
          body: String(note.body || '').replace('- Connect a local Ollama model in Settings for AI summaries, explanations, quizzes, and study guides.\n', '')
        } : note),
        folders: Array.isArray(parsed.folders) && parsed.folders.length ? parsed.folders : defaults.folders,
        flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
        settings: { ...defaults.settings, ...settings },
        stats: { ...defaults.stats, ...(parsed.stats || {}), dailyReviews: (parsed.stats && parsed.stats.dailyReviews) || {} }
      };
    } catch (error) {
      return blankData();
    }
  }

  const data = loadData();
  const state = {
    view: 'notes',
    folder: 'All notes',
    listFilter: 'all',
    mobileEditorOpen: false,
    selectedNoteId: data.notes.find(note => !note.isDeleted)?.id || null,
    preview: false,
    searchQuery: '',
    searchIndex: 0,
    currentCardId: null,
    cardFlipped: false,
    deckFilter: 'all',
    timer: {
      focusMinutes: Number(data.settings.focusMinutes) || 25,
      breakMinutes: Number(data.settings.breakMinutes) || 5,
      phase: 'Focus',
      secondsLeft: (Number(data.settings.focusMinutes) || 25) * 60,
      deadline: null,
      running: false,
      subject: ''
    }
  };

  let saveTimer = null;
  let recognition = null;
  let isRecording = false;
  let recordingNoteId = null;

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const status = $('#save-state');
      if (status) status.innerHTML = '<span class="save-dot"></span> Saved on this device';
    } catch (error) {
      toast('Could not save to this browser. Try exporting a backup from Settings.');
    }
  }

  function scheduleSave() {
    const status = $('#save-state');
    if (status) status.innerHTML = '<span class="save-dot" style="background:var(--amber)"></span> Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveData, 300);
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function plainText(value) {
    return String(value || '').replace(/[#>*_`~\[\]()]/g, '').replace(/\s+/g, ' ').trim();
  }

  function formatDate(timestamp, options = {}) {
    const date = new Date(timestamp || Date.now());
    if (options.full) return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  function formatWords(text) {
    const count = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return `${count} ${count === 1 ? 'word' : 'words'}`;
  }

  function toast(message, duration = 3000) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    toastRegion.append(node);
    setTimeout(() => node.remove(), duration);
  }

  function activeNote() {
    return data.notes.find(note => note.id === state.selectedNoteId && !note.isDeleted) || null;
  }

  function visibleNotes() {
    let notes = data.notes.filter(note => !note.isDeleted);
    if (state.folder !== 'All notes') notes = notes.filter(note => note.folder === state.folder);
    if (state.listFilter === 'pinned') notes = notes.filter(note => note.pinned);
    if (state.listFilter === 'recent') notes = notes.filter(note => Date.now() - note.updatedAt < 7 * 86400000);
    return notes.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }

  function renderSidebar() {
    const liveNotes = data.notes.filter(note => !note.isDeleted);
    $('#notes-count').textContent = String(liveNotes.length);
    $('#cards-count').textContent = String(data.flashcards.length);
    $('#folder-list').innerHTML = data.folders.map(folder => {
      const count = liveNotes.filter(note => note.folder === folder).length;
      const active = state.view === 'notes' && state.folder === folder ? ' is-active' : '';
      return `<button class="nav-item folder-item${active}" data-folder="${escapeHTML(folder)}" title="${escapeHTML(folder)}"><span class="folder-emoji">${folder === 'General' ? '◉' : '▰'}</span><span class="folder-name">${escapeHTML(folder)}</span><span class="nav-count">${count}</span></button>`;
    }).join('');
    $$('.primary-nav .nav-item').forEach(item => item.classList.toggle('is-active', item.dataset.view === state.view));
    $$('[data-view="trash"], [data-view="focus"], [data-view="insights"]').forEach(item => item.classList.toggle('is-active', item.dataset.view === state.view));
    const titles = { notes: state.folder, flashcards: 'Flashcards', focus: 'Focus room', insights: 'Study insights', trash: 'Recently deleted' };
    $('#topbar-view').textContent = titles[state.view] || 'Notes';
    $('#topbar-context').textContent = state.view === 'notes' && state.folder !== 'All notes' ? 'Collections' : 'My workspace';
  }

  function renderWorkspace() {
    if (isRecording && recognition && (state.view !== 'notes' || state.selectedNoteId !== recordingNoteId)) recognition.stop();
    document.body.classList.toggle('mobile-note-open', state.view === 'notes' && state.mobileEditorOpen);
    renderSidebar();
    if (state.view === 'notes') renderNotesView();
    else if (state.view === 'flashcards') renderFlashcardsView();
    else if (state.view === 'focus') renderFocusView();
    else if (state.view === 'insights') renderInsightsView();
    else renderTrashView();
    renderMobileNav();
  }

  function renderMobileNav() {
    let mobile = $('#mobile-nav');
    if (!mobile) {
      mobile = document.createElement('nav');
      mobile.id = 'mobile-nav';
      mobile.className = 'mobile-nav';
      mobile.setAttribute('aria-label', 'Mobile navigation');
      document.body.append(mobile);
    }
    mobile.innerHTML = [
      ['notes', '▤', 'Notes'], ['flashcards', '▣', 'Cards'], ['focus', '◷', 'Focus'], ['insights', '▥', 'Insights'], ['trash', '⌑', 'Trash']
    ].map(([view, icon, label]) => `<button data-mobile-view="${view}" class="${state.view === view ? 'is-active' : ''}"><span>${icon}</span><span>${label}</span></button>`).join('');
    mobile.hidden = !window.matchMedia('(max-width: 660px)').matches;
  }

  function renderNotesView() {
    const notes = visibleNotes();
    if (state.selectedNoteId && !notes.some(note => note.id === state.selectedNoteId)) state.selectedNoteId = notes[0]?.id || null;
    if (!state.selectedNoteId && notes.length) state.selectedNoteId = notes[0].id;
    const note = activeNote();
    const listTitle = state.folder === 'All notes' ? 'All notes' : state.folder;
    const mobileCollectionOptions = [`<option value="All notes" ${state.folder === 'All notes' ? 'selected' : ''}>All collections</option>`, ...data.folders.map(folder => `<option value="${escapeHTML(folder)}" ${state.folder === folder ? 'selected' : ''}>${escapeHTML(folder)}</option>`), '<option value="__new__">＋ Create collection…</option>'].join('');
    const notePanel = note ? renderNoteEditor(note) : `<div class="editor-empty"><div class="editor-empty-card"><div class="empty-illustration">✎</div><h2>Ready when you are</h2><p>Create a note to collect an idea, a lecture, or a question worth keeping.</p><button class="primary-button" id="empty-new-note">＋ Create your first note</button></div></div>`;
    workspace.innerHTML = `<div class="notes-layout${state.mobileEditorOpen ? ' mobile-editor-open' : ''}">
      <section class="notes-column" aria-label="Notes list">
        <div class="pane-title-row"><h1>${escapeHTML(listTitle)}</h1><button class="icon-button" id="new-note-small" aria-label="New note" title="New note">＋</button></div>
        <p class="collection-caption">${notes.length} ${notes.length === 1 ? 'note' : 'notes'} · kept in your workspace</p>
        <div class="mobile-collection-picker"><label for="mobile-folder-select">Collection</label><select id="mobile-folder-select">${mobileCollectionOptions}</select></div>
        <div class="list-filter-row" role="group" aria-label="Filter notes">
          <button class="filter-chip ${state.listFilter === 'all' ? 'is-active' : ''}" data-filter="all">All</button>
          <button class="filter-chip ${state.listFilter === 'pinned' ? 'is-active' : ''}" data-filter="pinned">Pinned</button>
          <button class="filter-chip ${state.listFilter === 'recent' ? 'is-active' : ''}" data-filter="recent">Recent</button>
        </div>
        <div class="note-list" id="note-list">${renderNoteCards(notes)}</div>
      </section>
      <section class="editor-column" aria-label="Note editor">${notePanel}</section>
      ${note ? renderStudyPanel() : ''}
    </div>`;
  }

  function renderNoteCards(notes) {
    if (!notes.length) return `<div class="empty-list">No notes here yet.<br>Start with a new note.</div>`;
    return notes.map(note => {
      const selected = note.id === state.selectedNoteId ? ' is-selected' : '';
      const preview = plainText(note.body) || 'No additional text yet…';
      return `<button class="note-card${selected}" data-note-id="${escapeHTML(note.id)}" aria-current="${note.id === state.selectedNoteId ? 'true' : 'false'}">
        <span class="note-card-title">${note.pinned ? '<span class="note-pin" aria-label="Pinned">◆</span>' : ''}${escapeHTML(note.title || 'Untitled note')}</span>
        <span class="note-card-preview">${escapeHTML(preview)}</span>
        <span class="note-card-meta"><span class="color-dot" style="background:var(--accent)"></span><span>${escapeHTML(formatDate(note.updatedAt))}</span><span class="meta-folder">${escapeHTML(note.folder || 'General')}</span></span>
      </button>`;
    }).join('');
  }

  function renderNoteEditor(note) {
    const folderOptions = data.folders.map(folder => `<option value="${escapeHTML(folder)}" ${folder === note.folder ? 'selected' : ''}>${escapeHTML(folder)}</option>`).join('');
    const tags = (note.tags || []).map(tag => `<span class="tag-chip">${escapeHTML(tag)}</span>`).join('');
    return `<div class="editor-topline">
      <div class="editor-topline-left"><button class="mobile-editor-back" id="mobile-editor-back" aria-label="Back to notes">‹ <span>Notes</span></button><span class="save-state" id="save-state"><span class="save-dot"></span> Saved on this device</span></div>
      <div class="editor-topline-actions">
        <button class="editor-action" id="dictate-button" title="Dictate a note"><span>◉</span><span class="action-label">Dictate</span></button>
        <button class="editor-action" id="preview-toggle" title="Preview markdown">${state.preview ? '✎' : '▤'}<span class="action-label">${state.preview ? 'Edit' : 'Preview'}</span></button>
        <button class="editor-action" id="pin-note-button" title="${note.pinned ? 'Unpin note' : 'Pin note'}">${note.pinned ? '◆' : '◇'}<span class="action-label">${note.pinned ? 'Pinned' : 'Pin'}</span></button>
        <button class="editor-action" id="note-menu-button" title="More note actions">•••</button>
      </div>
    </div>
    <div class="note-canvas">
      <div class="note-kicker"><span>IN</span><select id="note-folder-select" aria-label="Move note to collection">${folderOptions}</select><span>·</span><span>${escapeHTML(formatDate(note.createdAt, { full: false }))}</span></div>
      <input class="note-title-input" id="note-title-input" maxlength="180" value="${escapeHTML(note.title)}" placeholder="Untitled note" aria-label="Note title">
      <div class="editor-meta-row"><span id="editor-edited-at">Edited ${escapeHTML(formatDate(note.updatedAt))}</span><span class="meta-divider"></span><span>${escapeHTML(formatWords(note.body))}</span></div>
      <div class="tag-list">${tags}<button class="tag-add" id="add-tag-button">＋ Add tag</button></div>
      ${state.preview ? `<div class="markdown-preview" id="note-markdown-preview">${renderMarkdown(note.body)}</div>` : `<textarea class="note-body-input" id="note-body-input" spellcheck="true" placeholder="Start writing…\n\nTip: capture the idea first. You can organize it later." aria-label="Note content">${escapeHTML(note.body)}</textarea>`}
    </div>
    <div class="note-bottomline"><span>Autosaved locally</span><span class="note-bottomline-right"><span id="word-count">${escapeHTML(formatWords(note.body))}</span><span id="char-count">${String(note.body || '').length} characters</span></span></div>`;
  }

  function renderMarkdown(source) {
    const lines = String(source || '').split('\n');
    return lines.map(line => {
      let safe = escapeHTML(line);
      safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
      if (!safe.trim()) return '<br>';
      if (/^###\s/.test(safe)) return `<h3>${safe.slice(4)}</h3>`;
      if (/^##\s/.test(safe)) return `<h2>${safe.slice(3)}</h2>`;
      if (/^#\s/.test(safe)) return `<h1>${safe.slice(2)}</h1>`;
      if (/^>\s?/.test(safe)) return `<blockquote>${safe.replace(/^>\s?/, '')}</blockquote>`;
      if (/^[-*]\s\[[ xX]\]\s/.test(safe)) return `<div class="checkline">${safe.replace(/^[-*]\s\[([ xX])\]\s/, (_, checked) => checked.trim() ? '☑ ' : '☐ ')}</div>`;
      if (/^[-*]\s/.test(safe)) return `<div>• ${safe.slice(2)}</div>`;
      if (/^\d+\.\s/.test(safe)) return `<div>${safe.replace(/^(\d+\.)\s/, '$1 ')}</div>`;
      return `<p>${safe}</p>`;
    }).join('');
  }

  function renderStudyPanel() {
    return `<aside class="study-column" aria-label="Study tools">
      <div class="study-heading"><span class="study-icon">✦</span><span><strong>Study corner</strong><small>Simple ways to build recall</small></span></div>
      <div class="study-tip-card"><small>✦ Study tip</small><p>${escapeHTML(getStudyTip())}</p></div>
      <div class="study-recall-card"><strong>Practice from this note</strong><p>Turn definitions and key sentences into a small flashcard deck.</p><button class="secondary-button" id="generate-cards-open">Create flashcards</button></div>
    </aside>`;
  }

  const studyTips = [
    'Try to recall an idea before rereading it. That small effort helps it stick.',
    'After a study session, write one question you still want answered.',
    'Short reviews spread over a few days usually beat one long cram session.',
    'Explain a tricky idea in your own words, as if you were teaching a friend.',
    'Pair each new concept with an example you can picture.'
  ];
  function getStudyTip() { return studyTips[new Date().getDate() % studyTips.length]; }

  function renderFlashcardsView() {
    const allCards = data.flashcards.filter(card => state.deckFilter === 'all' || card.noteId === state.deckFilter);
    const dueCards = allCards.filter(card => !card.dueAt || card.dueAt <= Date.now()).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
    if (!state.currentCardId || !dueCards.some(card => card.id === state.currentCardId)) {
      state.currentCardId = dueCards[0]?.id || null;
      state.cardFlipped = false;
    }
    const current = dueCards.find(card => card.id === state.currentCardId);
    const dueLabel = dueCards.length;
    const noteOptions = data.notes.filter(note => !note.isDeleted).map(note => `<option value="${escapeHTML(note.id)}">${escapeHTML(note.title || 'Untitled note')}</option>`).join('');
    const selectedNote = current ? data.notes.find(note => note.id === current.noteId) : null;
    const stage = current ? `<div class="review-stage"><button class="flashcard ${state.cardFlipped ? 'is-flipped' : ''}" id="active-flashcard" aria-label="Flip flashcard">
      <span class="flashcard-label">${state.cardFlipped ? 'ANSWER' : 'QUESTION'} · ${dueCards.indexOf(current) + 1} OF ${dueCards.length}</span>
      <span class="flashcard-content">${escapeHTML(state.cardFlipped ? current.answer : current.question)}</span>
      <span class="flashcard-hint">Click or press Space to ${state.cardFlipped ? 'see the question' : 'reveal the answer'}</span>
    </button></div>
    ${state.cardFlipped ? `<div class="review-controls"><button class="rating-button again" data-rate="again">Again</button><button class="rating-button" data-rate="hard">Hard</button><button class="rating-button" data-rate="good">Good</button><button class="rating-button easy" data-rate="easy">Easy</button></div>` : '<div class="review-controls"><span class="form-hint">Rate your recall after revealing the answer</span></div>'}
    <div class="flashcard-extra-row"><span>${escapeHTML(selectedNote?.title || 'Untitled note')}</span><span>·</span><span>${current.repetitions || 0} successful reviews</span></div>` : `<div class="review-stage"><div class="review-empty"><div class="empty-illustration">✦</div><h2>${data.flashcards.length ? 'You are all caught up' : 'Start a small review habit'}</h2><p>${data.flashcards.length ? 'No cards are due right now. Your next reviews will be ready when their spaced schedule says so.' : 'Turn a note into a deck, then use a gentle spaced schedule to practice remembering it.'}</p><button class="primary-button" id="generate-cards-open">＋ Generate cards from a note</button></div></div>`;
    const upcomingCards = allCards.filter(card => card.dueAt && card.dueAt > Date.now()).length;
    const deckRows = allCards.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(0, 8).map(card => {
      const note = data.notes.find(item => item.id === card.noteId);
      return `<div class="deck-row surface-card"><span class="sparkle-icon">▣</span><span class="deck-row-main"><strong>${escapeHTML(card.question)}</strong><small>${escapeHTML(note?.title || 'Note removed')} · ${escapeHTML(plainText(card.answer).slice(0, 95))}</small></span><button data-delete-card="${escapeHTML(card.id)}" aria-label="Delete flashcard" title="Delete card">×</button></div>`;
    }).join('');
    workspace.innerHTML = `<div class="page-wrap flashcard-page">
      <div class="page-heading-row"><div><p class="page-eyebrow">Remember what matters</p><h1>Flashcards</h1><p class="page-subtitle">Active recall with a gentle spaced review schedule. Rate each card honestly; the next date adjusts for you.</p></div><button class="primary-button" id="generate-cards-open">＋ Create cards</button></div>
      <div class="deck-toolbar surface-card"><label class="deck-picker">Review deck <select id="deck-filter"><option value="all" ${state.deckFilter === 'all' ? 'selected' : ''}>All collections</option>${data.notes.filter(note => !note.isDeleted).map(note => `<option value="${note.id}" ${state.deckFilter === note.id ? 'selected' : ''}>${escapeHTML(note.title || 'Untitled note')}</option>`).join('')}</select></label><div class="deck-stats"><span><strong>${dueLabel}</strong> due now</span><span><strong>${upcomingCards}</strong> coming up</span><span><strong>${allCards.length}</strong> total cards</span></div></div>
      ${stage}
      ${deckRows ? `<div class="section-title-row" style="margin-top:27px"><h2>Your cards</h2><span>${allCards.length} in this deck</span></div><div class="deck-list">${deckRows}</div>` : ''}
      ${noteOptions ? `<select id="hidden-note-options" class="sr-only" aria-hidden="true">${noteOptions}</select>` : ''}
    </div>`;
  }

  function renderFocusView() {
    const timer = state.timer;
    const circumference = 2 * Math.PI * 45;
    const total = (timer.phase === 'Focus' ? timer.focusMinutes : timer.breakMinutes) * 60;
    const progress = Math.max(0, Math.min(1, 1 - timer.secondsLeft / total));
    const focusToday = getFocusToday();
    const sessionsToday = getSessionsToday().length;
    const minutes = Math.floor(timer.secondsLeft / 60);
    const seconds = timer.secondsLeft % 60;
    workspace.innerHTML = `<div class="page-wrap">
      <div class="page-heading-row"><div><p class="page-eyebrow">Make a little room</p><h1>Focus room</h1><p class="page-subtitle">One quiet block at a time. Choose what you are studying, then begin when you feel ready.</p></div></div>
      <div class="focus-grid">
        <section class="focus-main surface-card">
          <div class="focus-clock-wrap"><svg class="focus-clock" viewBox="0 0 100 100" aria-hidden="true"><circle class="clock-track" cx="50" cy="50" r="45"></circle><circle class="clock-progress" cx="50" cy="50" r="45" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - progress)}"></circle></svg><div class="focus-clock-label"><span class="focus-time" id="focus-time">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span><span class="focus-phase" id="focus-phase">${timer.phase} session</span></div></div>
          <div class="focus-subject"><label for="focus-subject">What are you focusing on?</label><input id="focus-subject" maxlength="80" placeholder="e.g. Review biology notes" value="${escapeHTML(timer.subject)}"></div>
          <div class="focus-controls"><button class="primary-button" id="focus-start">${timer.running ? 'Ⅱ Pause session' : timer.secondsLeft === total ? '▶ Start focus' : '▶ Resume session'}</button><button class="secondary-button" id="focus-reset">↺ Reset</button></div>
        </section>
        <div>
          <section class="focus-settings surface-card"><h2>Your rhythm</h2><p>A familiar 25 and 5 is a good starting point. Adjust the lengths to fit the task in front of you.</p>
            <label class="duration-row"><span>Focus minutes</span><input type="number" id="focus-duration" min="5" max="90" value="${timer.focusMinutes}" ${timer.running ? 'disabled' : ''}></label>
            <label class="duration-row"><span>Short break</span><input type="number" id="break-duration" min="1" max="30" value="${timer.breakMinutes}" ${timer.running ? 'disabled' : ''}></label>
          </section>
          <section class="focus-stats-card surface-card"><div class="stat-line"><span>Focused today</span><strong>${focusToday} min</strong></div><div class="stat-line"><span>Completed sessions</span><strong>${sessionsToday}</strong></div><div class="stat-line"><span>Target</span><strong>3 sessions</strong></div></section>
        </div>
      </div>
    </div>`;
  }

  function localDayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function getSessionsToday() { return data.stats.focusSessions.filter(session => localDayKey(new Date(session.completedAt)) === localDayKey()); }
  function getFocusToday() { return getSessionsToday().reduce((sum, session) => sum + (session.minutes || 0), 0); }

  function renderInsightsView() {
    const liveNotes = data.notes.filter(note => !note.isDeleted);
    const wordCount = liveNotes.reduce((sum, note) => sum + String(note.body || '').trim().split(/\s+/).filter(Boolean).length, 0);
    const totalFocus = data.stats.focusSessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
    const totalReviews = Object.values(data.stats.dailyReviews).reduce((sum, count) => sum + count, 0);
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(); date.setDate(date.getDate() - offset);
      const key = localDayKey(date);
      const minutes = data.stats.focusSessions.filter(session => localDayKey(new Date(session.completedAt)) === key).reduce((sum, session) => sum + (session.minutes || 0), 0);
      days.push({ name: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes, today: offset === 0 });
    }
    const max = Math.max(30, ...days.map(day => day.minutes));
    const recent = liveNotes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
    workspace.innerHTML = `<div class="page-wrap">
      <div class="page-heading-row"><div><p class="page-eyebrow">Small steps add up</p><h1>Study insights</h1><p class="page-subtitle">A private look at what you have been capturing and practicing on this device.</p></div></div>
      <div class="insight-grid">
        <div class="insight-stat surface-card"><small>Notes kept</small><strong>${liveNotes.length}</strong><span>Across ${data.folders.length} collections</span></div>
        <div class="insight-stat surface-card"><small>Words captured</small><strong>${wordCount.toLocaleString()}</strong><span>Across your notes</span></div>
        <div class="insight-stat surface-card"><small>Focus time</small><strong>${totalFocus}</strong><span>Minutes completed</span></div>
        <div class="insight-stat surface-card"><small>Recall practice</small><strong>${totalReviews}</strong><span>Card reviews recorded</span></div>
      </div>
      <div class="focus-grid">
        <section class="activity-card surface-card"><div class="section-title-row"><h2>Focus minutes</h2><span>Last 7 days</span></div><div class="weekly-bars">${days.map(day => `<div class="week-day"><div class="week-bar-track"><div class="week-bar" style="height:${day.minutes ? Math.max(5, day.minutes / max * 95) : 3}px;opacity:${day.today ? 1 : .73}"></div></div><span>${day.name}</span></div>`).join('')}</div></section>
        <section class="activity-card surface-card"><div class="section-title-row"><h2>Recently edited</h2><span>${recent.length} notes</span></div><div class="activity-list">${recent.length ? recent.map(note => `<div class="activity-line"><strong>${escapeHTML(note.title || 'Untitled note')}</strong><span class="activity-date">${escapeHTML(formatDate(note.updatedAt))}</span></div>`).join('') : '<p class="form-hint">Your recent notes will show up here.</p>'}</div></section>
      </div>
    </div>`;
  }

  function renderTrashView() {
    const deleted = data.notes.filter(note => note.isDeleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    const rows = deleted.map(note => `<div class="trash-row surface-card"><span class="sparkle-icon">⌑</span><span class="trash-row-main"><strong>${escapeHTML(note.title || 'Untitled note')}</strong><small>Deleted ${escapeHTML(formatDate(note.deletedAt || note.updatedAt))} · ${escapeHTML(note.folder || 'General')}</small></span><span class="trash-row-actions"><button data-restore-note="${escapeHTML(note.id)}">Restore</button><button data-delete-forever="${escapeHTML(note.id)}">Delete forever</button></span></div>`).join('');
    workspace.innerHTML = `<div class="page-wrap"><div class="page-heading-row"><div><p class="page-eyebrow">A little breathing room</p><h1>Recently deleted</h1><p class="page-subtitle">Notes here stay until you restore or permanently remove them.</p></div>${deleted.length ? '<button class="danger-button" id="empty-trash">Empty trash</button>' : ''}</div><div class="trash-list">${rows || '<div class="surface-card empty-list">Your trash is empty. Deleted notes will appear here.</div>'}</div></div>`;
  }

  function makeNote(title = '', body = '', folder = 'General', tags = []) {
    const now = Date.now();
    const note = { id: makeId(), title, body, folder: data.folders.includes(folder) ? folder : 'General', tags, pinned: false, createdAt: now, updatedAt: now, isDeleted: false };
    data.notes.unshift(note);
    state.selectedNoteId = note.id;
    state.view = 'notes';
    state.mobileEditorOpen = true;
    state.folder = note.folder === 'General' ? 'All notes' : note.folder;
    state.listFilter = 'all';
    saveData();
    renderWorkspace();
    setTimeout(() => $('#note-title-input')?.focus(), 40);
    return note;
  }

  function currentFolderForNewNote() {
    return state.folder !== 'All notes' && data.folders.includes(state.folder) ? state.folder : 'General';
  }

  function updateNoteFromEditor(field, value) {
    const note = activeNote();
    if (!note) return;
    note[field] = value;
    note.updatedAt = Date.now();
    scheduleSave();
    const edited = $('#editor-edited-at');
    if (edited) edited.textContent = 'Edited just now';
    const wordCount = $('#word-count');
    if (wordCount) wordCount.textContent = formatWords(note.body);
    const charCount = $('#char-count');
    if (charCount) charCount.textContent = `${String(note.body || '').length} characters`;
    const meta = $('.editor-meta-row');
    if (meta) meta.children[2].textContent = formatWords(note.body);
    const cards = $('#note-list');
    if (cards) cards.innerHTML = renderNoteCards(visibleNotes());
  }

  function createFolder(name) {
    const folder = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!folder) return;
    if (data.folders.some(item => item.toLowerCase() === folder.toLowerCase())) return toast('That collection already exists.');
    data.folders.push(folder);
    saveData();
    renderWorkspace();
    toast(`“${folder}” collection created.`);
  }

  function openModal(title, subtitle, body, className = '') {
    overlayRoot.innerHTML = `<div class="overlay" data-overlay-background><section class="modal ${className}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><h2 id="modal-title">${escapeHTML(title)}</h2>${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ''}</div><button class="modal-close" data-close-modal aria-label="Close">×</button></header><div class="modal-body">${body}</div></section></div>`;
  }

  function closeModal() { overlayRoot.innerHTML = ''; }

  function openFolderModal() {
    openModal('Create a collection', 'Group notes by class, project, or anything you are learning.', '<form id="folder-form"><div class="form-group"><label for="folder-name">Collection name</label><input id="folder-name" name="name" maxlength="40" placeholder="e.g. Cognitive science" required autocomplete="off"></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button" type="submit">Create collection</button></div></form>');
    setTimeout(() => $('#folder-name')?.focus(), 30);
  }

  function openTagPrompt() {
    const value = window.prompt('Add a short tag to this note:');
    if (!value) return;
    const note = activeNote();
    if (!note) return;
    note.tags = note.tags || [];
    const tag = value.trim().replace(/^#/, '').slice(0, 24);
    if (tag && !note.tags.some(item => item.toLowerCase() === tag.toLowerCase())) {
      note.tags.push(tag); saveData(); renderWorkspace();
    }
  }

  function openNoteActions() {
    const note = activeNote();
    if (!note) return;
    openModal('Note actions', 'Keep your workspace tidy.', `<div class="action-option-list"><button class="action-option" data-note-action="duplicate"><span class="action-option-icon">▧</span> Duplicate this note</button><button class="action-option" data-note-action="copy"><span class="action-option-icon">⎘</span> Copy as Markdown</button><button class="action-option" data-note-action="download"><span class="action-option-icon">↓</span> Download as text</button><button class="action-option" data-note-action="delete"><span class="action-option-icon">⌑</span> Move to recently deleted</button></div>`);
  }

  function performNoteAction(action) {
    const note = activeNote();
    if (!note) return;
    closeModal();
    if (action === 'duplicate') {
      const clone = makeNote(`${note.title || 'Untitled note'} — copy`, note.body, note.folder, [...(note.tags || [])]);
      clone.pinned = false; saveData(); toast('Note duplicated.');
    } else if (action === 'delete') {
      note.isDeleted = true; note.deletedAt = Date.now(); note.updatedAt = Date.now();
      state.selectedNoteId = null; state.mobileEditorOpen = false; state.preview = false; saveData(); renderWorkspace(); toast('Moved to recently deleted.');
    } else if (action === 'copy') {
      navigator.clipboard?.writeText(`# ${note.title || 'Untitled note'}\n\n${note.body || ''}`).then(() => toast('Markdown copied to clipboard.')).catch(() => toast('Clipboard access is unavailable in this browser.'));
    } else if (action === 'download') {
      downloadText(`${safeFileName(note.title || 'note')}.md`, `# ${note.title || 'Untitled note'}\n\n${note.body || ''}`);
      toast('Note downloaded.');
    }
  }

  function safeFileName(name) { return String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'note'; }

  function downloadText(filename, content, type = 'text/markdown') {
    if (window.StillnoteAndroid && typeof window.StillnoteAndroid.saveTextFile === 'function') {
      window.StillnoteAndroid.saveTextFile(filename, type, content);
      return;
    }
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function templatesModal() {
    const templates = [
      { title: 'Lecture notes', body: '## Topic\n\n### Key ideas\n- \n\n### Questions\n- \n\n### After class\n- Review\n' },
      { title: 'Reading notes', body: '## Reading\n\n**Main claim:** \n\n### Evidence\n- \n\n### My response\n- \n\n### Questions to revisit\n- ' },
      { title: 'Weekly study plan', body: '## This week\n\n### Priorities\n- [ ] \n- [ ] \n- [ ] \n\n### Review sessions\n- \n\n### What I learned\n- ' }
    ];
    openModal('Start with a template', 'A little structure can make it easier to begin.', templates.map((item, index) => `<button class="action-option" data-template-index="${index}" style="width:100%;margin-bottom:6px"><span class="action-option-icon">${index === 0 ? '▤' : index === 1 ? '◫' : '☑'}</span>${escapeHTML(item.title)}</button>`).join(''));
    return templates;
  }

  function startTemplate(index) {
    const templates = [
      { title: 'Lecture notes', body: '## Topic\n\n### Key ideas\n- \n\n### Questions\n- \n\n### After class\n- Review\n' },
      { title: 'Reading notes', body: '## Reading\n\n**Main claim:** \n\n### Evidence\n- \n\n### My response\n- \n\n### Questions to revisit\n- ' },
      { title: 'Weekly study plan', body: '## This week\n\n### Priorities\n- [ ] \n- [ ] \n- [ ] \n\n### Review sessions\n- \n\n### What I learned\n- ' }
    ];
    const template = templates[index];
    if (!template) return;
    closeModal(); makeNote(template.title, template.body, currentFolderForNewNote());
  }

  function openSearch() {
    state.searchQuery = ''; state.searchIndex = 0;
    openModal('', '', `<div class="search-input-row"><span>⌕</span><input id="global-search" type="search" placeholder="Search notes, ideas, and tags…" autocomplete="off" aria-label="Search notes"></div><div class="result-list" id="search-results"></div><div class="search-footer"><span>↑ ↓ to move · Enter to open</span><span>Esc to close</span></div>`, 'search-modal');
    $('#modal-title').textContent = 'Search your workspace';
    setTimeout(() => $('#global-search')?.focus(), 25);
    renderSearchResults();
  }

  function searchNotes(query) {
    const term = query.trim().toLowerCase();
    const notes = data.notes.filter(note => !note.isDeleted);
    if (!term) return notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 7);
    return notes.map(note => {
      const title = (note.title || '').toLowerCase();
      const body = (note.body || '').toLowerCase();
      const tags = (note.tags || []).join(' ').toLowerCase();
      const score = title.includes(term) ? 4 : tags.includes(term) ? 3 : body.includes(term) ? 1 : 0;
      return { note, score };
    }).filter(item => item.score).sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt).map(item => item.note).slice(0, 12);
  }

  function renderSearchResults() {
    const holder = $('#search-results');
    if (!holder) return;
    const results = searchNotes(state.searchQuery);
    if (!results.length) { holder.innerHTML = '<div class="empty-list">No notes found. Try another word.</div>'; return; }
    holder.innerHTML = results.map((note, index) => `<button class="search-result ${index === state.searchIndex ? 'is-highlighted' : ''}" data-search-note="${escapeHTML(note.id)}"><span class="search-result-icon">▤</span><span class="search-result-main"><strong>${escapeHTML(note.title || 'Untitled note')}</strong><small>${escapeHTML(plainText(note.body).slice(0, 120) || note.folder || 'No preview')} · ${escapeHTML(note.folder || 'General')}</small></span></button>`).join('');
  }

  function openSearchResult(noteId) {
    const note = data.notes.find(item => item.id === noteId && !item.isDeleted);
    if (!note) return;
    state.view = 'notes'; state.folder = 'All notes'; state.listFilter = 'all'; state.selectedNoteId = note.id; state.mobileEditorOpen = true; state.preview = false;
    closeModal(); renderWorkspace();
  }

  function openSettings() {
    const settings = data.settings;
    openModal('Settings', 'Choose your preferences and manage your local backup.', `<div class="form-row"><div class="form-group"><label for="theme-select">Appearance</label><select id="theme-select"><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div><div class="form-group"><label for="voice-language">Dictation language</label><select id="voice-language"><option value="en-US" ${settings.voiceLanguage === 'en-US' ? 'selected' : ''}>English (US)</option><option value="en-GB" ${settings.voiceLanguage === 'en-GB' ? 'selected' : ''}>English (UK)</option><option value="en-IN" ${settings.voiceLanguage === 'en-IN' ? 'selected' : ''}>English (India)</option><option value="hi-IN" ${settings.voiceLanguage === 'hi-IN' ? 'selected' : ''}>Hindi</option><option value="es-ES" ${settings.voiceLanguage === 'es-ES' ? 'selected' : ''}>Español</option><option value="fr-FR" ${settings.voiceLanguage === 'fr-FR' ? 'selected' : ''}>Français</option><option value="de-DE" ${settings.voiceLanguage === 'de-DE' ? 'selected' : ''}>Deutsch</option></select></div></div>
      <div class="modal-actions" style="justify-content:space-between"><button class="secondary-button" id="backup-export">↓ Export backup</button><div style="display:flex;gap:7px"><button class="secondary-button" data-close-modal>Close</button><label class="secondary-button" for="backup-import" style="cursor:pointer">↑ Import backup</label><input id="backup-import" type="file" accept="application/json,.json" hidden></div></div>
      `);
    $('#theme-select').addEventListener('change', event => setTheme(event.target.value));
  }

  function setTheme(theme) {
    data.settings.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = data.settings.theme;
    $('#theme-icon').textContent = data.settings.theme === 'dark' ? '☀' : '☾';
    if (window.StillnoteAndroid && typeof window.StillnoteAndroid.setTheme === 'function') window.StillnoteAndroid.setTheme(data.settings.theme);
    saveData();
  }

  function extractSentences(text) {
    return String(text || '').replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map(sentence => sentence.trim()).filter(sentence => sentence.length > 25).slice(0, 18);
  }

  function createCard(note, question, answer) {
    const card = { id: makeId(), noteId: note.id, question, answer, createdAt: Date.now(), dueAt: Date.now(), intervalDays: 0, easeFactor: 2.5, repetitions: 0 };
    data.flashcards.push(card);
    return card;
  }

  function createCardsFromNote(note) {
    const lines = String(note.body || '').split('\n').map(line => line.trim()).filter(Boolean);
    const pairs = [];
    for (const line of lines) {
      const normalized = line.replace(/^[-*#>\s]+/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      const pair = normalized.match(/^(.{2,90}?)\s*(?::|—|–|->)\s*(.{12,240})$/);
      if (pair) pairs.push({ question: `What is ${pair[1].replace(/[?.!]+$/, '')}?`, answer: pair[2] });
    }
    if (!pairs.length) {
      const sentences = extractSentences(note.body).slice(0, 7);
      const words = (note.title || 'this topic').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
      sentences.forEach((sentence, index) => {
        const key = sentence.match(/\b[A-Z][a-z]{3,}\b/)?.[0];
        const question = key ? `What role does ${key} play in ${words}?` : `What is one important idea from ${words}?`;
        pairs.push({ question: index ? `Recall another key idea from ${words}.` : question, answer: sentence });
      });
    }
    const cards = pairs.slice(0, 10).map(pair => createCard(note, pair.question, pair.answer));
    if (cards.length) { saveData(); renderSidebar(); }
    return cards;
  }

  function openGenerateCardsModal() {
    const notes = data.notes.filter(note => !note.isDeleted);
    if (!notes.length) { toast('Create a note before making flashcards.'); return; }
    const selected = activeNote()?.id || notes[0].id;
    openModal('Create a flashcard deck', 'Choose a note. Stillnote finds definitions and key sentences on this device.', `<div class="form-group"><label for="cards-note-select">Source note</label><select id="cards-note-select">${notes.map(note => `<option value="${note.id}" ${selected === note.id ? 'selected' : ''}>${escapeHTML(note.title || 'Untitled note')} · ${escapeHTML(note.folder || 'General')}</option>`).join('')}</select></div><p class="info-callout">Cards are made from lines in your note. Add definitions with a colon or write complete sentences for more review prompts.</p><div class="modal-actions"><button class="secondary-button" data-close-modal>Cancel</button><button class="primary-button" id="create-cards-submit">Create cards</button></div>`);
  }

  function generateDeckFromSelection() {
    const noteId = $('#cards-note-select')?.value;
    const note = data.notes.find(item => item.id === noteId);
    if (!note) return;
    closeModal();
    const cards = createCardsFromNote(note);
    state.view = 'flashcards'; state.deckFilter = note.id; state.currentCardId = cards[0]?.id || null; renderWorkspace();
    if (cards.length) toast(`${cards.length} flashcards created.`);
    else toast('Add a few complete ideas or definitions to this note first.');
  }

  function rateCard(rating) {
    const card = data.flashcards.find(item => item.id === state.currentCardId);
    if (!card) return;
    let interval = Number(card.intervalDays) || 0;
    let ease = Number(card.easeFactor) || 2.5;
    let repetitions = Number(card.repetitions) || 0;
    if (rating === 'again') { interval = 0; repetitions = 0; ease = Math.max(1.3, ease - 0.2); card.dueAt = Date.now() + 10 * 60 * 1000; }
    else if (rating === 'hard') { interval = Math.max(1, interval * 1.2); repetitions += 1; ease = Math.max(1.3, ease - 0.15); card.dueAt = Date.now() + interval * 86400000; }
    else if (rating === 'good') { interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : interval * ease; repetitions += 1; card.dueAt = Date.now() + interval * 86400000; }
    else { interval = repetitions === 0 ? 4 : Math.max(4, interval * ease * 1.3); repetitions += 1; ease = Math.min(3.2, ease + 0.1); card.dueAt = Date.now() + interval * 86400000; }
    card.intervalDays = interval; card.easeFactor = ease; card.repetitions = repetitions; card.lastReviewedAt = Date.now();
    const key = localDayKey(); data.stats.dailyReviews[key] = (data.stats.dailyReviews[key] || 0) + 1;
    state.currentCardId = null; state.cardFlipped = false; saveData(); renderWorkspace();
  }

  function toggleFlashcard() {
    state.cardFlipped = !state.cardFlipped; renderWorkspace();
  }

  function startDictation() {
    if (window.StillnoteAndroid && typeof window.StillnoteAndroid.startDictation === 'function') {
      const button = $('#dictate-button');
      isRecording = true;
      if (button) { button.classList.add('is-recording'); button.innerHTML = '<span>◉</span><span class="action-label">Listening…</span>'; }
      try { window.StillnoteAndroid.startDictation(data.settings.voiceLanguage || 'en-US'); }
      catch (error) { isRecording = false; toast('Android dictation could not start.'); }
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { toast('Dictation is not available in this browser. Try a recent version of Chrome or Edge.'); return; }
    if (isRecording && recognition) { recognition.stop(); return; }
    recognition = new Recognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = data.settings.voiceLanguage || 'en-US';
    let committed = '';
    const startingBody = activeNote()?.body || '';
    recordingNoteId = state.selectedNoteId;
    const button = $('#dictate-button');
    recognition.onstart = () => { isRecording = true; if (button) { button.classList.add('is-recording'); button.innerHTML = '<span>◉</span><span class="action-label">Listening…</span>'; } toast('Listening. Speak naturally, then tap the microphone to finish.', 2400); };
    recognition.onresult = event => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const phrase = event.results[index][0].transcript;
        if (event.results[index].isFinal) committed += `${phrase} `;
        else interim += phrase;
      }
      const textarea = $('#note-body-input');
      if (!textarea) return;
      const note = activeNote();
      if (!note) return;
      const separator = startingBody && !/\s$/.test(startingBody) ? '\n' : '';
      textarea.value = startingBody + separator + committed + interim;
      updateNoteFromEditor('body', textarea.value);
      textarea.scrollTop = textarea.scrollHeight;
    };
    recognition.onerror = event => { if (event.error !== 'no-speech' && event.error !== 'aborted') toast(`Dictation stopped: ${event.error}.`); };
    recognition.onend = () => { isRecording = false; recordingNoteId = null; const liveButton = $('#dictate-button'); if (liveButton) { liveButton.classList.remove('is-recording'); liveButton.innerHTML = '<span>◉</span><span class="action-label">Dictate</span>'; } saveData(); };
    try { recognition.start(); } catch (error) { toast('Dictation could not start. Check your microphone permission.'); }
  }

  window.addEventListener('stillnote:dictation', event => {
    const transcript = String(event.detail || '').trim();
    const note = activeNote();
    const textarea = $('#note-body-input');
    if (transcript && note && textarea) {
      const before = note.body || '';
      const separator = before && !/\s$/.test(before) ? '\n' : '';
      textarea.value = `${before}${separator}${transcript} `;
      updateNoteFromEditor('body', textarea.value);
      toast('Dictation added to your note.');
    }
    isRecording = false;
    const button = $('#dictate-button');
    if (button) { button.classList.remove('is-recording'); button.innerHTML = '<span>◉</span><span class="action-label">Dictate</span>'; }
  });

  window.addEventListener('stillnote:dictation-ended', event => {
    isRecording = false;
    const button = $('#dictate-button');
    if (button) { button.classList.remove('is-recording'); button.innerHTML = '<span>◉</span><span class="action-label">Dictate</span>'; }
    if (event.detail) toast(String(event.detail));
  });

  window.addEventListener('stillnote:file-saved', event => {
    toast(`${String(event.detail || 'File')} saved.`);
  });

  window.addEventListener('stillnote:file-save-error', event => {
    toast(String(event.detail || 'Could not save the file.'));
  });

  function updateFocusDisplay() {
    if (state.timer.running && state.timer.deadline) {
      state.timer.secondsLeft = Math.max(0, Math.ceil((state.timer.deadline - Date.now()) / 1000));
      if (state.timer.secondsLeft === 0) completeTimerPhase();
    }
    const time = $('#focus-time');
    if (!time) return;
    time.textContent = `${String(Math.floor(state.timer.secondsLeft / 60)).padStart(2, '0')}:${String(state.timer.secondsLeft % 60).padStart(2, '0')}`;
    const phase = $('#focus-phase'); if (phase) phase.textContent = `${state.timer.phase} session`;
    const total = (state.timer.phase === 'Focus' ? state.timer.focusMinutes : state.timer.breakMinutes) * 60;
    const progress = Math.max(0, Math.min(1, 1 - state.timer.secondsLeft / total));
    const circle = $('.clock-progress');
    if (circle) circle.style.strokeDashoffset = String(2 * Math.PI * 45 * (1 - progress));
    const start = $('#focus-start');
    if (start) start.textContent = state.timer.running ? 'Ⅱ Pause session' : state.timer.secondsLeft === total ? '▶ Start focus' : '▶ Resume session';
  }

  function completeTimerPhase() {
    const timer = state.timer;
    timer.running = false; timer.deadline = null;
    if (timer.phase === 'Focus') {
      const minutes = timer.focusMinutes;
      data.stats.focusSessions.push({ id: makeId(), minutes, subject: timer.subject || 'Focus session', completedAt: Date.now() });
      timer.phase = 'Break'; timer.secondsLeft = timer.breakMinutes * 60;
      saveData(); toast(`Focus session complete${timer.subject ? `: ${timer.subject}` : ''}. Take a short break.`);
    } else {
      timer.phase = 'Focus'; timer.secondsLeft = timer.focusMinutes * 60;
      toast('Break is over. Ready for another focus block?');
    }
    renderWorkspace();
  }

  function startTimer() {
    const timer = state.timer;
    if (timer.running) { timer.secondsLeft = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)); timer.running = false; timer.deadline = null; }
    else { timer.running = true; timer.deadline = Date.now() + timer.secondsLeft * 1000; }
    updateFocusDisplay();
  }

  function resetTimer() {
    const timer = state.timer;
    timer.running = false; timer.deadline = null;
    timer.phase = 'Focus'; timer.secondsLeft = timer.focusMinutes * 60;
    updateFocusDisplay();
  }

  function exportBackup() {
    const payload = { app: 'Stillnote', version: 1, exportedAt: new Date().toISOString(), ...data };
    downloadText(`stillnote-backup-${localDayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup exported. Keep the file somewhere safe.');
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.notes) || !Array.isArray(imported.folders)) throw new Error('This file does not look like a Stillnote backup.');
      if (!window.confirm(`Import ${imported.notes.length} notes and replace the current workspace on this device? Export a backup first if you want to keep both.`)) return;
      data.notes = imported.notes; data.folders = imported.folders.length ? imported.folders : ['General'];
      data.flashcards = Array.isArray(imported.flashcards) ? imported.flashcards : [];
      data.settings = { ...data.settings, ...(imported.settings || {}) };
      data.stats = { ...data.stats, ...(imported.stats || {}) };
      state.selectedNoteId = data.notes.find(note => !note.isDeleted)?.id || null;
      state.folder = 'All notes'; state.view = 'notes'; state.mobileEditorOpen = false; saveData(); closeModal(); renderWorkspace(); toast('Backup imported.');
    } catch (error) { toast(error.message || 'Could not read this backup file.'); }
  }

  workspace.addEventListener('click', event => {
    const target = event.target.closest('button, [data-note-id], [data-folder], select');
    if (!target) return;
    if (target.dataset.mobileView) { state.view = target.dataset.mobileView; state.mobileEditorOpen = false; renderWorkspace(); return; }
    if (target.dataset.view) { state.view = target.dataset.view; state.mobileEditorOpen = false; if (state.view === 'notes') state.folder = 'All notes'; state.preview = false; renderWorkspace(); return; }
    if (target.dataset.folder) { state.view = 'notes'; state.mobileEditorOpen = false; state.folder = target.dataset.folder; state.listFilter = 'all'; renderWorkspace(); return; }
    if (target.dataset.noteId) { state.selectedNoteId = target.dataset.noteId; state.mobileEditorOpen = true; state.preview = false; renderWorkspace(); return; }
    if (target.id === 'mobile-editor-back') { state.mobileEditorOpen = false; saveData(); renderWorkspace(); return; }
    if (target.dataset.filter) { state.listFilter = target.dataset.filter; renderWorkspace(); return; }
    if (target.id === 'new-note-small' || target.id === 'empty-new-note') { makeNote('', '', currentFolderForNewNote()); return; }
    if (target.id === 'dictate-button') { startDictation(); return; }
    if (target.id === 'preview-toggle') { state.preview = !state.preview; renderWorkspace(); return; }
    if (target.id === 'pin-note-button') { const note = activeNote(); if (note) { note.pinned = !note.pinned; saveData(); renderWorkspace(); } return; }
    if (target.id === 'note-menu-button') { openNoteActions(); return; }
    if (target.id === 'add-tag-button') { openTagPrompt(); return; }
    if (target.id === 'generate-cards-open') { openGenerateCardsModal(); return; }
    if (target.id === 'active-flashcard') { toggleFlashcard(); return; }
    if (target.dataset.rate) { rateCard(target.dataset.rate); return; }
    if (target.dataset.deleteCard) { data.flashcards = data.flashcards.filter(card => card.id !== target.dataset.deleteCard); state.currentCardId = null; saveData(); renderWorkspace(); toast('Flashcard deleted.'); return; }
    if (target.id === 'focus-start') { startTimer(); return; }
    if (target.id === 'focus-reset') { resetTimer(); return; }
    if (target.id === 'empty-trash') { if (window.confirm('Permanently delete all notes in recently deleted? This cannot be undone.')) { data.notes = data.notes.filter(note => !note.isDeleted); saveData(); renderWorkspace(); toast('Trash emptied.'); } return; }
    if (target.dataset.restoreNote) { const note = data.notes.find(item => item.id === target.dataset.restoreNote); if (note) { note.isDeleted = false; delete note.deletedAt; note.updatedAt = Date.now(); saveData(); renderWorkspace(); toast('Note restored.'); } return; }
    if (target.dataset.deleteForever) { if (window.confirm('Permanently delete this note? This cannot be undone.')) { data.notes = data.notes.filter(item => item.id !== target.dataset.deleteForever); saveData(); renderWorkspace(); toast('Note permanently deleted.'); } return; }
  });

  workspace.addEventListener('input', event => {
    if (event.target.id === 'note-title-input') updateNoteFromEditor('title', event.target.value);
    else if (event.target.id === 'note-body-input') updateNoteFromEditor('body', event.target.value);
    else if (event.target.id === 'focus-subject') state.timer.subject = event.target.value;
  });

  workspace.addEventListener('change', event => {
    if (event.target.id === 'mobile-folder-select') {
      if (event.target.value === '__new__') { openFolderModal(); return; }
      state.folder = event.target.value; state.listFilter = 'all'; renderWorkspace();
    } else if (event.target.id === 'note-folder-select') {
      const note = activeNote(); if (!note) return;
      note.folder = event.target.value; note.updatedAt = Date.now(); saveData(); state.folder = 'All notes'; renderWorkspace();
    } else if (event.target.id === 'deck-filter') {
      state.deckFilter = event.target.value; state.currentCardId = null; state.cardFlipped = false; renderWorkspace();
    } else if (event.target.id === 'focus-duration') {
      const value = Math.min(90, Math.max(5, Number(event.target.value) || 25));
      state.timer.focusMinutes = value; data.settings.focusMinutes = value;
      if (!state.timer.running && state.timer.phase === 'Focus') state.timer.secondsLeft = value * 60;
      saveData(); renderWorkspace();
    } else if (event.target.id === 'break-duration') {
      const value = Math.min(30, Math.max(1, Number(event.target.value) || 5));
      state.timer.breakMinutes = value; data.settings.breakMinutes = value;
      if (!state.timer.running && state.timer.phase === 'Break') state.timer.secondsLeft = value * 60;
      saveData(); renderWorkspace();
    }
  });

  overlayRoot.addEventListener('click', event => {
    const target = event.target.closest('button, [data-template-index], [data-note-action], [data-search-note]');
    if (event.target.matches('[data-overlay-background]') || target?.hasAttribute('data-close-modal')) { closeModal(); return; }
    if (!target) return;
    if (target.id === 'backup-export') { exportBackup(); return; }
    if (target.id === 'create-cards-submit') { generateDeckFromSelection(); return; }
    if (target.dataset.templateIndex) { startTemplate(Number(target.dataset.templateIndex)); return; }
    if (target.dataset.noteAction) { performNoteAction(target.dataset.noteAction); return; }
    if (target.dataset.searchNote) { openSearchResult(target.dataset.searchNote); return; }
  });

  overlayRoot.addEventListener('input', event => {
    if (event.target.id === 'global-search') { state.searchQuery = event.target.value; state.searchIndex = 0; renderSearchResults(); }
  });
  overlayRoot.addEventListener('submit', event => {
    if (event.target.id === 'folder-form') { event.preventDefault(); createFolder($('#folder-name').value); closeModal(); }
  });
  overlayRoot.addEventListener('change', event => {
    if (event.target.id === 'voice-language') { data.settings.voiceLanguage = event.target.value; saveData(); }
    else if (event.target.id === 'backup-import') importBackup(event.target.files?.[0]);
  });

  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.mobileView) { state.view = target.dataset.mobileView; state.mobileEditorOpen = false; renderWorkspace(); return; }
    if (target.dataset.view) { state.view = target.dataset.view; state.mobileEditorOpen = false; if (state.view === 'notes') state.folder = 'All notes'; state.preview = false; renderWorkspace(); return; }
    if (target.dataset.folder) { state.view = 'notes'; state.mobileEditorOpen = false; state.folder = target.dataset.folder; state.listFilter = 'all'; renderWorkspace(); return; }
    if (target.id === 'new-note-button') { makeNote('', '', currentFolderForNewNote()); return; }
    if (target.id === 'add-folder-button') { openFolderModal(); return; }
    if (target.id === 'settings-button' || target.id === 'profile-button') { openSettings(); return; }
    if (target.id === 'theme-toggle') { setTheme(data.settings.theme === 'dark' ? 'light' : 'dark'); return; }
    if (target.id === 'search-open') { openSearch(); return; }
  });

  document.addEventListener('keydown', event => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); return; }
    if (modifier && event.key.toLowerCase() === 'n') { event.preventDefault(); makeNote('', '', currentFolderForNewNote()); return; }
    if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); saveData(); toast('Saved on this device.'); return; }
    if (event.key === 'Escape' && overlayRoot.innerHTML) { closeModal(); return; }
    if (event.key === 'Escape' && state.view === 'notes' && state.mobileEditorOpen) { state.mobileEditorOpen = false; renderWorkspace(); return; }
    if (overlayRoot.innerHTML && $('#global-search')) {
      const results = searchNotes(state.searchQuery);
      if (event.key === 'ArrowDown') { event.preventDefault(); state.searchIndex = Math.min(results.length - 1, state.searchIndex + 1); renderSearchResults(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); state.searchIndex = Math.max(0, state.searchIndex - 1); renderSearchResults(); }
      if (event.key === 'Enter' && results[state.searchIndex]) { event.preventDefault(); openSearchResult(results[state.searchIndex].id); }
    } else if (state.view === 'flashcards' && event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault(); if (state.currentCardId) toggleFlashcard();
    }
  });

  window.stillnoteHandleBack = function () {
    if (overlayRoot.innerHTML) { closeModal(); return true; }
    if (state.view === 'notes' && state.mobileEditorOpen) { state.mobileEditorOpen = false; saveData(); renderWorkspace(); return true; }
    return false;
  };

  window.addEventListener('resize', renderMobileNav);
  window.addEventListener('beforeunload', saveData);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveData(); });
  if (window.StillnoteAndroid) document.documentElement.dataset.platform = 'android';
  document.documentElement.dataset.theme = data.settings.theme;
  $('#theme-icon').textContent = data.settings.theme === 'dark' ? '☀' : '☾';
  if (window.StillnoteAndroid && typeof window.StillnoteAndroid.setTheme === 'function') window.StillnoteAndroid.setTheme(data.settings.theme);
  setInterval(updateFocusDisplay, 300);
  renderWorkspace();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
})();
