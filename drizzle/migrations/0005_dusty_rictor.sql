CREATE TABLE "workoutSetLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workoutId" integer NOT NULL,
	"exerciseName" varchar(255) NOT NULL,
	"setIndex" integer NOT NULL,
	"reps" integer,
	"load" varchar(32),
	"rpe" integer,
	"completedAt" timestamp DEFAULT now() NOT NULL
);
