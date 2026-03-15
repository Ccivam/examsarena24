import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please sign in.' });
};

// Allows admin and super_admin
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    const role = (req.user as IUser).role;
    if (role === 'admin' || role === 'super_admin') return next();
  }
  res.status(403).json({ message: 'Forbidden. Admin access required.' });
};

// Allows teacher, admin, and super_admin
export const isTeacherOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    const role = (req.user as IUser).role;
    if (role === 'teacher' || role === 'admin' || role === 'super_admin') return next();
  }
  res.status(403).json({ message: 'Forbidden. Teacher or admin access required.' });
};

// Only super_admin
export const isSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && (req.user as IUser).role === 'super_admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden. Super admin access required.' });
};
