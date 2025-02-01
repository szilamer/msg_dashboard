from fastapi import FastAPI
from fastapi.middleware.wsgi import WSGIMiddleware
from main import app

# Create a WSGI wrapper for the FastAPI application
def create_app():
    wsgi_app = WSGIMiddleware(app)
    return wsgi_app

# Export the WSGI application
application = create_app() 