export interface Property {
  id: string;
  type: string;
  address: string;
  acquisitionDate?: Date;
  initialValue?: number;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
