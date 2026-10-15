CREATE TABLE `gmailSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`appPassword` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gmailSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmailSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`scheduledAt` datetime NOT NULL,
	`sentAt` datetime,
	`status` enum('scheduled','sent','failed') NOT NULL DEFAULT 'scheduled',
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `gmailSettings` (`userId`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `reminders` (`userId`);--> statement-breakpoint
CREATE INDEX `statusIdx` ON `reminders` (`status`);--> statement-breakpoint
CREATE INDEX `scheduledAtIdx` ON `reminders` (`scheduledAt`);--> statement-breakpoint
CREATE INDEX `cronTaskUidIdx` ON `reminders` (`scheduleCronTaskUid`);