import os
import sys
import types

# AppLocker / WDAC compatibility hook for Python 3.14 Windows
if 'sklearn.svm._libsvm' not in sys.modules:
    _m = types.ModuleType('sklearn.svm._libsvm')
    sys.modules['sklearn.svm._libsvm'] = _m
    sys.modules['sklearn.svm._libsvm_sparse'] = _m

import joblib
import numpy as np
import pandas as pd
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy.sparse import hstack

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, 'models')

app = FastAPI(
    title="CampusX AI Microservice",
    description="Intelligent Machine Learning Layer for Lovely Professional University (LPU)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Department Mapping Config per LPU campus.js
DEPARTMENTS = {
    'Equipment': 'IT Services',
    'Network': 'IT Services',
    'Electrical': 'Maintenance/Electrical',
    'Plumbing': 'Maintenance/Electrical',
    'Cleanliness': 'Housekeeping',
    'Civil': 'Maintenance/Electrical',
    'Academic Labs': 'School of Computer Science & Engineering',
    'Hostel': 'Hostel Administration',
    'Academics': 'Examination Cell',
    'Security': 'Security',
    'Finance': 'Accounts/Finance',
    'General Operations': 'Student Welfare'
}

# Global in-memory model cache
MODELS = {}

def load_models():
    try:
        MODELS['tfidf'] = joblib.load(os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib'))
        MODELS['category'] = joblib.load(os.path.join(MODEL_DIR, 'category_model.joblib'))
        MODELS['priority'] = joblib.load(os.path.join(MODEL_DIR, 'priority_model.joblib'))
        MODELS['priority_cols'] = joblib.load(os.path.join(MODEL_DIR, 'priority_feature_cols.joblib'))
        MODELS['queue'] = joblib.load(os.path.join(MODEL_DIR, 'queue_model.joblib'))
        MODELS['queue_cols'] = joblib.load(os.path.join(MODEL_DIR, 'queue_feature_cols.joblib'))
        MODELS['maintenance'] = joblib.load(os.path.join(MODEL_DIR, 'maintenance_model.joblib'))
        MODELS['maintenance_cols'] = joblib.load(os.path.join(MODEL_DIR, 'maintenance_feature_cols.joblib'))
        print("All machine learning models and schemas successfully loaded into memory.", flush=True)
    except Exception as e:
        print(f"Warning: Failed to load some models from {MODEL_DIR}: {e}", flush=True)

load_models()

# ==========================================
# Pydantic Schemas
# ==========================================

class ClassifyRequest(BaseModel):
    title: str = Field(..., example="AC not cooling in 32-401")
    description: str = Field(..., example="Air conditioner blower runs but no cool air during afternoon lecture.")
    location: str = Field(..., example="Block 32 - Room 401")

class PriorityRequest(BaseModel):
    category: str = Field(..., example="Electrical")
    location: str = Field(..., example="Block 32 - Room 401")
    affected_users: Optional[int] = Field(default=None, example=80)
    complaint_text: Optional[str] = Field(default="", example="AC not cooling and switch sparking")

class QueueWaitRequest(BaseModel):
    people_ahead: int = Field(..., ge=0, example=5)
    active_counters: int = Field(..., ge=1, example=2)
    avg_service_time_minutes: float = Field(..., gt=0, example=8.0)
    time_of_day_hour: Optional[int] = Field(default=11, example=11)
    office_type: Optional[str] = Field(default="Accounts Office", example="Accounts Office")

class MaintenanceRiskRequest(BaseModel):
    equipment_age_days: int = Field(..., ge=0, example=720)
    failures_last_90_days: int = Field(..., ge=0, example=3)
    days_since_last_maintenance: int = Field(..., ge=0, example=185)
    usage_category: Optional[str] = Field(default="Heavy Duty", example="Heavy Duty")
    equipment_type: Optional[str] = Field(default="Air Conditioner", example="Air Conditioner")

# ==========================================
# Endpoints
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "university": "Lovely Professional University",
        "location": "Phagwara, Punjab, India - 144411",
        "models_loaded": {
            "category_classifier": "category" in MODELS,
            "priority_predictor": "priority" in MODELS,
            "queue_regressor": "queue" in MODELS,
            "maintenance_regressor": "maintenance" in MODELS
        },
        "version": "1.0.0"
    }

def infer_affected_users(location: str) -> int:
    loc = location.lower()
    if 'auditorium' in loc:
        return 500
    elif 'library' in loc:
        return 120
    elif 'seminar' in loc:
        return 180
    elif 'arena' in loc or 'sports' in loc:
        return 150
    elif 'lab' in loc:
        return 60
    elif 'room' in loc or 'class' in loc:
        return 60
    elif 'bh-' in loc or 'gh-' in loc or 'hostel' in loc:
        return 20
    return 10

def detect_hazard(text: str) -> int:
    txt = text.lower()
    hazard_words = ['spark', 'fire', 'smoke', 'burning', 'shock', 'short circuit',
                    'flood', 'burst', 'trapped', 'gas', 'fissure', 'collapse']
    return 1 if any(w in txt for w in hazard_words) else 0

def get_location_tier(loc: str) -> int:
    loc_str = loc.lower()
    if any(w in loc_str for w in ['auditorium', 'library', 'lab', 'seminar', 'arena', 'hall']):
        return 3
    elif any(w in loc_str for w in ['hostel', 'bh-', 'gh-', 'dining', 'court', 'corridor']):
        return 2
    return 1

@app.post("/classify")
def classify_complaint(req: ClassifyRequest):
    if 'category' not in MODELS or 'tfidf' not in MODELS:
        raise HTTPException(status_code=503, detail="Classification models not loaded.")

    combined_text = f"{req.title} {req.description} {req.location}".lower()
    X_tfidf = MODELS['tfidf'].transform([combined_text])

    # 1. Category Prediction
    pred_cat = MODELS['category'].predict(X_tfidf)[0]
    cat_probs = MODELS['category'].predict_proba(X_tfidf)[0]
    confidence = float(np.max(cat_probs))

    # Map department
    department = DEPARTMENTS.get(pred_cat, 'Student Welfare')

    # 2. Priority Prediction
    affected = infer_affected_users(req.location)
    is_haz = detect_hazard(combined_text)
    loc_tier = get_location_tier(req.location)

    # Build tabular feature vector according to trained schema
    feature_cols = MODELS['priority_cols']
    tab_data = {col: 0.0 for col in feature_cols}
    tab_data['loc_tier'] = float(loc_tier)
    tab_data['affected_norm'] = float(np.log1p(affected))
    tab_data['hazard_flag'] = float(is_haz)

    cat_dummy_key = f"cat_{pred_cat}"
    if cat_dummy_key in tab_data:
        tab_data[cat_dummy_key] = 1.0

    tab_values = np.array([[tab_data[col] for col in feature_cols]])
    X_priority = hstack([X_tfidf, tab_values])
    pred_priority = MODELS['priority'].predict(X_priority)[0]

    # Format Title Case for consistency with MongoDB schema
    pred_priority_title = str(pred_priority).capitalize()

    # 3. Formulate Human-Readable Reason
    urgency_tag = "Critical safety hazard" if is_haz else f"{pred_priority_title} urgency"
    reason = (
        f"Classified as {pred_cat} ({department}) with {pred_priority_title} priority. "
        f"{urgency_tag} in {req.location} affecting approximately {affected} campus users "
        f"(confidence: {confidence * 100:.1f}%)."
    )

    return {
        "success": True,
        "category": pred_cat,
        "priority": pred_priority_title,
        "department": department,
        "confidence": round(confidence, 4),
        "reason": reason
    }

@app.post("/priority")
def predict_priority(req: PriorityRequest):
    if 'priority' not in MODELS or 'tfidf' not in MODELS:
        raise HTTPException(status_code=503, detail="Priority model not loaded.")

    combined_text = f"{req.category} {req.location} {req.complaint_text}".lower()
    X_tfidf = MODELS['tfidf'].transform([combined_text])

    affected = req.affected_users if req.affected_users is not None else infer_affected_users(req.location)
    is_haz = detect_hazard(combined_text)
    loc_tier = get_location_tier(req.location)

    feature_cols = MODELS['priority_cols']
    tab_data = {col: 0.0 for col in feature_cols}
    tab_data['loc_tier'] = float(loc_tier)
    tab_data['affected_norm'] = float(np.log1p(affected))
    tab_data['hazard_flag'] = float(is_haz)

    cat_dummy_key = f"cat_{req.category}"
    if cat_dummy_key in tab_data:
        tab_data[cat_dummy_key] = 1.0

    tab_values = np.array([[tab_data[col] for col in feature_cols]])
    X_priority = hstack([X_tfidf, tab_values])
    pred_priority = MODELS['priority'].predict(X_priority)[0]
    pred_priority_title = str(pred_priority).capitalize()

    reason = (
        f"Assigned {pred_priority_title} priority: "
        f"{'Urgent hazard flagged, ' if is_haz else ''}"
        f"space tier {loc_tier} with ~{affected} users in {req.location}."
    )

    return {
        "success": True,
        "priority": pred_priority_title,
        "affected_users": affected,
        "is_hazard": bool(is_haz),
        "reason": reason
    }

@app.post("/queue-wait")
def estimate_queue_wait(req: QueueWaitRequest):
    if 'queue' not in MODELS:
        raise HTTPException(status_code=503, detail="Queue model not loaded.")

    people_ahead = max(0, req.people_ahead)
    counters = max(1, req.active_counters)
    duration = max(1.0, req.avg_service_time_minutes)
    hour = req.time_of_day_hour if req.time_of_day_hour is not None else 11
    office = req.office_type or "Accounts Office"

    if people_ahead == 0:
        return {
            "success": True,
            "estimated_wait_minutes": 0,
            "raw_wait": 0.0,
            "reason": f"No queue ahead at {office}. Immediate service available."
        }

    base_ratio = (people_ahead * duration) / counters
    load_per_counter = people_ahead / counters
    is_peak = 1 if hour in [11, 12, 14, 15] else 0
    bottleneck = 1 if (counters == 1 and people_ahead > 3) else 0

    feature_cols = MODELS['queue_cols']
    row_data = {col: 0.0 for col in feature_cols}
    row_data['people_ahead'] = float(people_ahead)
    row_data['active_counters'] = float(counters)
    row_data['avg_service_time_minutes'] = float(duration)
    row_data['time_of_day_hour'] = float(hour)
    row_data['base_ratio'] = float(base_ratio)
    row_data['load_per_counter'] = float(load_per_counter)
    row_data['is_peak_hour'] = float(is_peak)
    row_data['single_counter_bottleneck'] = float(bottleneck)

    office_key = f"office_{office}"
    if office_key in row_data:
        row_data[office_key] = 1.0

    X = np.array([[row_data[col] for col in feature_cols]])
    pred_wait = float(MODELS['queue'].predict(X)[0])
    pred_wait_rounded = max(1, int(round(pred_wait)))

    rush_str = "during peak rush" if is_peak else "normal operating hours"
    reason = (
        f"Estimated ~{pred_wait_rounded} min: {people_ahead} student(s) ahead across {counters} desk(s) "
        f"at {office} ({rush_str}, {duration:.1f}m avg cycle)."
    )

    return {
        "success": True,
        "estimated_wait_minutes": pred_wait_rounded,
        "raw_wait": round(pred_wait, 2),
        "reason": reason
    }

@app.post("/maintenance-risk")
def calculate_maintenance_risk(req: MaintenanceRiskRequest):
    if 'maintenance' not in MODELS:
        raise HTTPException(status_code=503, detail="Maintenance model not loaded.")

    failures = max(0, req.failures_last_90_days)
    days_since = max(0, req.days_since_last_maintenance)
    age_days = max(0, req.equipment_age_days)
    usage_cat = req.usage_category or "Heavy Duty"
    eq_type = req.equipment_type or "Air Conditioner"

    failure_vel = min(45.0, failures * 15.0)
    overdue_90 = 1 if days_since > 90 else 0
    overdue_180 = 1 if days_since > 180 else 0
    wear_inter = (failures * days_since) / 30.0
    is_heavy = 1 if usage_cat == "Heavy Duty" else 0

    feature_cols = MODELS['maintenance_cols']
    row_data = {col: 0.0 for col in feature_cols}
    row_data['equipment_age_days'] = float(age_days)
    row_data['failures_last_90_days'] = float(failures)
    row_data['days_since_last_maintenance'] = float(days_since)
    row_data['failure_velocity'] = float(failure_vel)
    row_data['service_overdue_90'] = float(overdue_90)
    row_data['service_overdue_180'] = float(overdue_180)
    row_data['wear_interaction'] = float(wear_inter)
    row_data['is_heavy_duty'] = float(is_heavy)

    eq_key = f"eq_{eq_type}"
    if eq_key in row_data:
        row_data[eq_key] = 1.0

    X = np.array([[row_data[col] for col in feature_cols]])
    pred_risk = float(MODELS['maintenance'].predict(X)[0])
    pred_risk_clamped = max(0, min(100, int(round(pred_risk))))

    if pred_risk_clamped >= 70:
        level = "HIGH"
        action = "Immediate servicing required. Multiple recent failures or severely overdue maintenance."
    elif pred_risk_clamped >= 40:
        level = "MEDIUM"
        action = "Inspect during next operational cycle. Schedule preventative calibration."
    else:
        level = "LOW"
        action = "Operating normally. Continue standard preventative maintenance schedule."

    reason = (
        f"{level} RISK ({pred_risk_clamped}/100): {failures} failure(s) in past 90 days, "
        f"{days_since} days since last service, {usage_cat} {eq_type} ({round(age_days / 365, 1)} yrs in service)."
    )

    return {
        "success": True,
        "risk_score": pred_risk_clamped,
        "risk_level": level,
        "recommended_action": action,
        "reason": reason
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
