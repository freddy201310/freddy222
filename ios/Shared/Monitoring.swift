import Foundation
import DeviceActivity
import FamilyControls
import HavenCore

extension DeviceActivityName {
    static let daily = Self("haven.daily")
}

/// Registers the daily schedule and the usage threshold events the monitor extension reacts to.
enum Monitoring {
    static let totalStep = 10, totalMax = 600
    static let categoryStep = 15, categoryMax = 300

    static func start() throws {
        var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
        let everything = AppGroup.everything
        for m in usageThresholds(step: totalStep, max: totalMax) {
            events[.init("total.\(m)")] = DeviceActivityEvent(
                applications: everything.applicationTokens,
                categories: everything.categoryTokens,
                webDomains: everything.webDomainTokens,
                threshold: DateComponents(minute: m)
            )
        }
        for (id, _) in havenCategories {
            let sel = AppGroup.category(id)
            if sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty { continue }
            for m in usageThresholds(step: categoryStep, max: categoryMax) {
                events[.init("cat.\(id).\(m)")] = DeviceActivityEvent(
                    applications: sel.applicationTokens, categories: sel.categoryTokens, webDomains: sel.webDomainTokens,
                    threshold: DateComponents(minute: m)
                )
            }
        }
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        let center = DeviceActivityCenter()
        center.stopMonitoring([.daily])
        try center.startMonitoring(.daily, during: schedule, events: events)
    }

    /// "total.40" → (nil, 40); "cat.games.30" → ("games", 30)
    static func parse(_ event: DeviceActivityEvent.Name) -> (category: String?, minutes: Int)? {
        let parts = event.rawValue.split(separator: ".")
        if parts.count == 2, parts[0] == "total", let m = Int(parts[1]) { return (nil, m) }
        if parts.count == 3, parts[0] == "cat", let m = Int(parts[2]) { return (String(parts[1]), m) }
        return nil
    }
}
