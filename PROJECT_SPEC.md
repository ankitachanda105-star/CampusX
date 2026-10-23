# CampusX — Smart Campus Operations & Intelligence Platform
## Master Project Specification

---

## 1. Executive Summary
CampusX is a modern, modular, MERN-stack college operations and campus intelligence platform designed to streamline student services, campus administration, complaint lifecycles, resource management, and intelligent automated support.

---

## 2. Architecture Overview
- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, Lucide Icons
- **Backend API**: Node.js, Express, Mongoose / MongoDB, JWT Authentication, Role-based Access Control (RBAC)
- **AI Microservice**: Python (FastAPI/Flask) for complaint classification, priority prediction, queue wait-time estimation, and maintenance risk scoring (Phase 4 & 5)
- **Database**: MongoDB (User collections, complaints, queues, service requests, resources)

---

## 3. User Roles & Permissions
CampusX implements four distinct user roles:

1. **Student**
   - Access to student dashboard (`/student/dashboard`)
   - Submit and track complaints, request campus services (bonafide, ID replacement), view virtual queues.
2. **Faculty/Staff**
   - Access to faculty dashboard (`/faculty/dashboard`)
   - Resource booking, view department notices, department service requests.
3. **Admin**
   - Access to admin dashboard (`/admin/dashboard`)
   - Manage complaints, department staff assignments, operational queues, resource inventory.
4. **Super Admin**
   - Access to super admin dashboard (`/superadmin/dashboard`)
   - Full system governance, user management, audit logs, role assignments, system-wide analytics.

---

## 4. Phase Breakdown
- **Phase 0**: Architecture & Scaffolding
- **Phase 1**: Foundation — Module 1: Authentication & Role Management *(Current Phase)*
- **Phase 2**: Core Management — Module 2 (Smart Complaints), Module 3 (Smart Queue), Module 4 (Service Hub)
- **Phase 3**: Resource & Maintenance — Module 5 (Resource Management), Module 6 (Predictive Maintenance), Module 7 (Admin Dashboard scaffold)
- **Phase 4**: AI Layer — Python microservice (Classification, Priority, Queue Wait, Maintenance Risk)
- **Phase 5**: AI Assistant, Analytics & Final Polish — Module 8 (CampusX AI Assistant) & system integration
