(function (root) {
  'use strict';
  const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/ogg'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const safeURL = value => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  function validateMedia(items) {
    let total = 0;
    for (const item of items.filter(Boolean)) {
      if (!TYPES.includes(item.type) || !Number.isFinite(item.size) || item.size < 0 ||
          (item.url && !new RegExp('^data:' + item.type.replace('/', '\\/') + ';base64,[A-Za-z0-9+/=]+$').test(item.url))) {
        throw new Error('Choose a supported photo (JPG, PNG, WebP, GIF, AVIF) or video (MP4, WebM, Ogg).');
      }
      total += item.size;
      if (item.url) total += Math.max(0, item.url.split(',')[1].length * 0.75 - item.size - 2);
    }
    if (total > MAX_MEDIA_BYTES) throw new Error('Keep your photos and videos under 12 MB in total. Use a shorter or compressed video.');
  }
  function validateDraft(data) {
    if (!String(data.name || '').trim()) throw new Error('Add your name before previewing.');
    if (!String(data.bio || '').trim()) throw new Error('Add a short introduction before previewing.');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Enter a valid contact email, or leave it empty.');
    validateMedia([data.photo, ...(data.media || [])]);
  }
  const portfolioCSS = `
  *{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#f7f8f5;color:#182c3a;font-family:Arial,Helvetica,sans-serif;line-height:1.65}
  a{color:#08665e;text-underline-offset:4px}a:focus-visible{outline:3px solid #087a70;outline-offset:4px}img,video{max-width:100%;height:auto}
  .portfolio{max-width:1000px;margin:40px auto;padding:64px;background:#fff;border-top:7px solid #087a70;box-shadow:0 12px 48px #182c3a0c}
  .portfolio-header{display:flex;gap:32px;align-items:center;padding-bottom:36px;border-bottom:1px solid #dfe6e4}.portrait{width:116px;height:116px;flex-shrink:0;object-fit:cover;border-radius:50%}
  .initials{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:#e4f2ee;font-size:32px;font-weight:700;flex-shrink:0}
  h1{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(2.3rem,5vw,3.6rem);line-height:1.1;letter-spacing:-.035em;margin:0 0 12px;overflow-wrap:anywhere}
  .headline{font-size:1.15rem;color:#52646b;margin:0}.portfolio section{margin-top:36px}.portfolio h2{font-size:1.1rem;margin:0 0 16px;font-weight:700}.intro{white-space:pre-wrap;max-width:68ch;margin:0;overflow-wrap:anywhere}
  .skills{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.skill{padding:5px 12px;border-radius:5px;background:#eaf3f0;font-size:.86rem;color:#18564f}
  .project-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.project{padding:24px;background:#f7f8f5;border:1px solid #e2e8e5;border-radius:8px}.project h3{margin:0 0 10px;font-size:1.1rem;overflow-wrap:anywhere}.project p{white-space:pre-wrap;margin:0 0 14px;color:#52646b;overflow-wrap:anywhere}
  .gallery{display:grid;grid-template-columns:1fr 1fr;gap:20px}.gallery figure{margin:0;min-width:0}.gallery img,.gallery video{display:block;width:100%;border-radius:8px;background:#edf2ef;max-height:440px;object-fit:contain}.gallery figcaption{font-size:.85rem;color:#52646b;margin-top:8px;overflow-wrap:anywhere}
  .contact{border-top:1px solid #dfe6e4;padding-top:24px}.portfolio-footer{margin-top:48px;font-size:.8rem;color:#61747b;border-top:1px solid #dfe6e4;padding-top:18px}
  @media(max-width:640px){.portfolio{margin:0;padding:30px 22px;box-shadow:none}.portfolio-header{align-items:flex-start;gap:20px;flex-direction:column}.portrait{width:88px;height:88px}.project-grid,.gallery{grid-template-columns:1fr}}
  @media print{body{background:#fff}.portfolio{margin:0;padding:0;box-shadow:none;border:0}.project,figure{break-inside:avoid}a{color:inherit}}
  `;
  function portfolioBody(data) {
    const projects = (data.projects || []).filter(project => project.title?.trim());
    const skills = String(data.skills || '').split(/[,\n]/).map(skill => skill.trim()).filter(Boolean);
    const initials = String(data.name).trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
    return `<article class="portfolio">
      <header class="portfolio-header">${data.photo ? `<img class="portrait" src="${escape(data.photo.url)}" alt="Portrait of ${escape(data.name)}">` : `<div class="initials" aria-hidden="true">${escape(initials)}</div>`}
      <div><h1>${escape(data.name)}</h1>${data.headline ? `<p class="headline">${escape(data.headline)}</p>` : ''}</div></header>
      <section aria-label="About"><h2>About me</h2><p class="intro">${escape(data.bio)}</p>${skills.length ? `<div class="skills" aria-label="Skills">${skills.map(skill => `<span class="skill">${escape(skill)}</span>`).join('')}</div>` : ''}</section>
      ${projects.length ? `<section><h2>Selected projects</h2><div class="project-grid">${projects.map(project => `<div class="project"><h3>${escape(project.title)}</h3><p>${escape(project.description)}</p>${safeURL(project.url) ? `<a href="${escape(safeURL(project.url))}" target="_blank" rel="noopener noreferrer">Visit project</a>` : ''}</div>`).join('')}</div></section>` : ''}
      ${data.media?.length ? `<section><h2>Project gallery</h2><div class="gallery">${data.media.map(media => `<figure>${media.type.startsWith('image/') ? `<img src="${escape(media.url)}" alt="${escape(media.name)}" loading="lazy">` : `<video controls preload="metadata" playsinline src="${escape(media.url)}" aria-label="${escape(media.name)}">Your browser cannot play this video format.</video>`}<figcaption>${escape(media.name)}</figcaption></figure>`).join('')}</div></section>` : ''}
      ${data.email ? `<section class="contact"><h2>Get in touch</h2><a href="mailto:${escape(data.email)}">${escape(data.email)}</a></section>` : ''}
      <footer class="portfolio-footer">Created with Portfolio Nest. Photos and videos are included in this file.</footer>
    </article>`;
  }
  function exportHTML(data) {
    validateDraft(data);
    return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(data.headline || 'Personal portfolio')}"><title>${escape(data.name)} | Portfolio</title><style>${portfolioCSS}</style></head><body>${portfolioBody(data)}</body></html>`;
  }
  function createSaveTracker() {
    let revision = 0;
    let savedRevision = 0;
    return {
      changed() { return ++revision; },
      saved(value) { savedRevision = Math.max(savedRevision, value); },
      get revision() { return revision; },
      get dirty() { return savedRevision < revision; }
    };
  }
  function hasDraftContent(data) {
    if (!data) return false;
    return ['name', 'headline', 'bio', 'skills', 'email'].some(key => String(data[key] || '').trim()) ||
      Boolean(data.photo || data.media?.length) ||
      (data.projects || []).some(project => ['title', 'description', 'url'].some(key => String(project[key] || '').trim()));
  }
  const api = { exportHTML, portfolioBody, portfolioCSS, validateDraft, validateMedia, MAX_MEDIA_BYTES, createSaveTracker, hasDraftContent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PortfolioNest = api;
})(typeof window !== 'undefined' ? window : globalThis);
