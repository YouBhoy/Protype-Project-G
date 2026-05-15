import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PortalLayout } from './components/PortalLayout';
import { PrivateRoute, ConsentRoute } from './components/PrivateRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { FacilitatorSignupPage } from './pages/FacilitatorSignupPage';
import { ConsentPage } from './pages/ConsentPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { StudentAnalyticsPage } from './pages/StudentAnalyticsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { FacilitatorDashboardPage } from './pages/FacilitatorDashboardPage';
import { FacilitatorAppointmentsPage } from './pages/FacilitatorAppointmentsPage';
import { EmergencyResourcesPage } from './pages/EmergencyResourcesPage';
import { ChatPage } from './pages/ChatPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="register" element={<SignupPage />} />
        <Route path="facilitator/signup" element={<FacilitatorSignupPage />} />
        <Route path="facilitator/register" element={<FacilitatorSignupPage />} />
        <Route path="ogc/signup" element={<FacilitatorSignupPage />} />
        <Route path="ogc/register" element={<FacilitatorSignupPage />} />
        <Route path="resources" element={<EmergencyResourcesPage />} />
        <Route path="emergency-resources" element={<EmergencyResourcesPage />} />
      </Route>

      <Route path="student/consent" element={<ConsentRoute><ConsentPage /></ConsentRoute>} />

      <Route element={<PrivateRoute role="student"><PortalLayout /></PrivateRoute>}>
        <Route path="student/dashboard" element={<StudentDashboardPage />} />
        <Route path="student/analytics" element={<StudentAnalyticsPage />} />
        <Route path="student/appointments" element={<AppointmentsPage />} />
        <Route path="student/assessments" element={<AssessmentPage />} />
        <Route path="student/assessments/:type" element={<AssessmentPage />} />
        <Route path="student/resources" element={<EmergencyResourcesPage />} />
      </Route>

      <Route element={<PrivateRoute role="ogc"><PortalLayout /></PrivateRoute>}>
        <Route path="facilitator/dashboard" element={<FacilitatorDashboardPage />} />
        <Route path="facilitator/appointments" element={<FacilitatorAppointmentsPage />} />
        <Route path="facilitator/resources" element={<EmergencyResourcesPage />} />
      <Route path="student" element={<PrivateRoute role="student"><PortalLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="analytics" element={<StudentAnalyticsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="assessments" element={<AssessmentPage />} />
        <Route path="assessments/:type" element={<AssessmentPage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>

      <Route path="facilitator" element={<PrivateRoute role="ogc"><PortalLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FacilitatorDashboardPage />} />
        <Route path="appointments" element={<FacilitatorAppointmentsPage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}