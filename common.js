import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

export const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const nav = document.querySelector(".nav");
const overlay = document.querySelector(".page-transition");
const menu = document.querySelector(".menu");
const burger = document.querySelector(".burger");

// Active link
const page = document.body.dataset.page;
document
  .querySelectorAll(`[data-nav="${page}"]`)
  .forEach((link) => link.classList.add("active"));

// Mobile menu, built from the navbar links
document.querySelectorAll(".nav-links a").forEach((link) => {
  menu.appendChild(link.cloneNode(true));
});

let menuOpen = false;

const menuTl = gsap
  .timeline({ paused: true })
  .to(menu, {
    clipPath: "inset(0% 0% 0% 0%)",
    duration: 0.7,
    ease: "power4.inOut",
  })
  .from(
    ".menu a",
    {
      yPercent: 100,
      opacity: 0,
      stagger: 0.06,
      duration: 0.5,
      ease: "power3.out",
    },
    "-=0.25",
  );

function toggleMenu(open) {
  menuOpen = open;
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
  menu.setAttribute("aria-hidden", !open);
  if (open) {
    lenis.stop();
    menuTl.timeScale(1).play();
  } else {
    lenis.start();
    menuTl.timeScale(1.5).reverse();
  }
}

burger.addEventListener("click", () => toggleMenu(!menuOpen));

// Navbar: solid background after 50px, hides when scrolling down
let navHidden = false;

lenis.on("scroll", ({ scroll, direction }) => {
  nav.classList.toggle("scrolled", scroll > 50);
  const hide = direction === 1 && scroll > 200 && !menuOpen;
  if (hide !== navHidden) {
    navHidden = hide;
    gsap.to(nav, {
      yPercent: hide ? -110 : 0,
      duration: 0.5,
      ease: "power3.out",
    });
  }
});

// Page transitions
document.querySelectorAll('a[href^="/"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || link.target === "_blank")
      return;
    e.preventDefault();
    const href = link.getAttribute("href");
    try {
      sessionStorage.setItem("internal-nav", "1");
    } catch {}
    if (menuOpen) toggleMenu(false);
    if (reduceMotion) {
      location.href = href;
      return;
    }
    gsap.fromTo(
      overlay,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 0.7,
        ease: "power4.inOut",
        onComplete: () => (location.href = href),
      },
    );
  });
});

window.addEventListener("pageshow", (e) => {
  if (e.persisted) gsap.set(overlay, { yPercent: -100 });
});

// Preloader on every full load, skipped when arriving from an internal link.
// With reduced motion it still shows, as a simple fade.
let showPreloader = true;
try {
  if (sessionStorage.getItem("internal-nav")) showPreloader = false;
  sessionStorage.removeItem("internal-nav");
} catch {}

const preloader = showPreloader ? createPreloader() : null;

function createPreloader() {
  const el = document.createElement("div");
  el.className = "preloader";
  el.innerHTML = `
    <div class="preloader-inner">
      <p class="preloader-signature">Amira</p>
      <p class="preloader-sub">Diététicienne · Nutritionniste</p>
      <p class="preloader-ar ar" lang="ar">صحتك في صحنك</p>
      <div class="preloader-line"><span></span></div>
      <p class="preloader-count">0</p>
    </div>`;
  document.body.appendChild(el);
  gsap.set(overlay, { yPercent: -100 });
  lenis.stop();
  return el;
}

const pageLoaded = Promise.race([
  new Promise((resolve) =>
    document.readyState === "complete"
      ? resolve()
      : window.addEventListener("load", resolve, { once: true }),
  ),
  new Promise((resolve) => setTimeout(resolve, 5000)),
]);

function playPreloader() {
  const count = preloader.querySelector(".preloader-count");
  const line = preloader.querySelector(".preloader-line span");
  const progress = { value: 0 };

  const tl = gsap.timeline();
  if (reduceMotion) {
    tl.fromTo(
      ".preloader-signature",
      { clipPath: "inset(0% 0% 0% 0%)", opacity: 0 },
      { opacity: 1, duration: 0.8 },
    );
  } else {
    tl.fromTo(
      ".preloader-signature",
      { clipPath: "inset(0% 100% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "power2.inOut" },
    );
  }
  tl.from(
    ".preloader-sub, .preloader-ar",
    { opacity: 0, y: 12, stagger: 0.15, duration: 0.8, ease: "power3.out" },
    "-=0.9",
  ).to(
    progress,
    {
      value: 100,
      duration: 2.4,
      ease: "power2.inOut",
      onUpdate: () => {
        count.textContent = Math.round(progress.value);
        gsap.set(line, { scaleX: progress.value / 100 });
      },
    },
    0,
  );

  const done = new Promise((resolve) =>
    tl.eventCallback("onComplete", resolve),
  );
  return Promise.all([done, pageLoaded]);
}

// Waits for fonts (max 1.5s) so SplitText measures the right glyphs
const fontsReady = Promise.race([
  document.fonts.ready,
  new Promise((resolve) => setTimeout(resolve, 1500)),
]);

// Resolves when the page intro starts (after the preloader, if any)
export const introStarted = fontsReady.then(() => preloader && playPreloader());

introStarted.then(() => {
  if (reduceMotion) {
    gsap.set(overlay, { yPercent: -100 });
    if (preloader) {
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          preloader.remove();
          lenis.start();
        },
      });
    }
    return;
  }

  const intro = gsap.timeline();
  if (preloader) {
    intro
      .to(".preloader-inner", {
        opacity: 0,
        y: -30,
        duration: 0.6,
        ease: "power2.in",
      })
      .to(preloader, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 1.1,
        ease: "power4.inOut",
        onComplete: () => {
          preloader.remove();
          lenis.start();
        },
      });
  } else {
    intro.to(overlay, {
      yPercent: -100,
      duration: 0.9,
      ease: "power4.inOut",
    });
  }
  intro.from(
    nav,
    { yPercent: -110, duration: 0.7, ease: "power3.out" },
    "-=0.35",
  );

  document.querySelectorAll('[data-split="load"]').forEach((el) => {
    const split = SplitText.create(el, { type: "words", mask: "words" });
    intro.from(
      split.words,
      { yPercent: 110, duration: 1, stagger: 0.04, ease: "power4.out" },
      "-=0.6",
    );
  });

  intro.from(
    "[data-intro]",
    { opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: "power3.out" },
    "-=0.7",
  );

  // Headings revealed on scroll
  document.querySelectorAll('[data-split="scroll"]').forEach((el) => {
    const split = SplitText.create(el, { type: "words", mask: "words" });
    gsap.from(split.words, {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.04,
      ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });

  // Fade-up reveals in batches
  gsap.set("[data-reveal]", { opacity: 0, y: 60 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
      }),
  });

  // Counters
  document.querySelectorAll("[data-count]").forEach((el) => {
    const counter = { value: 0 };
    el.textContent = "0";
    gsap.to(counter, {
      value: Number(el.dataset.count),
      duration: 2.2,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () =>
        (el.textContent = Math.round(counter.value).toLocaleString("fr-FR")),
    });
  });

  // Parallax images. The image is 120% of its frame, so ±8% of its own
  // height is the most it can move without leaving a gap. Portraits only
  // move downwards so her face is never pushed out of the top of the frame.
  document.querySelectorAll("[data-parallax]").forEach((img) => {
    const isFace = img.classList.contains("face");
    gsap.fromTo(
      img,
      { yPercent: isFace ? 0 : -8 },
      {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: img.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });

  // Marquees
  document.querySelectorAll(".marquee-track").forEach((track) => {
    gsap.to(track, { xPercent: -50, duration: 45, ease: "none", repeat: -1 });
  });
});
