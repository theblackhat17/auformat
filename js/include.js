// === Injection des partials (header, footer, etc.) ===
(async function includePartials() {
  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all(Array.from(nodes).map(async (el) => {
    const url = el.getAttribute('data-include');
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();
      el.insertAdjacentHTML('afterend', html);
      el.remove();
    } catch (e) {
      console.error('Include error for', url, e);
      el.replaceWith(`<!-- include failed: ${url} -->`);
    }
  }));

  // ✅ Déclenche un événement quand tous les includes sont terminés
  document.dispatchEvent(new Event('includes:ready'));
})();


// === Mise à jour automatique de l'année ===
(function () {
  function updateYear() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('[data-year]').forEach(el => {
      el.textContent = currentYear;
    });
  }
  document.addEventListener('includes:ready', updateYear);
})();
