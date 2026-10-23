# Deploying CampusX on Render

This guide provides step-by-step instructions for deploying **CampusX** on [Render](https://render.com/) on the **Free Tier**.

---

## 🌟 Method 1: One-Click Render Blueprint (Recommended)

Render Blueprints use the [`render.yaml`](./render.yaml) file already configured in this repository to automatically provision both the **Fullstack Web App** and the **Python AI Microservice**.

### Step 1: Sign Up / Log In to Render
1. Open **[https://render.com](https://render.com)** and log in with your GitHub account (**`ankitachanda105-star`**).

### Step 2: Deploy the Blueprint
1. In the Render Dashboard, click the **New +** button in the top right.
2. Select **Blueprint**.
3. Connect your GitHub repository: **`ankitachanda105-star/CampusX`**.
4. Render will read `render.yaml` and display the two services:
   - **`campusx-app`** (Node.js fullstack service serving React frontend + Express API)
   - **`campusx-ai`** (Python FastAPI microservice for complaint classification, queue wait, and equipment maintenance scoring)
5. Click **Apply**.
6. Render will build and deploy both services automatically!

---

## 🍃 Persistent Database: MongoDB Atlas (Free Tier)

By default, CampusX runs in-memory if no external database is configured. To ensure your users, complaints, and bookings are saved permanently across server restarts:

1. Sign up for a free MongoDB database at **[https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)**.
2. Create a free **M0 (Shared)** cluster.
3. Under **Database Access**, create a database user (e.g., `admin` and a password).
4. Under **Network Access**, click **Add IP Address** $\rightarrow$ select **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/campusx?retryWrites=true&w=majority
   ```
6. In your Render Dashboard, open the **`campusx-app`** service:
   - Go to **Environment**.
   - Add an environment variable:
     - **Key**: `MONGODB_URI`
     - **Value**: *(Paste your MongoDB Atlas connection string)*
   - Click **Save Changes**. Render will automatically restart and seed default LPU accounts into your persistent database.

---

## 🛠️ Method 2: Manual Web Service Deployment

If you prefer to configure services manually on Render instead of using Blueprints:

### Service 1: Node.js Fullstack Web Service
- **Type**: Web Service
- **Repository**: `ankitachanda105-star/CampusX`
- **Name**: `campusx-app`
- **Root Directory**: `.` *(leave blank or dot)*
- **Runtime**: `Node`
- **Build Command**: `npm run build:all`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `JWT_SECRET`: *(Any random 32-character string)*
  - `MONGODB_URI`: *(Your MongoDB Atlas connection string)*
  - `AI_SERVICE_URL`: *(URL of your Python AI service, e.g. `https://campusx-ai.onrender.com`)*

### Service 2: Python AI Microservice (Optional)
- **Type**: Web Service
- **Repository**: `ankitachanda105-star/CampusX`
- **Name**: `campusx-ai`
- **Root Directory**: `ai-service`
- **Runtime**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `PYTHON_VERSION`: `3.11.9`

*(Note: If the Python service is sleeping on the free tier, CampusX automatically and gracefully falls back to deterministic campus heuristics without throwing errors).*

---

## 🔑 Default Login Credentials Once Deployed

Once live on your `*.onrender.com` URL:

| Role | Identifier | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Student** | `12345678` | `Student@123` | Student Portal (Complaints, Queues, Services) |
| **Faculty / Staff** | `EMP20491` | `Faculty@123` | Faculty Desk (Venue Booking, Approval Queues) |
| **Admin** | `ADM10822` | `Admin@123` | Operations Console (Analytics, Maintenance, RBAC) |
| **Super Admin** | `DIR001` | `SuperAdmin@123` | System Directorate (Headcount, Governance, Audit) |
