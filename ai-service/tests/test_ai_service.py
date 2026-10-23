import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app

client = TestClient(app)

VALID_CATEGORIES = [
    'Equipment', 'Network', 'Electrical', 'Plumbing',
    'Cleanliness', 'Civil', 'Academic Labs', 'Hostel',
    'Academics', 'Security', 'Finance', 'General Operations'
]
VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH']

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["university"] == "Lovely Professional University"
    assert data["models_loaded"]["category_classifier"] is True
    assert data["models_loaded"]["priority_predictor"] is True
    assert data["models_loaded"]["queue_regressor"] is True
    assert data["models_loaded"]["maintenance_regressor"] is True

def test_classify_complaint_network():
    payload = {
        "title": "Wi-Fi disconnected in library",
        "description": "Internet connection drops every few minutes in the central reading hall.",
        "location": "Central Library"
    }
    response = client.post("/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["category"] in VALID_CATEGORIES
    assert data["category"] == "Network"
    assert data["department"] == "IT Services"
    assert data["priority"] in VALID_PRIORITIES
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["reason"]) > 0

def test_classify_complaint_hazard_priority():
    payload = {
        "title": "Switchboard sparking with smoke",
        "description": "Electrical switchboard is sparking violently with smoke emitting in corridor.",
        "location": "Block 34 - Corridor 2"
    }
    response = client.post("/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["priority"] in ['High', 'Critical']
    assert "hazard" in data["reason"].lower() or "critical" in data["reason"].lower() or "high" in data["reason"].lower()

def test_predict_priority_endpoint():
    payload = {
        "category": "Electrical",
        "location": "Shanti Devi Mittal Auditorium",
        "affected_users": 500,
        "complaint_text": "Stage main power breaker tripped"
    }
    response = client.post("/priority", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["priority"] in VALID_PRIORITIES
    assert data["affected_users"] == 500

def test_queue_wait_zero_ahead():
    payload = {
        "people_ahead": 0,
        "active_counters": 2,
        "avg_service_time_minutes": 8.0,
        "time_of_day_hour": 11,
        "office_type": "Accounts Office"
    }
    response = client.post("/queue-wait", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["estimated_wait_minutes"] == 0

def test_queue_wait_positive_load():
    payload = {
        "people_ahead": 6,
        "active_counters": 2,
        "avg_service_time_minutes": 8.0,
        "time_of_day_hour": 12,
        "office_type": "Examination Cell"
    }
    response = client.post("/queue-wait", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["estimated_wait_minutes"] > 0
    assert data["estimated_wait_minutes"] < 120
    assert "Examination Cell" in data["reason"]

def test_maintenance_risk_low():
    payload = {
        "equipment_age_days": 60,
        "failures_last_90_days": 0,
        "days_since_last_maintenance": 15,
        "usage_category": "Standard",
        "equipment_type": "Projector"
    }
    response = client.post("/maintenance-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_level"] in VALID_RISK_LEVELS
    assert data["risk_level"] == "LOW"

def test_maintenance_risk_high():
    payload = {
        "equipment_age_days": 1100,
        "failures_last_90_days": 5,
        "days_since_last_maintenance": 240,
        "usage_category": "Heavy Duty",
        "equipment_type": "Air Conditioner"
    }
    response = client.post("/maintenance-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["risk_score"] >= 70
    assert data["risk_level"] == "HIGH"
    assert "Immediate servicing" in data["recommended_action"] or len(data["recommended_action"]) > 0
