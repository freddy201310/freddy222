import XCTest
@testable import HavenCore

final class HavenCoreTests: XCTestCase {
    // A real heartbeat response shape from the Haven server.
    let sample = """
    {"serverTime":"2026-10-14T20:00:00.000Z","timeZone":"America/New_York","nextCheckInSeconds":60,"policyVersion":3,
     "state":{"day":"2026-10-14","mode":"open","reason":"Open","schedule":null,"dailyLimit":120,"remaining":30},
     "rules":{"paused":false,"dailyLimit":[180,120,120,120,120,120,180],"schedules":[],"categories":{},"apps":[],
       "alwaysAllowed":{"phone":true,"maps":true,"approvedContactsMessaging":true},
       "installs":{"mode":"ask","maxAgeRating":"12+"},
       "web":{"blockCategories":["adult"],"blockDomains":["bad.com"],"allowDomains":[],"allowListOnly":false,"safeSearch":true,"youtubeRestricted":true,"filterInAppBrowsers":true,"blockPrivateDnsAndVpn":true},
       "requests":{"enabled":true,"maxPerDay":3,"maxMinutesPerRequest":30},"communication":"contacts",
       "tamper":{"lockOnTamper":true,"offlineAlertMinutes":60},"location":{"enabled":false}},
     "grants":[{"appId":"*","minutes":15}],"apps":{},
     "categories":{"games":{"allowed":true,"reason":"Allowed","remaining":10},"social":{"allowed":false,"reason":"This kind of app is blocked","remaining":0}}}
    """

    func testDecodesServerPolicy() throws {
        let p = try Policy.decode(Data(sample.utf8))
        XCTAssertEqual(p.policyVersion, 3)
        XCTAssertEqual(p.state.mode, "open")
        XCTAssertFalse(p.lockAll)
        XCTAssertFalse(p.locationEnabled)
        XCTAssertEqual(p.rules.web.blockDomains, ["bad.com"])
        XCTAssertEqual(p.grants.first?.minutes, 15)
        XCTAssertEqual(p.rules.dailyLimit.count, 7)
    }

    func testCountsDownOnTheServerClock() throws {
        let p = try Policy.decode(Data(sample.utf8))
        XCTAssertEqual(p.remaining(at: p.serverTime.addingTimeInterval(5 * 60)), 25)
        XCTAssertEqual(p.decision(category: "games", at: p.serverTime.addingTimeInterval(4 * 60)).remaining, 6)
        let later = p.decision(category: "games", at: p.serverTime.addingTimeInterval(11 * 60))
        XCTAssertFalse(later.allowed)
        XCTAssertFalse(p.decision(category: "social", at: p.serverTime).allowed)
        XCTAssertTrue(p.decision(category: "unknown", at: p.serverTime).allowed)
    }

    func testServerClockIgnoresWallClock() {
        var up: TimeInterval = 1000
        let clock = ServerClock(uptime: { up })
        let server = Date(timeIntervalSince1970: 1_760_000_000)
        clock.sync(serverTime: server)
        up += 90
        XCTAssertEqual(clock.now(), server.addingTimeInterval(90))
    }

    func testUsageLedgerAvoidsDoubleCounting() {
        var l = UsageLedger(day: "2026-10-14")
        l.record(day: "2026-10-14", category: nil, minutes: 50)
        l.record(day: "2026-10-14", category: "games", minutes: 20)
        l.record(day: "2026-10-14", category: "games", minutes: 15) // late event: never goes down
        l.record(day: "2026-10-14", category: "social", minutes: 10)
        let rows = l.rows()
        let total = rows.compactMap { $0["minutes"] as? Int }.reduce(0, +)
        XCTAssertEqual(total, 50)
        XCTAssertEqual(rows.first { ($0["appId"] as? String) == "ios:category:games" }?["minutes"] as? Int, 20)
        XCTAssertEqual(rows.first { ($0["appId"] as? String) == "ios:other" }?["minutes"] as? Int, 20)
        l.record(day: "2026-10-15", category: nil, minutes: 5) // new day resets
        XCTAssertEqual(l.totalMinutes, 5)
        XCTAssertTrue(l.categoryMinutes.isEmpty)
    }

    func testFamilyDayUsesFamilyTimeZone() {
        let d = Date(timeIntervalSince1970: 1_760_490_000) // 2025-10-15 00:00:00 UTC
        XCTAssertEqual(UsageLedger.day(d, timeZone: "America/New_York"), "2025-10-14")
        XCTAssertEqual(UsageLedger.day(d, timeZone: "UTC"), "2025-10-15")
    }

    func testThresholdsAndDomains() {
        XCTAssertEqual(usageThresholds(step: 5, max: 20), [5, 10, 15, 20])
        XCTAssertTrue(domainMatches("m.example.com", "example.com"))
        XCTAssertFalse(domainMatches("notexample.com", "example.com"))
    }
}
