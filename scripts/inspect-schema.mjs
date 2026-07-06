// Database schema inspection script
// Queried via Supabase SQL: information_schema.tables and information_schema.columns

const schema = {
  admin_users: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'email', type: 'text', nullable: false, default: null },
      { name: 'password_hash', type: 'text', nullable: false, default: null },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  },
  categorias: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'nombre', type: 'text', nullable: false, default: null },
      { name: 'slug', type: 'text', nullable: false, default: null },
      { name: 'orden', type: 'integer', nullable: true, default: '0' },
      { name: 'activo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  },
  leads: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'nombre', type: 'text', nullable: false, default: null },
      { name: 'email', type: 'text', nullable: false, default: null },
      { name: 'telefono', type: 'text', nullable: true, default: null },
      { name: 'producto_interes', type: 'text', nullable: true, default: null },
      { name: 'textile_interes', type: 'text', nullable: true, default: null },
      { name: 'mensaje', type: 'text', nullable: true, default: null },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  },
  producto_configuraciones: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'producto_id', type: 'uuid', nullable: true, default: null },
      { name: 'nombre', type: 'text', nullable: false, default: null },
      { name: 'precio_extra', type: 'numeric', nullable: true, default: '0' },
      { name: 'orden', type: 'integer', nullable: true, default: '0' }
    ]
  },
  producto_imagenes: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'producto_id', type: 'uuid', nullable: true, default: null },
      { name: 'url', type: 'text', nullable: false, default: null },
      { name: 'alt', type: 'text', nullable: true, default: null },
      { name: 'orden', type: 'integer', nullable: true, default: '0' },
      { name: 'es_principal', type: 'boolean', nullable: true, default: 'false' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  },
  producto_specs: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'producto_id', type: 'uuid', nullable: true, default: null },
      { name: 'titulo', type: 'text', nullable: false, default: null },
      { name: 'tipo', type: 'text', nullable: false, default: null },
      { name: 'contenido', type: 'jsonb', nullable: false, default: null },
      { name: 'orden', type: 'integer', nullable: true, default: '0' }
    ]
  },
  productos: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'categoria_id', type: 'uuid', nullable: true, default: null },
      { name: 'nombre', type: 'text', nullable: false, default: null },
      { name: 'slug', type: 'text', nullable: false, default: null },
      { name: 'subtitulo', type: 'text', nullable: true, default: null },
      { name: 'descripcion', type: 'text', nullable: true, default: null },
      { name: 'precio_desde', type: 'numeric', nullable: true, default: null },
      { name: 'badge', type: 'text', nullable: true, default: null },
      { name: 'activo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'orden', type: 'integer', nullable: true, default: '0' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  },
  textiles: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'nombre', type: 'text', nullable: false, default: null },
      { name: 'categoria', type: 'text', nullable: true, default: null },
      { name: 'color_hex', type: 'text', nullable: true, default: null },
      { name: 'imagen_url', type: 'text', nullable: true, default: null },
      { name: 'descripcion', type: 'text', nullable: true, default: null },
      { name: 'activo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'orden', type: 'integer', nullable: true, default: '0' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: true, default: 'now()' }
    ]
  }
}

// Pretty print schema
for (const [tableName, tableSchema] of Object.entries(schema)) {
  console.log(`\n[${tableName}]`)
  const columnNames = tableSchema.columns.map(c => c.name)
  console.log('  columns:', columnNames.join(', '))
  console.log('  details:')
  for (const col of tableSchema.columns) {
    const nullable = col.nullable ? ' (nullable)' : ''
    const defaultVal = col.default ? ` = ${col.default}` : ''
    console.log(`    - ${col.name}: ${col.type}${defaultVal}${nullable}`)
  }
}

export { schema }
