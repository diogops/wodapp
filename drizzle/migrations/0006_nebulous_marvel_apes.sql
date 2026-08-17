CREATE TABLE "scheduleRules" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"modalityId" integer NOT NULL,
	"weekdays" varchar(32) NOT NULL,
	"startTime" varchar(5),
	"durationMinutes" integer DEFAULT 60 NOT NULL,
	"preferredWorkoutId" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "autoStartEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "scheduleLeadMinutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "scheduleGraceMinutes" integer DEFAULT 45 NOT NULL;