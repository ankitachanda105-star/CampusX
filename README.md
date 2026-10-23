# CampusX — Smart Campus Operations & Intelligence Platform
### Lovely Professional University (LPU), Phagwara, Punjab

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)

**CampusX** is a unified, full-stack smart campus management and operations platform engineered specifically for **Lovely Professional University (LPU)**. It integrates multi-role service delivery, incident triage, virtual queuing, venue reservations, predictive equipment maintenance, real-time administrative analytics, and a grounded AI assistant.

---

## 🏛️ System Architecture

```text
                                  ┌──────────────────────────────┐
                                  │   CampusX Web SPA (React 18) │
                                  │   TailwindCSS + Lucide Icons │
                                  └──────────────┬───────────────┘
                                                 │ HTTP / REST
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │ Node.js / Express Backend    │
                                  │ JWT Auth + RBAC Middleware   │
                                  └──────┬───────────────┬───────┘
                                         │               │
                     Mongoose / MongoDB  │               │ HTTP REST
                                         ▼               ▼
                      ┌──────────────────────┐  ┌──────────────────────────────┐
                      │ MongoDB Database     │  │ Python AI Microservice       │
                      │ (Live & In-Memory)   │  │ FastAPI + Scikit-Learn (8000)│
                      └──────────────────────┘  └──────────────────────────────┘
```

---

## 🚀 Key Modules & Features

### 1. Role-Based Access Control (RBAC) & Foundation
* **4 Dedicated Portals**: Student, Faculty/Staff, Admin, and Super Admin.
* Multi-factor identifier login supporting LPU Registration/Employee IDs (e.g. `12345678`, `EMP20491`, `ADM10822`, `DIR001`) and `@lpu.in` institutional emails.
* Institutional branding: LPU Maroon (`#6e1324`) and Gold (`#eab308`).

### 2. Smart Complaint Management & AI Routing
* Student reporting with LPU academic block and room selectors.
* **Real-time AI Auto-Classification**: Automatically predicts category, urgency priority, and department dispatch via TF-IDF + Logistic Regression.
* Visual chronological audit timeline for resolution tracking.

### 3. Smart Queue (Virtual Token Management)
* Virtual token generation (`A-001`, `E-001`, `S-001`) for Accounts Office, Examination Cell, and Student Welfare.
* Proximity alert notifications when within 3 positions of being called.
* Administrative queue call-next desk console.

### 4. College Service Hub
* Seeded catalogue of 7 student services (Bonafide, Transcripts, Fee Slip, Character Certificate, Gate Pass, etc.).
* 5-stage sequential approval stepper: `Submitted` $\rightarrow$ `Document Verified` $\rightarrow$ `Department Approval` $\rightarrow$ `HOD Approval` $\rightarrow$ `Certificate Generated`.

### 5. Smart Resource Management & Collision Prevention
* Live directory of classrooms, computer labs, auditoriums, and sports facilities.
* Faculty venue reservation with automated temporal collision detection (`HTTP 409 Conflict`).
* 30-day facility utilization telemetry and KPI analytics.

### 6. Predictive Maintenance & Risk Scoring
* Equipment inventory linked to campus locations (projectors, ACs, workstations, UPS).
* ML-driven failure risk evaluation (0–100 scale) based on 90-day failure velocity, maintenance overdue intervals, and asset age.
* Recharts 6-month failure frequency histograms and service certification.

### 7. Central Admin Operations Dashboard & Live Heuristics
* Single-aggregation live KPI telemetry cards (active complaints, queue load, space utilization, high-risk assets).
* 4 Recharts visual charts: Complaints by Department, 30-Day Trend, Status Donut, and Space Utilization by Block.
* **AI Insights Panel**: Rule-based live anomaly detection for queue surges, repeated equipment breakdowns ($\ge 3$ in 30 days), and underutilized venues.

### 8. Grounded AI Campus Assistant
* Retrieval-Augmented Generation (RAG) assistant answering student and admin queries directly from MongoDB.
* Pre-fills complaint forms and navigates dashboard views.
* Zero-hallucination guarantee with verifiable citation tags.

---

## 🤖 Machine Learning Model Benchmarks

| Task | Architecture | Metric | Score | SLA Target |
| :--- | :--- | :---: | :---: | :--- |
| **Category Routing** | TF-IDF (1-2 ngrams) + Logistic Regression | Accuracy / Macro F1 | **1.00 / 1.00** | $>0.90$ across 11 categories |
| **Priority Prediction** | Multi-Modal Feature Fusion + Balanced Logistic Regression | Accuracy / Critical Recall | **96.36% / 1.00** | **0 Critical false negatives** |
| **Queue Wait Time** | Random Forest Regressor ($n=150$) | $R^2$ / MAE / RMSE | **0.9793 / 3.44m / 5.49m** | $\text{MAE} < 5.0\text{ min}$ |
| **Maintenance Risk** | Random Forest Regressor ($n=150$) | $R^2$ / MAE / RMSE | **0.9585 / 4.14pts / 5.29pts** | $\text{MAE} < 5.0\text{ pts}$ (0-100 scale) |

---

## 🔑 Demo Login Credentials

| Role | Identifier (Reg No / ID) | Password | Default Dashboard |
| :--- | :--- | :--- | :--- |
| **Student** | `12345678` | `Student@123` | `/student/dashboard` |
| **Faculty / Staff** | `EMP20491` | `Faculty@123` | `/faculty/dashboard` |
| **Admin** | `ADM10822` | `Admin@123` | `/admin/dashboard` |
| **Super Admin** | `DIR001` | `SuperAdmin@123` | `/superadmin/dashboard` |

---

## 🛠️ Quick Start & Running Locally

### 1. Clone the Repository
```bash
git clone https://github.com/ankitachanda105-star/CampusX.git
cd CampusX
```

### 2. Start the AI Microservice (Python)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```
Interactive API docs available at `http://127.0.0.1:8000/docs`.

### 3. Start the Backend API (Node.js)
```bash
cd ../backend
npm install
npm run seed     # Seeds LPU default accounts and master resources
node server.js   # Runs on port 5000 (MongoDB auto-connects with in-memory fallback)
```

### 4. Start the Frontend SPA (React / Vite)
```bash
cd ../frontend
npm install
npm run dev      # Runs on http://localhost:5173
```

---

## 🧪 Testing

```bash
# Run backend Jest + Supertest test suite (57 tests)
cd backend
npm test

# Run Python pytest suite (8 tests)
cd ../ai-service
pytest -v
```

Full test execution metrics and defect logs are documented in [`TEST_REPORT.md`](./TEST_REPORT.md).

---

## 📄 License
This project is developed as part of academic coursework for Lovely Professional University. Released under the MIT License.
