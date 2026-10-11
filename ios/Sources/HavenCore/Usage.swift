import Foundation

/// iOS never tells apps which apps a child used (that stays inside Apple's sandboxed report).
/// What it does give us is "this selection reached N minutes today" events from DeviceActivity.
/// Haven registers events every few minutes for each category the parent mapped, plus all apps,
/// and turns them into the per-row usage the server expects — without double counting.
public struct UsageLedger: Codable, Equatable, Sendable {
    public var day: String
    public var totalMinutes: Int = 0
    public var categoryMinutes: [String: Int] = [:]

    public init(day: String) { self.day = day }

    /// Record a threshold event. Values only go up within a day.
    public mutating func record(day: String, category: String?, minutes: Int) {
        if day != self.day { self = UsageLedger(day: day) }
        if let category {
            categoryMinutes[category] = max(categoryMinutes[category] ?? 0, minutes)
        } else {
            totalMinutes = max(totalMinutes, minutes)
        }
    }

    /// Rows for the heartbeat: one per category, plus "other" for time outside mapped categories.
    public func rows() -> [[String: Any]] {
        var rows: [[String: Any]] = categoryMinutes.sorted { $0.key < $1.key }.map { cat, mins in
            ["appId": "ios:category:\(cat)", "appName": UsageLedger.label(cat), "category": cat, "minutes": min(mins, 1440)]
        }
        let other = max(0, totalMinutes - categoryMinutes.values.reduce(0, +))
        if other > 0 { rows.append(["appId": "ios:other", "appName": "Other apps", "category": "", "minutes": min(other, 1440)]) }
        return rows
    }

    public static func label(_ category: String) -> String {
        ["social": "Social media", "games": "Games", "video": "Video & streaming", "messaging": "Messaging",
         "browsers": "Web browsers", "shopping": "Shopping", "education": "School & learning", "creativity": "Creativity"][category] ?? category
    }

    /// The family's calendar day for a moment in time.
    public static func day(_ date: Date, timeZone: String?) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone.flatMap(TimeZone.init(identifier:)) ?? .current
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
}

/// Minutes at which to fire DeviceActivity threshold events: every `step` minutes up to `max`.
public func usageThresholds(step: Int = 5, max: Int = 600) -> [Int] {
    Array(stride(from: step, through: max, by: step))
}
