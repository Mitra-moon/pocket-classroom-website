///learn.js: ⬇
// Learn section: lets user study notes, flashcards, and take quizzes.

import * as storage from './storage.js';
import * as utils from './utils.js';

let currentCapsule = null;
let currentTab = 'notes';
let cardIndex = 0;

const $ = s => document.querySelector(s);

export function initLearn() {
  // dropdown export button and tab buttons
  const select = $('#learn-capsule-select');
  const exportBtn = $('#export-current');
  const tabs = document.querySelectorAll('#learn-tabs .nav-link');

  // when user selects a capsule
  if (select) select.addEventListener('change', onSelectCapsule);

  // exports capsule as JSON
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!currentCapsule) return alert('No capsule selected');
    const out = storage.exportCapsuleObject(currentCapsule);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = utils.slugify(currentCapsule.meta.title || 'capsule') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // switch tabs notes, flashcards, quiz
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    showLearnTab(tab.dataset.tab);
  }));

// Keyboard keys Space flips the card, [ or ] changes the tab
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      toggleFlip();
    } else if (e.key === '[') {
      cycleTab(-1);
    } else if (e.key === ']') {
      cycleTab(1);
    }
  });

  // Flashcard controls
  $('#card-prev')?.addEventListener('click', () => { cardIndex = Math.max(0, cardIndex - 1); renderFlashcard(); });
  $('#card-next')?.addEventListener('click', () => { cardIndex = Math.min((currentCapsule?.flashcards?.length || 1) - 1, cardIndex + 1); renderFlashcard(); });
  $('#mark-known')?.addEventListener('click', markKnown);
  $('#mark-unknown')?.addEventListener('click', markUnknown);

  // Quiz control
  $('#quiz-next')?.addEventListener('click', onQuizNext);

  // When a new capsule is saved in Author mode refresh the list
  document.addEventListener('pc:capsule:saved', populateCapsuleSelector);

  // Load dropdown list at start
  populateCapsuleSelector();
}

export function openLearnWithCapsule(capsule) {
  currentCapsule = capsule;
  populateCapsuleSelector(capsule.id);
  showLearnTab('notes');
  renderAll();
}

// Fill dropdown with all capsules
function populateCapsuleSelector(selectId) {
  const sel = $('#learn-capsule-select');
  if (!sel) return;
  const index = storage.readIndex();
  sel.innerHTML = '';
  index.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.title} — ${item.subject || ''}`;
    if (selectId && selectId === item.id) opt.selected = true;
    sel.appendChild(opt);
  });
  if (!sel.value && sel.options.length) sel.selectedIndex = 0;
  if (sel.value && (!currentCapsule || currentCapsule.id !== sel.value)) {
    const c = storage.loadCapsule(sel.value);
    if (c) {
      currentCapsule = c;
      renderAll();
    }
  }
}

function onSelectCapsule(e) {
  const id = e.target.value;
  if (!id) return;
  const c = storage.loadCapsule(id);
  if (c) {
    currentCapsule = c;
    renderAll();
  }
}

function renderAll() {
  renderMeta();
  renderNotes();
  renderFlashcard();
  prepareQuiz();
}

function renderMeta() {
  // Show capsule title in browser tab
  if (currentCapsule) document.title = currentCapsule.meta.title + ' — Pocket Classroom';
}

// NOTES
function renderNotes() {
  const list = $('#notes-list');
  if (!list) return;
  list.innerHTML = '';
  (currentCapsule?.notes || []).forEach(note => {
    const li = document.createElement('li');
    li.className = 'list-group-item bg-transparent text-white';
    li.textContent = note;
    list.appendChild(li);
  });

  // Search filter
  $('#notes-search')?.addEventListener('input', ev => {
    const q = ev.target.value.toLowerCase().trim();
    Array.from(list.children).forEach(li => {
      li.style.display = q ? li.textContent.toLowerCase().includes(q) ? '' : 'none' : '';
    });
  });
}

// FLASHCARDS
function renderFlashcard() {
  const pane = $('#flashcard-pane');
  if (!pane) return;
  pane.classList.remove('flip');
  const cards = currentCapsule?.flashcards || [];
  if (!cards.length) {
    pane.querySelector('.front').textContent = 'No flashcards';
    pane.querySelector('.back').textContent = '';
    $('#card-index').textContent = '0/0';
    return;
  }
  if (cardIndex < 0) cardIndex = 0;
  if (cardIndex >= cards.length) cardIndex = cards.length - 1;
  const card = cards[cardIndex];
  pane.querySelector('.front').textContent = card.front || '';
  pane.querySelector('.back').textContent = card.back || '';
  $('#card-index').textContent = (cardIndex + 1) + '/' + cards.length;
}

function toggleFlip() {
  const inner = document.querySelector('.flashcard-inner');
  if (inner) inner.classList.toggle('flip');
}

function markKnown() {
  if (!currentCapsule) return;
  const prog = storage.loadProgress(currentCapsule.id);
  prog.knownFlashcards = prog.knownFlashcards || [];
  if (!prog.knownFlashcards.includes(cardIndex)) prog.knownFlashcards.push(cardIndex);
  storage.saveProgress(currentCapsule.id, prog);
  document.dispatchEvent(new CustomEvent('pc:progress:update', { detail: { id: currentCapsule.id } }));
  renderFlashcard();
}

function markUnknown() {
  if (!currentCapsule) return;
  const prog = storage.loadProgress(currentCapsule.id);
  prog.knownFlashcards = (prog.knownFlashcards || []).filter(i => i !== cardIndex);
  storage.saveProgress(currentCapsule.id, prog);
  document.dispatchEvent(new CustomEvent('pc:progress:update', { detail: { id: currentCapsule.id } }));
  renderFlashcard();
}

// QUIZ
let quizIndex = 0;
let quizCorrect = 0;
let quizSequence = [];

function prepareQuiz() {
  quizIndex = 0;
  quizCorrect = 0;
  quizSequence = (currentCapsule?.quiz || []).slice();
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const qDiv = $('#quiz-question');
  const choicesDiv = $('#quiz-choices');
  if (!qDiv || !choicesDiv) return;

  choicesDiv.innerHTML = '';
  const q = quizSequence[quizIndex];

  if (!q) {
    const pct = quizSequence.length ? Math.round((quizCorrect / quizSequence.length) * 100) : 0;
    $('#quiz-score').textContent = pct;

    const prog = storage.loadProgress(currentCapsule.id);
    if (pct > (prog.bestScore || 0)) {
      prog.bestScore = pct;
      storage.saveProgress(currentCapsule.id, prog);
      document.dispatchEvent(new CustomEvent('pc:progress:update', { detail: { id: currentCapsule.id } }));
      alert(`Quiz finished — ${pct}% (new best!)`);
    } else {
      alert(`Quiz finished — ${pct}%`);
    }
    return;
  }

  qDiv.textContent = q.question || '';
  (q.choices || []).forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'list-group-item list-group-item-action';
    btn.textContent = `${String.fromCharCode(65 + i)}. ${c}`;
    btn.addEventListener('click', () => {
      const correct = (i === (q.answer || 0));
      btn.classList.add(correct ? 'list-group-item-success' : 'list-group-item-danger');
      if (correct) quizCorrect++;
      Array.from(choicesDiv.children).forEach(ch => ch.disabled = true);
      setTimeout(() => {
        quizIndex++;
        renderQuizQuestion();
      }, 500);
    });
    choicesDiv.appendChild(btn);
  });
}

function onQuizNext() {
  quizIndex++;
  renderQuizQuestion();
}

// Switch between Notes Flashcards and Quiz
export function showLearnTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('[data-view]').forEach(v => {
    v.classList.toggle('d-none', v.dataset.view !== tabName);
  });
  if (tabName === 'notes') renderNotes();
  if (tabName === 'flashcards') renderFlashcard();
  if (tabName === 'quiz') prepareQuiz();
}

// Get current capsule for other scripts
export function getCurrentCapsule() {
  return currentCapsule;
}
