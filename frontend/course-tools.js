(() => {
  const ids = { 'capcut-mobile.html': 'capcut-mobile', 'capcut-pc.html': 'capcut-pc', 'premiere-pro.html': 'premiere-pro', 'after-effects.html': 'after-effects' };
  const courseId = ids[location.pathname.split('/').pop()];
  if (!courseId) return;
  const software = [
    { id: 'capcut-mobile', title: 'CapCut Mobile', icon: 'Capcut-pc.jpg', url: 'capcut-mobile.html' },
    { id: 'capcut-pc', title: 'CapCut PC', icon: 'Capcut-pc.jpg', url: 'capcut-pc.html' },
    { id: 'premiere-pro', title: 'Premiere Pro', icon: 'adobe-premiere.png', url: 'premiere-pro.html' },
    { id: 'after-effects', title: 'After Effects', icon: 'after-effect.png', url: 'after-effects.html' }
  ];
  const switcher = document.createElement('nav'); switcher.className = 'software-switcher'; switcher.setAttribute('aria-label', 'Explore editing software');
  const switcherTitle = document.createElement('span'); switcherTitle.className = 'software-switcher-title'; switcherTitle.textContent = 'Explore software'; switcher.append(switcherTitle);
  const switcherLinks = document.createElement('div'); switcherLinks.className = 'software-switcher-links';
  software.forEach(item => {
    const link = document.createElement('a'); link.href = item.url; link.className = 'software-switcher-link';
    if (item.id === courseId) { link.classList.add('is-current'); link.setAttribute('aria-current', 'page'); }
    const image = document.createElement('img'); image.src = item.icon; image.alt = ''; image.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = item.title;
    link.append(image, label); switcherLinks.append(link);
  });
  switcher.append(switcherLinks);
  document.querySelector('.navbar')?.after(switcher);
  let authMode = 'login';
  let authResolver = null;
  let authPromise = null;
  const authDialog = document.createElement('dialog'); authDialog.className = 'course-auth-dialog'; authDialog.innerHTML = `<button class="auth-dialog-close" type="button" aria-label="Close sign in">×</button><span class="eyebrow">YOUR CREATOR WORKSPACE</span><h2 class="auth-dialog-title">Welcome back</h2><p class="auth-dialog-copy">Sign in to save your course progress and lessons.</p><form class="course-auth-form"><label class="auth-name-field" hidden>Your name<input name="name" autocomplete="name" maxlength="80" placeholder="Your name"></label><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"></label><button class="primary-action auth-submit" type="submit">Sign in</button><p class="auth-message" role="alert" aria-live="polite"></p></form><p class="auth-switch-prompt"><span></span><button class="auth-switch" type="button"></button></p>`;
  document.body.append(authDialog);
  const authForm = authDialog.querySelector('.course-auth-form');
  const authMessage = authDialog.querySelector('.auth-message');
  const profileButton = document.querySelector('.navbar .profile-btn');
  let signedIn = false;
  let sessionReady = Promise.resolve();
  if (profileButton && profileButton.tagName === 'BUTTON') {
    profileButton.type = 'button'; profileButton.textContent = 'Checking…';
    profileButton.addEventListener('click', async () => {
      await sessionReady;
      if (signedIn) window.location.href = window.editMasterUrl('/dashboard.html');
      else openAuth();
    });
  }
  const setAuthMode = mode => {
    authMode = mode;
    authDialog.querySelector('.auth-dialog-title').textContent = mode === 'register' ? 'Create your account' : 'Welcome back';
    authDialog.querySelector('.auth-dialog-copy').textContent = mode === 'register' ? 'Create a free account to save your progress and bookmarks.' : 'Sign in to save your course progress and lessons.';
    authDialog.querySelector('.auth-name-field').hidden = mode !== 'register';
    authForm.elements.name.required = mode === 'register';
    authForm.elements.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    authDialog.querySelector('.auth-submit').textContent = mode === 'register' ? 'Create account' : 'Sign in';
    authDialog.querySelector('.auth-switch-prompt span').textContent = mode === 'register' ? 'Already have an account? ' : 'New to EditMaster? ';
    authDialog.querySelector('.auth-switch').textContent = mode === 'register' ? 'Sign in' : 'Create an account';
    authMessage.textContent = '';
  };
  const openAuth = (message = '') => {
    if (authPromise) return authPromise;
    authMessage.textContent = message;
    if (!authDialog.open) authDialog.showModal();
    authForm.elements.email.focus();
    authPromise = new Promise(resolve => { authResolver = resolve; });
    return authPromise;
  };
  const finishAuth = result => { if (authResolver) { authResolver(result); authResolver = null; authPromise = null; } };
  authDialog.querySelector('.auth-switch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
  authDialog.querySelector('.auth-dialog-close').addEventListener('click', () => authDialog.close());
  authDialog.addEventListener('cancel', () => finishAuth(false));
  authDialog.addEventListener('close', () => finishAuth(false));
  const ensureSignedIn = async () => {
    if (signedIn) return true;
    return openAuth('Sign in or create an account to save your learning.');
  };
  authForm.addEventListener('submit', async event => {
    event.preventDefault(); const submit = authDialog.querySelector('.auth-submit'); submit.disabled = true; authMessage.textContent = '';
    const values = new FormData(authForm); const payload = { email: values.get('email'), password: values.get('password'), name: values.get('name') || '' };
    try {
      const response = await window.editMasterFetch(`/auth/${authMode === 'register' ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { setAuthMode('login'); authForm.elements.email.value = payload.email; authMessage.textContent = 'An account already uses this email. Sign in with your password instead.'; }
        else if (response.status === 401) { authMessage.textContent = 'We couldn’t find an account with that email and password. Create an account if you’re new.'; }
        else authMessage.textContent = data.error || 'Unable to sign in. Please try again.';
        return;
      }
      signedIn = true;
      if (profileButton) profileButton.textContent = data.user.name || data.user.email;
      authDialog.close(); authForm.reset();
      finishAuth(true);
      window.dispatchEvent(new CustomEvent('editmaster:authenticated'));
      toast(authMode === 'register' ? 'Account created. Your progress will now be saved.' : 'Signed in. Your progress is ready to save.');
    } catch (error) { authMessage.textContent = error.message === 'Failed to fetch' ? 'Cannot reach the backend. Start it with npm start.' : 'Unable to sign in. Please try again.'; }
    finally { submit.disabled = false; }
  });
  const api = async (route, options = {}) => {
    const response = await window.editMasterFetch(route, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const raw = await response.text(); let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch {}
    if (!response.ok) throw new Error(data.error || 'Could not reach your account. Start the backend with npm start.');
    return data;
  };
  const cards = [...document.querySelectorAll('.lesson-card')];
  const completed = new Set();
  const toast = text => { let node = document.querySelector('.course-toast'); if (!node) { node = document.createElement('div'); node.className = 'course-toast'; node.setAttribute('role', 'status'); document.body.append(node); } node.textContent = text; node.classList.add('show'); clearTimeout(node.timer); node.timer = setTimeout(() => node.classList.remove('show'), 3300); };
  cards.forEach((card, index) => {
    const lessonId = `lesson-${index + 1}`; card.id = lessonId;
    const title = card.querySelector('h3')?.textContent.trim() || `Lesson ${index + 1}`;
    const info = card.querySelector('.lesson-info') || card;
    const button = document.createElement('button'); button.className = 'bookmark-btn'; button.type = 'button'; button.textContent = '☆ Save lesson'; button.setAttribute('aria-label', `Bookmark ${title}`);
    button.addEventListener('click', async () => {
      try {
        if (!await ensureSignedIn()) return;
        const key = `${courseId}:${lessonId}`;
        if (button.dataset.saved === 'true') { await api(`/bookmarks/${key}`, { method: 'DELETE' }); button.dataset.saved = 'false'; button.textContent = '☆ Save lesson'; toast('Bookmark removed.'); }
        else { await api('/bookmarks', { method: 'POST', body: JSON.stringify({ courseId, lessonId, title }) }); button.dataset.saved = 'true'; button.textContent = '★ Saved'; toast('Lesson saved to your dashboard.'); }
      } catch (error) { toast(error.message); }
    }); info.append(button);
  });
  window.completeLesson = async button => {
    const card = button.closest('.lesson-card'), id = card?.id; if (!id || completed.has(id)) return;
    if (!await ensureSignedIn()) return;
    completed.add(id); button.disabled = true; button.textContent = 'Saving…';
    try { await api(`/progress/${courseId}`, { method: 'PUT', body: JSON.stringify({ completedLessons: [...completed] }) }); button.textContent = 'Completed ✓'; button.classList.add('is-complete'); updateProgress(); }
    catch (error) { completed.delete(id); button.disabled = false; button.textContent = 'Mark as Complete ✓'; toast(error.message); }
  };
  const updateProgress = () => { const fill = document.getElementById('progressFill'), text = document.getElementById('progressText'); const percent = cards.length ? Math.round(completed.size / cards.length * 100) : 0; if (fill) fill.style.width = `${percent}%`; if (text) text.textContent = `${completed.size} / ${cards.length} lessons · ${percent}%`; };
  const quizData = {
    'capcut-mobile': [['Which tool sets the visible part of a clip?', ['Crop', 'Export', 'Share'], 0], ['What helps keep cuts in time with music?', ['Beat markers', 'A filter', 'A cover'], 0], ['Which format is best for most social video?', ['MP4', 'TXT', 'PSD'], 0]],
    'capcut-pc': [['Where do clips get arranged?', ['Timeline', 'Effects panel', 'Export dialog'], 0], ['What does ripple delete do?', ['Closes the gap after deletion', 'Adds a transition', 'Mutes audio'], 0], ['What should you check before export?', ['Resolution and frame rate', 'Desktop wallpaper', 'Font size'], 0]],
    'premiere-pro': [['What is a sequence?', ['An editable timeline setup', 'A video effect', 'A file browser'], 0], ['Which panel is used to mix clip audio?', ['Audio Track Mixer', 'Lumetri Color', 'Project'], 0], ['What is a proxy?', ['A lighter editing copy', 'A title template', 'An export preset'], 0]],
    'after-effects': [['What controls animation over time?', ['Keyframes', 'Bins', 'Markers only'], 0], ['Which property changes object transparency?', ['Opacity', 'Anchor Point', 'Scale'], 0], ['What is a precomposition useful for?', ['Grouping layers into a composition', 'Rendering audio only', 'Importing fonts'], 0]]
  };
  const practice = {
    'capcut-mobile': ['Create a 20–30 second vertical highlight edit', 'Select 5–8 clips and trim out pauses', 'Add music, balanced audio, and one readable title', 'Export as 1080 × 1920 MP4'],
    'capcut-pc': ['Build a 30-second desktop edit from supplied or personal clips', 'Organize media, make clean cuts, and add a simple transition', 'Balance dialogue and music, then export an MP4'],
    'premiere-pro': ['Edit a 45-second story with a clear beginning, middle, and end', 'Organize footage, refine audio, and apply a consistent color look', 'Export an H.264 MP4 and review the finished file'],
    'after-effects': ['Animate a 5–10 second title card', 'Use keyframes for position, scale, and opacity', 'Add easing and a restrained accent, then render a shareable video']
  };
  const section = document.createElement('section'); section.className = 'learning-extras';
  section.innerHTML = `<div class="extras-heading"><span class="eyebrow">PUT IT INTO PRACTICE</span><h2>Quick knowledge check</h2><p>Three short questions to reinforce the ideas in this course.</p></div><form class="course-quiz">${quizData[courseId].map(([question, options], index) => `<fieldset><legend>${index + 1}. ${question}</legend>${options.map((option, choice) => `<label><input type="radio" name="q${index}" value="${choice}" required><span>${option}</span></label>`).join('')}</fieldset>`).join('')}<button class="primary-action" type="submit">Check answers</button><p class="quiz-result" role="status" aria-live="polite"></p></form><article class="project-card"><span class="eyebrow">YOUR PRACTICE PROJECT</span><h3>${practice[courseId][0]}</h3><ul>${practice[courseId].slice(1).map(item => `<li>${item}</li>`).join('')}</ul></article>`;
  (document.querySelector('main') || document.body).append(section);
  section.querySelector('.course-quiz').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const score = quizData[courseId].reduce((sum, item, index) => sum + (Number(new FormData(form).get(`q${index}`)) === item[2] ? 1 : 0), 0); const result = section.querySelector('.quiz-result');
    try { await api('/quiz-scores', { method: 'POST', body: JSON.stringify({ courseId, score, total: quizData[courseId].length }) }); result.textContent = `You scored ${score} of ${quizData[courseId].length}. Your best recent result is saved in your dashboard.`; }
    catch (error) { result.textContent = `${error.message} Your score: ${score} of ${quizData[courseId].length}.`; }
  });
  const loadAccountLearning = () => {
    api(`/progress/${courseId}`).then(data => { (data.completedLessons || []).forEach(id => completed.add(id)); cards.forEach(card => { if (completed.has(card.id)) { const button = card.querySelector('.lesson-btn'); if (button) { button.disabled = true; button.textContent = 'Completed ✓'; button.classList.add('is-complete'); } } }); updateProgress(); }).catch(() => updateProgress());
    api('/bookmarks').then(data => { (data.bookmarks || []).forEach(item => { const card = document.getElementById(item.lessonId); if (item.courseId === courseId && card) { const button = card.querySelector('.bookmark-btn'); button.dataset.saved = 'true'; button.textContent = '★ Saved'; } }); }).catch(() => {});
  };
  sessionReady = window.editMasterFetch('/auth/me').then(response => response.ok ? response.json() : null).then(data => { if (data?.user) { signedIn = true; if (profileButton) profileButton.textContent = data.user.name || 'My profile'; loadAccountLearning(); } else { if (profileButton) profileButton.textContent = 'Sign in'; updateProgress(); } }).catch(() => { if (profileButton) profileButton.textContent = 'Sign in'; updateProgress(); });
  window.addEventListener('editmaster:authenticated', loadAccountLearning);
})();
