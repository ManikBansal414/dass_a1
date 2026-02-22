import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import ParticipantDashboard from './pages/ParticipantDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import Profile from './pages/Profile';
import ClubsPage from './pages/ClubsPage';
import OrganizerDetail from './pages/OrganizerDetail';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import OrganizerProfile from './pages/OrganizerProfile';
import QRScanner from './pages/QRScanner';
import MerchandiseOrders from './pages/MerchandiseOrders';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import ManageOrganizers from './pages/ManageOrganizers';
import PasswordResetRequests from './pages/PasswordResetRequests';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar />
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes - Accessible by all authenticated users */}
          <Route
            path="/onboarding"
            element={
              <PrivateRoute role={['participant', 'organizer', 'admin']}>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/events"
            element={
              <PrivateRoute role={['participant', 'organizer', 'admin']}>
                <BrowseEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <PrivateRoute role={['participant', 'organizer', 'admin']}>
                <EventDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/clubs"
            element={
              <PrivateRoute role={['participant', 'organizer', 'admin']}>
                <ClubsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/clubs/:id"
            element={
              <PrivateRoute role={['participant', 'organizer', 'admin']}>
                <OrganizerDetail />
              </PrivateRoute>
            }
          />
          
          {/* Participant Routes */}
          <Route
            path="/participant/dashboard"
            element={
              <PrivateRoute role="participant">
                <ParticipantDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/profile"
            element={
              <PrivateRoute role="participant">
                <Profile />
              </PrivateRoute>
            }
          />
          
          {/* Organizer Routes */}
          <Route
            path="/organizer/dashboard"
            element={
              <PrivateRoute role="organizer">
                <OrganizerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/create-event"
            element={
              <PrivateRoute role={['organizer', 'admin']}>
                <CreateEvent />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/profile"
            element={
              <PrivateRoute role="organizer">
                <OrganizerProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId"
            element={
              <PrivateRoute role={['organizer', 'admin']}>
                <OrganizerEventDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/edit"
            element={
              <PrivateRoute role={['organizer', 'admin']}>
                <EditEvent />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/scanner"
            element={
              <PrivateRoute role={['organizer', 'admin']}>
                <QRScanner />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/orders"
            element={
              <PrivateRoute role={['organizer', 'admin']}>
                <MerchandiseOrders />
              </PrivateRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/organizers"
            element={
              <PrivateRoute role="admin">
                <ManageOrganizers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/password-requests"
            element={
              <PrivateRoute role="admin">
                <PasswordResetRequests />
              </PrivateRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/events" />} />
          <Route path="*" element={<Navigate to="/events" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
