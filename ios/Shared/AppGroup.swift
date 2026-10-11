import Foundation
import FamilyControls
import ManagedSettings
import HavenCore

/// State shared between the app and its Screen Time extensions through the App Group container.
enum AppGroup {
    static let id = "group.com.haven.kids"
    static let defaults = UserDefaults(suiteName: id)!

    // MARK: Policy

    static var policyData: Data? {
        get { defaults.data(forKey: "policy") }
        set { defaults.set(newValue, forKey: "policy") }
    }

    static var policy: Policy? { policyData.flatMap { try? Policy.decode($0) } }

    static var appliedPolicyVersion: Int {
        get { defaults.integer(forKey: "appliedVersion") }
        set { defaults.set(newValue, forKey: "appliedVersion") }
    }

    // MARK: What the parent picked on this phone (Apple only gives apps opaque tokens)

    /// Apps that must always work (beyond Phone, which iOS never blocks).
    static var alwaysAllowed: FamilyActivitySelection {
        get { load("sel.always") ?? FamilyActivitySelection() }
        set { save(newValue, "sel.always") }
    }

    /// "Everything" — the parent selects all categories once, so Haven can measure total screen time.
    static var everything: FamilyActivitySelection {
        get { load("sel.everything") ?? FamilyActivitySelection() }
        set { save(newValue, "sel.everything") }
    }

    /// One selection per Haven category ("games", "social", …), picked by the parent during setup.
    static func category(_ id: String) -> FamilyActivitySelection {
        load("sel.cat.\(id)") ?? FamilyActivitySelection()
    }

    static func setCategory(_ id: String, _ selection: FamilyActivitySelection) {
        save(selection, "sel.cat.\(id)")
    }

    // MARK: Usage from DeviceActivity threshold events

    static var ledger: UsageLedger {
        get { defaults.data(forKey: "ledger").flatMap { try? JSONDecoder().decode(UsageLedger.self, from: $0) } ?? UsageLedger(day: "") }
        set { defaults.set(try? JSONEncoder().encode(newValue), forKey: "ledger") }
    }

    // MARK: Requests queued by the shield (sent by the app or the monitor)

    struct PendingRequest: Codable { var appId: String; var appName: String; var minutes: Int }

    static var pendingRequests: [PendingRequest] {
        get { defaults.data(forKey: "pending").flatMap { try? JSONDecoder().decode([PendingRequest].self, from: $0) } ?? [] }
        set { defaults.set(try? JSONEncoder().encode(newValue), forKey: "pending") }
    }

    /// Stable id for an app token, used as the request's appId (iOS never reveals bundle ids).
    static func appId(for token: ApplicationToken) -> String {
        let data = (try? JSONEncoder().encode(token)) ?? Data()
        var hash: UInt64 = 1469598103934665603 // FNV-1a
        for b in data { hash = (hash ^ UInt64(b)) &* 1099511628211 }
        return "ios:app:" + String(hash, radix: 16)
    }

    static func rememberName(_ name: String, for token: ApplicationToken) {
        let id = appId(for: token)
        defaults.set(name, forKey: "name." + id)
        defaults.set(try? JSONEncoder().encode(token), forKey: "token." + id)
    }

    /// The app token behind an "ios:app:…" id, if the block screen has shown that app.
    static func token(forAppId id: String) -> ApplicationToken? {
        defaults.data(forKey: "token." + id).flatMap { try? JSONDecoder().decode(ApplicationToken.self, from: $0) }
    }

    /// When a grant was first seen on this phone; approved minutes count from then.
    static func grantStart(_ appId: String, day: String, now: Date) -> Date {
        let key = "grant.\(day).\(appId)"
        if let t = defaults.object(forKey: key) as? Date { return t }
        defaults.set(now, forKey: key)
        return now
    }

    static func name(for token: ApplicationToken) -> String {
        defaults.string(forKey: "name." + appId(for: token)) ?? "this app"
    }

    private static func load<T: Decodable>(_ key: String) -> T? {
        defaults.data(forKey: key).flatMap { try? PropertyListDecoder().decode(T.self, from: $0) }
    }

    private static func save<T: Encodable>(_ value: T, _ key: String) {
        defaults.set(try? PropertyListEncoder().encode(value), forKey: key)
    }
}

/// The Haven categories the parent maps on this phone.
let havenCategories: [(id: String, label: String)] = [
    ("social", "Social media"), ("games", "Games"), ("video", "Video & streaming"), ("messaging", "Messaging"),
    ("browsers", "Web browsers"), ("shopping", "Shopping"), ("education", "School & learning"), ("creativity", "Creativity"),
]
