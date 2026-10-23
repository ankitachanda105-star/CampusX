/**
 * Centralized API configuration for CampusX
 * Supports local dev (Vite proxy / localhost:5000) and production deployment (Render)
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
