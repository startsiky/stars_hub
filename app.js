(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let toastTimer = 0;
  let tapCount = 0;
  let isTransforming = false;
  let isRevealed = false;

  function isValidTelegramUrl(value) {
    if (typeof value !== 'string') return false;
    const url = value.trim();
    if (!url || url.includes('...')) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' &&
        (parsed.hostname === 't.me' || parsed.hostname.endsWith('.t.me')) &&
        parsed.pathname.length > 1;
    } catch {
      return false;
    }
  }

  function showToast(message = 'Ссылка проекта ещё не настроена') {
    const toast = $('[data-toast]');
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1900);
  }

  function invalidFeedback(projectKey) {
    const card = document.querySelector(`[data-project-card="${projectKey}"]`);
    if (card) {
      card.classList.remove('is-invalid');
      requestAnimationFrame(() => card.classList.add('is-invalid'));
      window.setTimeout(() => card.classList.remove('is-invalid'), 420);
    }
    showToast();
  }

  function openProject(projectKey) {
    const url = (window.PROJECT_LINKS || {})[projectKey];
    if (!isValidTelegramUrl(url)) {
      invalidFeedback(projectKey);
      return;
    }
    window.location.href = url.trim();
  }

  function bindProjectLinks() {
    $$('[data-project]').forEach((button) => {
      button.addEventListener('click', () => openProject(button.dataset.project));
    });
  }

  function initLoader() {
    const loader = $('[data-loader]');
    const minimum = reduceMotion.matches ? 120 : 940;
    const maximum = reduceMotion.matches ? 220 : 1360;
    const startedAt = performance.now();
    let done = false;

    const reveal = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, minimum - (performance.now() - startedAt));
      window.setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        window.setTimeout(() => loader?.setAttribute('aria-hidden', 'true'), reduceMotion.matches ? 140 : 560);
      }, wait);
    };

    const hardStop = window.setTimeout(reveal, maximum);
    window.addEventListener('load', () => {
      window.clearTimeout(hardStop);
      reveal();
    }, { once: true });

    if (document.readyState === 'complete') {
      window.clearTimeout(hardStop);
      reveal();
    }
  }

  function initAssetFallbacks() {
    $$('[data-star-image]').forEach((img) => {
      const hide = () => { img.hidden = true; };
      img.addEventListener('error', hide, { once: true });
      if (img.complete && img.naturalWidth === 0) hide();
    });

    $$('[data-project-image]').forEach((img) => {
      const media = img.closest('[data-project-media]');
      const markMissing = () => media?.classList.add('is-missing');
      img.addEventListener('error', markMissing, { once: true });
      if (img.complete && img.naturalWidth === 0) markMissing();
    });

    const transitionImage = $('[data-transition-image]');
    if (transitionImage) {
      const hideTransitionImage = () => { transitionImage.hidden = true; };
      transitionImage.addEventListener('error', hideTransitionImage, { once: true });
      if (transitionImage.complete && transitionImage.naturalWidth === 0) hideTransitionImage();
    }
  }

  function prepareCriticalProjectImage() {
    const image = $('[data-project-image="starsRush"]');
    if (!image || typeof image.decode !== 'function') return;
    image.decode().catch(() => {});
  }

  function updateInstruction(text, highlightWord = '') {
    const el = $('[data-tap-instruction]');
    if (!el) return;
    el.classList.add('is-changing');
    window.setTimeout(() => {
      if (highlightWord && text.includes(highlightWord)) {
        const [before, after] = text.split(highlightWord);
        const accent = document.createElement('span');
        accent.textContent = highlightWord;
        el.replaceChildren(document.createTextNode(before), accent, document.createTextNode(after || ''));
      } else {
        el.textContent = text;
      }
      el.classList.remove('is-changing');
    }, reduceMotion.matches ? 0 : 120);
  }

  function updateTapProgress() {
    const progress = $('[data-tap-progress]');
    if (!progress) return;
    $$('i', progress).forEach((item, index) => item.classList.toggle('is-active', index < tapCount));
    progress.setAttribute('aria-label', `Прогресс: ${tapCount} из 3`);
  }

  function createShockwave(rect, strength = 1) {
    if (reduceMotion.matches || isRevealed) return;
    const wave = document.createElement('i');
    wave.className = 'tap-shockwave';
    const size = Math.min(340, Math.max(rect.width, rect.height) * (1.2 + strength * .16));
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left = `${rect.left + rect.width / 2}px`;
    wave.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  }

  function createTapParticles(rect, count, strength, allowDuringTransition = false) {
    if (reduceMotion.matches || isRevealed || (isTransforming && !allowDuringTransition)) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - .5) * .25;
      const distance = (42 + Math.random() * 34) * strength;
      const particle = document.createElement('i');
      const useStar = i === 0;
      particle.className = `tap-burst-particle${useStar ? ' is-star' : ''}`;
      particle.style.setProperty('--sx', `${cx}px`);
      particle.style.setProperty('--sy', `${cy}px`);
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--rot', `${(Math.random() > .5 ? 1 : -1) * (35 + Math.random() * 70)}deg`);
      particle.style.setProperty('--size', `${useStar ? 10 : 4 + Math.random() * 3}px`);
      particle.style.setProperty('--life', `${440 + Math.random() * 110}ms`);

      if (useStar) {
        const image = document.createElement('img');
        image.src = './tgstar.webp';
        image.alt = '';
        particle.appendChild(image);
      }

      particle.addEventListener('animationend', () => particle.remove(), { once: true });
      fragment.appendChild(particle);
    }

    document.body.appendChild(fragment);
  }

  function playTapFeedback(level, knownRect = null) {
    const stage = $('[data-tap-stage]');
    const button = $('[data-tap-star]');
    if (!stage || !button) return null;

    const rect = knownRect || button.getBoundingClientRect();
    stage.classList.remove('is-tapped-1', 'is-tapped-2');
    if (level === 1) stage.classList.add('is-tapped-1');
    if (level === 2) stage.classList.add('is-tapped-2');

    const particleCount = level === 1 ? 5 : level === 2 ? 6 : 7;
    const strength = level === 1 ? .82 : level === 2 ? 1.03 : 1.2;
    createTapParticles(rect, particleCount, strength, level === 3);
    createShockwave(rect, level);
    return rect;
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function waitForVisualEnd(element, eventName, timeout) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        element?.removeEventListener(eventName, onEnd);
        window.clearTimeout(fallback);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === element) finish();
      };
      const fallback = window.setTimeout(finish, timeout);
      element?.addEventListener(eventName, onEnd);
      if (!element) finish();
    });
  }

  function createTransitionGhost(layer, sourceRect) {
    const ghost = document.createElement('img');
    ghost.src = './tgstar.webp';
    ghost.alt = '';
    ghost.className = 'transition-star-ghost';
    ghost.style.setProperty('--ghost-w', `${sourceRect.width}px`);
    ghost.style.setProperty('--ghost-h', `${sourceRect.height}px`);
    ghost.style.setProperty('--from-x', `${sourceRect.left}px`);
    ghost.style.setProperty('--from-y', `${sourceRect.top}px`);
    layer.appendChild(ghost);
    return ghost;
  }

  function revealProjectsReduced() {
    isRevealed = true;
    document.body.classList.remove('is-transitioning');
    document.body.classList.add('is-revealed');
    $('[data-tap-stage]')?.classList.remove('is-final-burst');
  }

  async function runFinalTransformation() {
    if (isTransforming || isRevealed) return;
    isTransforming = true;

    const stage = $('[data-tap-stage]');
    const button = $('[data-tap-star]');
    const layer = $('[data-transition-layer]');
    const target = $('[data-transition-target]');
    const handoffAnchor = $('[data-transition-cta]');

    if (!stage || !button || !layer || !target || !handoffAnchor) {
      revealProjectsReduced();
      isTransforming = false;
      return;
    }

    const sourceRect = button.getBoundingClientRect();
    updateInstruction('Готово');
    stage.classList.add('is-final-burst');
    document.body.classList.add('is-transitioning');
    playTapFeedback(3, sourceRect);

    if (reduceMotion.matches) {
      await nextFrame();
      revealProjectsReduced();
      isTransforming = false;
      return;
    }

    layer.classList.add('is-active');
    const ghost = createTransitionGhost(layer, sourceRect);

    await nextFrame();

    const targetRect = target.getBoundingClientRect();
    const targetScale = Math.max(.05, targetRect.width / sourceRect.width);
    ghost.style.setProperty('--to-x', `${targetRect.left}px`);
    ghost.style.setProperty('--to-y', `${targetRect.top}px`);
    ghost.style.setProperty('--to-scale', targetScale.toFixed(4));

    layer.classList.add('is-running');

    await waitForVisualEnd(handoffAnchor, 'animationend', 1040);

    isRevealed = true;
    document.body.classList.add('is-revealed');
    await nextFrame();
    layer.classList.add('is-handoff');

    await waitForVisualEnd(layer, 'transitionend', 260);

    ghost.remove();
    layer.classList.remove('is-active', 'is-running', 'is-handoff');
    stage.classList.remove('is-final-burst');
    document.body.classList.remove('is-transitioning');
    isTransforming = false;
  }

  function handleStarTap() {
    if (isTransforming || isRevealed || tapCount >= 3) return;
    tapCount += 1;
    updateTapProgress();

    if (tapCount === 1) {
      playTapFeedback(1);
      updateInstruction('Да! Ещё раз', 'Ещё');
      return;
    }

    if (tapCount === 2) {
      playTapFeedback(2);
      updateInstruction('Последний тап', 'тап');
      return;
    }

    runFinalTransformation().catch(() => {
      revealProjectsReduced();
      isTransforming = false;
    });
  }

  function initTapMechanic() {
    const star = $('[data-tap-star]');
    if (!star) return;
    star.addEventListener('click', handleStarTap);
  }

  function initRipple() {
    $$('.project-cta').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        if (reduceMotion.matches) return;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.45;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      }, { passive: true });
    });
  }

  function initCardVisibility() {
    const cards = $$('[data-project-card]');
    if (!cards.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => {
        card.classList.remove('is-offscreen');
        if (card.hasAttribute('data-reveal-card')) card.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
        if (entry.isIntersecting && entry.target.hasAttribute('data-reveal-card')) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: .08, rootMargin: '80px 0px 80px 0px' });

    cards.forEach((card) => observer.observe(card));
  }

  function init() {
    initAssetFallbacks();
    bindProjectLinks();
    initLoader();
    prepareCriticalProjectImage();
    initTapMechanic();
    initRipple();
    initCardVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
