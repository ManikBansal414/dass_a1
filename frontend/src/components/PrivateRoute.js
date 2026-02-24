import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Support both single role and array of roles
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    
    if (!allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard
      if (user.role === 'participant') {
        return <Navigate to="/participant/dashboard" />;
      } else if (user.role === 'organizer') {
        return <Navigate to="/organizer/dashboard" />;
      } else if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" />;
      }
    }
  }

  return children;
};

export default PrivateRoute;
