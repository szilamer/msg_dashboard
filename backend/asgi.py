from fastapi import FastAPI
from main import app
import uvicorn

# Export the ASGI application
application = app

if __name__ == "__main__":
    uvicorn.run(application, host="0.0.0.0", port=8000) 