-- 결재 승인/반려 알림에 사용할 notification_type enum 값 추가
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'approval_approved';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'approval_rejected';
