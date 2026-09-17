export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
