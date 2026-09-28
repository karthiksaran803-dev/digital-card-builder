/**
 * Cardify - Digital Business Card & Resume Builder
 * Main Application Logic (app.js)
 * Zero dependencies, Vanilla JavaScript
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'cardify_form_draft_v1';
  const BUILDER_THEME_KEY = 'cardify_builder_theme';

  // --- Application State ---
  let state = {
    fullName: '',
    jobTitle: '',
    bio: '',
    location: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    github: '',
    twitter: '',
    skills: '',
    projects: [
      { title: '', desc: '', link: '' },
      { title: '', desc: '', link: '' },
      { title: '', desc: '', link: '' }
    ],
    avatar: '', // Base64 data string
    theme: 'modern-light',
    color: '#2563eb',
    viewMode: 'full' // 'full' or 'compact'
  };

  // --- DOM Elements Cache ---
  const elements = {
    // Inputs
    fullName: document.getElementById('fullName'),
    jobTitle: document.getElementById('jobTitle'),
    bio: document.getElementById('bio'),
    location: document.getElementById('location'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    website: document.getElementById('website'),
    linkedin: document.getElementById('linkedin'),
    github: document.getElementById('github'),
    twitter: document.getElementById('twitter'),
    skills: document.getElementById('skills'),
    projTitle1: document.getElementById('projTitle1'),
    projDesc1: document.getElementById('projDesc1'),
    projLink1: document.getElementById('projLink1'),
    projTitle2: document.getElementById('projTitle2'),
    projDesc2: document.getElementById('projDesc2'),
    projLink2: document.getElementById('projLink2'),
    projTitle3: document.getElementById('projTitle3'),
    projDesc3: document.getElementById('projDesc3'),
    projLink3: document.getElementById('projLink3'),
    photoInput: document.getElementById('photoInput'),
    removePhotoBtn: document.getElementById('removePhotoBtn'),
    avatarPreviewContainer: document.getElementById('avatarPreviewContainer'),
    avatarImg: document.getElementById('avatarImg'),
    avatarPlaceholder: document.getElementById('avatarPlaceholder'),
    accentColorPicker: document.getElementById('accentColorPicker'),
    accentColorHex: document.getElementById('accentColorHex'),
    colorSwatches: document.querySelectorAll('.color-swatch'),
    themeRadios: document.querySelectorAll('input[name="cardTheme"]'),
    
    // Feedback
    nameError: document.getElementById('nameError'),
    emailError: document.getElementById('emailError'),

    // Preview
    previewCard: document.getElementById('previewCard'),
    viewFullBtn: document.getElementById('viewFullBtn'),
    viewCompactBtn: document.getElementById('viewCompactBtn'),

    // Action buttons
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    openCardBtn: document.getElementById('openCardBtn'),
    showQrBtn: document.getElementById('showQrBtn'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
    downloadHtmlBtn: document.getElementById('downloadHtmlBtn'),
    downloadVcardBtn: document.getElementById('downloadVcardBtn'),
    resetBtn: document.getElementById('resetBtn'),
    loadDemoBtn: document.getElementById('loadDemoBtn'),
    builderThemeToggle: document.getElementById('builderThemeToggle'),
    themeIcon: document.getElementById('themeIcon'),

    // QR Modal
    qrModal: document.getElementById('qrModal'),
    closeQrModalBtn: document.getElementById('closeQrModalBtn'),
    qrcodeTarget: document.getElementById('qrcodeTarget'),
    qrShareUrlInput: document.getElementById('qrShareUrlInput'),
    downloadQrBtn: document.getElementById('downloadQrBtn'),
    copyModalLinkBtn: document.getElementById('copyModalLinkBtn'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // Instance reference for QR code object
  let qrCodeInstance = null;

  // --- Utility Functions ---

  /**
   * Escape HTML entities to prevent XSS attacks
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Safely formats and sanitizes external URLs
   */
  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    // Prevent javascript: or vbscript: or data: code injection
    if (/^(javascript|vbscript|data):/i.test(trimmed)) {
      return '#';
    }
    if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed) && !/^tel:/i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  }

  /**
   * Smart URL builder for social platforms
   */
  function formatSocialUrl(handleOrUrl, platform) {
    if (!handleOrUrl) return '';
    const trimmed = handleOrUrl.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // Remove leading @ or /
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

  /**
   * Extract 1 or 2 uppercase initials from a name
   */
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Convert hex color to RGB values for CSS alpha blending
   */
  function hexToRgb(hex) {
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

  /**
   * Display toast message
   */
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

  // --- Photo Handling & Resizing Canvas ---

  function handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\//)) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }

    // Limit initial file size to 8MB
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image file too large. Please select a photo under 8MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        // Center-crop and downscale to 180x180 square on canvas
        const targetSize = 180;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        // Determine crop box
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        // Convert to high-efficiency JPEG base64 (approx 8-12KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        state.avatar = compressedBase64;
        updateAvatarDisplay();
        renderCard();
        saveDraft();
        showToast('Photo uploaded and optimized for sharing!', 'success');
      };
      img.onerror = function () {
        showToast('Error reading image file.', 'error');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    state.avatar = '';
    elements.photoInput.value = '';
    updateAvatarDisplay();
    renderCard();
    saveDraft();
    showToast('Profile photo removed.', 'info');
  }

  function updateAvatarDisplay() {
    if (state.avatar) {
      elements.avatarImg.src = state.avatar;
      elements.avatarImg.style.display = 'block';
      elements.avatarPlaceholder.style.display = 'none';
      elements.removePhotoBtn.style.display = 'inline-flex';
    } else {
      elements.avatarImg.src = '';
      elements.avatarImg.style.display = 'none';
      elements.avatarPlaceholder.style.display = 'block';
      elements.removePhotoBtn.style.display = 'none';
    }
  }

  // --- Form Validation ---

  function validateForm() {
    let isValid = true;

    // Name is required
    const nameVal = elements.fullName.value.trim();
    if (!nameVal) {
      elements.fullName.classList.add('is-invalid');
      isValid = false;
    } else {
      elements.fullName.classList.remove('is-invalid');
    }

    // Email format (if provided)
    const emailVal = elements.email.value.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      elements.email.classList.add('is-invalid');
      isValid = false;
    } else {
      elements.email.classList.remove('is-invalid');
    }

    return isValid;
  }

  // --- Read Form State ---

  function syncStateFromInputs() {
    state.fullName = elements.fullName.value.trim();
    state.jobTitle = elements.jobTitle.value.trim();
    state.bio = elements.bio.value.trim();
    state.location = elements.location.value.trim();
    state.email = elements.email.value.trim();
    state.phone = elements.phone.value.trim();
    state.website = elements.website.value.trim();
    state.linkedin = elements.linkedin.value.trim();
    state.github = elements.github.value.trim();
    state.twitter = elements.twitter.value.trim();
    state.skills = elements.skills.value.trim();

    state.projects = [
      {
        title: elements.projTitle1.value.trim(),
        desc: elements.projDesc1.value.trim(),
        link: elements.projLink1.value.trim()
      },
      {
        title: elements.projTitle2.value.trim(),
        desc: elements.projDesc2.value.trim(),
        link: elements.projLink2.value.trim()
      },
      {
        title: elements.projTitle3.value.trim(),
        desc: elements.projDesc3.value.trim(),
        link: elements.projLink3.value.trim()
      }
    ];

    const checkedTheme = document.querySelector('input[name="cardTheme"]:checked');
    if (checkedTheme) {
      state.theme = checkedTheme.value;
    }
    state.color = elements.accentColorPicker.value;
  }

  // --- Populate Inputs from State ---

  function syncInputsFromState() {
    elements.fullName.value = state.fullName || '';
    elements.jobTitle.value = state.jobTitle || '';
    elements.bio.value = state.bio || '';
    elements.location.value = state.location || '';
    elements.email.value = state.email || '';
    elements.phone.value = state.phone || '';
    elements.website.value = state.website || '';
    elements.linkedin.value = state.linkedin || '';
    elements.github.value = state.github || '';
    elements.twitter.value = state.twitter || '';
    elements.skills.value = state.skills || '';

    const p = state.projects || [];
    elements.projTitle1.value = (p[0] && p[0].title) || '';
    elements.projDesc1.value = (p[0] && p[0].desc) || '';
    elements.projLink1.value = (p[0] && p[0].link) || '';

    elements.projTitle2.value = (p[1] && p[1].title) || '';
    elements.projDesc2.value = (p[1] && p[1].desc) || '';
    elements.projLink2.value = (p[1] && p[1].link) || '';

    elements.projTitle3.value = (p[2] && p[2].title) || '';
    elements.projDesc3.value = (p[2] && p[2].desc) || '';
    elements.projLink3.value = (p[2] && p[2].link) || '';

    // Theme radio
    const themeRadio = document.querySelector(`input[name="cardTheme"][value="${state.theme}"]`);
    if (themeRadio) {
      themeRadio.checked = true;
    }

    // Color
    elements.accentColorPicker.value = state.color || '#2563eb';
    elements.accentColorHex.textContent = state.color || '#2563eb';
    updateSwatchSelection(state.color || '#2563eb');

    updateAvatarDisplay();
  }

  function updateSwatchSelection(color) {
    elements.colorSwatches.forEach(swatch => {
      if (swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  // --- Render Digital Card HTML ---

  function generateCardMarkup(data, isCompact = false) {
    const displayName = escapeHtml(data.fullName || 'Your Name');
    const displayTitle = escapeHtml(data.jobTitle || 'Professional Title');
    const displayBio = escapeHtml(data.bio || 'Add a brief introduction highlighting your role, goals, and passions.');
    const displayLocation = escapeHtml(data.location || '');
    const initials = getInitials(data.fullName);

    // Avatar HTML
    let avatarHtml = '';
    if (data.avatar) {
      avatarHtml = `<img src="${data.avatar}" alt="${displayName}">`;
    } else {
      avatarHtml = `<span class="card-avatar-initials">${initials}</span>`;
    }

    // Quick Connect Buttons (Email & Phone)
    let quickActionsHtml = '';
    const hasEmail = Boolean(data.email);
    const hasPhone = Boolean(data.phone);
    if (hasEmail || hasPhone) {
      quickActionsHtml = `<div class="card-quick-actions">`;
      if (hasEmail) {
        quickActionsHtml += `
          <a href="mailto:${escapeHtml(data.email)}" class="card-action-btn primary" title="Send Email">
            <i class="fa-solid fa-envelope"></i> Email Me
          </a>`;
      }
      if (hasPhone) {
        quickActionsHtml += `
          <a href="tel:${escapeHtml(data.phone)}" class="card-action-btn secondary" title="Call">
            <i class="fa-solid fa-phone"></i> Call
          </a>`;
      }
      quickActionsHtml += `</div>`;
    }

    // Social Links Chips
    const socialLinks = [];
    if (data.website) {
      socialLinks.push({
        url: sanitizeUrl(data.website),
        icon: 'fa-globe',
        label: 'Website'
      });
    }
    if (data.linkedin) {
      socialLinks.push({
        url: formatSocialUrl(data.linkedin, 'linkedin'),
        icon: 'fa-brands fa-linkedin',
        label: 'LinkedIn'
      });
    }
    if (data.github) {
      socialLinks.push({
        url: formatSocialUrl(data.github, 'github'),
        icon: 'fa-brands fa-github',
        label: 'GitHub'
      });
    }
    if (data.twitter) {
      socialLinks.push({
        url: formatSocialUrl(data.twitter, 'twitter'),
        icon: 'fa-brands fa-x-twitter',
        label: 'Twitter'
      });
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
    if (data.skills) {
      const skillList = data.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (skillList.length > 0) {
        skillsHtml = `
          <div class="card-skills-section">
            <span class="card-section-label"><i class="fa-solid fa-code"></i> Skills</span>
            <div class="card-skills-list">
              ${skillList.map(skill => `<span class="card-skill-pill">${escapeHtml(skill)}</span>`).join('')}
            </div>
          </div>
        `;
      }
    }

    // Projects (shown only in full view or if present)
    let projectsHtml = '';
    if (!isCompact && data.projects && data.projects.length > 0) {
      const validProjects = data.projects.filter(p => p.title && p.title.trim());
      if (validProjects.length > 0) {
        projectsHtml = `
          <div class="card-projects-section">
            <span class="card-section-label"><i class="fa-solid fa-rocket"></i> Featured Projects</span>
            ${validProjects.map(proj => {
              const hasLink = Boolean(proj.link && proj.link.trim());
              const tag = hasLink ? 'a' : 'div';
              const hrefAttr = hasLink ? `href="${escapeHtml(sanitizeUrl(proj.link))}" target="_blank" rel="noopener noreferrer"` : '';
              return `
                <${tag} ${hrefAttr} class="card-project-item">
                  <div class="card-project-header">
                    <span class="card-project-title">
                      <i class="fa-solid fa-folder-open"></i> ${escapeHtml(proj.title)}
                    </span>
                    ${hasLink ? `<i class="fa-solid fa-arrow-up-right-from-square card-project-link-icon"></i>` : ''}
                  </div>
                  ${proj.desc ? `<p class="card-project-desc">${escapeHtml(proj.desc)}</p>` : ''}
                </${tag}>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // Full Card Assembly
    return `
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
          <h2 class="card-name">${displayName}</h2>
          <div class="card-title">${displayTitle}</div>
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
          <span>Digital Business Card &bull; Powered by Cardify</span>
        </div>

      </div>
    `;
  }

  function renderCard() {
    const isCompact = state.viewMode === 'compact';
    const markup = generateCardMarkup(state, isCompact);
    elements.previewCard.innerHTML = markup;

    // Apply Theme and Accent Color CSS Variables
    elements.previewCard.className = `digital-card theme-${state.theme}`;
    elements.previewCard.style.setProperty('--card-accent', state.color);
    elements.previewCard.style.setProperty('--accent-rgb', hexToRgb(state.color));
  }

  // --- Compression & Shareable URL Generation ---

  /**
   * Pack card state into compact JSON structure
   */
  function packCardData() {
    const validProjects = (state.projects || [])
      .filter(p => p.title && p.title.trim())
      .map(p => ({
        t: p.title.trim(),
        d: (p.desc || '').trim(),
        u: (p.link || '').trim()
      }));

    const cleanSkills = state.skills
      ? state.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    return {
      n: state.fullName,
      t: state.jobTitle,
      b: state.bio,
      l: state.location,
      e: state.email,
      p: state.phone,
      w: state.website,
      li: state.linkedin,
      gh: state.github,
      tw: state.twitter,
      s: cleanSkills,
      pr: validProjects,
      a: state.avatar || '',
      th: state.theme || 'modern-light',
      c: state.color || '#2563eb'
    };
  }

  /**
   * Generates compressed URL-safe string
   */
  function getCompressedShareUrl() {
    const data = packCardData();
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);

    // Compute absolute URL to card.html
    const currentUrl = new URL(window.location.href);
    const basePath = currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/') + 1);
    return `${currentUrl.origin}${basePath}card.html?d=${compressed}`;
  }

  // --- Copy Link & Clipboard ---

  async function copyShareLink() {
    if (!validateForm()) {
      showToast('Please provide at least your full name before sharing.', 'error');
      elements.fullName.focus();
      return;
    }

    const shareUrl = getCompressedShareUrl();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for non-https / file:// environments
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      showToast('Card link copied to clipboard!', 'success');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // Prompt user to copy manually
      window.prompt('Copy your card link:', shareUrl);
    }
  }

  function openCard() {
    if (!validateForm()) {
      showToast('Please provide at least your full name.', 'error');
      elements.fullName.focus();
      return;
    }
    const shareUrl = getCompressedShareUrl();
    window.open(shareUrl, '_blank');
  }

  // --- QR Code Generation ---

  function showQrModal() {
    if (!validateForm()) {
      showToast('Please provide at least your full name first.', 'error');
      elements.fullName.focus();
      return;
    }

    const shareUrl = getCompressedShareUrl();
    elements.qrShareUrlInput.value = shareUrl;

    // Clear previous QR element
    elements.qrcodeTarget.innerHTML = '';

    // Generate new QR Code
    try {
      qrCodeInstance = new QRCode(elements.qrcodeTarget, {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.error('QR code generation failed:', err);
      showToast('Error generating QR code.', 'error');
    }

    elements.qrModal.classList.add('active');
  }

  function closeQrModal() {
    elements.qrModal.classList.remove('active');
  }

  function downloadQrPng() {
    const imgOrCanvas = elements.qrcodeTarget.querySelector('img') || elements.qrcodeTarget.querySelector('canvas');
    if (!imgOrCanvas) {
      showToast('QR code not ready to download.', 'error');
      return;
    }

    let dataUrl = '';
    if (imgOrCanvas.tagName.toLowerCase() === 'img') {
      dataUrl = imgOrCanvas.src;
    } else {
      dataUrl = imgOrCanvas.toDataURL('image/png');
    }

    const a = document.createElement('a');
    const safeName = (state.fullName || 'card').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeName}_qr.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code image downloaded!', 'success');
  }

  // --- PDF Export via html2pdf.js ---

  function downloadPdf() {
    if (!validateForm()) {
      showToast('Please provide at least your full name before downloading PDF.', 'error');
      elements.fullName.focus();
      return;
    }

    const element = elements.previewCard;
    const safeName = (state.fullName || 'business_card').replace(/[^a-zA-Z0-9]/g, '_');

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${safeName}_digital_card.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showToast('Rendering PDF document...', 'info');

    // Call html2pdf bundle
    html2pdf().set(opt).from(element).save().then(() => {
      showToast('PDF downloaded successfully!', 'success');
    }).catch(err => {
      console.error('PDF export failed:', err);
      showToast('PDF export failed. Try using standard browser Print (Ctrl+P).', 'error');
    });
  }

  // --- Standalone Self-Contained HTML Download ---

  async function downloadStandaloneHtml() {
    if (!validateForm()) {
      showToast('Please provide at least your full name first.', 'error');
      elements.fullName.focus();
      return;
    }

    showToast('Packaging standalone HTML file...', 'info');

    // Retrieve active CSS styles
    let cssText = '';
    try {
      const response = await fetch('css/style.css');
      if (response.ok) {
        cssText = await response.text();
      }
    } catch (e) {
      console.warn('Could not fetch external style.css, fallback used', e);
    }

    const cardHtml = generateCardMarkup(state, false);
    const safeName = (state.fullName || 'card').replace(/[^a-zA-Z0-9]/g, '_');

    const standaloneDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(state.fullName || 'Digital Card')} | Digital Business Card</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    /* Embedded Master Stylesheet */
    ${cssText}

    body {
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .standalone-container {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
    }
    .standalone-actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="standalone-container">
    <div class="digital-card theme-${escapeHtml(state.theme)}" style="--card-accent: ${escapeHtml(state.color)}; --accent-rgb: ${hexToRgb(state.color)};">
      ${cardHtml}
    </div>
    <div class="standalone-actions">
      <button onclick="window.print()" class="btn btn-secondary btn-sm">
        <i class="fa-solid fa-print"></i> Print / Save PDF
      </button>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([standaloneDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_digital_card.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Standalone HTML downloaded!', 'success');
  }

  // --- vCard (.vcf) Export ---

  function downloadVCard() {
    if (!state.fullName) {
      showToast('Please enter your name to export a vCard.', 'error');
      elements.fullName.focus();
      return;
    }

    const parts = state.fullName.trim().split(/\s+/);
    const lastName = parts.length > 1 ? parts.pop() : '';
    const firstName = parts.join(' ');

    let vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
    vcf += `N:${lastName};${firstName};;;\r\n`;
    vcf += `FN:${state.fullName}\r\n`;

    if (state.jobTitle) vcf += `TITLE:${state.jobTitle}\r\n`;
    if (state.email) vcf += `EMAIL;TYPE=INTERNET,PREF:${state.email}\r\n`;
    if (state.phone) vcf += `TEL;TYPE=CELL,VOICE:${state.phone}\r\n`;
    if (state.website) vcf += `URL:${sanitizeUrl(state.website)}\r\n`;
    if (state.location) vcf += `ADR;TYPE=WORK:;;;${state.location};;;;\r\n`;
    if (state.bio) vcf += `NOTE:${state.bio.replace(/\n/g, '\\n')}\r\n`;
    if (state.linkedin) vcf += `X-SOCIALPROFILE;TYPE=linkedin:${formatSocialUrl(state.linkedin, 'linkedin')}\r\n`;
    if (state.github) vcf += `X-SOCIALPROFILE;TYPE=github:${formatSocialUrl(state.github, 'github')}\r\n`;
    vcf += 'END:VCARD\r\n';

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = state.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeName}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Contact card (.vcf) downloaded!', 'success');
  }

  // --- LocalStorage Save & Load ---

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function loadDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign({}, state, parsed);
        syncInputsFromState();
        renderCard();
        return true;
      }
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
    }
    return false;
  }

  function resetForm() {
    if (!confirm('Are you sure you want to reset all card information? This will clear your draft.')) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    state = {
      fullName: '',
      jobTitle: '',
      bio: '',
      location: '',
      email: '',
      phone: '',
      website: '',
      linkedin: '',
      github: '',
      twitter: '',
      skills: '',
      projects: [
        { title: '', desc: '', link: '' },
        { title: '', desc: '', link: '' },
        { title: '', desc: '', link: '' }
      ],
      avatar: '',
      theme: 'modern-light',
      color: '#2563eb',
      viewMode: 'full'
    };

    syncInputsFromState();
    renderCard();
    showToast('Card builder has been reset.', 'info');
  }

  // --- Demo Data Preset ---

  function loadDemoProfile() {
    state = {
      fullName: 'Alex Morgan',
      jobTitle: 'Senior Cloud Solutions Architect',
      bio: 'AWS & GCP certified architect specializing in distributed serverless systems, zero-trust infrastructure, and scalable cloud-native architectures.',
      location: 'San Francisco, CA',
      email: 'alex.morgan@cloudpulse.dev',
      phone: '+1 (415) 890-2411',
      website: 'https://alexmorgan.dev',
      linkedin: 'alex-morgan-cloud',
      github: 'alexmorgan-dev',
      twitter: 'alexmorgan_dev',
      skills: 'AWS, Google Cloud, Terraform, Kubernetes, Node.js, Go, Python, GraphQL, Distributed Systems',
      projects: [
        {
          title: 'CloudPulse Telemetry',
          desc: 'High-throughput real-time telemetry processing 20M+ metrics/sec using serverless event streams.',
          link: 'https://github.com/alexmorgan-dev/cloudpulse'
        },
        {
          title: 'ZeroGate Identity Provider',
          desc: 'Biometric WebAuthn passkey authentication proxy with zero-trust access control rules.',
          link: 'https://github.com/alexmorgan-dev/zerogate'
        },
        {
          title: 'KubeScale Autoscaler',
          desc: 'Custom Kubernetes HPA controller dynamically adapting pod pools based on queue latency.',
          link: 'https://github.com/alexmorgan-dev/kubescale'
        }
      ],
      avatar: '',
      theme: 'modern-light',
      color: '#2563eb',
      viewMode: 'full'
    };

    syncInputsFromState();
    renderCard();
    saveDraft();
    showToast('Demo profile loaded! Edit any field to customize.', 'success');
  }

  // --- Builder Interface Theme (Light / Dark) ---

  function initBuilderTheme() {
    const savedTheme = localStorage.getItem(BUILDER_THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyBuilderTheme(activeTheme);
  }

  function applyBuilderTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-builder-theme', 'dark');
      elements.themeIcon.className = 'fa-solid fa-sun';
      localStorage.setItem(BUILDER_THEME_KEY, 'dark');
    } else {
      document.documentElement.removeAttribute('data-builder-theme');
      elements.themeIcon.className = 'fa-solid fa-moon';
      localStorage.setItem(BUILDER_THEME_KEY, 'light');
    }
  }

  function toggleBuilderTheme() {
    const current = document.documentElement.getAttribute('data-builder-theme');
    applyBuilderTheme(current === 'dark' ? 'light' : 'dark');
  }

  // --- Event Listeners Setup ---

  function setupEventListeners() {
    // Form input changes (debounced input handler)
    const formInputSelectors = [
      elements.fullName, elements.jobTitle, elements.bio, elements.location,
      elements.email, elements.phone, elements.website, elements.linkedin,
      elements.github, elements.twitter, elements.skills,
      elements.projTitle1, elements.projDesc1, elements.projLink1,
      elements.projTitle2, elements.projDesc2, elements.projLink2,
      elements.projTitle3, elements.projDesc3, elements.projLink3
    ];

    formInputSelectors.forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        syncStateFromInputs();
        renderCard();
        saveDraft();
      });
    });

    // Theme selector radios
    elements.themeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        syncStateFromInputs();
        renderCard();
        saveDraft();
      });
    });

    // Color Swatches
    elements.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        elements.accentColorPicker.value = color;
        elements.accentColorHex.textContent = color;
        updateSwatchSelection(color);
        state.color = color;
        renderCard();
        saveDraft();
      });
    });

    // Custom Color Input
    elements.accentColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      elements.accentColorHex.textContent = color;
      updateSwatchSelection(color);
      state.color = color;
      renderCard();
      saveDraft();
    });

    // Photo input
    elements.photoInput.addEventListener('change', handlePhotoUpload);
    elements.removePhotoBtn.addEventListener('click', removePhoto);

    // View Mode Toggle (Full vs Compact)
    elements.viewFullBtn.addEventListener('click', () => {
      state.viewMode = 'full';
      elements.viewFullBtn.classList.add('active');
      elements.viewCompactBtn.classList.remove('active');
      renderCard();
    });

    elements.viewCompactBtn.addEventListener('click', () => {
      state.viewMode = 'compact';
      elements.viewCompactBtn.classList.add('active');
      elements.viewFullBtn.classList.remove('active');
      renderCard();
    });

    // Action buttons
    elements.copyLinkBtn.addEventListener('click', copyShareLink);
    elements.openCardBtn.addEventListener('click', openCard);
    elements.showQrBtn.addEventListener('click', showQrModal);
    elements.downloadPdfBtn.addEventListener('click', downloadPdf);
    elements.downloadHtmlBtn.addEventListener('click', downloadStandaloneHtml);
    elements.downloadVcardBtn.addEventListener('click', downloadVCard);
    elements.resetBtn.addEventListener('click', resetForm);
    elements.loadDemoBtn.addEventListener('click', loadDemoProfile);
    elements.builderThemeToggle.addEventListener('click', toggleBuilderTheme);

    // QR Modal
    elements.closeQrModalBtn.addEventListener('click', closeQrModal);
    elements.downloadQrBtn.addEventListener('click', downloadQrPng);
    elements.copyModalLinkBtn.addEventListener('click', copyShareLink);
    elements.qrModal.addEventListener('click', (e) => {
      if (e.target === elements.qrModal) closeQrModal();
    });

    // Keyboard ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.qrModal.classList.contains('active')) {
        closeQrModal();
      }
    });
  }

  // --- App Initialization ---

  function init() {
    initBuilderTheme();
    setupEventListeners();

    const draftLoaded = loadDraft();
    if (!draftLoaded) {
      // Load starter template so new users see an awesome card right away
      loadDemoProfile();
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
