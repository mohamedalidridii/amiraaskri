// TODO: remplacer par l'adresse e-mail du cabinet
const EMAIL = "contact@exemple.tn";

const form = document.querySelector("#rdv-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const subject = `Demande de rendez-vous — ${data.get("motif")}`;
  const body = [
    `Nom : ${data.get("nom")}`,
    `Téléphone : ${data.get("tel")}`,
    `Motif : ${data.get("motif")}`,
    "",
    data.get("message"),
  ].join("\n");

  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
