import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please sign in.' });
};

// Allows both admin and super_admin
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    const role = (req.user as IUser).role;
    if (role === 'admin' || role === 'super_admin') return next();
  }
  res.status(403).json({ message: 'Forbidden. Admin access required.' });
};

// Only super_admin
export const isSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && (req.user as IUser).role === 'super_admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden. Super admin access required.' });
};

export const isAdminOrContributor = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    const user = req.user as IUser;
    if (user.role === 'admin' || user.role === 'contributor' || user.role === 'super_admin') {
      return next();
    }
  }
  res.status(403).json({ message: 'Forbidden. Contributor access required.' });
};
