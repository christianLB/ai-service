export interface Valuation {
  id: string;
  propertyId: string;
  value: number;
  valuationDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
