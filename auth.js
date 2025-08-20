// auth.js
(() => {
    const API_USERS = '/api/hospital-users';
    let hospitalUsers = [];

    // Helpers
    const $ = (sel) => document.querySelector(sel);
    const showOverlay = () => { const o = $('#overlay'); if (o) o.style.display = 'flex'; };
    const hideOverlay = () => { const o = $('#overlay'); if (o) o.style.display = 'none'; };
    const setSession = (user) => {
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('access_level', user.access_level || 'employee');
        sessionStorage.setItem('user_id', user.hospital_id || user.hospitalId || '');
        // prefer an actual name from DB, fallback to id
        sessionStorage.setItem('user_name', user.name || user.user_name || user.hospital_id || '');
    };
    const clearSession = () => {
        sessionStorage.removeItem('authenticated');
        sessionStorage.removeItem('access_level');
        sessionStorage.removeItem('user_id');
        sessionStorage.removeItem('user_name');
    };

    async function loadHospitalUsers() {
        try {
            const res = await fetch(API_USERS, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            hospitalUsers = await res.json();
        } catch (err) {
            console.error('Error loading hospital users:', err);
            const errEl = $('#error-msg');
            if (errEl) errEl.textContent = '⚠ Failed to load hospital IDs.';
            hospitalUsers = [];
        }
    }

    function attachHandlers() {
        const form = $('#entry-form');
        const input = $('#code-input');
        const errorEl = $('#error-msg');
        const toggleIcon = $('#toggle-visibility');

        if (!form || !input) return;

        // clear error while typing
        input.addEventListener('input', () => {
            if (errorEl) errorEl.textContent = '';
        });

        // submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const raw = input.value || '';
            const value = raw.trim().toUpperCase();
            if (!value) {
                if (errorEl) errorEl.textContent = 'Please enter your hospital ID.';
                return;
            }

            const matched = hospitalUsers.find(u => (u.hospital_id || u.hospitalId || '').toString().toUpperCase() === value);

            if (matched) {
                // store the user info (id + name + role)
                setSession({
                    hospital_id: matched.hospital_id,
                    name: matched.name,
                    access_level: matched.access_level
                });

                // hide overlay and call existing role handler (if present)
                hideOverlay();
                if (typeof handleRoleBasedUI === 'function') {
                    try { handleRoleBasedUI(matched.access_level); } catch (err) { console.warn(err); }
                }
            } else {
                if (errorEl) errorEl.textContent = '❌ Invalid hospital ID. Try again.';
                input.value = '';
                input.focus();
            }
        });

        // toggle visibility if icon exists: keep global function name for any inline onclick usage
        window.toggleVisibility = () => {
            if (!input || !toggleIcon) return;
            if (input.type === 'password') {
                input.type = 'text';
                toggleIcon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                toggleIcon.textContent = 'visibility';
            }
        };
    }

    // On DOM ready initialize
    document.addEventListener('DOMContentLoaded', async () => {
        await loadHospitalUsers();

        // If already authenticated in sessionStorage, hide overlay and apply role-based UI
        const isAuth = sessionStorage.getItem('authenticated') === 'true';
        const role = sessionStorage.getItem('access_level');
        if (isAuth && role) {
            hideOverlay();
            if (typeof handleRoleBasedUI === 'function') {
                try { handleRoleBasedUI(role); } catch (err) { console.warn(err); }
            }
        } else {
            showOverlay();
        }

        attachHandlers();
    });

    // Expose a tiny API if other scripts want to use it
    window.Auth = {
        logout: () => {
            clearSession();
            showOverlay();
            // option: refresh or call role handler to hide admin UI
            if (typeof handleRoleBasedUI === 'function') handleRoleBasedUI(null);
        },
        currentUser: () => ({
            id: sessionStorage.getItem('user_id'),
            name: sessionStorage.getItem('user_name'),
            role: sessionStorage.getItem('access_level')
        })
    };
})();
