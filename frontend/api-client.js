(() => {
  const host = window.location.hostname;
  const localPreview = window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
  const backendOrigin = localPreview && window.location.port !== '3000'
    ? `http://${host === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000`
    : '';
  window.editMasterFetch = (route, options = {}) => fetch(`${backendOrigin}/api${route}`, { ...options, credentials: 'include' });
  const servedFromProjectRoot = window.location.pathname === '/frontend' || window.location.pathname.startsWith('/frontend/');
  window.editMasterUrl = path => {
    if (!servedFromProjectRoot || !path.startsWith('/')) return path;
    if (path === '/') return '/frontend/index.html';
    if (path.startsWith('/#')) return `/frontend/index.html${path.slice(1)}`;
    return `/frontend${path}`;
  };
  const fixInternalLinks = root => {
    if (!servedFromProjectRoot) return;
    root.querySelectorAll?.('a[href^="/"]').forEach(link => link.setAttribute('href', window.editMasterUrl(link.getAttribute('href'))));
    if (root.matches?.('a[href^="/"]')) root.setAttribute('href', window.editMasterUrl(root.getAttribute('href')));
  };
  fixInternalLinks(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) fixInternalLinks(node); }))).observe(document.body, { childList: true, subtree: true });
})();
