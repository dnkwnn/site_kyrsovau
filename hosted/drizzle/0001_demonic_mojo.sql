CREATE TABLE `demo_receipts` (
	`token_hash` text NOT NULL,
	`student_id` integer NOT NULL,
	PRIMARY KEY(`token_hash`, `student_id`)
);
--> statement-breakpoint
CREATE TABLE `demo_records` (
	`entity` text NOT NULL,
	`id` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`entity`, `id`)
);
--> statement-breakpoint
CREATE TABLE `demo_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
