(() => {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-grid">
      <section class="footer-brand"><a class="footer-logo" href="/" aria-label="EditMaster home"><span class="brand-glyph">E</span><span>EditMaster</span></a><p>EditMaster helps creators learn video editing through practical, step-by-step lessons. Build confidence with the tools you use to bring your stories to life.</p><div class="footer-socials" aria-label="Social media"><a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noopener noreferrer">f</a><a href="https://x.com/" aria-label="X" target="_blank" rel="noopener noreferrer">𝕏</a><a href="https://www.linkedin.com/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">in</a><a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noopener noreferrer">◎</a></div></section>
      <section><h2>Quick Links</h2><nav class="footer-links"><a href="/">Home</a><a href="/index.html#about">About Us</a><a href="/index.html#software">Services</a><a href="/careers.html">Careers</a><a href="/blog.html">Blog</a></nav></section>
      <section><h2>Contact &amp; Support</h2><nav class="footer-links"><a href="/help.html#faqs">FAQs</a><a href="/help.html#support">Support Center</a><a href="mailto:info@company.com">info@company.com</a><a href="tel:+1234567890">+1 234 567 890</a></nav></section>
      <section class="footer-newsletter"><h2>Stay Updated</h2><p>Get occasional editing tips, course updates, and creator inspiration.</p><form class="newsletter-form"><label class="sr-only" for="footer-email">Email address</label><input id="footer-email" name="email" type="email" placeholder="Your email address" autocomplete="email" required><button type="submit">Subscribe</button></form><p class="newsletter-message" role="status" aria-live="polite"></p></section>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} EditMaster. All rights reserved.</span><nav><a href="/privacy-policy.html">Privacy Policy</a><a href="/terms-of-service.html">Terms of Service</a></nav></div>`;
  document.querySelectorAll('footer').forEach(item => item.remove());
  document.body.append(footer);
  footer.querySelector('.newsletter-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('button'), message = footer.querySelector('.newsletter-message');
    button.disabled = true; message.textContent = 'Adding you to the list…';
    try {
      const response = await window.editMasterFetch('/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email.value }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Please try again.');
      message.textContent = 'Thanks — you’re on the EditMaster updates list.'; form.reset();
    } catch (error) { message.textContent = error.message === 'Failed to fetch' ? 'Start the site with npm start to subscribe.' : error.message; }
    finally { button.disabled = false; }
  });
})();
