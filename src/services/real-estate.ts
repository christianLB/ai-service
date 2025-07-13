import { Pool } from 'pg';
import { Property } from '../models/real-estate/property.model';
import { PropertyTransaction } from '../models/real-estate/property-transaction.model';
import { Valuation } from '../models/real-estate/valuation.model';

export class RealEstateService {
  constructor(private pool: Pool) {}

  async listProperties(): Promise<Property[]> {
    const res = await this.pool.query('SELECT * FROM real_estate.properties ORDER BY created_at DESC');
    return res.rows;
  }

  async createProperty(data: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property> {
    const result = await this.pool.query(
      `INSERT INTO real_estate.properties (type, address, acquisition_date, initial_value, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.type, data.address, data.acquisitionDate, data.initialValue, data.status]
    );
    return result.rows[0];
  }

  async listPropertyTransactions(propertyId: string): Promise<PropertyTransaction[]> {
    const res = await this.pool.query(
      'SELECT * FROM real_estate.property_transactions WHERE property_id = $1 ORDER BY date DESC',
      [propertyId]
    );
    return res.rows;
  }

  async addValuation(propertyId: string, value: number, valuationDate: Date): Promise<Valuation> {
    const res = await this.pool.query(
      `INSERT INTO real_estate.valuations (property_id, value, valuation_date)
       VALUES ($1, $2, $3) RETURNING *`,
      [propertyId, value, valuationDate]
    );
    return res.rows[0];
  }
}
