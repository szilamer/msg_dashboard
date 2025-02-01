#!/bin/bash
cd backend
gunicorn wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --worker-class uvicorn.workers.UvicornWorker 