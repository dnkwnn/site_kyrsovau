CREATE TABLE `receipts` (
	`token_hash` text NOT NULL,
	`student_id` integer NOT NULL,
	PRIMARY KEY(`token_hash`, `student_id`)
);
--> statement-breakpoint
CREATE TABLE `records` (
	`entity` text NOT NULL,
	`id` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`entity`, `id`)
);
--> statement-breakpoint
CREATE TABLE `state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
