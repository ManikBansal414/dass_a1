import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case 'participant':
        return '/participant/dashboard';
      case 'organizer':
        return '/organizer/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav>
      <div className="container">
        <Link to="/" className="logo">Felicity</Link>
        <ul>
          {/* Browse Events - Only for participants */}
          {user && user.role === 'participant' && (
            <li><Link to="/events">Browse Events</Link></li>
          )}
          {user && user.role === 'participant' && (
            <li><Link to="/clubs">Clubs</Link></li>
          )}
          {user && user.role === 'organizer' && (
            <>
              <li><Link to="/organizer/ongoing-events">Ongoing Events</Link></li>
              <li><Link to="/organizer/create-event">Create Event</Link></li>
            </>
          )}
          {/* Admin-specific links */}
          {user && user.role === 'admin' && (
            <>
              <li><Link to="/admin/dashboard">Dashboard</Link></li>
              <li><Link to="/admin/organizers">Manage Organizers</Link></li>
              <li><Link to="/admin/password-requests">Password Reset Requests</Link></li>
            </>
          )}
          {user ? (
            <>
              {/* Dashboard link - only for participant and organizer */}
              {user.role !== 'admin' && (
                <li><Link to={getDashboardLink()}>Dashboard</Link></li>
              )}
              {user.role === 'participant' && (
                <li><Link to="/participant/profile">Profile</Link></li>
              )}
              {user.role === 'organizer' && (
                <li><Link to="/organizer/profile">Profile</Link></li>
              )}
              <li>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
