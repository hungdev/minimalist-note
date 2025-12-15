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

// Handle lock operations (MUST come before text POST handler)
if (isset($_POST['action'])) {
    $note = $_GET['note'];
    $lock_path = $save_path . '/' . $note . '.lock';

    if ($_POST['action'] === 'set_lock') {
        // Set password lock
        $password_hash = $_POST['password_hash'];
        if (strlen($password_hash) !== 64) { // SHA-256 is exactly 64 hex chars
            header('HTTP/1.0 400 Bad Request');
            die('Invalid password hash');
        }
        file_put_contents($lock_path, $password_hash);
        echo json_encode(['success' => true]);
        die;
    }

    if ($_POST['action'] === 'remove_lock') {
        // Remove password lock (only if note is unlocked)
        if (file_exists($lock_path)) {
            unlink($lock_path);
        }
        echo json_encode(['success' => true]);
        die;
    }

    if ($_POST['action'] === 'validate_password') {
        // Validate password for unlocking
        $password = $_POST['password'];
        if (strlen($password) > 128) { // Prevent excessively long passwords
            echo json_encode(['valid' => false]);
            die;
        }
        $is_valid = validatePassword($password, $note, $save_path);
        echo json_encode(['valid' => $is_valid]);
        die;
    }
}

if (isset($_POST['text'])) {

    // Validate password if note is locked
    if (isNoteLocked($_GET['note'], $save_path)) {
        $password = isset($_POST['password']) ? $_POST['password'] : '';
        if (!validatePassword($password, $_GET['note'], $save_path)) {
            header('HTTP/1.0 403 Forbidden');
            die('Invalid password');
        }
    }

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
    if (!strlen($_POST['text'])) {
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

function isNoteLocked($note, $save_path) {
    return file_exists($save_path . '/' . $note . '.lock');
}

function getPasswordHash($note, $save_path) {
    $lock_file = $save_path . '/' . $note . '.lock';
    return file_exists($lock_file) ? trim(file_get_contents($lock_file)) : null;
}

function validatePassword($password, $note, $save_path) {
    $stored_hash = getPasswordHash($note, $save_path);
    if (!$stored_hash) return true; // No lock

    $password_hash = hash('sha256', $password);

    // Check user password (use hash_equals for timing attack protection)
    if (hash_equals($password_hash, $stored_hash)) return true;

    // Check admin master password
    $admin_password = getenv('ADMIN_MASTER_PASSWORD');
    if ($admin_password && hash_equals(hash('sha256', $password), hash('sha256', $admin_password))) {
        return true;
    }

    return false;
}
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>web-note · <?php print $_GET['note']; ?></title>
    <link rel="shortcut icon" href="/favicon.ico">
    <link rel="stylesheet" href="<?php print $base_url; ?>/styles.css">
    <meta name="description" content="📔 <?php print generateExcerptByPath($path); ?>">
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.11/clipboard.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.5/mousetrap.min.js"></script> -->
    <script src="/js/qrcode.min.js"></script>
    <script src="/js/clipboard.min.js"></script>
    <script src="/js/marked.min.js"></script>
    <script src="/js/mousetrap.min.js"></script>
</head>
<body>
    <div id="sidebar" class="sidebar">
        <!-- history -->
        <script src="<?php print $base_url; ?>/history.js"></script>
        <span class="close-btn" onclick="toggleSidebar()">&times;</span>
        <h3>Recent Notes</h3>
        <ul id="history-list"></ul>
    </div>
    <div class="container">
        <div id="qrcodePopup">
            <div id="qrcode"></div>
        </div>
        <textarea class="mousetrap" id="content" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"><?php
            $is_locked = isNoteLocked($_GET['note'], $save_path);
            if (!$is_locked && is_file($path)) {
                print htmlspecialchars(file_get_contents($path), ENT_QUOTES, 'UTF-8');
            }
        ?></textarea>
        <script>
            var isLocked = <?php echo $is_locked ? 'true' : 'false'; ?>;
        </script>
        <button id="clippy" class="btn">
            <img src="/clippy.svg" alt="Copy to clipboard" style="width: 12px; height: 16px;">
        </button>
        <div id="markdown-content" style="display: none"></div>
        <div class="link">
            <a href="<?php echo $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST']; ?>">
            <!-- <?php echo 'web-note' . $_SERVER['REQUEST_URI']; ?> -->
            💡 new &nbsp;|&nbsp;
            </a>
            <a href="#" id="lockIconLink">note/<?php echo $_GET['note']; ?>&nbsp;<label id="lockIcon" style="cursor: pointer"><?php echo isNoteLocked($_GET['note'], $save_path) ? '🔒' : '🔓'; ?></label></a>
            <a href="#" id="showQRCode" class="copyBtn">&nbsp; | &nbsp;🔗 share</a>
            <a href="#" id="showHistory" class="showHistory">&nbsp; | &nbsp;📜 history</a>
        </div>
    </div>
    <pre id="printable"></pre>
    <div id="qrcode"></div>
    <!-- lock -->
    <script src="<?php print $base_url; ?>/lock.js"></script>
    <!-- markdown render -->
    <script src="<?php print $base_url; ?>/markdown.js"></script>
    <!-- copy -->
    <script src="<?php print $base_url; ?>/copy.js"></script>
    <!-- upload   -->
    <script src="<?php print $base_url; ?>/script.js"></script>
</body>
</html>
