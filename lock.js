// Password Lock Feature for Web-Note

// SHA-256 Hashing Function
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// LocalStorage Password Management
function getStoredPassword() {
    const note = window.location.pathname.split('/').pop();
    return localStorage.getItem('note_password_' + note);
}

function storePassword(password) {
    const note = window.location.pathname.split('/').pop();
    localStorage.setItem('note_password_' + note, password);
}

function clearStoredPassword() {
    const note = window.location.pathname.split('/').pop();
    localStorage.removeItem('note_password_' + note);
}

// Lock Modal UI Functions
function showSetPasswordModal() {
    const overlay = document.createElement('div');
    overlay.className = 'password-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <h3>🔒 Set Password for this note</h3>
        <input type="password" id="passwordInput" placeholder="Enter password" autocomplete="new-password">
        <div style="margin-top: 15px;">
            <button class="btn-primary" id="confirmSetLock">Set Lock</button>
            <button class="btn-secondary" id="cancelModal">Cancel</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('passwordInput').focus();

    document.getElementById('confirmSetLock').onclick = async () => {
        const password = document.getElementById('passwordInput').value;
        if (!password) {
            alert('Password cannot be empty');
            return;
        }
        await setNoteLock(password);
        document.body.removeChild(overlay);
    };

    document.getElementById('cancelModal').onclick = () => {
        document.body.removeChild(overlay);
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };
}

function showUnlockModal(errorMessage = '') {
    const overlay = document.createElement('div');
    overlay.className = 'password-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <h3>🔒 This note is password protected</h3>
        ${errorMessage ? `<p style="color: #ff4444;">${errorMessage}</p>` : ''}
        <input type="password" id="passwordInput" placeholder="Enter password" autocomplete="off">
        <div style="margin-top: 15px;">
            <button class="btn-primary" id="confirmUnlock">Unlock</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('passwordInput').focus();

    const unlockHandler = async () => {
        const password = document.getElementById('passwordInput').value;
        const success = await unlockNote(password);
        if (!success) {
            document.body.removeChild(overlay);
            showUnlockModal('Wrong password. Try again.');
        } else {
            document.body.removeChild(overlay);
        }
    };

    document.getElementById('confirmUnlock').onclick = unlockHandler;
    document.getElementById('passwordInput').onkeypress = (e) => {
        if (e.key === 'Enter') unlockHandler();
    };
}

function showRemovePasswordModal() {
    const overlay = document.createElement('div');
    overlay.className = 'password-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <h3>🔓 Remove Password Protection</h3>
        <p>Are you sure you want to remove password protection from this note?</p>
        <div style="margin-top: 15px;">
            <button class="btn-primary" id="confirmRemoveLock">Remove Lock</button>
            <button class="btn-secondary" id="cancelModal">Cancel</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('confirmRemoveLock').onclick = async () => {
        await removeNoteLock();
        document.body.removeChild(overlay);
    };

    document.getElementById('cancelModal').onclick = () => {
        document.body.removeChild(overlay);
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };
}

// Lock API Calls
async function setNoteLock(password) {
    try {
        const hash = await sha256(password);
        const response = await fetch(window.location.href, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'action=set_lock&password_hash=' + encodeURIComponent(hash)
        });
        const result = await response.json();
        if (result.success) {
            // Update UI: icon 🔓 → 🔒
            document.getElementById('lockIcon').textContent = '🔒';
            // Store password in localStorage
            storePassword(password);
            isLocked = true;
            showNotification('Password protection enabled');
        }
    } catch (error) {
        console.error('Set lock error:', error);
        showNotification('Error setting password');
    }
}

async function unlockNote(password) {
    try {
        const response = await fetch(window.location.href, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'action=validate_password&password=' + encodeURIComponent(password)
        });
        const result = await response.json();
        if (result.valid) {
            storePassword(password);
            // Fetch note content via AJAX instead of full reload
            const contentResponse = await fetch(window.location.href + '?raw=1');
            const content = await contentResponse.text();
            textarea.value = content;
            textarea.disabled = false;
            textarea.focus();
            // Update lock icon if needed
            const lockIcon = document.getElementById('lockIcon');
            if (lockIcon) lockIcon.textContent = '🔒';
            isLocked = true; // Note is still locked, but we have password
            showNotification('Note unlocked');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Unlock error:', error);
        showNotification('Error unlocking note');
        return false;
    }
}

async function removeNoteLock() {
    try {
        const response = await fetch(window.location.href, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'action=remove_lock'
        });
        const result = await response.json();
        if (result.success) {
            clearStoredPassword();
            // Update UI: icon 🔒 → 🔓
            document.getElementById('lockIcon').textContent = '🔓';
            isLocked = false;
            showNotification('Password protection removed');
        }
    } catch (error) {
        console.error('Remove lock error:', error);
        showNotification('Error removing password');
    }
}

// Lock Icon Click Handler
document.addEventListener('DOMContentLoaded', function() {
    const lockIconLink = document.getElementById('lockIconLink');
    if (lockIconLink) {
        lockIconLink.addEventListener('click', function(e) {
            e.preventDefault();

            if (isLocked) {
                // Note is locked
                const hasStoredPassword = !!getStoredPassword();
                if (!hasStoredPassword) {
                    // User hasn't unlocked yet, show unlock modal
                    showUnlockModal();
                } else {
                    // User has unlocked, allow removing password
                    showRemovePasswordModal();
                }
            } else {
                // Note is not locked, show set password dialog
                showSetPasswordModal();
            }
        });
    }

    // Page Load Lock Check
    if (typeof isLocked !== 'undefined' && isLocked) {
        const storedPassword = getStoredPassword();
        if (!storedPassword) {
            // No password stored, show unlock modal
            textarea.disabled = true;
            textarea.placeholder = 'This note is locked. Enter password to view.';
            showUnlockModal();
        } else {
            // Verify stored password silently
            unlockNote(storedPassword).then(success => {
                if (!success) {
                    // Invalid stored password, clear and ask again
                    clearStoredPassword();
                    textarea.disabled = true;
                    textarea.value = '';
                    showUnlockModal('Stored password is invalid');
                }
            });
        }
    }
});
