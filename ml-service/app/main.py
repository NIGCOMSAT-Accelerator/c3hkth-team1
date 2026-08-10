from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.config import get_settings
from app.model_service import ModelNotLoadedError, ModelService
from app.schemas import HealthResponse, PredictionRequest, PredictionResponse

model_service: ModelService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model_service
    settings = get_settings()
    service = ModelService(
        model_path=settings.model_path,
        low_risk_threshold=settings.low_risk_threshold,
        high_risk_threshold=settings.high_risk_threshold,
    )
    try:
        service.load()
    except ModelNotLoadedError:
        pass
    model_service = service
    yield
    model_service = None


app = FastAPI(title="AquaWatch Risk Inference Service", lifespan=lifespan)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=bool(model_service and model_service.is_loaded))


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    if model_service is None or not model_service.is_loaded:
        raise HTTPException(status_code=503, detail="model is not loaded")

    return model_service.predict(request)
