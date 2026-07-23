<?php

// Base URL of the website, without trailing slash.
$base_url = '';

// Path to the directory to save the notes in, without trailing slash.
// Should be outside of the document root, if possible.
$save_path = '_tmp';

$file_limit = getenv('FILE_LIMIT') ?: 100000; // the number of files limit
$single_file_size_limit = getenv('SINGLE_FILE_SIZE_LIMIT') ?: 102400; // the size of single file limit

$files = scandir($save_path);
$fileCount = count($files) - 2;

// Disable caching.
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// If no name is provided or it contains invalid characters or it is too long.
if (!isset($_GET['note']) || !preg_match('/^[a-zA-Z0-9_-]+$/', $_GET['note']) || strlen($_GET['note']) > 64) {

    // Generate a name with 5 random unambiguous characters. Redirect to it.
    header("Location: $base_url/" . substr(str_shuffle('234579abcdefghjkmnpqrstwxyz'), -5));
    die;
}

$path = $save_path . '/' . $_GET['note'];

if (isset($_POST['text'])) {

    // file count limit
    if ($fileCount >= $file_limit) {
        error_log("File limit reached $file_limit");
        header('HTTP/1.0 403 Forbidden');
        die;
    }
    
    // single file size limit
    if (strlen($_POST['text']) > $single_file_size_limit) {
        error_log("File size limit reached $single_file_size_limit");
        header('HTTP/1.0 403 Forbidden');
        die;
    }

    // Update file.
    file_put_contents($path, $_POST['text']);

    // If provided input is empty, delete file.
    if (!strlen($_POST['text']) && is_file($path)) {
        unlink($path);
    }
    die;
}

// Print raw file if the client is curl, wget, or when explicitly requested.
if (isset($_GET['raw']) || strpos($_SERVER['HTTP_USER_AGENT'], 'curl') === 0 || strpos($_SERVER['HTTP_USER_AGENT'], 'Wget') === 0) {
    if (is_file($path)) {
        header('Content-type: text/plain');
        print file_get_contents($path);
    } else {
        header('HTTP/1.0 404 Not Found');
    }
    die;
}

function generateExcerptByPath($p) {
  if (is_file($p)) {
    return _generateExcerpt(file_get_contents($p));
  }
  return '';
}

function _generateExcerpt($text, $length = 150) {
    $excerpt = substr($text, 0, $length);
    if (strlen($text) > $length) {
        $excerpt .= "...";
    }
    return $excerpt;
}
?>

<!DOCTYPE html>
<html data-theme="moon">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#232136">
    <title><?php print htmlspecialchars($_GET['note'], ENT_QUOTES, 'UTF-8'); ?> · write</title>
    <link rel="shortcut icon" href="/favicon.ico">
    <link rel="stylesheet" href="<?php print $base_url; ?>/styles.css?v=write-fork-9">
    <meta name="description" content="📔 <?php print htmlspecialchars(generateExcerptByPath($path), ENT_QUOTES, 'UTF-8'); ?>">
    <script src="/js/qrcode.min.js"></script>
    <script src="/js/clipboard.min.js"></script>
    <script src="/js/marked.min.js"></script>
    <script src="/js/mousetrap.min.js"></script>
</head>
<body>
    <div id="sidebarBackdrop" class="sidebar-backdrop" aria-hidden="true"></div>
    <aside id="sidebar" class="sidebar" aria-label="Recent notes" aria-hidden="true">
        <div class="sidebar-header">
            <div>
                <span class="eyebrow">Library</span>
                <h2>Recent notes</h2>
            </div>
            <button class="icon-button close-btn" type="button" onclick="toggleSidebar()" aria-label="Close history" title="Close history">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
        </div>
        <ul id="history-list"></ul>
        <p id="history-empty" class="history-empty">Notes you open will appear here.</p>
    </aside>

    <main class="workspace">
        <header id="toolbar" class="toolbar">
            <div class="toolbar-side">
                <a id="newNote" class="icon-button" href="<?php echo htmlspecialchars(((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'], ENT_QUOTES, 'UTF-8'); ?>" aria-label="New note" title="New note">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
                </a>
                <button id="clippy" class="icon-button btn" type="button" aria-label="Copy note" title="Copy note">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
                </button>
            </div>

            <div class="document-title" title="note/<?php echo htmlspecialchars($_GET['note'], ENT_QUOTES, 'UTF-8'); ?>">
                <h1><?php echo htmlspecialchars($_GET['note'], ENT_QUOTES, 'UTF-8'); ?></h1>
                <span id="saveStatus" class="save-status" aria-live="polite">Saved</span>
            </div>

            <div class="toolbar-side toolbar-right">
                <button id="renderMarkdown" class="icon-button" type="button" aria-label="Preview" title="Preview (⌘ E)" aria-pressed="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/></svg>
                </button>
                <a href="#" id="showQRCode" class="icon-button copyBtn" aria-label="Copy share link" title="Copy share link (⌘ L)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>
                </a>
                <button id="showHistory" class="icon-button showHistory" type="button" aria-label="Recent notes" title="Recent notes (⌘ K)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v5h5"/><path d="M3.1 13a9 9 0 1 0 .5-5M12 7v5l3 2"/></svg>
                </button>
                <button id="showSettings" class="icon-button" type="button" aria-label="Settings" title="Settings" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.1-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.1.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.1.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.1-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.1.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.1-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.1-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.1.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
        </header>

        <section class="body">
            <div class="editor-pane">
                <div class="editor-shell">
                    <div id="caretMirror" class="caret-mirror" aria-hidden="true"><span id="caretMarker">&#8203;</span></div>
                    <span id="editorCaret" class="editor-caret" aria-hidden="true"></span>
                    <textarea class="mousetrap" id="content" aria-label="Note content" placeholder="Start writing…" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"><?php
                        if (is_file($path)) {
                            print htmlspecialchars(file_get_contents($path), ENT_QUOTES, 'UTF-8');
                        }
                    ?></textarea>
                </div>
            </div>
            <div id="previewPane" class="preview-pane" aria-hidden="true">
                <div class="preview-scroller">
                    <article id="markdown-content" class="preview-card"></article>
                </div>
            </div>
        </section>

        <div id="settingsPanel" class="settings-panel" aria-hidden="true">
            <div class="setting-section">
                <span>Theme</span>
                <div class="theme-options" role="group" aria-label="Theme">
                    <button class="theme-option" type="button" data-theme-choice="main"><i class="theme-swatch swatch-main"></i>Main</button>
                    <button class="theme-option" type="button" data-theme-choice="moon"><i class="theme-swatch swatch-moon"></i>Moon</button>
                    <button class="theme-option" type="button" data-theme-choice="dawn"><i class="theme-swatch swatch-dawn"></i>Dawn</button>
                </div>
            </div>
            <label class="slider-setting">
                <span>Line length <output id="lineWidthOutput">80 characters</output></span>
                <input id="lineWidth" type="range" min="0" max="4" step="1" value="2">
            </label>
            <label class="slider-setting">
                <span>Text size <output id="fontSizeOutput">20 px</output></span>
                <input id="fontSize" type="range" min="0" max="16" step="1" value="7">
            </label>
        </div>

        <div id="qrcodePopup" class="qr-popup" aria-hidden="true">
            <div id="qrcode"></div>
            <p>Scan to open this note</p>
        </div>
    </main>
    <div id="newNoteDialog" class="confirm-dialog" aria-hidden="true">
        <div class="confirm-overlay" data-dialog-cancel></div>
        <div class="confirm-container">
            <div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="newNoteTitle" aria-describedby="newNoteDescription">
                <h2 id="newNoteTitle">Are you sure you want to create a new note?</h2>
                <p id="newNoteDescription">This note already has content. Your current note will remain saved in history.</p>
                <div class="confirm-actions">
                    <button id="cancelNewNote" class="dialog-button secondary-button" type="button">Cancel</button>
                    <button id="confirmNewNote" class="dialog-button primary-button" type="button">Create new note</button>
                </div>
            </div>
        </div>
    </div>
    <pre id="printable"></pre>
    <script src="<?php print $base_url; ?>/history.js?v=write-fork-9"></script>
    <script src="<?php print $base_url; ?>/markdown.js?v=write-fork-9"></script>
    <script src="<?php print $base_url; ?>/copy.js?v=write-fork-9"></script>
    <script src="<?php print $base_url; ?>/script.js?v=write-fork-9"></script>
</body>
</html>
