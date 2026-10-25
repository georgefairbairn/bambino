// Scroll-driven tour: the phone pins while the section scrolls past, and the
// step whose slice of the scroll we're in sets the caption and the stretch of
// video that loops on the phone.
(() => {
  const tour = document.querySelector('.tour');
  if (!tour) return;

  const video = tour.querySelector('video');
  const steps = [...tour.querySelectorAll('.tour-steps li')];
  const dotsEl = tour.querySelector('.tour-dots');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ranges = steps.map((li) => [Number(li.dataset.start), Number(li.dataset.end)]);

  tour.style.setProperty('--steps', steps.length);
  tour.classList.add('is-live');
  video.loop = false;
  video.removeAttribute('autoplay');
  video.pause();

  const dots = steps.map((li, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', li.querySelector('h2').textContent);
    button.addEventListener('click', () => scrollToStep(i));
    dotsEl.append(button);
    return button;
  });
  dotsEl.removeAttribute('aria-hidden');

  let active = -1;

  // Keep playback inside the active step's range. requestAnimationFrame
  // rather than timeupdate, which fires too rarely to stop at the boundary.
  const loopWithinStep = () => {
    if (active >= 0 && !video.paused) {
      const [start, end] = ranges[active];
      if (video.currentTime >= end || video.currentTime < start - 0.25) video.currentTime = start;
    }
    requestAnimationFrame(loopWithinStep);
  };

  const setStep = (i) => {
    if (i === active) return;
    active = i;
    steps.forEach((li, j) => li.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));

    video.classList.add('is-switching');
    // Seeking before metadata loads is ignored, so wait for it.
    if (video.readyState >= 1) video.currentTime = ranges[i][0];
    else
      video.addEventListener('loadedmetadata', () => (video.currentTime = ranges[active][0]), {
        once: true,
      });
    video.addEventListener(
      'seeked',
      () => {
        video.classList.remove('is-switching');
        if (!reduceMotion) video.play().catch(() => {});
      },
      { once: true },
    );
  };

  // Progress through the section's scrollable length, 0 → 1.
  const progress = () => {
    const rect = tour.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
  };

  const scrollToStep = (i) => {
    const scrollable = tour.offsetHeight - window.innerHeight;
    const top = tour.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + ((i + 0.5) / steps.length) * scrollable,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  let queued = false;
  const update = () => {
    queued = false;
    setStep(Math.min(steps.length - 1, Math.floor(progress() * steps.length)));
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  requestAnimationFrame(loopWithinStep);
})();
