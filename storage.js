//storage.js ⬇
//Storage section: Functions to save, load, and manage learning capsules in the browser's localStorage

// Key names used in localStorage
export const INDEX_KEY = 'pc_capsules_index'; 
const CAPSULE_KEY_PREFIX = 'pc_capsule_';   
const PROGRESS_KEY_PREFIX = 'pc_progress_';
export const SCHEMA = 'pocket-classroom/v1';

// Helper function: get storage key for a capsule by its id
function keyForCapsule(id){ 
  return CAPSULE_KEY_PREFIX + id; 
}

// Helper function: get storage key for progress by capsule id
function keyForProgress(id){ 
  return PROGRESS_KEY_PREFIX + id; 
}

// Read JSON from localStorage safely
export function readJSON(key){
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch(e){
    console.error('Bad JSON for', key, e);
    return null;
  }
}

// Save a JS object as JSON in localStorage
export function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value)); // Convert object to string and save
}

// Load the index of all capsules
export function readIndex(){
  const raw = localStorage.getItem(INDEX_KEY);
  if(!raw) return []; // If nothing saved yet, return empty array
  try { 
    return JSON.parse(raw); // Convert saved string back to array
  } catch(e){ 
    console.error(e); 
    return []; 
  }
}

// Save the index of all capsules
export function writeIndex(indexArr){
  writeJSON(INDEX_KEY, indexArr || []); // Save array, or empty array if nothing
}

// Save a capsule (create or update)
export function saveCapsule(id, capsule){
  if(!id) throw new Error('id required');

  writeJSON(keyForCapsule(id), capsule); 

  // Update the index
  const idx = readIndex();
  const meta = { 
    id,
    title: capsule.meta?.title || 'Untitled',
    subject: capsule.meta?.subject || '',
    level: capsule.meta?.level || '',
    updatedAt: capsule.meta?.updatedAt || new Date().toISOString()
  };

  const i = idx.findIndex(x => x.id === id); 
  if(i >= 0) idx[i] = meta;
  else idx.push(meta);

  writeIndex(idx);
}

// Load a capsule by id
export function loadCapsule(id){
  return readJSON(keyForCapsule(id));
}

// Delete a capsule and its progress
export function deleteCapsule(id){
  localStorage.removeItem(keyForCapsule(id)); 
  localStorage.removeItem(keyForProgress(id)); 

  const idx = readIndex().filter(x => x.id !== id);
  writeIndex(idx); 
}

// Prepare capsule for export
export function exportCapsuleObject(capsule){
  const out = Object.assign({}, capsule);
  out.schema = SCHEMA;
  return out;
}

// Save learning progress for a capsule
export function saveProgress(id, progressObj){
  writeJSON(keyForProgress(id), progressObj);
}

// Load learning progress for a capsule
export function loadProgress(id){
  return readJSON(keyForProgress(id)) || { bestScore: 0, knownFlashcards: [] };
}
