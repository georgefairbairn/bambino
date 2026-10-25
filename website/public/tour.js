// Scroll-driven tour: the phone pins while the section scrolls past, and the
// step whose slice of the scroll we're in sets the caption and the stretch of
// video that plays once on the phone. The progress bars fill continuously, so the
// reader can see their scrolling is doing something between step changes.
(() => {
  const tour = document.querySelector('.tour');
  if (!tour) return;

  const video = tour.querySelector('.phone-you video');
  const partner = tour.querySelector('.phone-partner video');
  const partnerOffset = Number(partner.dataset.offset);
  const steps = [...tour.querySelectorAll('.tour-steps li')];
  const progressEl = tour.querySelector('.tour-progress');
  const hint = tour.querySelector('.tour-hint');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ranges = steps.map((li) => [Number(li.dataset.start), Number(li.dataset.end)]);
  const duo = steps.map((li) => li.hasAttribute('data-duo'));

  tour.style.setProperty('--steps', steps.length);
  tour.classList.add('is-live');
  video.loop = false;
  video.removeAttribute('autoplay');
  video.pause();

  const bars = steps.map((li, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Step ${i + 1}: ${li.querySelector('h2').textContent}`);
    button.addEventListener('click', () => scrollToStep(i));
    progressEl.append(button);
    return button;
  });

  let active = -1;

  // The partner's clip starts partnerOffset seconds into the tour's timeline.
  const syncPartner = () => {
    partner.currentTime = Math.max(0, video.currentTime - partnerOffset);
  };

  // Play the active step's range once, then hold on its last frame; scrolling
  // back into a step plays it again. requestAnimationFrame rather than
  // timeupdate, which fires too rarely to stop at the boundary. The partner's
  // phone is kept in step with yours.
  const HOLD = 1 / 30; // stop a frame short, so the next step's first frame never shows
  const playStepOnce = () => {
    if (active >= 0 && !video.paused) {
      const end = ranges[active][1];
      if (video.currentTime >= end - HOLD) {
        video.pause();
        video.currentTime = end - HOLD;
        if (duo[active]) {
          partner.pause();
          syncPartner();
        }
      } else if (
        duo[active] &&
        Math.abs(partner.currentTime + partnerOffset - video.currentTime) > 0.2
      ) {
        syncPartner();
      }
    }
    requestAnimationFrame(playStepOnce);
  };

  const setStep = (i) => {
    if (i === active) return;
    active = i;
    steps.forEach((li, j) => {
      li.classList.toggle('is-active', j === i);
      li.classList.toggle('is-past', j < i);
    });
    bars.forEach((bar, j) => bar.setAttribute('aria-current', j === i ? 'step' : 'false'));
    tour.classList.toggle('is-duo', duo[i]);
    if (!duo[i]) partner.pause();

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
        if (duo[active]) syncPartner();
        if (reduceMotion) return;
        video.play().catch(() => {});
        if (duo[active]) partner.play().catch(() => {});
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
    const position = progress() * steps.length;
    const i = Math.min(steps.length - 1, Math.floor(position));
    setStep(i);
    bars.forEach((bar, j) =>
      bar.style.setProperty('--fill', Math.min(1, Math.max(0, position - j))),
    );
    // The hint has done its job once the reader is a little way into the tour.
    hint.classList.toggle('is-hidden', position > 0.35);
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
  requestAnimationFrame(playStepOnce);
})();
