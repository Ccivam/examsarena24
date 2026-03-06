import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please sign in.' });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && (req.user as IUser).role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden. Admin access required.' });
};

export const isAdminOrContributor = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    const user = req.user as IUser;
    if (user.role === 'admin' || user.role === 'contributor') {
      return next();
    }
  }
  res.status(403).json({ message: 'Forbidden. Contributor access required.' });
};
