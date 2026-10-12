(() => {
  document.documentElement.classList.add('js');
  const video = document.querySelector('#film');
  const progress = document.querySelector('.scroll-progress span');
  const revealItems = document.querySelectorAll('.reveal');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let rafId = 0;
  let targetProgress = 0;
  let scrubProgress = 0;
  let seekPending = false;

  // Ease the paused film toward the latest scroll position, waiting for each decoded seek.
  function updateScroll() {
    rafId = 0;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    targetProgress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
    progress.style.width = `${targetProgress * 100}%`;
    if (!reducedMotion.matches && video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0) {
      const remaining = targetProgress - scrubProgress;
      scrubProgress = Math.abs(remaining) < 0.001 ? targetProgress : scrubProgress + remaining * 0.3;
      const targetTime = scrubProgress * Math.max(0, video.duration - 0.08);
      if (!seekPending && Math.abs(video.currentTime - targetTime) > 0.025) {
        try {
          seekPending = true;
          video.currentTime = targetTime;
        } catch (_) {
          seekPending = false;
        }
      }
      if (!seekPending && Math.abs(targetProgress - scrubProgress) > 0.001) queueScrollUpdate();
    }
  }
  function queueScrollUpdate() {
    if (!rafId) rafId = requestAnimationFrame(updateScroll);
  }
  function handleScroll() {
    video.pause();
    queueScrollUpdate();
  }
  addEventListener('scroll', handleScroll, { passive: true });
  addEventListener('resize', queueScrollUpdate, { passive: true });
  video.addEventListener('seeked', () => {
    seekPending = false;
    if (Math.abs(targetProgress - scrubProgress) > 0.001) queueScrollUpdate();
  });
  video.addEventListener('loadedmetadata', queueScrollUpdate, { once: true });
  video.addEventListener('error', () => document.body.classList.add('film-unavailable'), { once: true });
  video.addEventListener('loadeddata', () => {
    video.pause();
    queueScrollUpdate();
  }, { once: true });

  if (reducedMotion.matches) {
    revealItems.forEach(item => item.classList.add('is-visible'));
    video.addEventListener('loadeddata', () => video.pause(), { once: true });
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('is-open');
    menu.inert = true;
  }
  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', opening);
    menu.inert = !opening;
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  reducedMotion.addEventListener?.('change', queueScrollUpdate);
  queueScrollUpdate();
})();
