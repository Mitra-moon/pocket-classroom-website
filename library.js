//library.js: ⬇
// Main file: shows all capsules, connects buttons, and links Author + Learn sections

import * as storage from './storage.js';
import * as utils from './utils.js';
import { initAuthor, openAuthorForEdit, openAuthorForNew } from './author.js';
import { initLearn, openLearnWithCapsule } from './learn.js';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

document.addEventListener('DOMContentLoaded', () => {
  console.log('library.init loaded');

  // Start Author and Learn sections
  initAuthor();
  initLearn();

  // Show the list of capsules first
  renderLibrary();

  // When a capsule is saved, refresh the library list
  document.addEventListener('pc:capsule:saved', renderLibrary);

  // "Create new capsule button
  const newBtn = $('#empty-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      openAuthorForNew();
      showSection('author');
    });
  }

  // "Import JSON file" input
  const importFile = $('#import-file');
  if (importFile) {
    importFile.addEventListener('change', handleImport);
  }

  // Click events for Learn, Edit, Export,  Delete buttons inside each capsule card
  const list = $('#capsules-list');
  if (list) {
    list.addEventListener('click', ev => {
      const btn = ev.target.closest('button, a');
      if (!btn) return;
      const id = btn.dataset.id;

      if (btn.matches('.btn-learn')) {
        const capsule = storage.loadCapsule(id);
        if (capsule) openLearnWithCapsule(capsule);
        showSection('learn');

      } else if (btn.matches('.btn-edit')) {
        const capsule = storage.loadCapsule(id);
        if (capsule) openAuthorForEdit(capsule);
        showSection('author');

      } else if (btn.matches('.btn-export')) {
        const c = storage.loadCapsule(id);
        if (c) doExport(c);

      } else if (btn.matches('.btn-delete')) {
        if (confirm('Delete this capsule? This cannot be undone.')) {
          storage.deleteCapsule(id);
          renderLibrary();
        }
      }
    });
  }

  // Navbar links to switch between sections (Library, Author, Learn)
  $$('.nav-link[data-section]').forEach(a => {
    a.addEventListener('click', ev => {
      ev.preventDefault();
      const sec = a.dataset.section;
      showSection(sec);
    });
  });
});

// Show only the chosen section, hide others
function showSection(name) {
  ['library', 'author', 'learn'].forEach(n => {
    const el = document.getElementById(n);
    if (!el) return;
    el.classList.toggle('d-none', n !== name);
  });

  // Highlight the active navbar link
  $$('.nav-link[data-section]').forEach(a => {
    a.classList.toggle('active', a.dataset.section === name);
  });
}

// Show all saved capsules in the library
export function renderLibrary() {
  const container = document.getElementById('capsules-list');
  const emptyEl = document.getElementById('library-empty');
  if (!container || !emptyEl) return;

  const index = storage.readIndex() || [];

  // Show or hide the "no capsules" message
  emptyEl.style.display = index.length ? 'none' : '';
  container.innerHTML = '';

  if (!index.length) return;

  // Sort by most recently updated
  index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Create a card for each capsule
  index.forEach(meta => {
    const progress = storage.loadProgress(meta.id);
    const knownCount = (progress.knownFlashcards || []).length;
    const best = progress.bestScore || 0;

    const card = document.createElement('div');
    card.className = 'col-12 col-md-6 col-lg-4';
    card.innerHTML = `
      <div class="card p-3 h-100">
        <div class="d-flex align-items-start gap-3">
          <div class="flex-grow-1">
            <h3 class="h6 mb-1">${utils.escapeHtml(meta.title)}</h3>
            <div class="small text-muted">
              ${utils.escapeHtml(meta.subject || '')} · 
              <span class="badge bg-secondary">${utils.escapeHtml(meta.level || '')}</span>
            </div>
            <div class="small mt-2">Updated: ${utils.timeAgo(meta.updatedAt)}</div>
            <div class="small mt-2">Best Quiz: ${best}% · Known cards: ${knownCount}</div>
          </div>
          <div class="d-flex flex-column align-items-end">
            <div class="btn-group-vertical">
              <button class="btn btn-sm btn-primary btn-learn" data-id="${meta.id}">Learn</button>
              <button class="btn btn-sm btn-outline-light btn-edit" data-id="${meta.id}">Edit</button>
              <button class="btn btn-sm btn-outline-secondary btn-export" data-id="${meta.id}">Export</button>
              <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${meta.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Export one capsule as a JSON file
function doExport(capsule) {
  const out = storage.exportCapsuleObject(capsule);
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (utils.slugify(capsule.meta?.title || 'capsule')) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Handle JSON import
function handleImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);

      // Check if JSON is valid
      if (json.schema !== storage.SCHEMA && json.schema !== 'pocket-classroom/v1') {
        throw new Error('Unsupported file type');
      }
      if (!json.meta || !json.meta.title) throw new Error('Missing title in JSON');

      const newId = `capsule_${Date.now().toString(36)}`;
      const capsule = { ...json, id: newId };
      capsule.meta = capsule.meta || {};
      capsule.meta.updatedAt = new Date().toISOString();

      // Save the imported capsule
      storage.saveCapsule(newId, capsule);
      renderLibrary();
      alert('Capsule imported successfully!');
    } catch (err) {
      console.error(err);
      alert('Import failed: ' + (err.message || err));
    } finally {
      e.target.value = '';
    }
  };

  reader.onerror = err => {
    console.error(err);
    alert('Error reading file');
    e.target.value = '';
  };

  reader.readAsText(file);
}
