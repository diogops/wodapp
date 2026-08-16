CREATE TABLE "workoutDrafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"payload" text NOT NULL,
	"source" varchar(32) DEFAULT 'generated' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
