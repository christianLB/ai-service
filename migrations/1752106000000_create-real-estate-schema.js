/**
 * Create schema and tables for real estate module
 */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createSchema('real_estate', { ifNotExists: true });

  pgm.createTable({ schema: 'real_estate', name: 'properties' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    type: { type: 'varchar(50)', notNull: true },
    address: { type: 'text', notNull: true },
    acquisition_date: { type: 'date' },
    initial_value: { type: 'numeric(15,2)' },
    status: { type: 'varchar(30)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.createTable({ schema: 'real_estate', name: 'property_transactions' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    property_id: { type: 'uuid', notNull: true, references: 'real_estate.properties', onDelete: 'cascade' },
    type: { type: 'varchar(30)', notNull: true },
    amount: { type: 'numeric(15,2)', notNull: true },
    date: { type: 'date', notNull: true },
    notes: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.createTable({ schema: 'real_estate', name: 'valuations' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    property_id: { type: 'uuid', notNull: true, references: 'real_estate.properties', onDelete: 'cascade' },
    value: { type: 'numeric(15,2)', notNull: true },
    valuation_date: { type: 'date', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });
};

exports.down = pgm => {
  pgm.dropTable({ schema: 'real_estate', name: 'valuations' });
  pgm.dropTable({ schema: 'real_estate', name: 'property_transactions' });
  pgm.dropTable({ schema: 'real_estate', name: 'properties' });
  pgm.dropSchema('real_estate');
};
