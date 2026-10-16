import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", { entity: text("entity").notNull(), id: integer("id").notNull(), payload: text("payload").notNull() }, table => [primaryKey({columns:[table.entity,table.id]})]);
export const state = sqliteTable("state", { key: text("key").primaryKey(), value: integer("value").notNull() });

export const receipts = sqliteTable("receipts", {tokenHash: text("token_hash").notNull(), studentId: integer("student_id").notNull()}, table => [primaryKey({columns:[table.tokenHash,table.studentId]})]);
