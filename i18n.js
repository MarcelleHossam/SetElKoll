// ═══════════════════════════════════════════
// i18n.js — Localization Engine
// Supports: English (LTR) and Arabic (RTL)
// ═══════════════════════════════════════════

const i18n = (() => {
    let currentLang = localStorage.getItem('lang') || 'en';
    let translations = {};

    // Load a translation file for a given lang
    async function loadTranslations(lang) {
        try {
            const res = await fetch(`/locales/${lang}/translation.json`);
            if (!res.ok) throw new Error('Failed to load translations');
            translations = await res.json();
        } catch (err) {
            console.error('i18n load error:', err);
            translations = {};
        }
    }

    // Get a translation by dot-path key, with optional interpolation
    // e.g. t('auth.loginSuccess', { name: 'Ahmed' })
    function t(key, vars = {}) {
        const parts = key.split('.');
        let value = translations;
        for (const part of parts) {
            if (value == null) return key;
            value = value[part];
        }
        if (typeof value !== 'string') return key;
        // Replace {{var}} placeholders
        return value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    }

    // Apply all [data-i18n] attributes in the DOM
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = t(key);
            if (translated !== key) {
                // For inputs/textareas, set placeholder
                if (el.hasAttribute('data-i18n-placeholder')) {
                    el.placeholder = translated;
                } else {
                    el.textContent = translated;
                }
            }
        });

        // Placeholders have their own attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translated = t(key);
            if (translated !== key) el.placeholder = translated;
        });

        // data-i18n-html allows innerHTML (for spans inside buttons etc)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translated = t(key);
            if (translated !== key) el.innerHTML = translated;
        });
    }

    // Apply RTL/LTR direction and lang attribute
    function applyDirection() {
        const isAr = currentLang === 'ar';
        document.documentElement.lang = currentLang;
        document.documentElement.dir = isAr ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', isAr);
        document.body.classList.toggle('ltr', !isAr);
    }

    // Update the toggle button appearance
    function updateToggleButton() {
        const btn = document.getElementById('langToggleBtn');
        if (!btn) return;
        btn.textContent = currentLang === 'en' ? 'ع' : 'EN';
        btn.title = currentLang === 'en' ? 'Switch to Arabic' : 'Switch to English';
    }

    // Initialize: load translations and render
    async function init() {
        await loadTranslations(currentLang);
        applyDirection();
        applyTranslations();
        updateToggleButton();
    }

    // Toggle between languages
    async function toggle() {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        localStorage.setItem('lang', currentLang);
        await loadTranslations(currentLang);
        applyDirection();
        applyTranslations();
        updateToggleButton();
        // Fire a custom event so app.js can react (e.g. re-render dynamic content)
        document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: currentLang } }));
    }

    function getLang() { return currentLang; }
    function isRTL() { return currentLang === 'ar'; }

    return { init, toggle, t, applyTranslations, getLang, isRTL };
})();
