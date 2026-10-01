'use strict';
const form = document.getElementById('portfolioForm');
const status = document.getElementById('save-status');
const message = document.getElementById('message');
const projectsContainer = document.getElementById('projects');
const fields = ['name', 'headline', 'bio', 'skills', 'email'];
let photo = null;
let media = [];
let saveTimer;
let saveQueue = Promise.resolve();
const saveTracker = PortfolioNest.createSaveTracker();
let processingMedia = false;
const emptyDraft = () => ({ name: '', headline: '', bio: '', skills: '', email: '', projects: [], photo: null, media: [] });
function showMessage(text, error = true) {
  message.textContent = text;
  message.className = 'notice' + (error ? ' error' : '');
  message.hidden = !text;
}
function addProject(project = {}) {
  const section = document.createElement('div');
  section.className = 'project-editor';
  const id = 'project-' + crypto.randomUUID();
  section.innerHTML = `<div class="project-heading"><h3>Project</h3><button class="text-btn remove-project" type="button">Remove</button></div><div class="field"><label for="${id}-title">Project title</label><input id="${id}-title" data-field="title" maxlength="160" placeholder="e.g. Portfolio Nest"></div><div class="field"><label for="${id}-description">Description</label><textarea id="${id}-description" data-field="description" maxlength="2500" placeholder="What does it do? What did you build or learn?"></textarea></div><div class="field"><label for="${id}-url">Project link <span class="optional">Optional</span></label><input id="${id}-url" data-field="url" type="url" pattern="https?://.*" maxlength="2000" placeholder="https://…"></div>`;
  for (const key of ['title', 'description', 'url']) section.querySelector(`[data-field="${key}"]`).value = project[key] || '';
  section.querySelector('.remove-project').addEventListener('click', () => { section.remove(); scheduleSave(); });
  projectsContainer.appendChild(section);
}
function collectDraft() {
  const data = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()]));
  data.projects = Array.from(projectsContainer.children).map(section => Object.fromEntries(['title', 'description', 'url'].map(key => [key, section.querySelector(`[data-field="${key}"]`).value.trim()])));
  return { ...data, photo, media };
}
function saveDraft() {
  clearTimeout(saveTimer);
  const snapshot = collectDraft();
  const revision = saveTracker.changed();
  status.textContent = 'Saving your draft…';
  saveQueue = saveQueue.catch(() => {}).then(() => PortfolioStorage.write(snapshot));
  saveQueue.then(() => {
    saveTracker.saved(revision);
    if (!saveTracker.dirty) status.textContent = 'Draft saved on this device';
  }, () => {
    if (revision === saveTracker.revision) {
      status.textContent = 'Draft could not be saved';
      showMessage('Your browser could not save this draft. Free some device storage or use a regular browser window, then try again.');
    }
  });
  return saveQueue;
}
function scheduleSave() {
  saveTracker.changed();
  status.textContent = 'Unsaved changes';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 450);
}
function renderMedia() {
  for (const [id, items, kind] of [['photo-list', photo ? [photo] : [], 'photo'], ['media-list', media, 'media']]) {
    const list = document.getElementById(id);
    list.replaceChildren();
    items.forEach((item, index) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = item.name + ' · ' + (item.size / 1024 / 1024).toFixed(2) + ' MB';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'text-btn'; button.textContent = 'Remove';
      button.setAttribute('aria-label', 'Remove ' + item.name);
      button.addEventListener('click', () => { if (kind === 'photo') photo = null; else media.splice(index, 1); renderMedia(); scheduleSave(); });
      li.append(label, button); list.appendChild(li);
    });
  }
  const bytes = [photo, ...media].filter(Boolean).reduce((sum, file) => sum + file.size, 0);
  document.getElementById('media-size').textContent = bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB of 12 MB used. The downloaded file will be a little larger.` : 'No media added yet.';
}
function fillDraft(data) {
  fields.forEach(field => { document.getElementById(field).value = data[field] || ''; });
  projectsContainer.replaceChildren();
  (data.projects || []).forEach(addProject);
  if (!data.projects?.length) addProject();
  photo = data.photo || null; media = data.media || [];
  renderMedia();
}
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result });
    reader.onerror = () => reject(new Error('This file could not be read. Try selecting it again.'));
    reader.readAsDataURL(file);
  });
}
async function upload(event, isPhoto) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  processingMedia = true;
  for (const element of form.querySelectorAll('button,input[type=file]')) element.disabled = true;
  status.textContent = 'Adding your media…';
  try {
    if (isPhoto && !files[0].type.startsWith('image/')) throw new Error('Choose an image for your profile photo.');
    PortfolioNest.validateMedia([...(isPhoto ? [] : photo ? [photo] : []), ...media, ...files]);
    const added = await Promise.all(files.map(readFile));
    if (isPhoto) photo = added[0]; else media.push(...added);
    renderMedia(); showMessage('');
    await saveDraft();
  } catch (error) { showMessage(error.message); status.textContent = 'Media was not added or saved'; }
  finally { processingMedia = false; for (const element of form.querySelectorAll('button,input[type=file]')) element.disabled = false; event.target.value = ''; }
}
form.addEventListener('input', event => { if (event.target.type !== 'file') scheduleSave(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (processingMedia) return;
  try {
    PortfolioNest.validateDraft(collectDraft());
    document.getElementById('preview-button').disabled = true;
    await saveDraft();
    window.location.href = 'preview.html';
  } catch (error) { showMessage(error.message); message.scrollIntoView({ block: 'center' }); document.getElementById('preview-button').disabled = false; }
});
document.getElementById('add-project').addEventListener('click', () => { addProject(); projectsContainer.lastChild.querySelector('input').focus(); scheduleSave(); });
document.getElementById('photo').addEventListener('change', event => upload(event, true));
document.getElementById('projectMedia').addEventListener('change', event => upload(event, false));
document.getElementById('reset').addEventListener('click', async () => {
  if (window.confirm('Start a fresh portfolio? This clears your saved draft on this device. Download your current portfolio first if you want to keep it.')) {
    fillDraft(emptyDraft()); showMessage(''); await saveDraft();
  }
});
window.addEventListener('beforeunload', event => {
  if (processingMedia || saveTracker.dirty) { event.preventDefault(); event.returnValue = ''; }
});
(async () => {
  for (const element of form.elements) element.disabled = true;
  try {
    const saved = await PortfolioStorage.read();
    const example = new URLSearchParams(location.search).has('demo');
    const useExample = example && (!PortfolioNest.hasDraftContent(saved) || window.confirm('Replace the current draft with the example portfolio? Download your current portfolio first if you want to keep it.'));
    const demo = { name: 'Alex Morgan', headline: 'Student developer & curious maker', bio: 'I enjoy turning everyday problems into small, useful tools. These projects helped me practise interface design, JavaScript and clear communication.', skills: 'JavaScript, HTML, CSS, Problem solving', email: '', projects: [{ title: 'Habit tracker', description: 'A simple dashboard for recording daily habits and following progress over time.', url: '' }, { title: 'Music finder', description: 'A responsive website for discovering artists and collecting favourite releases.', url: '' }], photo: null, media: [] };
    fillDraft(useExample ? demo : saved || emptyDraft());
    status.textContent = saved ? 'Draft restored from this device' : 'Your draft saves automatically';
    if (useExample) { await saveDraft(); history.replaceState(null, '', 'builder.html'); showMessage('Example loaded. Replace these fictional details with your own.', false); }
  } catch { fillDraft(emptyDraft()); status.textContent = 'Draft saving is unavailable'; showMessage('Browser storage is unavailable. Open the builder through a local web server or a hosted website in a regular browser window.'); }
  finally { for (const element of form.elements) element.disabled = false; }
})();
