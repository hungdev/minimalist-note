var textarea = document.getElementById("content");
var printable = document.getElementById("printable");
var saveStatus = document.getElementById("saveStatus");
var toolbar = document.getElementById("toolbar");
var settingsPanel = document.getElementById("settingsPanel");
var settingsButton = document.getElementById("showSettings");
var caretMirror = document.getElementById("caretMirror");
var caretMarker = document.getElementById("caretMarker");
var editorCaret = document.getElementById("editorCaret");
var newNoteButton = document.getElementById("newNote");
var newNoteDialog = document.getElementById("newNoteDialog");
var cancelNewNoteButton = document.getElementById("cancelNewNote");
var confirmNewNoteButton = document.getElementById("confirmNewNote");
var content = textarea.value;
var saveTimer = null;
var toolbarTimer = null;

// These values mirror write-fork/src/web/settings exactly.
var LINE_WIDTHS = [64, 72, 80, 100, 120];
var FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60, 72];
var TYPOGRAPHY = {
    11: { lineHeight: 1.9, letterSpacing: .42, fontWeight: 490 },
    12: { lineHeight: 1.89, letterSpacing: .38, fontWeight: 482 },
    13: { lineHeight: 1.89, letterSpacing: .34, fontWeight: 475 },
    14: { lineHeight: 1.88, letterSpacing: .28, fontWeight: 470 },
    15: { lineHeight: 1.87, letterSpacing: .24, fontWeight: 465 },
    16: { lineHeight: 1.86, letterSpacing: .22, fontWeight: 460 },
    18: { lineHeight: 1.85, letterSpacing: .2, fontWeight: 455 },
    20: { lineHeight: 1.83, letterSpacing: .2, fontWeight: 450 },
    24: { lineHeight: 1.79, letterSpacing: .2, fontWeight: 445 },
    28: { lineHeight: 1.75, letterSpacing: .19, fontWeight: 440 },
    32: { lineHeight: 1.71, letterSpacing: .18, fontWeight: 435 },
    36: { lineHeight: 1.67, letterSpacing: .17, fontWeight: 430 },
    42: { lineHeight: 1.61, letterSpacing: .16, fontWeight: 425 },
    48: { lineHeight: 1.55, letterSpacing: .15, fontWeight: 425 },
    54: { lineHeight: 1.49, letterSpacing: .14, fontWeight: 425 },
    60: { lineHeight: 1.43, letterSpacing: .13, fontWeight: 425 },
    72: { lineHeight: 1.38, letterSpacing: .12, fontWeight: 425 }
};

function setSaveStatus(label, saving) {
    saveStatus.textContent = label;
    saveStatus.classList.toggle("is-saving", Boolean(saving));
}

function updatePrintable(text) {
    printable.textContent = text;
}

function uploadContent(force) {
    if (!force && content === textarea.value) return;

    var nextContent = textarea.value;
    var request = new XMLHttpRequest();
    setSaveStatus("Saving…", true);

    request.open("POST", window.location.href, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
    request.onload = function() {
        if (request.status >= 200 && request.status < 300) {
            content = nextContent;
            setSaveStatus("Saved", false);
        } else {
            setSaveStatus("Save failed", true);
        }
    };
    request.onerror = function() {
        setSaveStatus("Offline", true);
    };
    request.send("text=" + encodeURIComponent(nextContent));
    updatePrintable(nextContent);
}

function scheduleSave() {
    window.clearTimeout(saveTimer);
    setSaveStatus("Edited", true);
    saveTimer = window.setTimeout(function() {
        uploadContent(false);
    }, 650);
}

function resizeTextarea() {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(textarea.scrollHeight, textarea.parentElement.clientHeight) + "px";
}

function updateCustomCaret() {
    var hasCaret = document.activeElement === textarea &&
        textarea.selectionStart === textarea.selectionEnd;

    if (!hasCaret) {
        editorCaret.classList.remove("is-visible");
        return;
    }

    var valueBeforeCaret = textarea.value.slice(0, textarea.selectionStart);
    caretMirror.replaceChildren(
        document.createTextNode(valueBeforeCaret),
        caretMarker
    );

    var mirrorRect = caretMirror.getBoundingClientRect();
    var markerRect = caretMarker.getBoundingClientRect();
    editorCaret.style.left = (markerRect.left - mirrorRect.left) + "px";
    editorCaret.style.top = (markerRect.top - mirrorRect.top) + "px";

    editorCaret.classList.remove("is-visible");
    void editorCaret.offsetWidth;
    editorCaret.classList.add("is-visible");
}

function updateEditorLayout(lineWidth) {
    var containerWidth = textarea.parentElement.clientWidth;
    var edgePadding = 38;
    var availableWidth = Math.max(containerWidth - edgePadding * 2, 0);
    var widthRatio = lineWidth / 120;
    var contentWidth = availableWidth * widthRatio;
    var sidePadding = Math.max(
        Math.round((containerWidth - contentWidth) / 2),
        edgePadding
    );
    document.documentElement.style.setProperty("--editor-side-padding", sidePadding + "px");
}

function dimToolbarLater() {
    window.clearTimeout(toolbarTimer);
    toolbarTimer = window.setTimeout(function() {
        if (!settingsPanel.classList.contains("is-open")) {
            toolbar.classList.add("is-dimmed");
        }
    }, 1300);
}

function showToolbar() {
    toolbar.classList.remove("is-dimmed");
}

function closeSettings() {
    settingsPanel.classList.remove("is-open");
    settingsPanel.setAttribute("aria-hidden", "true");
    settingsButton.setAttribute("aria-expanded", "false");
}

function openNewNoteDialog() {
    newNoteDialog.classList.add("is-open");
    newNoteDialog.setAttribute("aria-hidden", "false");
    document.querySelector(".workspace").inert = true;
    window.requestAnimationFrame(function() {
        cancelNewNoteButton.focus();
    });
}

function closeNewNoteDialog() {
    newNoteDialog.classList.remove("is-open");
    newNoteDialog.setAttribute("aria-hidden", "true");
    document.querySelector(".workspace").inert = false;
    newNoteButton.focus();
}

function applySettings() {
    var stored = {};
    try {
        stored = JSON.parse(localStorage.getItem("write.settings.v1") || "{}");
    } catch (error) {
        stored = {};
    }

    var theme = stored.theme || "moon";
    var lineWidth = stored.lineWidth || 80;
    var fontSize = stored.fontSize || 20;
    if (!LINE_WIDTHS.includes(lineWidth)) lineWidth = 80;
    if (!FONT_SIZES.includes(fontSize)) fontSize = 20;
    var typography = TYPOGRAPHY[fontSize] || TYPOGRAPHY[20];

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--editor-size", fontSize + "px");
    document.documentElement.style.setProperty("--editor-line-height", Math.round(fontSize * typography.lineHeight) + "px");
    document.documentElement.style.setProperty("--editor-letter-spacing", typography.letterSpacing + "px");
    document.documentElement.style.setProperty("--editor-weight", typography.fontWeight);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", theme === "dawn" ? "#faf4ed" : theme === "main" ? "#191724" : "#232136");

    document.getElementById("lineWidth").value = LINE_WIDTHS.indexOf(lineWidth);
    document.getElementById("fontSize").value = FONT_SIZES.indexOf(fontSize);
    document.getElementById("lineWidthOutput").textContent = lineWidth + " characters";
    document.getElementById("fontSizeOutput").textContent = fontSize + " px";
    document.querySelectorAll("[data-theme-choice]").forEach(function(button) {
        button.classList.toggle("is-selected", button.dataset.themeChoice === theme);
    });
    updateEditorLayout(lineWidth);
    resizeTextarea();
    updateCustomCaret();
}

function saveSettings(partial) {
    var current = {};
    try {
        current = JSON.parse(localStorage.getItem("write.settings.v1") || "{}");
    } catch (error) {
        current = {};
    }
    localStorage.setItem("write.settings.v1", JSON.stringify(Object.assign(current, partial)));
    applySettings();
}

textarea.addEventListener("input", function() {
    resizeTextarea();
    updateCustomCaret();
    scheduleSave();
    showToolbar();
    dimToolbarLater();
});

textarea.addEventListener("focus", function() {
    updateCustomCaret();
    dimToolbarLater();
});

textarea.addEventListener("blur", updateCustomCaret);
textarea.addEventListener("click", updateCustomCaret);
textarea.addEventListener("keyup", updateCustomCaret);
textarea.addEventListener("select", updateCustomCaret);
document.addEventListener("selectionchange", function() {
    if (document.activeElement === textarea) updateCustomCaret();
});

document.addEventListener("mousemove", function(event) {
    if (event.clientY < 72) showToolbar();
});

toolbar.addEventListener("mouseenter", showToolbar);

newNoteButton.addEventListener("click", function(event) {
    if (!textarea.value.trim()) return;
    event.preventDefault();
    openNewNoteDialog();
});

cancelNewNoteButton.addEventListener("click", closeNewNoteDialog);

confirmNewNoteButton.addEventListener("click", function() {
    window.location.href = newNoteButton.href;
});

newNoteDialog.querySelector("[data-dialog-cancel]").addEventListener("click", closeNewNoteDialog);

document.addEventListener("keydown", function(event) {
    if (!newNoteDialog.classList.contains("is-open")) return;

    if (event.key === "Escape") {
        event.preventDefault();
        closeNewNoteDialog();
    }

    if (event.key === "Tab") {
        var firstButton = cancelNewNoteButton;
        var lastButton = confirmNewNoteButton;
        if (event.shiftKey && document.activeElement === firstButton) {
            event.preventDefault();
            lastButton.focus();
        } else if (!event.shiftKey && document.activeElement === lastButton) {
            event.preventDefault();
            firstButton.focus();
        }
    }
});

settingsButton.addEventListener("click", function(event) {
    event.stopPropagation();
    var open = !settingsPanel.classList.contains("is-open");
    settingsPanel.classList.toggle("is-open", open);
    settingsPanel.setAttribute("aria-hidden", String(!open));
    settingsButton.setAttribute("aria-expanded", String(open));
    showToolbar();
});

settingsPanel.addEventListener("click", function(event) {
    event.stopPropagation();
});

document.addEventListener("click", function() {
    closeSettings();
});

document.querySelectorAll("[data-theme-choice]").forEach(function(button) {
    button.addEventListener("click", function() {
        saveSettings({ theme: button.dataset.themeChoice });
    });
});

document.getElementById("lineWidth").addEventListener("input", function() {
    saveSettings({ lineWidth: LINE_WIDTHS[Number(this.value)] || 80 });
});

document.getElementById("fontSize").addEventListener("input", function() {
    saveSettings({ fontSize: FONT_SIZES[Number(this.value)] || 20 });
});

Mousetrap.bind("mod+s", function() {
    window.clearTimeout(saveTimer);
    uploadContent(true);
    showNotification("Note saved");
    return false;
});

Mousetrap.bind("mod+k", function() {
    toggleSidebar();
    return false;
});

document.addEventListener("DOMContentLoaded", function() {
    var note = window.location.pathname.split("/").filter(Boolean).pop();
    if (note) addToHistory(note);
    document.getElementById("showHistory").onclick = toggleSidebar;
});

window.addEventListener("resize", function() {
    applySettings();
});
window.addEventListener("beforeunload", function() {
    if (content !== textarea.value) uploadContent(false);
});

applySettings();
updatePrintable(content);
resizeTextarea();
textarea.focus();
dimToolbarLater();

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applySettings);
}
