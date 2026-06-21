// Snapfix landing page — waitlist form
(function () {
  const form = document.getElementById('waitlistForm');
  const input = document.getElementById('waitlistEmail');
  const btn = document.getElementById('waitlistBtn');
  const msg = document.getElementById('waitlistMsg');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = 'waitlist-msg' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();

    if (!EMAIL_RE.test(email)) {
      input.classList.add('invalid');
      setMsg('Please enter a valid email address.', 'err');
      input.focus();
      return;
    }
    input.classList.remove('invalid');

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Joining…';
    setMsg('', '');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg(data.duplicate ? "You're already on the list — see you soon! 🎉" : "You're on the list! We'll be in touch. 🎉", 'ok');
        form.reset();
      } else if (res.status === 429) {
        setMsg('Whoa, slow down a sec and try again.', 'err');
      } else {
        setMsg(data.error || 'Something went wrong. Please try again.', 'err');
      }
    } catch (err) {
      setMsg('Network error — check your connection and try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  input.addEventListener('input', () => input.classList.remove('invalid'));

  // "Join the waitlist" bottom CTA scrolls back to the form
  document.querySelectorAll('[data-scroll-top]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => input.focus(), 400);
    });
  });
})();
