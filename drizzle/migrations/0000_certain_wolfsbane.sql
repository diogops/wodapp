CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sessionAction" AS ENUM('completed', 'skipped');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workoutExercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"sectionId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"prescription" text,
	"sets" varchar(64),
	"reps" varchar(64),
	"duration" varchar(64),
	"load" varchar(128),
	"notes" text,
	"orderIndex" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workoutSections" (
	"id" serial PRIMARY KEY NOT NULL,
	"workoutId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"format" varchar(64),
	"notes" text,
	"orderIndex" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workoutSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workoutId" integer NOT NULL,
	"action" "sessionAction" NOT NULL,
	"performedAt" timestamp DEFAULT now() NOT NULL,
	"snapshot" text
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"focus" text,
	"level" varchar(64),
	"suggestedDate" timestamp,
	"notes" text,
	"orderIndex" integer DEFAULT 0 NOT NULL,
	"sourceFileKey" varchar(512),
	"sourceFileName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
