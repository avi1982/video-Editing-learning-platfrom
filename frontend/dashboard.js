(() => {
  const root = document.getElementById('dashboard-content'), intro = document.getElementById('dashboard-intro');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const api = async (route, options = {}) => { const response = await window.editMasterFetch(route, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load your dashboard.'); return data; };
  const profileToggle = document.getElementById('profile-toggle');
  const profilePanel = document.getElementById('profile-panel');
  const logoutButton = document.getElementById('logout-button');
  const logoutMessage = document.getElementById('logout-message');
  profileToggle.addEventListener('click', () => {
    profilePanel.hidden = !profilePanel.hidden;
    profileToggle.setAttribute('aria-expanded', String(!profilePanel.hidden));
  });
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    logoutMessage.textContent = 'Signing out…';
    try {
      await api('/auth/logout', { method: 'POST' });
      window.location.href = window.editMasterUrl('/');
    } catch (error) {
      logoutMessage.textContent = error.message;
      logoutButton.disabled = false;
    }
  });
  api('/dashboard').then(data => {
    intro.textContent = `Welcome${data.user.name ? `, ${data.user.name}` : ''}. Pick up where you left off or revisit a saved lesson.`;
    document.getElementById('profile-name').textContent = data.user.name || 'EditMaster learner';
    document.getElementById('profile-email').textContent = data.user.email;
    const courses = data.courses || [], bookmarks = data.bookmarks || [], scores = data.quizScores || {};
    const next = courses.find(course => course.completedCount < course.lessons) || courses[0];
    root.innerHTML = `<section class="dashboard-section"><div class="dashboard-title"><div><span class="eyebrow">YOUR COURSES</span><h2>Learning progress</h2></div><a class="text-link" href="/#software">Explore courses ↗</a></div><div class="dashboard-course-grid">${courses.map(course => `<article class="dashboard-card"><div class="dashboard-card-top"><span class="eyebrow">${escapeHtml(course.level)}</span><span>${course.percent}%</span></div><h3>${escapeHtml(course.title)}</h3><p>${course.completedCount} of ${course.lessons} lessons completed</p><div class="dashboard-progress"><span style="width:${course.percent}%"></span></div><a class="course-link" href="${escapeHtml(course.url)}">${course.completedCount ? 'Continue learning' : 'Start course'} ↗</a></article>`).join('')}</div></section><section class="dashboard-section"><div class="dashboard-title"><div><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Next lesson</h2></div></div><a class="continue-card" href="${escapeHtml(next.url)}"><span class="continue-mark">↗</span><span><strong>${escapeHtml(next.title)}</strong><small>${next.completedCount ? `${next.completedCount} lessons done — keep going` : 'Start your first lesson'}</small></span></a></section><section class="dashboard-section"><div class="dashboard-title"><div><span class="eyebrow">SAVED FOR LATER</span><h2>Bookmarked lessons</h2></div></div>${bookmarks.length ? `<div class="saved-list">${bookmarks.map(item => `<article class="saved-item"><a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.courseTitle)}</span></a><button type="button" data-bookmark="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)} bookmark">Remove</button></article>`).join('')}</div>` : '<p class="empty-state">Save a lesson with ☆ on any course page and it will appear here.</p>'}</section><section class="dashboard-section"><div class="dashboard-title"><div><span class="eyebrow">PRACTICE MAKES PROGRESS</span><h2>Quiz results</h2></div></div>${Object.keys(scores).length ? `<div class="score-grid">${Object.entries(scores).map(([id, score]) => `<article class="score-card"><strong>${escapeHtml(courses.find(course => course.id === id)?.title || id)}</strong><span>${score.score} / ${score.total} · ${score.percent}%</span></article>`).join('')}</div>` : '<p class="empty-state">Complete a course quiz to keep your result here.</p>'}</section>`;
    root.querySelectorAll('[data-bookmark]').forEach(button => button.addEventListener('click', async () => { try { await api(`/bookmarks/${button.dataset.bookmark}`, { method: 'DELETE' }); button.closest('.saved-item').remove(); if (!root.querySelector('.saved-item')) root.querySelector('.saved-list').outerHTML = '<p class="empty-state">Save a lesson with ☆ on any course page and it will appear here.</p>'; } catch (error) { alert(error.message); } }));
  }).catch(error => { intro.textContent = error.message; root.innerHTML = '<section class="dashboard-locked"><span class="eyebrow">SIGN IN REQUIRED</span><h2>Your progress belongs to your account.</h2><p>Head to the home page to sign in or create an account, then return here to see your courses, bookmarks, and quiz scores.</p><a class="start-btn" href="/">Go to EditMaster <span>↗</span></a></section>'; });
})();
