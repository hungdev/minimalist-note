const HISTORY_KEY = "web_note_history";
const MAX_HISTORY_ITEMS = 30;

function addToHistory(note) {
    let noteHistory = getHistory();
    noteHistory = noteHistory.filter(item => item !== note);
    noteHistory.unshift(note);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(noteHistory.slice(0, MAX_HISTORY_ITEMS)));
    updateSidebar();
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function updateSidebar() {
    const noteHistory = getHistory();
    const historyList = document.getElementById("history-list");
    const emptyState = document.getElementById("history-empty");
    historyList.innerHTML = "";
    emptyState.style.display = noteHistory.length ? "none" : "block";

    noteHistory.forEach(note => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        const removeButton = document.createElement("button");

        link.href = "/" + encodeURIComponent(note);
        link.textContent = note;
        link.title = "Open " + note;

        removeButton.className = "delete-btn";
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", "Remove " + note + " from history");
        removeButton.textContent = "×";
        removeButton.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();
            deleteHistoryItem(note);
        });

        li.append(link, removeButton);
        historyList.appendChild(li);
    });
}

function deleteHistoryItem(note) {
    const updated = getHistory().filter(item => item !== note);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    updateSidebar();
}

function toggleSidebar(force) {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const shouldOpen = typeof force === "boolean" ? force : !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", shouldOpen);
    backdrop.classList.toggle("is-open", shouldOpen);
    sidebar.setAttribute("aria-hidden", String(!shouldOpen));
    document.getElementById("showHistory").classList.toggle("is-selected", shouldOpen);
}

document.getElementById("sidebarBackdrop").addEventListener("click", function() {
    toggleSidebar(false);
});

updateSidebar();
