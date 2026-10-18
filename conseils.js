import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(Flip, ScrollTrigger);

const filters = document.querySelectorAll(".filter");
const articles = document.querySelectorAll(".article");

// Category filters, animated with Flip
filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((b) => b.classList.toggle("active", b === button));
    const category = button.dataset.filter;
    const state = Flip.getState(articles);

    articles.forEach((article) => {
      const visible = category === "all" || article.dataset.cat === category;
      article.classList.toggle("hidden", !visible);
    });

    Flip.from(state, {
      duration: 0.6,
      ease: "power3.inOut",
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.5 },
        ),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
});

// Article accordions
document.querySelectorAll(".article").forEach((article) => {
  const toggle = article.querySelector(".toggle");
  const body = article.querySelector(".article-body");

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "Fermer −" : "Lire +";
    gsap.to(body, {
      height: open ? "auto" : 0,
      duration: 0.5,
      ease: "power3.inOut",
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
});
