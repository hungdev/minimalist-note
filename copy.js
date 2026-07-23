var qrGeneratedFor = "";

var clipboardForContent = new ClipboardJS(".btn", {
    text: function() {
        return document.getElementById("content").value;
    }
});

clipboardForContent.on("success", function(event) {
    showNotification("Note copied");
    event.clearSelection();
});

var clipboard = new ClipboardJS(".copyBtn", {
    text: getUrl
});

clipboard.on("success", function(event) {
    showNotification("Link copied");
    event.clearSelection();
});

clipboard.on("error", function() {
    showNotification("Could not copy link");
});

document.getElementById("showQRCode").addEventListener("click", function(event) {
    event.preventDefault();
    var popup = document.getElementById("qrcodePopup");
    var qrTarget = document.getElementById("qrcode");
    var url = getUrl();

    if (qrGeneratedFor !== url && typeof QRCode !== "undefined") {
        qrTarget.innerHTML = "";
        new QRCode(qrTarget, {
            text: url,
            width: 168,
            height: 168,
            colorDark: "#191724",
            colorLight: "#ffffff"
        });
        qrGeneratedFor = url;
    }

    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
});

document.addEventListener("click", function(event) {
    if (!event.target.closest("#qrcodePopup") && !event.target.closest("#showQRCode")) {
        closeQrPopup();
    }
});

function closeQrPopup() {
    var popup = document.getElementById("qrcodePopup");
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
}

function showNotification(message) {
    var existing = document.querySelector(".notify");
    if (existing) existing.remove();

    var notify = document.createElement("div");
    notify.className = "notify";
    notify.setAttribute("role", "status");
    notify.textContent = message;
    document.body.appendChild(notify);
    window.setTimeout(function() {
        notify.remove();
    }, 1300);
}

function getUrl() {
    var url = new URL(window.location.href);
    if (typeof previewOpen !== "undefined" && previewOpen) {
        url.searchParams.set("marked", "");
    } else {
        url.searchParams.delete("marked");
    }
    return url.toString();
}

Mousetrap.bind("mod+l", function() {
    document.getElementById("showQRCode").click();
    return false;
});

Mousetrap.bind("esc", function() {
    closeQrPopup();
    if (document.getElementById("sidebar").classList.contains("open")) toggleSidebar(false);
    return true;
});
