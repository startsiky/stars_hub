(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let toastTimer = 0;

  function isValidTelegramUrl(value) {
    if (typeof value !== 'string') return false;
    const url = value.trim();
    if (!url || url.includes('...')) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && (parsed.hostname === 't.me' || parsed.hostname.endsWith('.t.me')) && parsed.pathname.length > 1;
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
    const links = window.PROJECT_LINKS || {};
    const url = links[projectKey];
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
    const minimum = reduceMotion.matches ? 120 : 980;
    const maximum = reduceMotion.matches ? 260 : 1400;
    const started = performance.now();
    let finished = false;

    const reveal = () => {
      if (finished) return;
      finished = true;
      const elapsed = performance.now() - started;
      const wait = Math.max(0, minimum - elapsed);
      window.setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        $$('[data-star-image]').forEach((img) => {
          img.addEventListener('error', () => img.hidden = true, { once: true });
          if (img.complete && img.naturalWidth === 0) img.hidden = true;
        });
        window.setTimeout(() => loader?.setAttribute('aria-hidden', 'true'), 560);
      }, wait);
    };

    const maxTimer = window.setTimeout(reveal, maximum);
    window.addEventListener('load', () => {
      window.clearTimeout(maxTimer);
      reveal();
    }, { once: true });

    if (document.readyState === 'complete') {
      window.clearTimeout(maxTimer);
      reveal();
    }
  }

  function initIntroReveal() {
    const run = () => $$('.reveal--intro').forEach((el) => el.classList.add('is-visible'));
    if (document.body.classList.contains('is-ready')) run();
    else window.setTimeout(run, reduceMotion.matches ? 0 : 1040);
  }

  function initIntersectionReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => observer.observe(el));
  }

  function initRipple() {
    $$('.cta').forEach((button) => {
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

  function initScrollProgress() {
    const bar = $('.scroll-progress span');
    const header = $('[data-header]');
    if (!bar && !header) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
      header?.classList.toggle('is-scrolled', y > 12);
    };
    const request = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    update();
  }

  function initQuickChoice() {
    $$('[data-scroll-project]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = document.querySelector(`[data-project-card="${button.dataset.scrollProject}"]`);
        card?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      });
    });
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
        card.style.transform = `translateY(-4px) rotateX(${(-ny * 2.2).toFixed(2)}deg) rotateY(${(nx * 3.2).toFixed(2)}deg)`;
      };
      card.addEventListener('pointermove', (event) => {
        lastEvent = event;
        if (!raf) raf = requestAnimationFrame(render);
      });
      card.addEventListener('pointerleave', () => {
        lastEvent = null;
        card.style.removeProperty('transform');
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
      });
    });
  }

  function initMagneticButtons() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('.cta').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
        button.style.transform = `translate3d(${(x * 5).toFixed(2)}px, ${(y * 3).toFixed(2)}px, 0)`;
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
      x = event.clientX; y = event.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty('--pointer-x', `${x}px`);
        document.documentElement.style.setProperty('--pointer-y', `${y}px`);
      });
    }, { passive: true });
  }

  function initHeroEasterEgg() {
    const trigger = $('[data-hero-star]');
    if (!trigger) return;
    let locked = false;
    const vectors = [[-48,-28],[-22,-52],[28,-50],[50,-20],[-50,24],[-16,52],[26,48],[52,18]];
    trigger.addEventListener('click', () => {
      if (locked || reduceMotion.matches) return;
      locked = true;
      trigger.classList.add('is-bursting');
      vectors.slice(0, 6).forEach(([dx,dy], index) => {
        const spark = document.createElement('i');
        spark.className = 'hero-spark';
        spark.style.setProperty('--dx', `${dx}px`);
        spark.style.setProperty('--dy', `${dy}px`);
        spark.style.animationDelay = `${index * 24}ms`;
        trigger.appendChild(spark);
        spark.addEventListener('animationend', () => spark.remove(), { once: true });
      });
      window.setTimeout(() => {
        trigger.classList.remove('is-bursting');
        locked = false;
      }, 720);
    });
  }

  function initStarFallbacks() {
    $$('[data-star-image]').forEach((img) => {
      const hide = () => { img.hidden = true; };
      img.addEventListener('error', hide, { once: true });
      if (img.complete && img.naturalWidth === 0) hide();
    });
  }

  function init() {
    initStarFallbacks();
    bindProjectLinks();
    initLoader();
    initIntroReveal();
    initIntersectionReveal();
    initRipple();
    initScrollProgress();
    initQuickChoice();
    initCardPointerEffects();
    initMagneticButtons();
    initPointerGlow();
    initHeroEasterEgg();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
