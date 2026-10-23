# CampusX — AI Microservice (Lovely Professional University)

The intelligent machine learning microservice for **CampusX** powering automated complaint categorization, hazard & priority prediction, dynamic queue wait-time estimation, and predictive equipment maintenance risk scoring for **Lovely Professional University (LPU), Phagwara, Punjab**.

---

## 1. Architecture & Models Overview

| Endpoint | Task | Model Architecture | Key Features Engineered | Target Output |
| :--- | :--- | :--- | :--- | :--- |
| **`POST /classify`** | Complaint Routing | TF-IDF Vectorizer + Multinomial Logistic Regression | Unigram + bigram ngrams, LPU campus block normalization, department mapping | `category`, `priority`, `department`, `reason` |
| **`POST /priority`** | Urgency Evaluation | Multi-modal Classifier (Logistic Regression / RF) | Space density tier (Auditorium vs Lab vs Single Room), affected user count, hazard flags | `priority` (`Low`, `Medium`, `High`, `Critical`), `reason` |
| **`POST /queue-wait`** | Queue Regression | Random Forest Regressor | Baseline service ratio, student-to-counter density, cyclical time-of-day peak multipliers, office congestion factors | `estimated_wait_minutes`, `reason` |
| **`POST /maintenance-risk`**| Equipment Wear | Random Forest Regressor | Acute 90-day failure velocity, service overdue elapsed days, duty cycle category, failure acceleration term | `risk_score` (0–100), `risk_level`, `reason` |

---

## 2. Retraining the Models

All synthetic datasets are inspectable CSV files located in `/ai-service/data/`. To regenerate datasets or retrain models:

### Step 1: Regenerate Synthetic Datasets (Optional)
```bash
python generate_datasets.py
```
This produces:
- `data/complaints_dataset.csv` (272 realistic LPU complaint tickets)
- `data/queue_dataset.csv` (360 real-world queue interaction samples)
- `data/maintenance_dataset.csv` (320 equipment operational histories)

### Step 2: Retrain Complaint Category & Priority Classifier
```bash
python train_classifier.py
```
Outputs precision, recall, and F1-score across all 11 LPU operational categories, saving:
- `models/tfidf_vectorizer.joblib`
- `models/category_model.joblib`
- `models/priority_model.joblib`
- `models/priority_feature_cols.joblib`

### Step 3: Retrain Queue Wait Time Model
```bash
python train_queue_model.py
```
Evaluates $R^2$ and MAE against historical queue trends, saving:
- `models/queue_model.joblib`
- `models/queue_feature_cols.joblib`

### Step 4: Retrain Predictive Maintenance Model
```bash
python train_maintenance_model.py
```
Evaluates risk score predictions against equipment wear profiles, saving:
- `models/maintenance_model.joblib`
- `models/maintenance_feature_cols.joblib`

---

## 3. Running the Microservice

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```
Interactive API documentation will be available at `http://127.0.0.1:8000/docs`.

---

## 4. Health Check
```bash
curl http://127.0.0.1:8000/health
```
Expected response:
```json
{
  "status": "healthy",
  "university": "Lovely Professional University",
  "location": "Phagwara, Punjab, India - 144411",
  "models_loaded": {
    "category_classifier": true,
    "priority_predictor": true,
    "queue_regressor": true,
    "maintenance_regressor": true
  },
  "version": "1.0.0"
}
```
