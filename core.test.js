const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = path.join(__dirname, 'core.js');
const core = fs.existsSync(corePath) ? require(corePath) : {};
const image = { name: 'Project.png', type: 'image/png', size: 3, url: 'data:image/png;base64,YWJj' };
const video = { name: 'Demo.mp4', type: 'video/mp4', size: 3, url: 'data:video/mp4;base64,YWJj' };
const draft = () => ({ name: 'Alex Morgan', headline: 'Student developer', bio: 'Building useful things.', email: 'alex@example.com', skills: 'Python, JavaScript', projects: [{ title: 'Music finder', description: 'Find new artists.', url: 'https://example.com/music' }], photo: image, media: [video] });

// Dropping embedded styles/media or keeping builder dependencies would break file sharing.
test('export includes styling, photo and playable video without app dependencies', () => {
  const html = core.exportHTML(draft());
  assert.match(html, /<style>/);
  assert.match(html, /src="data:image\/png;base64,YWJj"/);
  assert.match(html, /<video[^>]*controls[^>]*src="data:video\/mp4;base64,YWJj"/);
  assert.match(html, /Music finder/);
  assert.doesNotMatch(html, /<script|<link|localStorage|indexedDB|builder\.html/);
});

// Inserting unescaped user content would let downloaded files execute it.
test('export treats user supplied HTML as text', () => {
  const data = draft();
  data.name = '<script>alert("x")</script>';
  data.projects[0].description = '<img src=x onerror=alert(1)>';
  const html = core.exportHTML(data);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test('export omits unsafe project links and rejects executable media', () => {
  const data = draft();
  data.projects[0].url = 'javascript:alert(1)';
  assert.doesNotMatch(core.exportHTML(data), /javascript:/);
  data.media = [{ name: 'bad.svg', type: 'image/svg+xml', size: 1, url: 'data:image/svg+xml;base64,WA==' }];
  assert.throws(() => core.exportHTML(data), /supported/i);
});

test('validation requires a name, introduction and valid contact email', () => {
  assert.throws(() => core.validateDraft({ ...draft(), name: '  ' }), /name/i);
  assert.throws(() => core.validateDraft({ ...draft(), bio: '' }), /introduction/i);
  assert.throws(() => core.validateDraft({ ...draft(), email: 'hello' }), /email/i);
  assert.doesNotThrow(() => core.validateDraft(draft()));
});

test('media validation enforces a combined limit and MIME matching', () => {
  assert.throws(() => core.validateMedia([{ ...image, size: 13 * 1024 * 1024 }]), /12 MB/);
  assert.throws(() => core.validateMedia([{ ...image, url: 'data:text/html;base64,YWJj' }]), /supported/i);
  assert.throws(() => core.validateMedia([{ ...image, size: 7 * 1024 * 1024 }, { ...video, size: 7 * 1024 * 1024 }]), /12 MB/);
  assert.doesNotThrow(() => core.validateMedia([image, video]));
});

test('export supports a portfolio without optional projects or media', () => {
  const html = core.exportHTML({ ...draft(), projects: [], media: [], photo: null, email: '' });
  assert.match(html, /Alex Morgan/);
  assert.doesNotMatch(html, /<video|<img|mailto:|Selected projects|Project gallery/);
});

// Completing an older write must not hide a newer edit or remove the unload warning.
test('save tracking keeps newer changes dirty until their own save completes', () => {
  const tracker = core.createSaveTracker();
  const first = tracker.changed();
  const second = tracker.changed();
  tracker.saved(first);
  assert.equal(tracker.dirty, true);
  tracker.saved(second);
  assert.equal(tracker.dirty, false);
  tracker.saved(first);
  assert.equal(tracker.dirty, false);
});

// A draft with projects or media but no name still needs confirmation before replacement.
test('example replacement detects incomplete drafts with any meaningful content', () => {
  assert.equal(core.hasDraftContent({ name: '', bio: 'My work', projects: [], media: [] }), true);
  assert.equal(core.hasDraftContent({ name: '', projects: [{ title: 'My project' }] }), true);
  assert.equal(core.hasDraftContent({ name: '', media: [video] }), true);
  assert.equal(core.hasDraftContent({ photo: image }), true);
  assert.equal(core.hasDraftContent({ name: '  ', projects: [{title:'',description:'',url:''}], media: [] }), false);
});
