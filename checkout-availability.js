(() => {
  window.pulseCheckoutAvailable = fetch('/api/secure-checkout', { cache: 'no-store' })
    .then(async response => response.ok && (await response.json()).available === true)
    .catch(() => false);

  window.pulseCheckoutAvailable.then(available => {
    if (!available) return;
    document.querySelectorAll('[data-pulse-checkout-ready]').forEach(element => { element.hidden = false; });
    document.querySelectorAll('[data-pulse-checkout-pending]').forEach(element => { element.hidden = true; });
  });
})();
