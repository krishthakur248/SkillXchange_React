import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

/**
 * useAnimeStagger — staggered entrance animation for child elements.
 * @param {string} selector - CSS selector for children inside the ref element
 * @param {object} opts - anime options (excluding targets/delay)
 */
export function useAnimeStagger(selector, opts = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const targets = ref.current.querySelectorAll(selector);
    if (!targets.length) return;

    const anim = animate(targets, {
      opacity: [0, 1],
      translateY: [32, 0],
      duration: 600,
      ease: 'outCubic',
      delay: stagger(80, { start: 100 }),
      ...opts,
    });

    return () => {
      if (anim && typeof anim.pause === 'function') anim.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

/**
 * useScrollReveal — observes elements with class .reveal and fades them in on scroll.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target, {
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 700,
            ease: 'outCubic',
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    elements.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

/**
 * animateProgressRing — animates SVG stroke-dashoffset to represent a percentage.
 */
export function animateProgressRing(circleEl, percent, circumference = 251.2) {
  if (!circleEl) return;
  const offset = circumference - (percent / 100) * circumference;
  animate(circleEl, {
    strokeDashoffset: [circumference, offset],
    duration: 1500,
    ease: 'inOutCubic',
    delay: 400,
  });
}
