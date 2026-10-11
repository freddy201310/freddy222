import Foundation

public struct Decision: Codable, Equatable, Sendable {
    public var allowed: Bool
    public var reason: String
    public var remaining: Int?

    public init(allowed: Bool, reason: String, remaining: Int?) {
        self.allowed = allowed
        self.reason = reason
        self.remaining = remaining
    }
}

public struct DeviceState: Codable, Equatable, Sendable {
    public var day: String
    public var mode: String // open | schedule | limit | paused | tamper
    public var reason: String
    public var dailyLimit: Int?
    public var remaining: Int?
}

public struct Grant: Codable, Equatable, Sendable {
    public var appId: String
    public var minutes: Int
}

/// The parts of the rules the phone needs locally. Unknown fields are ignored, so the server can add more.
public struct Rules: Codable, Equatable, Sendable {
    public struct AlwaysAllowed: Codable, Equatable, Sendable { public var maps: Bool?; public var approvedContactsMessaging: Bool? }
    public struct Requests: Codable, Equatable, Sendable { public var enabled: Bool; public var maxPerDay: Int; public var maxMinutesPerRequest: Int }
    public struct Web: Codable, Equatable, Sendable {
        public var blockCategories: [String]
        public var blockDomains: [String]
        public var allowDomains: [String]
        public var allowListOnly: Bool
        public var safeSearch: Bool
        public var youtubeRestricted: Bool
    }
    public struct Location: Codable, Equatable, Sendable { public var enabled: Bool }
    public struct Installs: Codable, Equatable, Sendable { public var mode: String; public var maxAgeRating: String }

    public var paused: Bool
    public var dailyLimit: [Int?]
    public var alwaysAllowed: AlwaysAllowed?
    public var requests: Requests
    public var web: Web
    public var location: Location?
    public var installs: Installs?
    public var communication: String?
}

/// The compiled policy returned by /api/device/heartbeat.
public struct Policy: Codable, Equatable, Sendable {
    public var serverTime: Date
    public var timeZone: String?
    public var nextCheckInSeconds: Int
    public var policyVersion: Int
    public var state: DeviceState
    public var rules: Rules
    public var grants: [Grant]
    public var categories: [String: Decision]

    public var locationEnabled: Bool { rules.location?.enabled ?? true }

    /// Should everything except always-allowed apps be shielded right now?
    public var lockAll: Bool { state.mode != "open" }

    /// Minutes of overall screen time left, counted down on the server clock since the policy arrived.
    public func remaining(at now: Date) -> Int? {
        guard let left = state.remaining else { return nil }
        let elapsed = max(0, Int(now.timeIntervalSince(serverTime) / 60))
        return max(0, left - elapsed)
    }

    /// Decision for one Haven category (games, social, …), counted down the same way.
    public func decision(category: String, at now: Date) -> Decision {
        guard var d = categories[category] else {
            return Decision(allowed: !lockAll, reason: state.reason, remaining: nil)
        }
        if let left = d.remaining {
            let elapsed = max(0, Int(now.timeIntervalSince(serverTime) / 60))
            d.remaining = max(0, left - elapsed)
            if d.allowed && d.remaining == 0 { d = Decision(allowed: false, reason: "Time limit reached", remaining: 0) }
        }
        return d
    }

    public static func decode(_ data: Data) throws -> Policy {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { d in
            let s = try d.singleValueContainer().decode(String.self)
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = f.date(from: s) { return date }
            f.formatOptions = [.withInternetDateTime]
            if let date = f.date(from: s) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: d.codingPath, debugDescription: "Bad date \(s)"))
        }
        return try decoder.decode(Policy.self, from: data)
    }
}
