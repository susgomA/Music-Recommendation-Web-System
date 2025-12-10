# start.sh
#!/usr/bin/env bash
set -o errexit

# Use the full path here: FolderName.Filename:AppInstanceName
gunicorn --workers 4 --bind 0.0.0.0:$PORT 'Project System.app:app'