CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flat_id` integer NOT NULL,
	`month_id` integer NOT NULL,
	`sent_by` text NOT NULL,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`month_id`) REFERENCES `months`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_date` text;