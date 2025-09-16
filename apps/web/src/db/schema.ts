import { pgTable, text, timestamp, boolean, integer, pgEnum, index, varchar, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const clientStatusEnum = pgEnum('client_status', ['LEAD', 'CUSTOMER', 'PREVIOUS']);
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'STAFF', 'READONLY']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['AVAILABLE', 'SOLD', 'PENDING', 'RESERVED']);
export const activityTypeEnum = pgEnum('activity_type', ['NOTE', 'EMAIL', 'CALL', 'MEETING', 'TASK']);
export const campaignStatusEnum = pgEnum('campaign_status', ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED']);

// Tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  role: userRoleEnum('role').default('STAFF'),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  lastActive: timestamp('last_active'),
  dealershipId: text('dealership_id').references(() => dealerships.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    dealershipIdx: index('users_dealership_idx').on(table.dealershipId),
  }
});

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  jobTitle: text('job_title').notNull(),
  department: text('department').notNull(),
  phoneNumber: text('phone_number'),
  address: text('address'),
  startDate: timestamp('start_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('employees_user_id_idx').on(table.userId),
    dealershipIdx: index('employees_dealership_idx').on(table.dealershipId),
  }
});

export const dealerships = pgTable('dealerships', {
  id: text('id').primaryKey(),  // We're using our own ID format instead of uuid_generate_v4()
  name: text('name').notNull(),
  description: text('description'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  logo: text('logo'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  s3BucketName: text('s3_bucket_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  source: text('source'),
  status: clientStatusEnum('status').default('LEAD'),
  notes: text('notes'),
  createdById: text('created_by_id').references(() => users.clerkId, { onDelete: 'set null' }),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    dealershipIdx: index('clients_dealership_idx').on(table.dealershipId),
  }
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  stock: text('stock').notNull(),
  vin: text('vin').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  trim: text('trim'),
  mileage: integer('mileage').notNull(),
  price: integer('price').notNull(),
  exteriorColor: text('exterior_color'),
  interiorColor: text('interior_color'),
  fuelType: text('fuel_type'),
  transmission: text('transmission'),
  engine: text('engine'),
  description: text('description'),
  status: vehicleStatusEnum('status').default('AVAILABLE'),
  featured: boolean('featured').default(false),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    dealershipIdx: index('vehicles_dealership_idx').on(table.dealershipId),
    stockIdx: index('vehicles_stock_dealership_idx').on(table.stock, table.dealershipId),  // Composite index
    vinIdx: index('vehicles_vin_dealership_idx').on(table.vin, table.dealershipId),  // Composite index
  }
});

export const vehicleImages = pgTable('vehicle_images', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  caption: text('caption'),
  isPrimary: boolean('is_primary').default(false),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
});

export const vehicleFeatures = pgTable('vehicle_features', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
});

export const clientVehicleNotes = pgTable('client_vehicle_notes', {
  id: text('id').primaryKey(),
  note: text('note').notNull(),
  status: text('status').default('interested'),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  type: activityTypeEnum('type').notNull(),
  content: text('content').notNull(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    dealershipIdx: index('activities_dealership_idx').on(table.dealershipId),
  }
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  fromName: text('from_name').notNull(),
  fromEmail: text('from_email').notNull(),
  content: text('content').notNull(),
  audienceType: text('audience_type').notNull(),
  segmentId: text('segment_id'),
  recipientCount: integer('recipient_count'),
  status: campaignStatusEnum('status').default('DRAFT'),
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  openRate: integer('open_rate'),
  clickRate: integer('click_rate'),
  trackOpens: boolean('track_opens').default(true),
  trackClicks: boolean('track_clicks').default(true),
  createdById: text('created_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    dealershipIdx: index('campaigns_dealership_idx').on(table.dealershipId),
  }
});

export const allowedIPs = pgTable('allowed_ips', {
  id: text('id').primaryKey(),
  ip: text('ip').unique().notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationSettings = pgTable('notification_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealStatusEnum = pgEnum('deal_status', ['DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED']);
export const documentTypeEnum = pgEnum('document_type', [
  'Motor Vehicle Dealer Title Reassignment',
  'Reduction for Trade In',
  'Motor Vehicle Division State and Local Title Ad Valorem',
  'Bailment Agreement',
  'OFAC Compliance Statement',
  'What We Do With Your Information',
  'Limited Power of Attorney - Motor Vehicle Transactions',
  'Buyers Guide Part 1',
  'Buyers Guide Part 2',
  'Odometer Disclosure Statement',
  'Arbitration Agreement',
  'We Owe Document',
  'Bill of Sale',
  'MV-1 Motor Vehicle Title Application',
  'As-Is Sold Without Warranty',
  'Bill of Sale Terms and Conditions',
]);

export const deals = pgTable('deals', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  status: dealStatusEnum('status').default('DRAFT'),
  saleAmount: decimal('sale_amount', { precision: 10, scale: 2 }).notNull(),
  salesTax: decimal('sales_tax', { precision: 10, scale: 2 }).notNull(),
  tradeInValue: decimal('trade_in_value', { precision: 10, scale: 2 }).default('0'),
  downPayment: decimal('down_payment', { precision: 10, scale: 2 }).default('0'),
  financedAmount: decimal('financed_amount', { precision: 10, scale: 2 }).notNull(),
  docFee: decimal('doc_fee', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
}, (table) => {
  return {
    clientIdIdx: index('deal_client_id_idx').on(table.clientId),
    vehicleIdIdx: index('deal_vehicle_id_idx').on(table.vehicleId),
    dealershipIdIdx: index('deal_dealership_id_idx').on(table.dealershipId),
    statusIdx: index('deal_status_idx').on(table.status),
  }
});

export const dealDocuments = pgTable('deal_documents', {
  id: text('id').primaryKey(),
  type: documentTypeEnum('type').notNull(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  generated: boolean('generated').default(false),
  generatedAt: timestamp('generated_at'),
  clientSigned: boolean('client_signed').default(false),
  clientSignedAt: timestamp('client_signed_at'),
  dealerSigned: boolean('dealer_signed').default(false),
  dealerSignedAt: timestamp('dealer_signed_at'),
  notarized: boolean('notarized').default(false),
  notarizedAt: timestamp('notarized_at'),
  documentUrl: text('document_url'),
}, (table) => {
  return {
    dealIdIdx: index('deal_document_deal_id_idx').on(table.dealId),
    typeIdx: index('deal_document_type_idx').on(table.type),
  }
});

export const userInvitations = pgTable('user_invitations', {
  id: text('id').primaryKey(),
  token: text('token').unique().notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').default('STAFF').notNull(),
  dealershipId: text('dealership_id').notNull().references(() => dealerships.id, { onDelete: 'cascade' }),
  invitedById: text('invited_by_id').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    dealershipIdx: index('user_invitations_dealership_idx').on(table.dealershipId),
    tokenIdx: index('user_invitations_token_idx').on(table.token),
  }
});

// Relations
export const dealsRelations = relations(deals, ({ one, many }) => ({
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
  vehicle: one(vehicles, {
    fields: [deals.vehicleId],
    references: [vehicles.id],
  }),
  documents: many(dealDocuments),
  dealership: one(dealerships, {
    fields: [deals.dealershipId],
    references: [dealerships.id],
  }),
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
}));

export const dealDocumentsRelations = relations(dealDocuments, ({ one }) => ({
  deal: one(deals, {
    fields: [dealDocuments.dealId],
    references: [deals.id],
  }),
  client: one(clients, {
    fields: [dealDocuments.clientId],
    references: [clients.id],
  }),
  vehicle: one(vehicles, {
    fields: [dealDocuments.vehicleId],
    references: [vehicles.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  dealership: one(dealerships, {
    fields: [clients.dealershipId],
    references: [dealerships.id],
  }),
  deals: many(deals),
  documents: many(dealDocuments),
  vehicles: many(vehicles),
  notes: many(clientVehicleNotes),
  activities: many(activities),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  dealership: one(dealerships, {
    fields: [vehicles.dealershipId],
    references: [dealerships.id],
  }),
  client: one(clients, {
    fields: [vehicles.clientId],
    references: [clients.id],
  }),
  deals: many(deals),
  documents: many(dealDocuments),
  images: many(vehicleImages),
  features: many(vehicleFeatures),
  notes: many(clientVehicleNotes),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  dealership: one(dealerships, {
    fields: [users.dealershipId],
    references: [dealerships.id],
  }),
  campaigns: many(campaigns),
  activities: many(activities),
  employees: many(employees),
}));

export const dealershipsRelations = relations(dealerships, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  vehicles: many(vehicles),
  campaigns: many(campaigns),
  employees: many(employees),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleFeaturesRelations = relations(vehicleFeatures, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleFeatures.vehicleId],
    references: [vehicles.id],
  }),
}));

export const clientVehicleNotesRelations = relations(clientVehicleNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientVehicleNotes.clientId],
    references: [clients.id],
  }),
  vehicle: one(vehicles, {
    fields: [clientVehicleNotes.vehicleId],
    references: [vehicles.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  client: one(clients, {
    fields: [activities.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  createdBy: one(users, {
    fields: [campaigns.createdById],
    references: [users.id],
  }),
  dealership: one(dealerships, {
    fields: [campaigns.dealershipId],
    references: [dealerships.id],
  }),
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  dealership: one(dealerships, {
    fields: [userInvitations.dealershipId],
    references: [dealerships.id],
  }),
  invitedBy: one(users, {
    fields: [userInvitations.invitedById],
    references: [users.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  dealership: one(dealerships, {
    fields: [employees.dealershipId],
    references: [dealerships.id],
  }),
}));

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NewNotificationSetting = typeof notificationSettings.$inferInsert; 
