var previewOpen = false;

function renderPreviewContent() {
    var markdownContent = document.getElementById("markdown-content");
    var markdownText = document.getElementById("content").value;

    if (!markdownText.trim()) {
        markdownContent.innerHTML = '<p class="preview-empty">Your preview will appear here.</p>';
        return;
    }

    markdownContent.innerHTML = marked.parse(markdownText);
    markdownContent.querySelectorAll("img").forEach(function(image) {
        if (image.alt && image.alt.endsWith("%")) {
            image.style.width = image.alt;
            image.alt = image.title || "";
        }
    });
    addCodeCopyHandlers(markdownContent);
}

function addCodeCopyHandlers(root) {
    root.querySelectorAll("pre").forEach(function(element) {
        element.title = "Click to copy";
        element.addEventListener("click", async function() {
            var code = this.querySelector("code");
            var text = (code ? code.textContent : this.textContent).trim();
            try {
                await copyText(text);
                showNotification("Code copied");
            } catch (error) {
                console.error("Copy failed:", error);
            }
        });
    });
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    var fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.style.position = "fixed";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
}

function setPreview(open, updateUrl) {
    previewOpen = open;
    document.body.classList.toggle("preview-open", open);

    var previewPane = document.getElementById("previewPane");
    var previewButton = document.getElementById("renderMarkdown");
    previewPane.setAttribute("aria-hidden", String(!open));
    previewButton.setAttribute("aria-pressed", String(open));

    if (typeof applySettings === "function") {
        window.requestAnimationFrame(applySettings);
    }

    if (open) {
        renderPreviewContent();
    } else {
        document.getElementById("content").focus();
    }

    if (updateUrl !== false) {
        var url = new URL(window.location.href);
        if (open) {
            url.searchParams.set("marked", "");
        } else {
            url.searchParams.delete("marked");
        }
        history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
}

function renderMarkdown() {
    setPreview(!previewOpen, true);
}

document.getElementById("renderMarkdown").addEventListener("click", function(event) {
    event.preventDefault();
    renderMarkdown();
});

document.getElementById("content").addEventListener("input", function() {
    if (previewOpen) {
        renderPreviewContent();
    }
});

document.getElementById("content").addEventListener("keydown", function(event) {
    if (event.key !== "Tab") return;
    event.preventDefault();

    var start = this.selectionStart;
    var end = this.selectionEnd;
    var value = this.value;

    if (event.shiftKey) {
        var lineStart = value.lastIndexOf("\n", start - 1) + 1;
        var selectedStart = lineStart;
        var selectedEnd = end;
        var selected = value.substring(selectedStart, selectedEnd);
        var updated = selected.replace(/^ {1,4}/gm, "");
        this.value = value.substring(0, selectedStart) + updated + value.substring(selectedEnd);
        this.selectionStart = Math.max(selectedStart, start - Math.min(4, start - lineStart));
        this.selectionEnd = selectedStart + updated.length;
    } else if (start === end) {
        this.value = value.substring(0, start) + "    " + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
    } else {
        var blockStart = value.lastIndexOf("\n", start - 1) + 1;
        var block = value.substring(blockStart, end);
        var indented = block.replace(/^/gm, "    ");
        this.value = value.substring(0, blockStart) + indented + value.substring(end);
        this.selectionStart = start + 4;
        this.selectionEnd = blockStart + indented.length;
    }

    this.dispatchEvent(new Event("input", { bubbles: true }));
});

Mousetrap.bind("mod+e", function() {
    renderMarkdown();
    return false;
});

setPreview(new URL(window.location.href).searchParams.has("marked"), false);
