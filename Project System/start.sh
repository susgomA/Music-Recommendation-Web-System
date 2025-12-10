#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Command to start the Gunicorn web server.
# --workers 4: Starts 4 worker processes for concurrency.
# --bind 0.0.0.0:$PORT: Binds the server to the dynamic port ($PORT) assigned by Render.
# app:app: Specifies the entry point: module 'app' (your app.py) and variable 'app' (your Flask application instance).
gunicorn --workers 4 --bind 0.0.0.0:$PORT app:app