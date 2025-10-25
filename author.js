//author.js: ⬇
// learn sectoin: import other files that help save data and use small helper functions
import * as storage from './storage.js';
import * as utils from './utils.js';

// this keeps the id of the capsule Im working on
let currentId = null;

// short way to select things from html
const $ = s => document.querySelector(s);

// start the author page
export function initAuthor() {
  const saveBtn = $('#save-capsule');
  const cancelBtn = $('#cancel-author');
  const addFlashBtn = $('#add-flashcard');
  const addQBtn = $('#add-question');

  // when we click buttuns run these functions
  if (saveBtn) saveBtn.addEventListener('click', onSave);
  if (cancelBtn) cancelBtn.addEventListener('click', () => showAuthor(false));
  if (addFlashBtn) addFlashBtn.addEventListener('click', addFlashcardRow);
  if (addQBtn) addQBtn.addEventListener('click', addQuestionRow);

  // auto save after user types
  const debSave = utils.debounce(() => {
    const capsule = gatherFromForm();
    if (!capsule) return;
    if (currentId) storage.saveCapsule(currentId, capsule);
  }, 600);

  document.getElementById('author-form')?.addEventListener('input', debSave);
}

// when user wants to make a new capsule
export function openAuthorForNew() {
  currentId = null;
  clearAuthorForm();
  showAuthor(true);
}

// when user wants to edit an old capsule
export function openAuthorForEdit(capsule) {
  if (!capsule) return;
  currentId = capsule.id || `capsule_${Date.now().toString(36)}`;
  populateForm(capsule);
  showAuthor(true);
}

// show or hide the Author section
function showAuthor(yes) {
  const sec = document.getElementById('author');
  if (!sec) return;
  sec.classList.toggle('d-none', !yes);
}

// fill form with old capsule data
function populateForm(capsule) {
  $('#capsule-id').value = capsule.id || '';
  $('#meta-title').value = capsule.meta?.title || '';
  $('#meta-subject').value = capsule.meta?.subject || '';
  $('#meta-level').value = capsule.meta?.level || 'Beginner';
  $('#meta-description').value = capsule.meta?.description || '';
  $('#notes-text').value = (capsule.notes || []).join('\n');

  // show old flashcards
  const fcRows = $('#flashcards-rows');
  fcRows.innerHTML = '';
  (capsule.flashcards || []).forEach(f => {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2';
    row.innerHTML = `
      <input class="form-control form-control-sm fc-front" placeholder="Front" value="${utils.escapeHtml(f.front || '')}" />
      <input class="form-control form-control-sm fc-back" placeholder="Back" value="${utils.escapeHtml(f.back || '')}" />
      <button class="btn btn-sm btn-outline-danger fc-remove">×</button>`;
    fcRows.appendChild(row);
  });

  // show old quiz questions
  const qRows = $('#quiz-rows');
  qRows.innerHTML = '';
  (capsule.quiz || []).forEach(q => {
    const block = makeQuestionBlock(q);
    qRows.appendChild(block);
  });

  delegateFlashRemove();
  delegateQuestionRemove();
}

// clear all inputs for new capsule
function clearAuthorForm() {
  $('#capsule-id').value = '';
  $('#meta-title').value = '';
  $('#meta-subject').value = '';
  $('#meta-level').value = 'Beginner';
  $('#meta-description').value = '';
  $('#notes-text').value = '';
  $('#flashcards-rows').innerHTML = '';
  $('#quiz-rows').innerHTML = '';
}

// make one quiz question box
function makeQuestionBlock(q = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-2 p-2 bg-transparent border rounded';
  const html = `
    <div class="mb-1"><input class="form-control form-control-sm q-question" placeholder="Question" value="${utils.escapeHtml(q.question || '')}" /></div>
    <div class="d-flex gap-2 mb-1">
      <input class="form-control form-control-sm q-choice" placeholder="A" value="${utils.escapeHtml((q.choices || [])[0] || '')}" />
      <input class="form-control form-control-sm q-choice" placeholder="B" value="${utils.escapeHtml((q.choices || [])[1] || '')}" />
      <input class="form-control form-control-sm q-choice" placeholder="C" value="${utils.escapeHtml((q.choices || [])[2] || '')}" />
      <input class="form-control form-control-sm q-choice" placeholder="D" value="${utils.escapeHtml((q.choices || [])[3] || '')}" />
    </div>
    <div class="d-flex align-items-center gap-2">
      <label class="small mb-0">Answer index (0-3)</label>
      <input type="number" min="0" max="3" class="form-control form-control-sm q-answer w-auto" value="${(q.answer || 0)}" />
      <button class="btn btn-sm btn-outline-danger q-remove ms-auto">Remove</button>
    </div>
  `;
  wrap.innerHTML = html;
  return wrap;
}

// add a new flashcard row
function addFlashcardRow() {
  const container = $('#flashcards-rows');
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 mb-2';
  row.innerHTML = `
    <input class="form-control form-control-sm fc-front" placeholder="Front" />
    <input class="form-control form-control-sm fc-back" placeholder="Back" />
    <button class="btn btn-sm btn-outline-danger fc-remove">×</button>
  `;
  container.appendChild(row);
  delegateFlashRemove();
}

// add a new quiz question row
function addQuestionRow() {
  const qRows = $('#quiz-rows');
  qRows.appendChild(makeQuestionBlock({ question: '', choices: ['', '', '', ''], answer: 0 }));
  delegateQuestionRemove();
}

// make remove buttons work for flashcards
function delegateFlashRemove() {
  document.querySelectorAll('.fc-remove').forEach(b => {
    b.onclick = (ev) => { ev.target.closest('div')?.remove(); };
  });
}

// make remove buttons work for quiz questions
function delegateQuestionRemove() {
  document.querySelectorAll('.q-remove').forEach(b => {
    b.onclick = (ev) => { ev.target.closest('.p-2')?.remove(); };
  });
}

// collect all data from the form
function gatherFromForm() {
  const title = $('#meta-title').value.trim();
  const subject = $('#meta-subjec t').value.trim();
  const level = $('#meta-level').value;
  const description = $('#meta-description').value.trim();

  // notes each line is one note
  const notesRaw = $('#notes-text').value.split('\n').map(s => s.trim()).filter(Boolean);

  // collect flashcards
  const flashcards = Array.from(document.querySelectorAll('#flashcards-rows .d-flex'))
    .map(row => {
      const front = row.querySelector('.fc-front')?.value?.trim() || '';
      const back = row.querySelector('.fc-back')?.value?.trim() || '';
      return { front, back };
    }).filter(f => f.front || f.back);

  // collect quiz questions
  const quiz = Array.from(document.querySelectorAll('#quiz-rows .p-2'))
    .map(block => {
      const question = block.querySelector('.q-question')?.value?.trim() || '';
      const choices = Array.from(block.querySelectorAll('.q-choice')).map(i => i.value.trim());
      const answer = parseInt(block.querySelector('.q-answer')?.value || '0', 10);
      return { question, choices, answer: isNaN(answer) ? 0 : answer, explanation: '' };
    }).filter(q => q.question);

  const id = $('#capsule-id').value || currentId || `capsule_${Date.now().toString(36)}`;

  return {
    id,
    meta: { title, subject, level, description, updatedAt: new Date().toISOString() },
    notes: notesRaw,
    flashcards,
    quiz,
    schema: storage.SCHEMA
  };
}

// check if capsule has title and some content
function validateCapsule(capsule) {
  if (!capsule.meta.title || !capsule.meta.title.trim()) return 'Title is required';
  const hasNotes = (capsule.notes || []).length > 0;
  const hasCards = (capsule.flashcards || []).length > 0;
  const hasQuiz = (capsule.quiz || []).length > 0;
  if (!(hasNotes || hasCards || hasQuiz)) return 'Add at least notes, flashcards, or quiz';
  return null;
}

// save button work
function onSave() {
  const capsule = gatherFromForm();
  const err = validateCapsule(capsule);
  if (err) {
    alert(err);
    return;
  }
  const id = capsule.id || `capsule_${Date.now().toString(36)}`;
  capsule.id = id;
  capsule.meta.updatedAt = new Date().toISOString();
  storage.saveCapsule(id, capsule);
  currentId = id;
  document.dispatchEvent(new CustomEvent('pc:capsule:saved', { detail: { id } }));
  alert('Saved locally');
}
