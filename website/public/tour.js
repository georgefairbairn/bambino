// Scroll-driven tour: the phone pins while the section scrolls past, and the
// step whose slice of the scroll we're in sets the caption and the stretch of
// video that plays once on the phone. Each scroll gesture inside the tour
// settles on the next step, and the active progress bar fills as its clip plays.
(() => {
  const tour = document.querySelector('.tour');
  if (!tour) return;

  const video = tour.querySelector('.phone-you video');
  const partner = tour.querySelector('.phone-partner video');
  const partnerOffset = Number(partner.dataset.offset);
  const steps = [...tour.querySelectorAll('.tour-steps li')];
  const progressEl = tour.querySelector('.tour-progress');
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
    button.addEventListener('click', () => glideTo(i));
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
  const fillBars = () => {
    const [start, end] = ranges[active];
    const played = reduceMotion ? 1 : (video.currentTime - start) / (end - HOLD - start);
    bars.forEach((bar, j) =>
      bar.style.setProperty(
        '--fill',
        j < active ? 1 : j > active ? 0 : Math.min(1, Math.max(0, played)),
      ),
    );
  };

  const playStepOnce = () => {
    if (active >= 0) fillBars();
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

  // Scroll positions are measured in steps: 0 where the phone pins, steps.length
  // where it lets go, and step i is centred on i + 0.5.
  const stepLength = () => (tour.offsetHeight - window.innerHeight) / steps.length;
  const tourTop = () => tour.getBoundingClientRect().top + window.scrollY;
  const positionAt = (y) => (y - tourTop()) / stepLength();

  const scrollToStep = (i) => {
    window.scrollTo({
      top: tourTop() + (i + 0.5) * stepLength(),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  let queued = false;
  const update = () => {
    queued = false;
    const position = positionAt(window.scrollY);
    setStep(Math.min(steps.length - 1, Math.max(0, Math.floor(position))));
  };

  // One scroll gesture moves one step: when a gesture ends inside the tour, glide
  // to the step after (or before) the one it started on, however far momentum
  // carried it. Gestures that leave the tour, up into the hero or down past the
  // last step, are left alone. Browser scroll snapping isn't used because it
  // would apply to the whole page.
  let gestureStart = null;
  let direction = 0;
  let lastY = window.scrollY;
  let touching = false;
  let settleTimer;
  // Our own glides scroll the page too; they mustn't count as gestures.
  let gliding = false;
  let glideTimer;

  const glideTo = (i) => {
    gliding = true;
    gestureStart = null;
    clearTimeout(settleTimer);
    clearTimeout(glideTimer);
    glideTimer = setTimeout(() => (gliding = false), 1000);
    scrollToStep(i);
  };
  const takeOver = () => {
    gliding = false;
    clearTimeout(glideTimer);
  };

  const settle = () => {
    const start = gestureStart;
    gestureStart = null;
    if (start === null || direction === 0) return;
    const n = steps.length;
    const position = positionAt(window.scrollY);
    let target;
    if (start >= 0 && start < n) {
      // Started on a step: move exactly one, or let go off either end.
      target = Math.floor(start) + direction;
      if (target < 0 || target > n - 1) return;
    } else if (direction > 0 && start < 0 && position > -window.innerHeight / stepLength()) {
      target = 0; // coming down from the hero
    } else if (direction < 0 && start >= n && position < n + 0.5) {
      target = n - 1; // coming back up from below
    } else {
      return;
    }
    if (Math.abs(position - (target + 0.5)) > 0.02) glideTo(target);
  };

  const scheduleSettle = () => {
    clearTimeout(settleTimer);
    if (!touching) settleTimer = setTimeout(settle, 140);
  };

  const onScroll = () => {
    if (!gliding) {
      if (gestureStart === null) gestureStart = positionAt(lastY);
      direction = Math.sign(window.scrollY - lastY) || direction;
      scheduleSettle();
    }
    lastY = window.scrollY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener(
    'touchstart',
    () => {
      takeOver();
      touching = true;
      clearTimeout(settleTimer);
    },
    { passive: true },
  );
  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('keydown', takeOver);
  const onTouchEnd = () => {
    touching = false;
    scheduleSettle();
  };
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  requestAnimationFrame(playStepOnce);
})();
