#!/bin/sh
set -e

# ensure sqlite file exists when bind-mounted from host
if [ ! -f /app/db.sqlite3 ]; then
  touch /app/db.sqlite3 || true
fi

# Apply migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start server: use runserver when DEBUG enabled, otherwise gunicorn
if [ "${DEBUG:-True}" = "True" ] || [ "${DEBUG:-1}" = "1" ]; then
  exec python manage.py runserver 0.0.0.0:8000
else
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
