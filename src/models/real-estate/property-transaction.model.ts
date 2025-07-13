export interface PropertyTransaction {
  id: string;
  propertyId: string;
  type: string;
  amount: number;
  date: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
