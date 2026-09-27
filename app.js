(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

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
      void card.offsetWidth;
      card.classList.add('is-invalid');
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
    const minimum = reduceMotion.matches ? 120 : 960;
    const maximum = reduceMotion.matches ? 220 : 1380;
    const startedAt = performance.now();
    let done = false;

    const reveal = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, minimum - (performance.now() - startedAt));
      window.setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        window.setTimeout(() => {
          loader?.setAttribute('aria-hidden', 'true');
        }, reduceMotion.matches ? 140 : 620);
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
  }

  function updateInstruction(text, highlightWord = '') {
    const el = $('[data-tap-instruction]');
    if (!el) return;
    el.classList.add('is-changing');
    window.setTimeout(() => {
      if (highlightWord && text.includes(highlightWord)) {
        const [before, after] = text.split(highlightWord);
        el.replaceChildren(
          document.createTextNode(before),
          Object.assign(document.createElement('span'), { textContent: highlightWord }),
          document.createTextNode(after || '')
        );
      } else {
        el.textContent = text;
      }
      el.classList.remove('is-changing');
    }, reduceMotion.matches ? 0 : 150);
  }

  function updateTapProgress() {
    const progress = $('[data-tap-progress]');
    if (!progress) return;
    $$('i', progress).forEach((item, index) => item.classList.toggle('is-active', index < tapCount));
    progress.setAttribute('aria-label', `Прогресс: ${tapCount} из 3`);
  }

  function createShockwave(rect, strength = 1) {
    if (reduceMotion.matches) return;
    const wave = document.createElement('i');
    wave.className = 'tap-shockwave';
    const size = Math.min(390, Math.max(rect.width, rect.height) * (1.25 + strength * .18));
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left = `${rect.left + rect.width / 2}px`;
    wave.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  }

  function createTapParticles(rect, count, strength) {
    if (reduceMotion.matches || isRevealed) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - .5) * .32;
      const distance = (48 + Math.random() * 42) * strength;
      const particle = document.createElement('i');
      const useStar = i % 4 === 0;
      particle.className = `tap-burst-particle${useStar ? ' is-star' : ''}`;
      particle.style.setProperty('--sx', `${cx}px`);
      particle.style.setProperty('--sy', `${cy}px`);
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--rot', `${(Math.random() > .5 ? 1 : -1) * (40 + Math.random() * 90)}deg`);
      particle.style.setProperty('--size', `${useStar ? 10 + Math.random() * 5 : 4 + Math.random() * 4}px`);
      particle.style.setProperty('--life', `${470 + Math.random() * 160}ms`);
      if (useStar) {
        const image = document.createElement('img');
        image.src = './tgstar.webp';
        image.alt = '';
        particle.appendChild(image);
      }
      fragment.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }

    document.body.appendChild(fragment);
  }

  function playTapFeedback(level) {
    const stage = $('[data-tap-stage]');
    const button = $('[data-tap-star]');
    if (!stage || !button) return;
    const rect = button.getBoundingClientRect();

    stage.classList.remove('is-tapped-1', 'is-tapped-2');
    void stage.offsetWidth;
    if (level < 3) stage.classList.add(`is-tapped-${level}`);

    createTapParticles(rect, level === 1 ? 7 : 9, level === 1 ? .9 : 1.15);
    createShockwave(rect, level);
  }

  function makeMorphGhost(sourceRect) {
    const ghost = document.createElement('img');
    ghost.src = './tgstar.webp';
    ghost.alt = '';
    ghost.className = 'morph-ghost';
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;
    ghost.style.transform = `translate3d(${sourceRect.left}px,${sourceRect.top}px,0)`;
    document.body.appendChild(ghost);
    return ghost;
  }

  function revealProjectsReduced() {
    document.body.classList.add('is-transforming', 'is-revealed');
    isRevealed = true;
    window.setTimeout(() => document.body.classList.remove('is-transforming'), 30);
  }

  function runFinalTransformation() {
    if (isTransforming || isRevealed) return;
    isTransforming = true;

    const stage = $('[data-tap-stage]');
    const button = $('[data-tap-star]');
    const target = $('[data-morph-target]');
    if (!stage || !button || !target) {
      revealProjectsReduced();
      isTransforming = false;
      return;
    }

    updateInstruction('Готово');
    stage.classList.add('is-final-burst');
    document.body.classList.add('is-transforming', 'is-morph-flash');

    const sourceRect = button.getBoundingClientRect();
    playTapFeedback(3);
    createTapParticles(sourceRect, 12, 1.38);
    createShockwave(sourceRect, 3);

    if (reduceMotion.matches) {
      revealProjectsReduced();
      isTransforming = false;
      return;
    }

    const ghost = makeMorphGhost(sourceRect);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetRect = target.getBoundingClientRect();
        const sx = targetRect.width / sourceRect.width;
        const sy = targetRect.height / sourceRect.height;
        const dx = targetRect.left - sourceRect.left;
        const dy = targetRect.top - sourceRect.top;
        ghost.classList.add('is-moving');
        ghost.style.transform = `translate3d(${sourceRect.left + dx}px,${sourceRect.top + dy}px,0) scale(${sx},${sy}) rotate(12deg)`;
        ghost.style.opacity = '.12';
      });
    });

    window.setTimeout(() => {
      document.body.classList.add('is-revealed');
      document.body.classList.remove('is-morph-flash');
      isRevealed = true;
    }, 540);

    window.setTimeout(() => {
      ghost.remove();
      stage.classList.remove('is-final-burst');
      document.body.classList.remove('is-transforming');
      isTransforming = false;
    }, 980);
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

    runFinalTransformation();
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
        const size = Math.max(rect.width, rect.height) * 1.55;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      });
    });
  }

  function initCardReveal() {
    const cards = $$('[data-reveal-card]');
    if (!cards.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => card.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: .16, rootMargin: '0px 0px -6% 0px' });

    cards.forEach((card) => observer.observe(card));
  }

  function initCardPointerEffects() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('[data-project-card]').forEach((card) => {
      let raf = 0;
      let lastEvent = null;

      const render = () => {
        raf = 0;
        if (!lastEvent) return;
        const rect = card.getBoundingClientRect();
        const x = lastEvent.clientX - rect.left;
        const y = lastEvent.clientY - rect.top;
        const nx = (x / rect.width - .5) * 2;
        const ny = (y / rect.height - .5) * 2;
        card.style.setProperty('--glow-x', `${x}px`);
        card.style.setProperty('--glow-y', `${y}px`);
        card.style.transform = `translateY(-3px) rotateX(${(-ny * 1.7).toFixed(2)}deg) rotateY(${(nx * 2.5).toFixed(2)}deg)`;
      };

      card.addEventListener('pointermove', (event) => {
        lastEvent = event;
        if (!raf) raf = window.requestAnimationFrame(render);
      });
      card.addEventListener('pointerleave', () => {
        lastEvent = null;
        card.style.removeProperty('transform');
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '20%');
      });
    });
  }

  function initMagneticButtons() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('.project-cta').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
        button.style.transform = `translate3d(${(x * 4).toFixed(2)}px,${(y * 2.5).toFixed(2)}px,0)`;
      });
      button.addEventListener('pointerleave', () => button.style.removeProperty('transform'));
    });
  }

  function initPointerGlow() {
    if (!finePointer.matches || reduceMotion.matches) return;
    let raf = 0;
    let x = innerWidth / 2;
    let y = innerHeight / 3;
    window.addEventListener('pointermove', (event) => {
      x = event.clientX;
      y = event.clientY;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty('--pointer-x', `${x}px`);
        document.documentElement.style.setProperty('--pointer-y', `${y}px`);
      });
    }, { passive: true });
  }

  function init() {
    initAssetFallbacks();
    bindProjectLinks();
    initLoader();
    initTapMechanic();
    initRipple();
    initCardReveal();
    initCardPointerEffects();
    initMagneticButtons();
    initPointerGlow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
