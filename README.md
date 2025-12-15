# 📔 Web-Note

Deploy to coolify using docker-compose.yml

## Notes Storage Configuration

By default, notes are stored at `/home/ubuntu/notes-data` on the server.

### Change Storage Path

To change the notes storage location, edit the `docker-compose.yml` file:

```yaml
services:
  init-notes:
    volumes:
      - /your/path:/notes-data  # Change this path

  web-note:
    volumes:
      - /your/path:/var/www/html/_tmp  # Change this path (must match init-notes)
```

**Example:** Store notes at `/data/my-notes`
```yaml
services:
  init-notes:
    volumes:
      - /data/my-notes:/notes-data

  web-note:
    volumes:
      - /data/my-notes:/var/www/html/_tmp
```

### View Notes on Server

After deployment, SSH into the server and view notes directly:

```bash
# List all notes
ls -la /home/ubuntu/notes-data/

# View content of a note
cat /home/ubuntu/notes-data/<filename>

# Backup notes
tar -czf notes-backup.tar.gz /home/ubuntu/notes-data/
```
