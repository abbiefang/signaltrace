/**
 * SignalTrace — photos.js
 * Handles all photo storage: person avatars and interaction screenshots.
 *
 * Strategy: FileReader API + canvas compression → base64 data URL → localStorage
 * No server required. Compresses aggressively to stay within the 5 MB limit.
 *
 * Storage keys:
 *   signaltrace_photo_person_{personId}     → base64 data URL  (avatar)
 *   signaltrace_photos_ix_{interactionId}   → JSON string[]    (up to 3 screenshots)
 *
 * Public API (attached to window.Photos):
 *   processImage(file, maxWidth?, quality?) → Promise<string>
 *   savePersonPhoto(personId, file)         → Promise<string|null>
 *   savePersonPhotoDataUrl(personId, url)   → void (sync)
 *   getPersonPhoto(personId)                → string|null
 *   saveInteractionPhotos(ixId, urls[])     → void
 *   getInteractionPhotos(ixId)              → string[]
 *   deletePersonPhotos(personId, ixIds[])   → void
 */

'use strict';

const Photos = {

  /* ───────────────────────────────────────────────────────────
     Image compression
  ─────────────────────────────────────────────────────────── */

  /**
   * Compress an image File to a JPEG base64 data URL.
   *
   * @param {File}   file      — source image file
   * @param {number} maxWidth  — maximum dimension in px (applied to both axes)
   * @param {number} quality   — JPEG quality 0–1
   * @returns {Promise<string>} base64 data URL
   */
  processImage(file, maxWidth = 400, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.onload  = function (e) {
        const img = new Image();

        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload  = function () {
          let w = img.width;
          let h = img.height;

          // Scale down if either dimension exceeds maxWidth
          if (w > maxWidth || h > maxWidth) {
            if (w >= h) {
              h = Math.round(h * maxWidth / w);
              w = maxWidth;
            } else {
              w = Math.round(w * maxWidth / h);
              h = maxWidth;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Release GPU backing store (critical on iOS WebKit to prevent memory leak)
          canvas.width = 0;
          canvas.height = 0;
          img.src = '';
          resolve(dataUrl);
        };

        img.src = /** @type {string} */ (e.target.result);
      };

      reader.readAsDataURL(file);
    });
  },


  /* ───────────────────────────────────────────────────────────
     Person avatar
  ─────────────────────────────────────────────────────────── */

  /**
   * Compress a File and persist it as the person's avatar.
   * @returns {Promise<string|null>} saved data URL, or null on error
   */
  async savePersonPhoto(personId, file) {
    try {
      const dataUrl = await Photos.processImage(file, 400, 0.72);
      Photos.savePersonPhotoDataUrl(personId, dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn('[Photos] savePersonPhoto failed:', err);
      return null;
    }
  },

  /**
   * Persist a pre-processed data URL as the person's avatar (synchronous).
   * Silently swallows quota errors — the app stays functional even if photo
   * cannot be saved.
   */
  savePersonPhotoDataUrl(personId, dataUrl) {
    if (!dataUrl || !personId) return;
    try {
      localStorage.setItem(`signaltrace_photo_person_${personId}`, dataUrl);
    } catch (err) {
      alert('Storage is full. Please delete some old photos or interactions to free up space.');
    }
  },

  /**
   * Retrieve a person's avatar data URL.
   * @returns {string|null}
   */
  getPersonPhoto(personId) {
    if (!personId) return null;
    return localStorage.getItem(`signaltrace_photo_person_${personId}`) || null;
  },


  /* ───────────────────────────────────────────────────────────
     Interaction screenshots
  ─────────────────────────────────────────────────────────── */

  /**
   * Persist up to 3 screenshot data URLs for an interaction.
   * @param {string}   interactionId
   * @param {string[]} dataUrls  — array of base64 data URLs
   */
  saveInteractionPhotos(interactionId, dataUrls) {
    if (!interactionId || !Array.isArray(dataUrls) || dataUrls.length === 0) return;
    try {
      localStorage.setItem(
        `signaltrace_photos_ix_${interactionId}`,
        JSON.stringify(dataUrls.slice(0, 3)),
      );
    } catch (err) {
      alert('Storage is full. Please delete some old photos or interactions to free up space.');
    }
  },

  /**
   * Retrieve screenshots for an interaction.
   * @returns {string[]} — may be empty
   */
  getInteractionPhotos(interactionId) {
    if (!interactionId) return [];
    try {
      const raw = localStorage.getItem(`signaltrace_photos_ix_${interactionId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },


  /* ───────────────────────────────────────────────────────────
     Cascading delete
  ─────────────────────────────────────────────────────────── */

  /**
   * Remove a person's avatar and all their interaction screenshots.
   * Called before deletePerson() so we still have the interaction IDs.
   *
   * @param {string}   personId
   * @param {string[]} interactionIds — IDs of all interactions for this person
   */
  deletePersonPhotos(personId, interactionIds) {
    if (personId) {
      localStorage.removeItem(`signaltrace_photo_person_${personId}`);
    }
    if (Array.isArray(interactionIds)) {
      interactionIds.forEach(id => {
        if (id) localStorage.removeItem(`signaltrace_photos_ix_${id}`);
      });
    }
  },
};

window.Photos = Photos;
