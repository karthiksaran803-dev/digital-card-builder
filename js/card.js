/**
 * Cardify - Digital Business Card Public Viewer
 * Renders card from compressed URL parameter
 * Zero dependencies, Vanilla JavaScript
 */

(function () {
  'use strict';

  // --- Elements Cache ---
  const elements = {
    cardTarget: document.getElementById('cardTarget'),
    publicShareBtn: document.getElementById('publicShareBtn'),
    publicQrBtn: document.getElementById('publicQrBtn'),
    publicPdfBtn: document.getElementById('publicPdfBtn'),
    qrModal: document.getElementById('qrModal'),
    closeQrModalBtn: document.getElementById('closeQrModalBtn'),
    qrcodeTarget: document.getElementById('qrcodeTarget'),
    qrShareUrlInput: document.getElementById('qrShareUrlInput'),
    downloadQrBtn: document.getElementById('downloadQrBtn'),
    copyModalLinkBtn: document.getElementById('copyModalLinkBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  let cardData = null;

  // --- Utility Functions ---

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (/^(javascript|vbscript|data):/i.test(trimmed)) {
      return '#';
    }
    if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed) && !/^tel:/i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  }

  function formatSocialUrl(handleOrUrl, platform) {
    if (!handleOrUrl) return '';
    const trimmed = handleOrUrl.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const cleaned = trimmed.replace(/^[@/]+/, '');
    switch (platform) {
      case 'linkedin':
        return cleaned.startsWith('in/') ? `https://linkedin.com/${cleaned}` : `https://linkedin.com/in/${cleaned}`;
      case 'github':
        return `https://github.com/${cleaned}`;
      case 'twitter':
        return `https://x.com/${cleaned}`;
      default:
        return `https://${cleaned}`;
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function hexToRgb(hex) {
    if (!hex) return '37, 99, 235';
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return `${r}, ${g}, ${b}`;
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) || 37;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 99;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 235;
    return `${r}, ${g}, ${b}`;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' :
                 type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3600);
  }

  // --- Read & Decompress URL Data ---

  function parseCardDataFromUrl() {
    let compressed = null;

    // Check search query parameters (?d=... or ?data=...)
    const urlParams = new URLSearchParams(window.location.search);
    compressed = urlParams.get('d') || urlParams.get('data');

    // Fallback: check hash parameters (#d=... or #data=...)
    if (!compressed && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      compressed = hashParams.get('d') || hashParams.get('data');
    }

    if (!compressed) {
      return null;
    }

    try {
      if (typeof LZString === 'undefined') {
        console.error('LZString library not loaded.');
        return null;
      }
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (!decompressed) {
        return null;
      }
      return JSON.parse(decompressed);
    } catch (err) {
      console.error('Failed to decompress card data:', err);
      return null;
    }
  }

  // --- Render Error State ---

  function renderErrorState() {
    elements.cardTarget.innerHTML = `
      <div class="card-error-box">
        <div class="card-error-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 class="card-error-title">Card Not Found</h2>
        <p class="card-error-desc">
          This digital business card link appears to be invalid or incomplete.
          The link data might have been truncated during sharing.
        </p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> Create Your Own Card Free
        </a>
      </div>
    `;

    // Disable action buttons
    if (elements.publicShareBtn) elements.publicShareBtn.style.display = 'none';
    if (elements.publicQrBtn) elements.publicQrBtn.style.display = 'none';
    if (elements.publicPdfBtn) elements.publicPdfBtn.style.display = 'none';
  }

  // --- Render Valid Card ---

  function renderCard(data) {
    const displayName = escapeHtml(data.n || 'Professional');
    const displayTitle = escapeHtml(data.t || '');
    const displayBio = escapeHtml(data.b || '');
    const displayLocation = escapeHtml(data.l || '');
    const initials = getInitials(data.n);

    // Update document title
    document.title = `${data.n || 'Digital Card'} | Cardify`;

    // Avatar
    let avatarHtml = '';
    if (data.a) {
      avatarHtml = `<img src="${data.a}" alt="${displayName}">`;
    } else {
      avatarHtml = `<span class="card-avatar-initials">${initials}</span>`;
    }

    // Quick Connect Buttons
    let quickActionsHtml = '';
    const hasEmail = Boolean(data.e);
    const hasPhone = Boolean(data.p);
    if (hasEmail || hasPhone) {
      quickActionsHtml = `<div class="card-quick-actions">`;
      if (hasEmail) {
        quickActionsHtml += `
          <a href="mailto:${escapeHtml(data.e)}" class="card-action-btn primary" title="Send Email">
            <i class="fa-solid fa-envelope"></i> Email Me
          </a>`;
      }
      if (hasPhone) {
        quickActionsHtml += `
          <a href="tel:${escapeHtml(data.p)}" class="card-action-btn secondary" title="Call">
            <i class="fa-solid fa-phone"></i> Call
          </a>`;
      }
      quickActionsHtml += `</div>`;
    }

    // Social Links
    const socialLinks = [];
    if (data.w) {
      socialLinks.push({ url: sanitizeUrl(data.w), icon: 'fa-globe', label: 'Website' });
    }
    if (data.li) {
      socialLinks.push({ url: formatSocialUrl(data.li, 'linkedin'), icon: 'fa-brands fa-linkedin', label: 'LinkedIn' });
    }
    if (data.gh) {
      socialLinks.push({ url: formatSocialUrl(data.gh, 'github'), icon: 'fa-brands fa-github', label: 'GitHub' });
    }
    if (data.tw) {
      socialLinks.push({ url: formatSocialUrl(data.tw, 'twitter'), icon: 'fa-brands fa-x-twitter', label: 'Twitter' });
    }

    let socialChipsHtml = '';
    if (socialLinks.length > 0) {
      socialChipsHtml = `
        <div class="card-links-grid">
          ${socialLinks.map(link => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="card-social-chip">
              <i class="${escapeHtml(link.icon)}"></i>
              <span>${escapeHtml(link.label)}</span>
            </a>
          `).join('')}
        </div>
      `;
    }

    // Skills
    let skillsHtml = '';
    if (data.s && Array.isArray(data.s) && data.s.length > 0) {
      skillsHtml = `
        <div class="card-skills-section">
          <span class="card-section-label"><i class="fa-solid fa-code"></i> Skills</span>
          <div class="card-skills-list">
            ${data.s.map(skill => `<span class="card-skill-pill">${escapeHtml(skill)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Projects
    let projectsHtml = '';
    if (data.pr && Array.isArray(data.pr) && data.pr.length > 0) {
      projectsHtml = `
        <div class="card-projects-section">
          <span class="card-section-label"><i class="fa-solid fa-rocket"></i> Featured Projects</span>
          ${data.pr.map(proj => {
            const hasLink = Boolean(proj.u && proj.u.trim());
            const tag = hasLink ? 'a' : 'div';
            const hrefAttr = hasLink ? `href="${escapeHtml(sanitizeUrl(proj.u))}" target="_blank" rel="noopener noreferrer"` : '';
            return `
              <${tag} ${hrefAttr} class="card-project-item">
                <div class="card-project-header">
                  <span class="card-project-title">
                    <i class="fa-solid fa-folder-open"></i> ${escapeHtml(proj.t)}
                  </span>
                  ${hasLink ? `<i class="fa-solid fa-arrow-up-right-from-square card-project-link-icon"></i>` : ''}
                </div>
                ${proj.d ? `<p class="card-project-desc">${escapeHtml(proj.d)}</p>` : ''}
              </${tag}>
            `;
          }).join('')}
        </div>
      `;
    }

    const theme = data.th || 'modern-light';
    const accentColor = data.c || '#2563eb';

    const cardMarkup = `
      <div class="digital-card theme-${escapeHtml(theme)}" id="renderedCard" style="--card-accent: ${escapeHtml(accentColor)}; --accent-rgb: ${hexToRgb(accentColor)};">
        <div class="card-banner"></div>
        <div class="card-content">
          
          <div class="card-avatar-wrapper">
            <div class="card-avatar">
              ${avatarHtml}
            </div>
            <span class="card-badge">
              <i class="fa-solid fa-circle-check"></i> Verified
            </span>
          </div>

          <div class="card-identity">
            <h1 class="card-name">${displayName}</h1>
            ${displayTitle ? `<div class="card-title">${displayTitle}</div>` : ''}
            ${displayLocation ? `
              <div class="card-location">
                <i class="fa-solid fa-location-dot"></i>
                <span>${displayLocation}</span>
              </div>` : ''}
          </div>

          ${displayBio ? `<p class="card-bio">${displayBio}</p>` : ''}

          ${quickActionsHtml}
          ${socialChipsHtml}
          ${(quickActionsHtml || socialChipsHtml) && (skillsHtml || projectsHtml) ? `<div class="card-divider"></div>` : ''}
          ${skillsHtml}
          ${projectsHtml}

          <div class="card-footer">
            <span>Digital Business Card &bull; Powered by <a href="index.html" style="font-weight: 600;">Cardify</a></span>
          </div>

        </div>
      </div>
    `;

    elements.cardTarget.innerHTML = cardMarkup;
  }

  // --- Sharing & Actions ---

  async function shareCardLink() {
    const currentUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          text: `Check out ${cardData.n || 'this'}'s digital business card`,
          url: currentUrl
        });
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentUrl);
        showToast('Card URL copied to clipboard!', 'success');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        showToast('Card URL copied to clipboard!', 'success');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        window.prompt('Copy card URL:', currentUrl);
      }
    }
  }

  function showQrModal() {
    const currentUrl = window.location.href;
    elements.qrShareUrlInput.value = currentUrl;
    elements.qrcodeTarget.innerHTML = '';

    try {
      new QRCode(elements.qrcodeTarget, {
        text: currentUrl,
        width: 200,
        height: 200,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      console.error(e);
      showToast('Error generating QR code.', 'error');
    }

    elements.qrModal.classList.add('active');
  }

  function closeQrModal() {
    elements.qrModal.classList.remove('active');
  }

  function downloadQrPng() {
    const imgOrCanvas = elements.qrcodeTarget.querySelector('img') || elements.qrcodeTarget.querySelector('canvas');
    if (!imgOrCanvas) return;

    let dataUrl = imgOrCanvas.tagName.toLowerCase() === 'img' ? imgOrCanvas.src : imgOrCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    const safeName = (cardData && cardData.n ? cardData.n : 'card').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeName}_qr.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code downloaded!', 'success');
  }

  function downloadPdf() {
    const cardEl = document.getElementById('renderedCard');
    if (!cardEl) return;

    const safeName = (cardData && cardData.n ? cardData.n : 'digital_card').replace(/[^a-zA-Z0-9]/g, '_');
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${safeName}_digital_card.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showToast('Preparing PDF download...', 'info');

    html2pdf().set(opt).from(cardEl).save().then(() => {
      showToast('PDF downloaded successfully!', 'success');
    }).catch(err => {
      console.error('PDF error:', err);
      showToast('PDF generation failed. Use browser print (Ctrl+P).', 'error');
    });
  }

  // --- Event Setup ---

  function setupEvents() {
    if (elements.publicShareBtn) {
      elements.publicShareBtn.addEventListener('click', shareCardLink);
    }
    if (elements.publicQrBtn) {
      elements.publicQrBtn.addEventListener('click', showQrModal);
    }
    if (elements.publicPdfBtn) {
      elements.publicPdfBtn.addEventListener('click', downloadPdf);
    }
    if (elements.closeQrModalBtn) {
      elements.closeQrModalBtn.addEventListener('click', closeQrModal);
    }
    if (elements.downloadQrBtn) {
      elements.downloadQrBtn.addEventListener('click', downloadQrPng);
    }
    if (elements.copyModalLinkBtn) {
      elements.copyModalLinkBtn.addEventListener('click', shareCardLink);
    }
    if (elements.qrModal) {
      elements.qrModal.addEventListener('click', (e) => {
        if (e.target === elements.qrModal) closeQrModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.qrModal && elements.qrModal.classList.contains('active')) {
        closeQrModal();
      }
    });
  }

  // --- Initialization ---

  function init() {
    setupEvents();
    cardData = parseCardDataFromUrl();

    if (!cardData || !cardData.n) {
      renderErrorState();
    } else {
      renderCard(cardData);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
