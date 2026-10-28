CREATE TABLE `manager_login_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `manager_login_attempts_reset_at_idx` ON `manager_login_attempts` (`reset_at`);--> statement-breakpoint
CREATE TABLE `manager_sessions` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `manager_sessions_expires_at_idx` ON `manager_sessions` (`expires_at`);