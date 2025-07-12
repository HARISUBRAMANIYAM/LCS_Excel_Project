# from fastapi import APIRouter
# from api.router import auth as auth_router
# from api.router import pf as pf_router

# router = APIRouter()

# router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
# router.include_router(pf_router, prefix="/pf", tags=["providentfund"])

from fastapi import APIRouter
from api.router import auth, pf,esi,dashboard # import modules, not APIRouter instances

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(pf.router, prefix="/pf", tags=["ProvidentFund"])
router.include_router(esi.router, prefix="/esi", tags=["ESI"])
router.include_router(dashboard.router,prefix="/dashboard",tags=["Dashboard"])

