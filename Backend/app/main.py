from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from database.session import engine
from database.base import Base
from api.routers import router  # single point of import

app = FastAPI(title=settings.PROJECT_NAME)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.10.14:7057"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)

app.include_router(router)  # all subrouters included in one

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="192.168.10.14", port=7056)
