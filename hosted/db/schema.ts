import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", { entity: text("entity").notNull(), id: integer("id").notNull(), payload: text("payload").notNull() }, table => [primaryKey({columns:[table.entity,table.id]})]);
export const state = sqliteTable("state", { key: text("key").primaryKey(), value: integer("value").notNull() });

export const receipts = sqliteTable("receipts", {tokenHash: text("token_hash").notNull(), studentId: integer("student_id").notNull()}, table => [primaryKey({columns:[table.tokenHash,table.studentId]})]);

// Shared educational dataset. Existing private records remain separate.
export const demoRecords = sqliteTable("demo_records", {entity:text("entity").notNull(),id:integer("id").notNull(),payload:text("payload").notNull()}, table=>[primaryKey({columns:[table.entity,table.id]})]);
export const demoState = sqliteTable("demo_state", {key:text("key").primaryKey(),value:integer("value").notNull()});
export const demoReceipts = sqliteTable("demo_receipts", {tokenHash:text("token_hash").notNull(),studentId:integer("student_id").notNull()}, table=>[primaryKey({columns:[table.tokenHash,table.studentId]})]);
