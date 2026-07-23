CREATE TABLE "users" (
	"uid" varchar(255) PRIMARY KEY,
	"email" varchar(255),
	"display_name" varchar(255),
	"photo_url" varchar(512),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
