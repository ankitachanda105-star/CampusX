import os
import sys
import types

# AppLocker / WDAC compatibility hook for Python 3.14 Windows
if 'sklearn.svm._libsvm' not in sys.modules:
    _m = types.ModuleType('sklearn.svm._libsvm')
    sys.modules['sklearn.svm._libsvm'] = _m
    sys.modules['sklearn.svm._libsvm_sparse'] = _m

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def train_maintenance_model():
    csv_path = os.path.join(DATA_DIR, 'maintenance_dataset.csv')
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} maintenance records from {csv_path}", flush=True)

    # Feature Engineering
    df['failure_velocity'] = (df['failures_last_90_days'] * 15.0).clip(upper=45.0)
    df['service_overdue_90'] = (df['days_since_last_maintenance'] > 90).astype(int)
    df['service_overdue_180'] = (df['days_since_last_maintenance'] > 180).astype(int)
    df['wear_interaction'] = (df['failures_last_90_days'] * df['days_since_last_maintenance']) / 30.0
    df['is_heavy_duty'] = (df['usage_category'] == 'Heavy Duty').astype(int)

    eq_dummies = pd.get_dummies(df['equipment_type'], prefix='eq', dtype=float)

    feature_df = pd.concat([
        df[['equipment_age_days', 'failures_last_90_days', 'days_since_last_maintenance',
            'failure_velocity', 'service_overdue_90', 'service_overdue_180',
            'wear_interaction', 'is_heavy_duty']],
        eq_dummies
    ], axis=1)

    feature_cols = list(feature_df.columns)
    X = feature_df.values
    y = df['risk_score'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print("\n" + "="*60, flush=True)
    print(" Predictive Maintenance Risk Model Evaluation (Random Forest)", flush=True)
    print("="*60, flush=True)
    print(f"R² Score:              {r2:.4f}", flush=True)
    print(f"Mean Absolute Error:   {mae:.2f} points (0-100 scale)", flush=True)
    print(f"Root Mean Sq Error:    {rmse:.2f} points", flush=True)
    print(f"Sample Predictions vs Actual (First 5 test cases):", flush=True)
    for i in range(min(5, len(y_test))):
        print(f"  Actual: {y_test[i]:5.1f} | Predicted: {y_pred[i]:5.1f} | Err: {abs(y_test[i]-y_pred[i]):.1f}", flush=True)

    # Save Model Artifacts
    joblib.dump(model, os.path.join(MODEL_DIR, 'maintenance_model.joblib'))
    joblib.dump(feature_cols, os.path.join(MODEL_DIR, 'maintenance_feature_cols.joblib'))
    print(f"\nSaved maintenance risk model to {MODEL_DIR}", flush=True)

if __name__ == '__main__':
    train_maintenance_model()
