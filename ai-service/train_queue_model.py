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

def train_queue_model():
    csv_path = os.path.join(DATA_DIR, 'queue_dataset.csv')
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} queue records from {csv_path}", flush=True)

    # Feature Engineering
    df['base_ratio'] = (df['people_ahead'] * df['avg_service_time_minutes']) / df['active_counters'].clip(lower=1)
    df['load_per_counter'] = df['people_ahead'] / df['active_counters'].clip(lower=1)
    df['is_peak_hour'] = df['time_of_day_hour'].isin([11, 12, 14, 15]).astype(int)
    df['single_counter_bottleneck'] = ((df['active_counters'] == 1) & (df['people_ahead'] > 3)).astype(int)

    office_dummies = pd.get_dummies(df['office_type'], prefix='office', dtype=float)

    feature_df = pd.concat([
        df[['people_ahead', 'active_counters', 'avg_service_time_minutes',
            'time_of_day_hour', 'base_ratio', 'load_per_counter',
            'is_peak_hour', 'single_counter_bottleneck']],
        office_dummies
    ], axis=1)

    feature_cols = list(feature_df.columns)
    X = feature_df.values
    y = df['actual_wait_minutes'].values

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
    print(" Queue Wait Time Model Evaluation (Random Forest Regressor)", flush=True)
    print("="*60, flush=True)
    print(f"R² Score:              {r2:.4f}", flush=True)
    print(f"Mean Absolute Error:   {mae:.2f} minutes", flush=True)
    print(f"Root Mean Sq Error:    {rmse:.2f} minutes", flush=True)
    print(f"Sample Predictions vs Actual (First 5 test cases):", flush=True)
    for i in range(min(5, len(y_test))):
        print(f"  Actual: {y_test[i]:5.1f} min | Predicted: {y_pred[i]:5.1f} min | Err: {abs(y_test[i]-y_pred[i]):.1f} min", flush=True)

    # Save Model Artifacts
    joblib.dump(model, os.path.join(MODEL_DIR, 'queue_model.joblib'))
    joblib.dump(feature_cols, os.path.join(MODEL_DIR, 'queue_feature_cols.joblib'))
    print(f"\nSaved queue model to {MODEL_DIR}", flush=True)

if __name__ == '__main__':
    train_queue_model()
