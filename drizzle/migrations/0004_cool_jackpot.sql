CREATE TABLE "modalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"color" varchar(16) NOT NULL,
	"icon" varchar(32) NOT NULL,
	"grammar" text NOT NULL,
	"builtIn" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"orderIndex" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workoutSections" ADD COLUMN "kind" varchar(32);--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "modalityId" integer;