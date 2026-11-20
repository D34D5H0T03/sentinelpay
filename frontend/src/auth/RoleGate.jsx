import React from 'react';
import { useAuth } from './AuthContext';

export default function RoleGate({ allowedRoles = [], children, fallback = null }) {
  const { user } = useAuth();
  if (!user || !user.roles) return fallback;

  const hasRole = user.roles.some((r) => allowedRoles.includes(r));
  return hasRole ? children : fallback;
}
