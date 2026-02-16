CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flat_number` text NOT NULL,
	`maintenance_amount` real DEFAULT 2000 NOT NULL,
	`pin_hash` text NOT NULL,
	`phone_encrypted` text,
	`phone_iv` text,
	`phone_tag` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flats_flat_number_unique` ON `flats` (`flat_number`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`attempted_at` text NOT NULL,
	`success` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `months` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`due_date_day` integer DEFAULT 10 NOT NULL,
	`created_at` text NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `month_year_idx` ON `months` (`month`,`year`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flat_id` integer NOT NULL,
	`month_id` integer NOT NULL,
	`amount` real NOT NULL,
	`payment_mode` text NOT NULL,
	`status` text DEFAULT 'pending_verification' NOT NULL,
	`screenshot_blob_url` text,
	`screenshot_iv` text,
	`screenshot_tag` text,
	`submitted_at` text NOT NULL,
	`watchman_confirmed_at` text,
	`verified_at` text,
	`collected_at` text,
	`admin_note` text,
	FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`month_id`) REFERENCES `months`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flat_month_idx` ON `payments` (`flat_id`,`month_id`);