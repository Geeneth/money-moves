CREATE TABLE `bill_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`transaction_id` text,
	`due_date` text NOT NULL,
	`paid_date` text,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `bill_payments_bill_idx` ON `bill_payments` (`bill_id`);--> statement-breakpoint
CREATE INDEX `bill_payments_due_idx` ON `bill_payments` (`due_date`);--> statement-breakpoint
CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`frequency` text NOT NULL,
	`due_day` integer,
	`next_due_date` text NOT NULL,
	`category_id` text,
	`is_auto_pay` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `bills_next_due_idx` ON `bills` (`next_due_date`);--> statement-breakpoint
CREATE INDEX `bills_active_idx` ON `bills` (`is_active`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`icon` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `pay_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pay_periods_start_unique` ON `pay_periods` (`start_date`);--> statement-breakpoint
CREATE TABLE `paychecks` (
	`id` text PRIMARY KEY NOT NULL,
	`expected_date` text NOT NULL,
	`actual_date` text,
	`expected_amount` integer NOT NULL,
	`actual_amount` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_manual` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `paychecks_expected_date_idx` ON `paychecks` (`expected_date`);--> statement-breakpoint
CREATE TABLE `savings_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`paycheck_id` text,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `savings_goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paycheck_id`) REFERENCES `paychecks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `savings_contributions_goal_idx` ON `savings_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `savings_contributions_date_idx` ON `savings_contributions` (`date`);--> statement-breakpoint
CREATE TABLE `savings_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`contribution_type` text DEFAULT 'fixed' NOT NULL,
	`contribution_amount` integer DEFAULT 0 NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`currency` text DEFAULT 'CAD' NOT NULL,
	`default_pay_amount` integer DEFAULT 0 NOT NULL,
	`known_payday` text NOT NULL,
	`pay_frequency_days` integer DEFAULT 14 NOT NULL,
	`savings_method` text DEFAULT 'fixed' NOT NULL,
	`default_savings_amount` integer DEFAULT 0 NOT NULL,
	`week_start_day` integer DEFAULT 0 NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`payment_method` text DEFAULT 'debit' NOT NULL,
	`category_id` text,
	`pay_period_id` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pay_period_id`) REFERENCES `pay_periods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_period_idx` ON `transactions` (`pay_period_id`);