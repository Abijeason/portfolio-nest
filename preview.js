'use strict';
(async () => {
  const host = document.getElementById('portfolio-host');
  const download = document.getElementById('download');
  try {
    const data = await PortfolioStorage.read();
    if (!data) { host.innerHTML = '<div class="empty-state"><h1>Your portfolio starts here.</h1><p>Add your introduction and projects in the builder, then come back to preview.</p><a class="btn" href="builder.html">Open builder</a></div>'; return; }
    PortfolioNest.validateDraft(data);
    const style = document.createElement('style'); style.textContent = PortfolioNest.portfolioCSS; document.head.appendChild(style);
    host.innerHTML = PortfolioNest.portfolioBody(data);
    download.disabled = false;
    const html = PortfolioNest.exportHTML(data);
    document.querySelector('.preview-note').textContent = `Ready to share. Your HTML file is ${(new Blob([html]).size / 1024 / 1024).toFixed(2)} MB, including all photos and videos.`;
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url;
      const filename = data.name.normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'my';
      link.download = filename + '-portfolio.html'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      document.getElementById('message').textContent = 'Download requested. Open the saved HTML file in a browser to check it before sharing.';
    });
  } catch {
    host.innerHTML = '<div class="empty-state"><h1>Let’s check your draft.</h1><p>Your saved draft could not be loaded. Return to the builder to check your details and media.</p><a class="btn" href="builder.html">Open builder</a></div>';
  }
})();
