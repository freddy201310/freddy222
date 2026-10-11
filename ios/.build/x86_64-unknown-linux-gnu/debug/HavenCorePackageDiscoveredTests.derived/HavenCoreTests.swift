import XCTest
@testable import HavenCoreTests

fileprivate extension HavenCoreTests {
    @available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
    static nonisolated(unsafe) let __allTests__HavenCoreTests = [
        ("testCountsDownOnTheServerClock", testCountsDownOnTheServerClock),
        ("testDecodesServerPolicy", testDecodesServerPolicy),
        ("testFamilyDayUsesFamilyTimeZone", testFamilyDayUsesFamilyTimeZone),
        ("testServerClockIgnoresWallClock", testServerClockIgnoresWallClock),
        ("testThresholdsAndDomains", testThresholdsAndDomains),
        ("testUsageLedgerAvoidsDoubleCounting", testUsageLedgerAvoidsDoubleCounting)
    ]
}
@available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
func __HavenCoreTests__allTests() -> [XCTestCaseEntry] {
    return [
        testCase(HavenCoreTests.__allTests__HavenCoreTests)
    ]
}