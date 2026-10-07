// Behaviour shared by every page: header, mobile menu and scroll reveals.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ header
// The header hides while scrolling down and returns when scrolling up.
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  let lastY = window.scrollY;
  let queued = false;
  const update = () => {
    const y = window.scrollY;
    const menuOpen = document.documentElement.classList.contains('menu-open');
    header.classList.toggle('is-scrolled', y > 4);
    const hide = y > lastY && y > header.offsetHeight * 2 && !menuOpen && !header.contains(document.activeElement);
    header.classList.toggle('is-hidden', hide);
    lastY = y;
    queued = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

// ------------------------------------------------------------- mobile menu
const menu = document.querySelector<HTMLElement>('[data-menu]');
const openButton = document.querySelector<HTMLButtonElement>('[data-menu-open]');
const closeButton = document.querySelector<HTMLButtonElement>('[data-menu-close]');

const setMenu = (open: boolean) => {
  if (!menu || !openButton) return;
  menu.classList.toggle('is-open', open);
  openButton.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  (open ? closeButton : openButton)?.focus();
};

openButton?.addEventListener('click', () => setMenu(true));
closeButton?.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.classList.contains('is-open')) setMenu(false);
});
window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
  if (event.matches && menu?.classList.contains('is-open')) setMenu(false);
});
// Keep keyboard focus inside the open menu.
menu?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [...menu.querySelectorAll<HTMLElement>('a[href], button')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// ------------------------------------------------------------- reveals
const revealed = document.querySelectorAll<HTMLElement>('.reveal');
if (!reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
  );
  revealed.forEach((element) => observer.observe(element));
} else {
  revealed.forEach((element) => element.classList.add('is-visible'));
}
