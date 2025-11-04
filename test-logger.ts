import { logLabBookingActivity, getUserInfoForLogging, getLabBookingActivityLogs } from "./lib/activity-logger"

async function test() {
  console.log("🧪 Testing activity logger...")
  
  try {
    // Test 1: Log a booking creation
    console.log("\n1. Creating test log...")
    await logLabBookingActivity({
      bookingId: 1,
      labId: 1,
      actorUserId: 1,
      actorName: "Test User",
      actorEmail: "test@lnmiit.ac.in",
      actorRole: "faculty",
      action: "created",
      actionDescription: "Test booking creation",
      bookingSnapshot: { test: true, date: new Date().toISOString() },
      ipAddress: "127.0.0.1",
      userAgent: "test-script",
    })
    console.log("✅ Test log created")
    
    // Test 2: Retrieve the log
    console.log("\n2. Retrieving logs...")
    const logs = await getLabBookingActivityLogs({ limit: 1 })
    console.log("✅ Retrieved", logs.length, "log(s)")
    console.log("Latest log:", JSON.stringify(logs[0], null, 2))
    
    console.log("\n✅ All tests passed!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Test failed:", error)
    process.exit(1)
  }
}

test()
