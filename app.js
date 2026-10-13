(() => {
  'use strict';

  const songs = Array.isArray(window.MUSIC_LIBRARY) ? window.MUSIC_LIBRARY : [];
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = 0.8;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const libraryScreen = $('#library-screen');
  const playerScreen = $('#player-screen');
  const trackList = $('#track-list');
  const emptyState = $('#empty-state');
  const searchInput = $('#search-input');
  const toast = $('#toast');

  let currentIndex = songs.length ? 0 : -1;
  if (currentIndex >= 0) audio.src = songs[currentIndex].src;
  let activeView = 'library';
  let activeFilter = 'all';
  let activeLibraryTab = 'songs';
  let shuffleEnabled = false;
  let repeatMode = 'off'; // off | all | one
  let favorites = readFavorites();
  let toastTimeout;
  let isSeeking = false;

  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem('fvnky-night-favorites') || '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveFavorites() {
    try { localStorage.setItem('fvnky-night-favorites', JSON.stringify([...favorites])); }
    catch (_) { showToast('Favorites tidak dapat disimpan dalam browser ini.'); }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }

  function coverName(song) {
    const allowed = ['violet', 'orange', 'blue', 'pink', 'green'];
    return allowed.includes(String(song?.cover || '').toLowerCase()) ? String(song.cover).toLowerCase() : 'violet';
  }

  function icon(name) {
    const paths = {
      play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"></path>',
      pause: '<path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" stroke="none"></path>',
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
      more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"></circle>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.play}</svg>`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function durationLabel(song, index) {
    if (index === currentIndex && Number.isFinite(audio.duration) && audio.duration > 0) return formatTime(audio.duration);
    if (Number.isFinite(song.seconds)) return formatTime(song.seconds);
    return song.duration || '––:––';
  }

  function selectedSong() { return currentIndex >= 0 ? songs[currentIndex] : null; }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function switchView(view) {
    activeView = view === 'player' ? 'player' : 'library';
    libraryScreen.classList.toggle('active', activeView === 'library');
    libraryScreen.hidden = activeView !== 'library';
    playerScreen.classList.toggle('active', activeView === 'player');
    playerScreen.hidden = activeView !== 'player';
    $$('[data-view-link]').forEach(button => {
      if (button.classList.contains('nav-item')) {
        button.classList.toggle('active', button.dataset.viewLink === activeView);
        button.setAttribute('aria-current', button.dataset.viewLink === activeView ? 'page' : 'false');
      }
    });
    $('#mini-player').hidden = !(currentIndex >= 0 && activeView === 'library');
    document.body.classList.toggle('player-open', activeView === 'player');
    if (activeView === 'player') renderPlayer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filteredSongs() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const entries = songs.map((song, index) => ({ song, index })).filter(({ song }) => {
      const haystack = `${song.title || ''} ${song.artist || ''} ${song.genre || ''} ${song.album || ''}`.toLocaleLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (activeFilter === 'favorites' && !favorites.has(song.id)) return false;
      if (activeFilter === 'fvnky' && String(song.genre || '').toLowerCase() !== 'fvnky') return false;
      if (activeFilter === 'slow' && String(song.genre || '').toLowerCase() !== 'slow') return false;
      return true;
    });
    if (activeLibraryTab === 'songs') {
      entries.sort((a, b) => String(a.song.title || '').localeCompare(String(b.song.title || ''), undefined, { sensitivity: 'base' }));
    } else if (activeLibraryTab === 'artists') {
      entries.sort((a, b) => String(a.song.artist || 'Artis tidak diketahui').localeCompare(String(b.song.artist || 'Artis tidak diketahui'), undefined, { sensitivity: 'base' }) || String(a.song.title || '').localeCompare(String(b.song.title || '')));
    } else if (activeLibraryTab === 'albums') {
      entries.sort((a, b) => String(a.song.album || a.song.genre || 'Single').localeCompare(String(b.song.album || b.song.genre || 'Single'), undefined, { sensitivity: 'base' }) || String(a.song.title || '').localeCompare(String(b.song.title || '')));
    }
    return entries;
  }

  function renderLibrary() {
    const entries = filteredSongs();
    trackList.innerHTML = entries.map(({ song, index }, visibleIndex) => {
      const current = currentIndex === index;
      const playing = current && !audio.paused;
      const favorite = favorites.has(song.id);
      const genreClass = String(song.genre || '').toLowerCase() === 'fvnky' ? 'genre-fvnky' : (String(song.genre || '').toLowerCase() === 'slow' ? 'genre-slow' : '');
      const position = current && playing
        ? '<span class="row-playing-bars" aria-label="Playing"><i></i><i></i><i></i></span>'
        : `<span>${String(visibleIndex + 1).padStart(2, '0')}</span>`;
      return `
        <article class="track-row ${current ? 'is-current' : ''}" data-index="${index}" data-letter="${/^[A-Za-z]/.test(String(song.title || '').trim()) ? String(song.title).trim().charAt(0).toUpperCase() : '#'}" tabindex="0" role="button" aria-label="Play ${escapeHtml(song.title)}">
          <div class="track-number">${position}</div>
          <div class="track-main">
            <div class="mini-art cover-${coverName(song)}" aria-hidden="true"><b>FNK</b></div>
            <div class="track-text"><span class="track-title">${escapeHtml(song.title || 'Untitled track')}</span><span class="track-artist">${escapeHtml(song.artist || 'Artis tidak diketahui')}</span></div>
          </div>
          <div class="track-genre-cell"><span class="genre-tag ${genreClass}">${escapeHtml(song.genre || 'Other')}</span></div>
          <div class="track-duration">${durationLabel(song, index)}</div>
          <div class="track-row-actions">
            <button type="button" class="row-action favorite-row ${favorite ? 'favorite-active' : ''}" data-action="favorite" aria-label="${favorite ? 'Remove from' : 'Add to'} favorites" title="Favorite">${icon('heart')}</button>
            <button type="button" class="row-action play-row" data-action="play" aria-label="${playing ? 'Pause' : 'Play'} ${escapeHtml(song.title)}" title="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button>
          </div>
        </article>`;
    }).join('');

    const hasEntries = entries.length > 0;
    emptyState.hidden = hasEntries;
    trackList.hidden = !hasEntries;
    $('#visible-count').textContent = String(entries.length).padStart(2, '0');
    $('#song-count').textContent = String(songs.length).padStart(2, '0');
    if (!hasEntries) {
      const h = $('.empty-state h3');
      const p = $('.empty-state p');
      if (activeFilter === 'favorites' && !searchInput.value.trim()) {
        h.textContent = 'Belum ada favorite';
        p.innerHTML = 'Tekan ikon hati pada lagu untuk simpan ke Favorites. Senarai favorite tersimpan dalam browser anda.';
      } else {
        h.textContent = 'Belum jumpa track';
        p.innerHTML = 'Cuba carian lain, atau tambah lagu anda ke <code>music/</code> dan senaraikannya dalam <code>library.js</code>.';
      }
    }
  }

  function setCoverTheme(element, song) {
    if (!element) return;
    element.classList.remove('cover-violet', 'cover-orange', 'cover-blue', 'cover-pink', 'cover-green');
    element.classList.add(`cover-${coverName(song)}`);
  }

  function makeCoverText(song) {
    if (!song) return ['AFTER', 'HOURS'];
    const cleaned = String(song.title || 'FVNKY NIGHT').replace(/\s*\(demo\)/ig, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) return [words[0].slice(0, 12), 'FVNKY'];
    return [words[0].slice(0, 12), words.slice(1).join(' ').slice(0, 15)];
  }

  function renderPlayer() {
    const song = selectedSong();
    const heading = $('#player-heading');
    const artist = $('#player-artist');
    const genre = $('#player-genre');
    const cover = $('#player-cover');
    const playerTags = $('.player-tags');
    if (!song) {
      heading.innerHTML = 'Choose your<br><em>soundtrack.</em>';
      artist.textContent = 'FVNKY NIGHT PLAYER';
      genre.textContent = 'READY WHEN YOU ARE';
      genre.className = 'genre-tag';
      setCoverTheme(cover, { cover: 'violet' });
      $('.cover-main-type', cover).textContent = '♪';
      $('#current-time').textContent = '00:00';
      $('#duration-time').textContent = '00:00';
      $('#seek-slider').value = 0;
      $('#seek-slider').style.setProperty('--range-progress', '0%');
      $('#favorite-button').classList.remove('active');
      $('#favorite-label').textContent = 'ADD TO FAVORITES';
      playerTags.style.opacity = '.75';
      return;
    }
    heading.textContent = song.title || 'Untitled track';
    artist.textContent = song.artist || 'Artis tidak diketahui';
    genre.textContent = song.genre || 'Other';
    genre.className = `genre-tag ${String(song.genre || '').toLowerCase() === 'fvnky' ? 'genre-fvnky' : (String(song.genre || '').toLowerCase() === 'slow' ? 'genre-slow' : '')}`;
    playerTags.style.opacity = '1';
    setCoverTheme(cover, song);
    $('.cover-main-type', cover).textContent = '♪';
    updateFavoriteControls();
    updateTimeline();
  }

  function updateFavoriteControls() {
    const song = selectedSong();
    const button = $('#favorite-button');
    const favorite = song ? favorites.has(song.id) : false;
    button.classList.toggle('active', favorite);
    button.setAttribute('aria-label', favorite ? 'Remove from favorites' : 'Add to favorites');
    $('#favorite-label').textContent = favorite ? 'SAVED TO FAVORITES' : 'ADD TO FAVORITES';
  }

  function renderMiniPlayer() {
    const song = selectedSong();
    const mini = $('#mini-player');
    mini.hidden = !(song && activeView === 'library');
    if (!song) return;
    $('#mini-title').textContent = song.title || 'Untitled track';
    $('#mini-artist').textContent = song.artist || 'Artis tidak diketahui';
    setCoverTheme($('#mini-cover'), song);
  }

  function updatePlaybackButtons() {
    const playing = !audio.paused;
    $('#play-button').innerHTML = icon(playing ? 'pause' : 'play');
    $('#play-button').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('#play-button').title = playing ? 'Pause' : 'Play';
    $('#mini-play-button').innerHTML = icon(playing ? 'pause' : 'play');
    $('#mini-play-button').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    document.body.classList.toggle('is-playing', playing);
    $('#shuffle-button').classList.toggle('toggled', shuffleEnabled);
    $('#repeat-button').classList.toggle('toggled', repeatMode !== 'off');
    $('#repeat-button').classList.toggle('repeat-one', repeatMode === 'one');
    $('#repeat-button').setAttribute('aria-label', `Repeat ${repeatMode}`);
    $('#repeat-button').title = `Repeat: ${repeatMode}`;
  }

  function updateTimeline() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    const slider = $('#seek-slider');
    if (!isSeeking) slider.value = percent;
    slider.style.setProperty('--range-progress', `${percent}%`);
    $('#current-time').textContent = formatTime(current);
    $('#duration-time').textContent = duration > 0 ? formatTime(duration) : (selectedSong()?.duration || '00:00');
    $('#mini-progress-fill').style.width = `${percent}%`;
  }

  async function playSong(index) {
    if (!Number.isInteger(index) || index < 0 || index >= songs.length) return;
    const song = songs[index];
    const sameTrack = currentIndex === index && audio.src;
    currentIndex = index;
    if (!sameTrack) {
      audio.pause();
      audio.src = song.src;
      audio.currentTime = 0;
      audio.load();
    }
    renderLibrary();
    renderPlayer();
    renderMiniPlayer();
    switchView('player');
    try {
      await audio.play();
      updatePlaybackButtons();
      renderLibrary();
      renderMiniPlayer();
    } catch (error) {
      updatePlaybackButtons();
      showToast(`Tak dapat mainkan fail: ${song.src}. Semak nama/path fail dalam library.js.`);
    }
  }

  async function togglePlay() {
    if (currentIndex < 0) {
      if (!songs.length) { showToast('Tambah lagu dahulu dalam library.js.'); return; }
      await playSong(0);
      return;
    }
    if (audio.paused) {
      try { await audio.play(); }
      catch (_) { showToast('Audio tidak dapat dimainkan. Semak fail lagu.'); }
    } else {
      audio.pause();
    }
    updatePlaybackButtons();
    renderLibrary();
    renderMiniPlayer();
  }

  async function nextTrack() {
    if (!songs.length) return;
    let next = currentIndex < 0 ? 0 : currentIndex + 1;
    if (shuffleEnabled && songs.length > 1) {
      do { next = Math.floor(Math.random() * songs.length); } while (next === currentIndex);
    } else if (next >= songs.length) {
      if (repeatMode === 'all') next = 0;
      else {
        audio.pause();
        audio.currentTime = 0;
        updateTimeline();
        updatePlaybackButtons();
        renderLibrary();
        return;
      }
    }
    await playSong(next);
  }

  async function previousTrack() {
    if (!songs.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      updateTimeline();
      return;
    }
    let previous = currentIndex - 1;
    if (shuffleEnabled && songs.length > 1) {
      do { previous = Math.floor(Math.random() * songs.length); } while (previous === currentIndex);
    } else if (previous < 0) {
      previous = repeatMode === 'all' ? songs.length - 1 : 0;
    }
    await playSong(previous);
  }

  function toggleFavorite(id) {
    if (!id) return;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    saveFavorites();
    renderLibrary();
    updateFavoriteControls();
    renderQueue();
  }

  function renderQueue() {
    $('#queue-count').textContent = String(songs.length).padStart(2, '0');
    $('#queue-list').innerHTML = songs.map((song, index) => `
      <div class="queue-row ${index === currentIndex ? 'current' : ''}" data-queue-index="${index}" tabindex="0" role="button" aria-label="Play ${escapeHtml(song.title)}">
        <span class="queue-row-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="mini-art cover-${coverName(song)}" aria-hidden="true"><b>FNK</b></span>
        <span class="queue-row-copy"><strong class="queue-row-title">${escapeHtml(song.title || 'Untitled track')}</strong><small class="queue-row-artist">${escapeHtml(song.artist || 'Artis tidak diketahui')}</small></span>
        <span class="queue-row-duration">${durationLabel(song, index)}</span>
      </div>`).join('');
  }

  function openQueue() {
    renderQueue();
    $('#queue-backdrop').hidden = false;
    $('#close-queue-button').focus();
  }
  function closeQueue() { $('#queue-backdrop').hidden = true; }

  // Library interactions
  $$('[data-view-link]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    switchView(button.dataset.viewLink);
  }));
  $$('.nav-item[data-library-tab]').forEach(button => button.addEventListener('click', () => {
    activeLibraryTab = button.dataset.libraryTab || 'songs';
    $$('.nav-item[data-library-tab]').forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    });
    renderLibrary();
  }));
  $('#search-toggle').addEventListener('click', () => {
    const box = $('.search-box');
    const opening = !box.classList.contains('search-visible');
    box.classList.toggle('search-visible', opening);
    $('#search-toggle').classList.toggle('is-selected', opening);
    if (opening) searchInput.focus();
    else { searchInput.value = ''; renderLibrary(); }
  });
  $('#library-menu-button').addEventListener('click', openQueue);
  $('#more-player-button').addEventListener('click', openQueue);
  $('#alphabet-index').addEventListener('click', event => {
    const button = event.target.closest('[data-letter]');
    if (!button) return;
    const letter = button.dataset.letter;
    const rows = $$('.track-row', trackList);
    const target = rows.find(row => row.dataset.letter === letter);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else showToast(`Tiada lagu bermula dengan ${letter}.`);
  });
  $('#back-to-library').addEventListener('click', () => switchView('library'));
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    $$('.filter-chip').forEach(chip => chip.classList.toggle('active', chip === button));
    renderLibrary();
  }));
  searchInput.addEventListener('input', renderLibrary);
  $('#clear-search').addEventListener('click', () => {
    searchInput.value = '';
    activeFilter = 'all';
    $$('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'all'));
    renderLibrary();
    searchInput.focus();
  });
  trackList.addEventListener('click', event => {
    const row = event.target.closest('.track-row');
    if (!row) return;
    const index = Number(row.dataset.index);
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'favorite') { toggleFavorite(songs[index]?.id); event.stopPropagation(); return; }
    if (action === 'play' && currentIndex === index && !audio.paused) { audio.pause(); updatePlaybackButtons(); renderLibrary(); return; }
    playSong(index);
  });
  trackList.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('track-row')) {
      event.preventDefault(); playSong(Number(event.target.dataset.index));
    }
  });

  // Player controls
  $('#play-button').addEventListener('click', togglePlay);
  $('#mini-play-button').addEventListener('click', togglePlay);
  $('#next-button').addEventListener('click', nextTrack);
  $('#mini-next-button').addEventListener('click', nextTrack);
  $('#previous-button').addEventListener('click', previousTrack);
  $('#shuffle-button').addEventListener('click', () => {
    shuffleEnabled = !shuffleEnabled;
    updatePlaybackButtons();
    showToast(shuffleEnabled ? 'Shuffle diaktifkan' : 'Shuffle dimatikan');
  });
  $('#repeat-button').addEventListener('click', () => {
    repeatMode = repeatMode === 'off' ? 'all' : (repeatMode === 'all' ? 'one' : 'off');
    audio.loop = repeatMode === 'one';
    updatePlaybackButtons();
    showToast(repeatMode === 'off' ? 'Repeat dimatikan' : (repeatMode === 'one' ? 'Repeat satu lagu' : 'Repeat semua lagu'));
  });
  $('#seek-slider').addEventListener('input', event => {
    isSeeking = true;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const percent = Number(event.target.value);
      $('#current-time').textContent = formatTime((percent / 100) * audio.duration);
      event.target.style.setProperty('--range-progress', `${percent}%`);
    }
  });
  $('#seek-slider').addEventListener('change', event => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
    isSeeking = false;
    updateTimeline();
  });
  $('#volume-slider').addEventListener('input', event => { audio.volume = Number(event.target.value); });
  $('#favorite-button').addEventListener('click', () => {
    const song = selectedSong();
    if (!song) { showToast('Pilih lagu dahulu untuk menambah favorite.'); return; }
    toggleFavorite(song.id);
  });
  $('#share-button').addEventListener('click', async () => {
    const song = selectedSong();
    if (!song) { showToast('Pilih lagu dahulu untuk dikongsi.'); return; }
    const shareText = `${song.title || 'Untitled track'} — ${song.artist || 'Artis tidak diketahui'}\n${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: song.title || 'Muzik', text: `${song.title || 'Untitled track'} — ${song.artist || 'Artis tidak diketahui'}`, url: window.location.href }); }
      catch (error) { if (error?.name !== 'AbortError') showToast('Perkongsian tidak tersedia.'); }
    } else if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(shareText); showToast('Maklumat lagu disalin.'); }
      catch (_) { showToast('Salin pautan website daripada address bar.'); }
    } else showToast('Salin pautan website daripada address bar.');
  });
  ['#queue-button', '#queue-top-button', '#mini-queue-button'].forEach(selector => $(selector).addEventListener('click', openQueue));
  $('#close-queue-button').addEventListener('click', closeQueue);
  $('#queue-backdrop').addEventListener('click', event => { if (event.target.id === 'queue-backdrop') closeQueue(); });
  $('#queue-list').addEventListener('click', event => {
    const row = event.target.closest('[data-queue-index]');
    if (!row) return;
    closeQueue();
    playSong(Number(row.dataset.queueIndex));
  });
  $('#queue-list').addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-queue-index]')) {
      event.preventDefault(); closeQueue(); playSong(Number(event.target.dataset.queueIndex));
    }
  });

  audio.addEventListener('play', () => { updatePlaybackButtons(); renderLibrary(); renderMiniPlayer(); });
  audio.addEventListener('pause', () => { updatePlaybackButtons(); renderLibrary(); renderMiniPlayer(); });
  audio.addEventListener('timeupdate', updateTimeline);
  audio.addEventListener('loadedmetadata', () => { updateTimeline(); renderLibrary(); renderQueue(); });
  audio.addEventListener('durationchange', () => { updateTimeline(); renderLibrary(); renderQueue(); });
  audio.addEventListener('ended', async () => {
    if (repeatMode === 'one') return;
    if (repeatMode === 'all' || shuffleEnabled || currentIndex < songs.length - 1) await nextTrack();
    else { updatePlaybackButtons(); renderLibrary(); }
  });
  audio.addEventListener('error', () => {
    if (selectedSong()) showToast(`Audio tidak ditemui: ${selectedSong().src}. Semak path fail dalam library.js.`);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeQueue(); return; }
    const target = event.target;
    const typing = target && (target.matches('input, textarea, select') || target.isContentEditable);
    if (event.key === '/' && !typing) { event.preventDefault(); searchInput.focus(); return; }
    if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
    if (event.code === 'ArrowRight' && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); }
    if (event.code === 'ArrowLeft' && Number.isFinite(audio.duration)) { audio.currentTime = Math.max(0, audio.currentTime - 5); }
  });

  // Initial state
  $('#year').textContent = new Date().getFullYear();
  $('#volume-slider').value = String(audio.volume);
  renderLibrary();
  renderPlayer();
  renderMiniPlayer();
  renderQueue();
  updatePlaybackButtons();
  switchView('library');
})();
