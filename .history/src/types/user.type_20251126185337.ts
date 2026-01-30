import { Request } from 'express';


export type CurrentUser = {
  id: string;
  email: string;
};


export interface RequestWithUser extends Request {
  user: {
    id: string;
  };
}
