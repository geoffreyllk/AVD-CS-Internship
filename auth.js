// auth.js
(() => {
    const $ = (sel) => document.querySelector(sel);
    const showOverlay = () => { const o = $('#overlay'); if (o) o.style.display = 'flex'; };
    const hideOverlay = () => { const o = $('#overlay'); if (o) o.style.display = 'none'; };
    const setSession = (user) => {
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('access_level', user.access_level || 'employee');
        sessionStorage.setItem('user_id', user.hospital_id || '');
        sessionStorage.setItem('user_name', user.name || user.hospital_id || '');
    };
    const clearSession = () => {
        ['authenticated','access_level','user_id','user_name'].forEach(k => sessionStorage.removeItem(k));
    };

    async function attemptLogin(hospitalId, password) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hospital_id: hospitalId, password })
            });

            const data = await res.json();
            if (res.ok && data.success && data.user) {
                setSession(data.user);
                hideOverlay();
                if (typeof handleRoleBasedUI === 'function') handleRoleBasedUI(data.user.access_level);
            } else {
                const errorEl = $('#error-msg');
                if (errorEl) errorEl.textContent = data.message || 'Invalid ID or password.';
                const passEl = $('#password-input');
                if (passEl) { passEl.value = ''; passEl.focus(); }
            }
        } catch {
            const errorEl = $('#error-msg');
            if (errorEl) errorEl.textContent = 'Server error. Please try again later.';
        }
    }

    function attachHandlers() {
        const form = $('#entry-form');
        const inputId = $('#code-input');
        const inputPass = $('#password-input');
        const errorEl = $('#error-msg');
        const toggleIcon = $('#toggle-visibility');
        if (!form || !inputId || !inputPass) return;
        [inputId, inputPass].forEach(el => el.addEventListener('input', () => { if (errorEl) errorEl.textContent = ''; }));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const hospitalId = (inputId.value || '').trim().toUpperCase();
            const password = inputPass.value || '';
            if (!hospitalId || !password) {
                if (errorEl) errorEl.textContent = 'Please enter both Hospital ID and Password.';
                return;
            }
        attemptLogin(hospitalId, password);
        });

        window.toggleVisibility = () => {
            if (!inputPass || !toggleIcon) return;
            if (inputPass.type === 'password') {
                inputPass.type = 'text'; toggleIcon.textContent = 'visibility_off';
            } else {
                inputPass.type = 'password'; toggleIcon.textContent = 'visibility';
            }
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        const isAuth = sessionStorage.getItem('authenticated') === 'true';
        const role = sessionStorage.getItem('access_level');
        if (isAuth && role) {
            hideOverlay();
            if (typeof handleRoleBasedUI === 'function') handleRoleBasedUI(role);
        } else {
            showOverlay();
        }
        attachHandlers();
    });

    window.Auth = {
        logout: () => { clearSession(); showOverlay(); if (typeof handleRoleBasedUI === 'function') handleRoleBasedUI(null); },
        currentUser: () => ({
            id: sessionStorage.getItem('user_id'),
            name: sessionStorage.getItem('user_name'),
            role: sessionStorage.getItem('access_level')
        })
    };
})();
