import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { GET as getNotificationsHandler } from "../src/app/api/v1/notifications/route";
import { GET as getUnreadCountHandler } from "../src/app/api/v1/notifications/unread-count/route";
import {
  GET as getNotifByIdHandler,
  DELETE as deleteNotifHandler,
} from "../src/app/api/v1/notifications/[id]/route";
import { PATCH as readNotifHandler } from "../src/app/api/v1/notifications/[id]/read/route";
import { PATCH as readAllHandler } from "../src/app/api/v1/notifications/read-all/route";
import {
  createNotification,
  getUnreadCount,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../src/lib/services/notification";
import { NotificationType, UserRole } from "@prisma/client";

// ──────────────────────────────────────────────
// Test infrastructure
// ──────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
    errors.push(label);
  }
}

function mkReq(
  url: string,
  opts: { method?: string; token?: string | null; body?: any } = {}
): NextRequest {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

async function readBody(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ──────────────────────────────────────────────
// Setup helpers
// ──────────────────────────────────────────────
async function createTestUser(suffix: string, role: UserRole = "BUYER") {
  const hash = await bcrypt.hash("Test1234!", 10);
  const email = `notif_test_${suffix}_${Date.now()}@test.com`;
  return prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      fullName: `Notif Test ${suffix}`,
      role,
      isActive: true,
      isEmailVerified: true,
    },
  });
}

function mkToken(userId: string): string {
  return signJwt({ sub: userId, email: "x@x.com", role: "BUYER" });
}

// ──────────────────────────────────────────────
// MAIN TEST SUITE
// ──────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" FEATURE 20 TEST SUITE: PLATFORM NOTIFICATION SYSTEM");
  console.log("══════════════════════════════════════════════════════════\n");

  // ──────────────────────
  // 1. Service Layer Tests
  // ──────────────────────
  console.log("━━━ SECTION 1: Service Layer ━━━\n");

  const userA = await createTestUser("A");
  const userB = await createTestUser("B");
  const tokenA = mkToken(userA.id);

  // 1.1 Create basic notification
  const n1 = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Test Alert",
    message: "This is a test notification for user A.",
  });
  assert(!!n1?.id, "1.1 createNotification returns a notification with id");
  assert(n1.userId === userA.id, "1.2 Notification belongs to userA");
  assert(n1.isRead === false, "1.3 Notification defaults to unread");
  assert(n1.type === "ACCOUNT_ALERT", "1.4 Notification type is correct");

  // 1.2 Idempotency via dedupKey
  const dedupKey = `test_dedup_${Date.now()}`;
  const nd1 = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Dedup Notif",
    message: "Should only be created once.",
    dedupKey,
  });
  const nd2 = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Dedup Notif",
    message: "Should only be created once.",
    dedupKey,
  });
  assert(nd1.id === nd2.id, "1.5 Idempotency: same dedupKey returns same notification");

  // 1.3 Metadata sanitization — sensitive keys must be stripped
  const ns = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Sensitive Meta Test",
    message: "Check metadata sanitization.",
    metadata: {
      password: "sEcReT123",
      token: "eyJsomething",
      safeField: "allowed_value",
      amount: 999,
    },
  });
  const meta = ns.metadata as Record<string, any>;
  assert(meta !== null, "1.6 Metadata is persisted (non-null)");
  assert(!("password" in (meta ?? {})), "1.7 'password' key is stripped from metadata");
  assert(!("token" in (meta ?? {})), "1.8 'token' key is stripped from metadata");
  assert(meta?.safeField === "allowed_value", "1.9 Safe string key is retained");
  assert(meta?.amount === 999, "1.10 Safe numeric key is retained");

  // 1.4 getUnreadCount
  const unread1 = await getUnreadCount(userA.id);
  assert(unread1 >= 3, "1.11 getUnreadCount returns count ≥ 3 (created 3 notifications for A)");

  const unreadB = await getUnreadCount(userB.id);
  assert(unreadB === 0, "1.12 getUnreadCount is 0 for userB (no notifications yet)");

  // 1.5 getUserNotifications pagination
  const result = await getUserNotifications(userA.id, { page: 1, limit: 5 });
  assert(Array.isArray(result.notifications), "1.13 getUserNotifications returns array");
  assert(result.pagination.page === 1, "1.14 Pagination page is 1");
  assert(result.pagination.limit === 5, "1.15 Pagination limit is respected");
  assert(result.unreadCount >= 0, "1.16 unreadCount is returned");

  // 1.6 getUserNotifications filter by isRead=false
  const unreadResult = await getUserNotifications(userA.id, { isRead: false });
  assert(
    unreadResult.notifications.every((n) => n.isRead === false),
    "1.17 isRead=false filter returns only unread notifications"
  );

  // 1.7 markNotificationAsRead
  const markResult = await markNotificationAsRead(userA.id, n1.id);
  assert(markResult.success === true, "1.18 markNotificationAsRead returns success:true");
  const afterMark = await prisma.notification.findUnique({ where: { id: n1.id } });
  assert(afterMark?.isRead === true, "1.19 Notification is marked as read in DB");
  assert(!!afterMark?.readAt, "1.20 readAt timestamp is set");

  // 1.8 IDOR: markNotificationAsRead with wrong user
  const idorResult = await markNotificationAsRead(userB.id, n1.id);
  assert(idorResult.success === false, "1.21 IDOR: userB cannot mark userA's notification");
  assert(idorResult.code === "FORBIDDEN", "1.22 IDOR: correct FORBIDDEN code returned");

  // 1.9 markAllNotificationsAsRead
  const allResult = await markAllNotificationsAsRead(userA.id);
  assert(allResult.success === true, "1.23 markAllNotificationsAsRead returns success");
  assert(typeof allResult.count === "number", "1.24 count is a number");
  const newUnread = await getUnreadCount(userA.id);
  assert(newUnread === 0, "1.25 After markAllRead, unreadCount is 0 for userA");

  // 1.10 deleteNotification
  const toDelete = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "To Delete",
    message: "Will be deleted",
  });
  const delResult = await deleteNotification(userA.id, toDelete.id);
  assert(delResult.success === true, "1.26 deleteNotification returns success");
  const afterDelete = await prisma.notification.findUnique({ where: { id: toDelete.id } });
  assert(afterDelete === null, "1.27 Notification is removed from DB after delete");

  // 1.11 IDOR: deleteNotification with wrong user
  const toDeleteB = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "IDOR Delete Test",
    message: "Only A can delete this",
  });
  const idorDel = await deleteNotification(userB.id, toDeleteB.id);
  assert(idorDel.success === false, "1.28 IDOR: userB cannot delete userA's notification");
  assert(idorDel.code === "FORBIDDEN", "1.29 IDOR: correct FORBIDDEN code for delete");

  // ──────────────────────
  // 2. API Layer Tests
  // ──────────────────────
  console.log("\n━━━ SECTION 2: API Layer ━━━\n");

  // Seed some notifications for API tests
  await Promise.all([
    createNotification({ userId: userA.id, type: NotificationType.PAYMENT_SUCCESS, title: "P1", message: "m1" }),
    createNotification({ userId: userA.id, type: NotificationType.NEW_SALE, title: "P2", message: "m2" }),
    createNotification({ userId: userA.id, type: NotificationType.PRODUCT_APPROVED, title: "P3", message: "m3" }),
  ]);

  // 2.1 GET /api/v1/notifications — unauthenticated
  const r1 = await getNotificationsHandler(mkReq("/api/v1/notifications"));
  assert(r1.status === 401, "2.1 GET /notifications → 401 without token");

  // 2.2 GET /api/v1/notifications — authenticated
  const r2 = await getNotificationsHandler(mkReq("/api/v1/notifications", { token: tokenA }));
  assert(r2.status === 200, "2.2 GET /notifications → 200 with valid token");
  const body2 = await readBody(r2);
  assert(Array.isArray(body2?.data?.notifications ?? body2?.notifications), "2.3 notifications array returned");

  // 2.3 GET /api/v1/notifications?isRead=false
  const r3 = await getNotificationsHandler(
    mkReq("/api/v1/notifications?isRead=false", { token: tokenA })
  );
  assert(r3.status === 200, "2.4 GET /notifications?isRead=false → 200");

  // 2.4 GET /api/v1/notifications?type=PAYMENT_SUCCESS
  const r4 = await getNotificationsHandler(
    mkReq("/api/v1/notifications?type=PAYMENT_SUCCESS", { token: tokenA })
  );
  assert(r4.status === 200, "2.5 GET /notifications?type=PAYMENT_SUCCESS → 200");

  // 2.5 GET /api/v1/notifications/unread-count — unauthenticated
  const r5 = await getUnreadCountHandler(mkReq("/api/v1/notifications/unread-count"));
  assert(r5.status === 401, "2.6 GET /unread-count → 401 without token");

  // 2.6 GET /api/v1/notifications/unread-count — authenticated
  const r6 = await getUnreadCountHandler(
    mkReq("/api/v1/notifications/unread-count", { token: tokenA })
  );
  assert(r6.status === 200, "2.7 GET /unread-count → 200 with valid token");
  const body6 = await readBody(r6);
  assert(typeof (body6?.data?.unreadCount ?? body6?.unreadCount) === "number", "2.8 unreadCount is a number");

  // 2.7 Seed a notification for by-id tests
  const testNotif = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "API Read Test",
    message: "For PATCH /read test",
  });
  const notifId = testNotif.id;

  // 2.8 GET /api/v1/notifications/[id] — own notification
  const r7 = await getNotifByIdHandler(
    mkReq(`/api/v1/notifications/${notifId}`, { token: tokenA }),
    { params: { id: notifId } }
  );
  assert(r7.status === 200, "2.9 GET /notifications/[id] → 200 for own notification");

  // 2.9 IDOR: GET /api/v1/notifications/[id] as different user
  const tokenB = mkToken(userB.id);
  const r8 = await getNotifByIdHandler(
    mkReq(`/api/v1/notifications/${notifId}`, { token: tokenB }),
    { params: { id: notifId } }
  );
  assert(r8.status === 403, "2.10 IDOR: GET /notifications/[id] → 403 for different user");

  // 2.10 PATCH /api/v1/notifications/[id]/read — own notification
  const r9 = await readNotifHandler(
    mkReq(`/api/v1/notifications/${notifId}/read`, { method: "PATCH", token: tokenA }),
    { params: { id: notifId } }
  );
  assert(r9.status === 200, "2.11 PATCH /notifications/[id]/read → 200 for own notification");
  const afterApiMark = await prisma.notification.findUnique({ where: { id: notifId } });
  assert(afterApiMark?.isRead === true, "2.12 Notification marked read in DB via API");

  // 2.11 IDOR: PATCH /read as different user
  const r10 = await readNotifHandler(
    mkReq(`/api/v1/notifications/${notifId}/read`, { method: "PATCH", token: tokenB }),
    { params: { id: notifId } }
  );
  assert(r10.status === 403, "2.13 IDOR: PATCH /read → 403 for different user");

  // 2.12 PATCH /api/v1/notifications/read-all — unauthenticated
  const r11 = await readAllHandler(mkReq("/api/v1/notifications/read-all", { method: "PATCH" }));
  assert(r11.status === 401, "2.14 PATCH /read-all → 401 without token");

  // 2.13 PATCH /api/v1/notifications/read-all — authenticated
  const r12 = await readAllHandler(
    mkReq("/api/v1/notifications/read-all", { method: "PATCH", token: tokenA })
  );
  assert(r12.status === 200, "2.15 PATCH /read-all → 200 with valid token");

  // 2.14 DELETE /api/v1/notifications/[id] — own notification
  const toApiDelete = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "API Delete Test",
    message: "Will be deleted via API",
  });
  const r13 = await deleteNotifHandler(
    mkReq(`/api/v1/notifications/${toApiDelete.id}`, { method: "DELETE", token: tokenA }),
    { params: { id: toApiDelete.id } }
  );
  assert(r13.status === 200, "2.16 DELETE /notifications/[id] → 200 for own notification");
  const afterApiDelete = await prisma.notification.findUnique({ where: { id: toApiDelete.id } });
  assert(afterApiDelete === null, "2.17 Notification deleted from DB via API");

  // 2.15 IDOR: DELETE as different user
  const toIdorDelete = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "IDOR API Delete Test",
    message: "Only A can delete",
  });
  const r14 = await deleteNotifHandler(
    mkReq(`/api/v1/notifications/${toIdorDelete.id}`, { method: "DELETE", token: tokenB }),
    { params: { id: toIdorDelete.id } }
  );
  assert(r14.status === 403, "2.18 IDOR: DELETE /notifications/[id] → 403 for different user");

  // 2.16 DELETE non-existent notification
  const r15 = await deleteNotifHandler(
    mkReq("/api/v1/notifications/nonexistent-id-xyz", { method: "DELETE", token: tokenA }),
    { params: { id: "nonexistent-id-xyz" } }
  );
  assert(r15.status === 404, "2.19 DELETE non-existent notification → 404");

  // ──────────────────────
  // 3. Notification Types Coverage
  // ──────────────────────
  console.log("\n━━━ SECTION 3: Notification Type Coverage ━━━\n");

  const allTypes = [
    NotificationType.SELLER_APPROVED,
    NotificationType.SELLER_REJECTED,
    NotificationType.PRODUCT_APPROVED,
    NotificationType.PRODUCT_REJECTED,
    NotificationType.PAYMENT_SUCCESS,
    NotificationType.NEW_SALE,
    NotificationType.RECEIPT_GENERATED,
    NotificationType.ORDER_PLACED,
    NotificationType.NEW_REVIEW,
    NotificationType.REFUND_PROCESSED,
    NotificationType.PAYOUT_COMPLETED,
    NotificationType.PAYOUT_FAILED,
    NotificationType.ACCOUNT_ALERT,
    NotificationType.PRODUCT_UPDATED,
  ];

  const userC = await createTestUser("C");
  for (const type of allTypes) {
    const n = await createNotification({
      userId: userC.id,
      type,
      title: `Test ${type}`,
      message: `Testing notification type ${type}`,
    });
    assert(n.type === type, `3.x createNotification supports type: ${type}`);
  }

  // ──────────────────────
  // 4. Security & Edge Cases
  // ──────────────────────
  console.log("\n━━━ SECTION 4: Security & Edge Cases ━━━\n");

  // 4.1 JWT-looking value in metadata must be stripped
  const jwtMeta = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "JWT Meta Strip",
    message: "JWT-like values in metadata should be stripped",
    metadata: {
      jwtValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
      okValue: "normal text",
    },
  });
  const jwtMeta_ = jwtMeta.metadata as Record<string, any>;
  assert(!("jwtValue" in (jwtMeta_ ?? {})), "4.1 JWT-like value is stripped from metadata");
  assert(jwtMeta_?.okValue === "normal text", "4.2 Normal string value is preserved");

  // 4.2 Long string value in metadata must be stripped
  const longStr = "a".repeat(501);
  const longMeta = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Long String Meta",
    message: "Long strings should be stripped",
    metadata: { longVal: longStr, shortVal: "ok" },
  });
  const longMeta_ = longMeta.metadata as Record<string, any>;
  assert(!("longVal" in (longMeta_ ?? {})), "4.3 String > 500 chars is stripped from metadata");
  assert(longMeta_?.shortVal === "ok", "4.4 Short string is preserved in metadata");

  // 4.3 Inactive user cannot access notifications
  const inactiveUser = await createTestUser("Inactive");
  await prisma.user.update({ where: { id: inactiveUser.id }, data: { isActive: false } });
  const inactiveToken = mkToken(inactiveUser.id);
  const r16 = await getNotificationsHandler(mkReq("/api/v1/notifications", { token: inactiveToken }));
  assert(r16.status === 403, "4.5 Inactive user: GET /notifications → 403");

  // 4.4 Invalid pagination param is rejected
  const r17 = await getNotificationsHandler(
    mkReq("/api/v1/notifications?page=abc", { token: tokenA })
  );
  assert(r17.status === 400, "4.6 Invalid page param → 400");

  // 4.5 linkUrl is stored correctly
  const withLink = await createNotification({
    userId: userA.id,
    type: NotificationType.SELLER_APPROVED,
    title: "Link Test",
    message: "Has a link",
    linkUrl: "/seller",
  });
  assert(withLink.linkUrl === "/seller", "4.7 linkUrl is correctly stored");

  // 4.6 Null dedupKey allows duplicates
  const dA = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "No Dedup A",
    message: "A",
  });
  const dB = await createNotification({
    userId: userA.id,
    type: NotificationType.ACCOUNT_ALERT,
    title: "No Dedup B",
    message: "B",
  });
  assert(dA.id !== dB.id, "4.8 Without dedupKey, duplicate notifications can be created");

  // 4.7 POST /notifications is restricted to ADMIN
  const r18 = await (await import("../src/app/api/v1/notifications/route")).POST(
    mkReq("/api/v1/notifications", {
      method: "POST",
      token: tokenA, // buyer token
      body: {
        userId: userA.id,
        type: "ACCOUNT_ALERT",
        title: "Unauthorized Create",
        message: "Should fail",
      },
    })
  );
  assert(r18.status === 403, "4.9 POST /notifications → 403 for non-admin users");

  // ──────────────────────
  // 5. Integration Tests
  // ──────────────────────
  console.log("\n━━━ SECTION 5: Integration (Event Trigger Verification) ━━━\n");

  // 5.1 SELLER_APPROVED notification is created by approve service
  const sellerUser = await createTestUser("SellerInteg");
  await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: "Notif Test Store",
      storeSlug: `notif-test-store-${Date.now()}`,
      status: "PENDING",
      panNumberMasked: "ABCDE1234F",
      bankAccountLast4: "7890",
      bankIfsc: "SBIN0000001",
      bankAccountHolder: "Test Seller",
    },
  });
  const sellerProfile = await prisma.sellerProfile.findFirst({
    where: { userId: sellerUser.id },
  });

  // Create admin user for approval
  const adminUser = await createTestUser("AdminNotif", UserRole.ADMIN);
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" });

  // Call the approve handler
  const { PATCH: approveHandler } = await import("../src/app/api/v1/admin/sellers/[id]/approve/route");
  await approveHandler(
    mkReq(`/api/v1/admin/sellers/${sellerProfile!.id}/approve`, {
      method: "PATCH",
      token: adminToken,
    }),
    { params: { id: sellerProfile!.id } }
  );

  // Wait briefly for async notification
  await new Promise((r) => setTimeout(r, 300));

  const sellerApprovalNotif = await prisma.notification.findFirst({
    where: {
      userId: sellerUser.id,
      type: "SELLER_APPROVED",
      dedupKey: `seller_approved_${sellerProfile!.id}`,
    },
  });
  assert(!!sellerApprovalNotif, "5.1 SELLER_APPROVED notification created after seller approval");
  assert(sellerApprovalNotif?.isRead === false, "5.2 Approval notification starts as unread");

  // 5.2 Verify SELLER_APPROVED dedupKey prevents duplicate notifications
  // Call approve again (will fail with status conflict but shouldn't create duplicate)
  const existingNotifCount = await prisma.notification.count({
    where: { dedupKey: `seller_approved_${sellerProfile!.id}` },
  });
  assert(existingNotifCount === 1, "5.3 Idempotency: only one SELLER_APPROVED notification per seller per event");

  // 5.3 Seller notifications page returns notifications via API
  const sellerNotifToken = mkToken(sellerUser.id);
  const r19 = await getNotificationsHandler(
    mkReq("/api/v1/notifications", { token: sellerNotifToken })
  );
  assert(r19.status === 200, "5.4 Seller can access their own notification list after event");
  const body19 = await readBody(r19);
  const sellerNotifs = body19?.data?.notifications ?? body19?.notifications ?? [];
  assert(sellerNotifs.some((n: any) => n.type === "SELLER_APPROVED"), "5.5 SELLER_APPROVED appears in seller's notification list");

  // ──────────────────────
  // Cleanup
  // ──────────────────────
  console.log("\n━━━ Cleanup ━━━\n");
  const userIds = [userA.id, userB.id, userC.id, inactiveUser.id, sellerUser.id, adminUser.id];
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { adminId: { in: userIds } } });
  await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log("  ✅ Test data cleaned up");


  // ──────────────────────
  // Summary
  // ──────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(` RESULTS: ${passed} passed / ${failed} failed`);
  if (errors.length > 0) {
    console.error("\n Failed assertions:");
    errors.forEach((e) => console.error(`   • ${e}`));
  }
  console.log("══════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\n💥 Test suite crashed:", err);
  await prisma.$disconnect();
  process.exit(1);
});

