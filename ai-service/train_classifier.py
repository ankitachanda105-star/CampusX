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
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from scipy.sparse import hstack

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def train():
    csv_path = os.path.join(DATA_DIR, 'complaints_dataset.csv')
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} samples from {csv_path}", flush=True)

    # 1. Prepare Text Features
    df['clean_text'] = (df['title'].fillna('') + ' ' +
                        df['description'].fillna('') + ' ' +
                        df['location'].fillna('')).str.lower()

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=2500,
        sublinear_tf=True,
        stop_words='english'
    )
    X_tfidf = vectorizer.fit_transform(df['clean_text'])

    # ----------------------------------------------------
    # TASK A: Category Classification (TF-IDF + Logistic Regression)
    # ----------------------------------------------------
    print("\n" + "="*60, flush=True)
    print(" TASK A: Training Category Classifier (TF-IDF + Logistic Regression)", flush=True)
    print("="*60, flush=True)
    y_cat = df['category']
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X_tfidf, y_cat, test_size=0.2, random_state=42, stratify=y_cat
    )

    cat_model = LogisticRegression(C=2.5, max_iter=1000, random_state=42)
    cat_model.fit(X_train_c, y_train_c)

    y_pred_c = cat_model.predict(X_test_c)
    acc_c = accuracy_score(y_test_c, y_pred_c)
    print(f"Category Classifier Accuracy: {acc_c:.4f}\n", flush=True)
    print("Classification Report for Category Prediction:", flush=True)
    print(classification_report(y_test_c, y_pred_c), flush=True)

    # Save TF-IDF & Category Model
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib'))
    joblib.dump(cat_model, os.path.join(MODEL_DIR, 'category_model.joblib'))
    print(f"Saved category model & vectorizer to {MODEL_DIR}", flush=True)

    # ----------------------------------------------------
    # TASK B: Priority Prediction Model
    # ----------------------------------------------------
    print("\n" + "="*60, flush=True)
    print(" TASK B: Training Priority Classifier (Engineered Features)", flush=True)
    print("="*60, flush=True)

    # Engineered tabular features
    def extract_location_tier(loc):
        loc_str = str(loc).lower()
        if any(w in loc_str for w in ['auditorium', 'library', 'lab', 'seminar', 'arena', 'hall']):
            return 3  # High density
        elif any(w in loc_str for w in ['hostel', 'bh-', 'gh-', 'dining', 'court', 'corridor']):
            return 2  # Medium density
        return 1      # Low density / single room

    df['loc_tier'] = df['location'].apply(extract_location_tier)
    df['affected_norm'] = np.log1p(df['affected_users'].clip(lower=1))
    df['hazard_flag'] = df['is_hazard'].astype(int)

    # Category one-hot representation
    cat_dummies = pd.get_dummies(df['category'], prefix='cat', dtype=float)
    tabular_features = pd.concat([
        df[['loc_tier', 'affected_norm', 'hazard_flag']],
        cat_dummies
    ], axis=1)

    tabular_feature_cols = list(tabular_features.columns)

    # Combine dense tabular features with TF-IDF features
    X_priority = hstack([X_tfidf, tabular_features.values])

    y_priority = df['priority']
    X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(
        X_priority, y_priority, test_size=0.2, random_state=42, stratify=y_priority
    )

    priority_model = LogisticRegression(C=2.0, class_weight='balanced', max_iter=1000, random_state=42)
    priority_model.fit(X_train_p, y_train_p)

    y_pred_p = priority_model.predict(X_test_p)
    acc_p = accuracy_score(y_test_p, y_pred_p)
    print(f"Priority Classifier Accuracy: {acc_p:.4f}\n", flush=True)
    print("Classification Report for Priority Prediction:", flush=True)
    print(classification_report(y_test_p, y_pred_p), flush=True)

    # Save Priority Model & Schema
    joblib.dump(priority_model, os.path.join(MODEL_DIR, 'priority_model.joblib'))
    joblib.dump(tabular_feature_cols, os.path.join(MODEL_DIR, 'priority_feature_cols.joblib'))
    print(f"Saved priority model & column schema to {MODEL_DIR}", flush=True)

if __name__ == '__main__':
    train()
