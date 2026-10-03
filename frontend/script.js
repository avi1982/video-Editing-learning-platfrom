let authMode = 'login';
const localHost = window.location.hostname;
const isLocalPreview = window.location.protocol === 'file:' || localHost === 'localhost' || localHost === '127.0.0.1';
const API_BASE = isLocalPreview && window.location.port !== '3000'
    ? `http://${localHost === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000/api`
    : '/api';

function apiFetch(route, options = {}) {
    return fetch(`${API_BASE}${route}`, { ...options, credentials: 'include' });
}

async function readApiResponse(response) {
    const text = await response.text();
    if (!text) throw new Error('The backend returned an empty response. Start it from the backend folder with `npm start`, then open http://localhost:3000.');
    try {
        return JSON.parse(text);
    } catch {
        throw new Error('The page is not connected to the EditMaster backend. Start it from the backend folder with `npm start`, then open http://localhost:3000.');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const search = document.getElementById('course-search');
    const level = document.getElementById('course-level');
    const cards = [...document.querySelectorAll('.software-card[data-course-level]')];
    const count = document.getElementById('course-count');
    const results = document.getElementById('video-search-results');
    const courseFiles = [
        { id: 'capcut-mobile', name: 'CapCut Mobile', file: 'capcut-mobile.html', level: 'beginner' },
        { id: 'capcut-pc', name: 'CapCut PC', file: 'capcut-pc.html', level: 'beginner' },
        { id: 'premiere-pro', name: 'Premiere Pro', file: 'premiere-pro.html', level: 'intermediate' },
        { id: 'after-effects', name: 'After Effects', file: 'after-effects.html', level: 'advanced' }
    ];
    let videoIndexPromise;
    const getVideoIndex = () => videoIndexPromise ||= Promise.all(courseFiles.map(async course => {
        const response = await fetch(course.file);
        if (!response.ok) throw new Error('Could not load course videos. Please refresh and try again.');
        const markup = await response.text();
        const documentPage = new DOMParser().parseFromString(markup, 'text/html');
        return [...documentPage.querySelectorAll('.lesson-card')].map((card, index) => ({
            course, lesson: `lesson-${index + 1}`,
            title: card.querySelector('.lesson-info h3, h3')?.textContent.trim() || `Lesson ${index + 1}`,
            description: card.querySelector('.lesson-info p, p')?.textContent.trim() || '',
            videoName: card.querySelector('iframe[title], video[aria-label]')?.getAttribute('title') || '',
            href: `${course.file}#lesson-${index + 1}`
        }));
    })).then(groups => groups.flat());
    const showVideos = async (query, selectedLevel) => {
        if (!results || !query) { if (results) results.hidden = true; return; }
        results.hidden = false;
        results.innerHTML = '<p class="video-search-status">Searching lessons across all software…</p>';
        try {
            const videos = await getVideoIndex();
            const found = videos.filter(video => (selectedLevel === 'all' || video.course.level === selectedLevel) && `${video.title} ${video.description} ${video.videoName} ${video.course.name}`.toLowerCase().includes(query));
            results.replaceChildren();
            const heading = document.createElement('div'); heading.className = 'video-results-heading';
            const title = document.createElement('h3'); title.textContent = 'Video lessons';
            const total = document.createElement('span'); total.textContent = `${found.length} ${found.length === 1 ? 'result' : 'results'}`;
            heading.append(title, total); results.append(heading);
            if (!found.length) { const empty = document.createElement('p'); empty.className = 'video-search-status'; empty.textContent = 'No matching lessons yet. Try another title or choose a different level.'; results.append(empty); return; }
            const list = document.createElement('div'); list.className = 'video-result-grid';
            found.forEach(video => {
                const link = document.createElement('a'); link.className = 'video-result-card'; link.href = video.href;
                const badge = document.createElement('span'); badge.className = 'eyebrow'; badge.textContent = video.course.name;
                const name = document.createElement('strong'); name.textContent = video.title;
                const detail = document.createElement('p'); detail.textContent = video.description;
                const action = document.createElement('span'); action.className = 'video-result-action'; action.textContent = 'Open lesson ↗';
                link.append(badge, name, detail, action); list.append(link);
            });
            results.append(list);
        } catch (error) { results.innerHTML = `<p class="video-search-status">${error.message}</p>`; }
    };
    let searchTimer;
    const filterCourses = () => {
        const query = (search?.value || '').trim().toLowerCase();
        let visible = 0;
        cards.forEach(card => {
            const matches = card.textContent.toLowerCase().includes(query) && (level?.value === 'all' || card.dataset.courseLevel === level?.value);
            card.hidden = !matches;
            if (matches) visible++;
        });
        if (count) count.textContent = `${visible} ${visible === 1 ? 'course' : 'courses'}`;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => showVideos(query, level?.value || 'all'), 180);
    };
    search?.addEventListener('input', filterCourses);
    level?.addEventListener('change', filterCourses);
    const popup = document.getElementById('loginPopup');
    if (!popup) return;
    try {
        const response = await apiFetch('/auth/me');
        const data = await readApiResponse(response);
        if (response.ok) {
            popup.style.display = 'none';
            const profile = document.querySelector('.profile-btn');
            if (profile) profile.textContent = data.user.name || data.user.email;
            return;
        }
    } catch { /* The page may be opened without the backend. */ }
    popup.style.display = 'flex';
});

async function login(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    const message = document.getElementById('authMessage');
    const payload = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        name: document.getElementById('name')?.value || ''
    };
    button.disabled = true;
    message.textContent = '';
    try {
        const response = await apiFetch(`/auth/${authMode === 'register' ? 'register' : 'login'}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
        document.getElementById('loginPopup').style.display = 'none';
        const profile = document.querySelector('.profile-btn');
        if (profile) profile.textContent = data.user.name || data.user.email;
    } catch (error) {
        message.textContent = error.message === 'Failed to fetch' ? 'Cannot reach the backend. Start the site with npm start.' : error.message;
    } finally { button.disabled = false; }
}

function toggleAuthMode(event) {
    event.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('authTitle').textContent = authMode === 'register' ? 'Create your account' : 'Welcome Back!';
    document.getElementById('authSubtitle').textContent = authMode === 'register' ? 'Join EditMaster to save your progress' : 'Please login to continue';
    document.getElementById('authSubmit').textContent = authMode === 'register' ? 'Sign Up' : 'Login';
    document.getElementById('authPrompt').textContent = authMode === 'register' ? 'Already have an account? ' : "Don't have an account? ";
    document.getElementById('authToggle').textContent = authMode === 'register' ? 'Login' : 'Sign Up';
    document.getElementById('nameGroup').hidden = authMode !== 'register';
    document.getElementById('name').required = authMode === 'register';
    document.getElementById('authMessage').textContent = '';
}

function closeLogin() {
    const popup = document.getElementById('loginPopup');
    if (popup) popup.style.display = 'none';
}
