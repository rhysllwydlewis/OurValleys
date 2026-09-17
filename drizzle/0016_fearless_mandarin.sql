ALTER TABLE "business_enquiry" DROP CONSTRAINT "business_enquiry_status_check";--> statement-breakpoint
ALTER TABLE "business_enquiry" ADD CONSTRAINT "business_enquiry_status_check" CHECK ("business_enquiry"."status" in ('new', 'read', 'replied', 'closed', 'archived', 'spam'));
