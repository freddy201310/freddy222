import Foundation
import FamilyControls
import ManagedSettings
import HavenCore

/// Turns a Haven policy into Screen Time settings. Used by the app and the monitor extension,
/// so rules apply on schedule even when the app isn't running.
enum Shields {
    static let store = ManagedSettingsStore(named: .init("haven"))

    static func apply(_ policy: Policy, now: Date = ServerClock.shared.now()) {
        let always = AppGroup.alwaysAllowed
        let rules = policy.rules

        // Protect Haven itself and the settings kids use to get around it.
        store.application.denyAppRemoval = true
        store.dateAndTime.requireAutomaticDateAndTime = true
        store.passcode.lockPasscode = true
        store.account.lockAccounts = true
        store.appStore.maximumRating = appRating(rules.installs?.maxAgeRating)
        store.application.denyAppInstallation = rules.installs?.mode == "block"

        // Websites: Apple's adult-content filter, plus the parent's own lists.
        let blocked = Set(rules.web.blockDomains.map { WebDomain(domain: $0) })
        let allowed = Set(rules.web.allowDomains.map { WebDomain(domain: $0) })
        if rules.web.allowListOnly {
            store.webContent.blockedByFilter = .all(except: allowed)
        } else if rules.web.blockCategories.contains("adult") {
            store.webContent.blockedByFilter = .auto(blocked, except: allowed)
        } else {
            store.webContent.blockedByFilter = .specific(blocked)
        }

        let bonus = activeGrantTokens(policy, now: now)

        if policy.lockAll {
            // Downtime, time's up, paused, or a bypass attempt: everything except always-allowed apps.
            // Once the daily limit is used up, approved bonus time still opens its one app.
            let except = policy.state.mode == "limit" ? always.applicationTokens.union(bonus) : always.applicationTokens
            store.shield.applicationCategories = .all(except: except)
            store.shield.webDomainCategories = .all(except: always.webDomainTokens)
            store.shield.applications = nil
            return
        }

        // Open: shield only the categories whose own limit is used up or that are blocked.
        var shieldedCategories = Set<ActivityCategoryToken>()
        var shieldedApps = Set<ApplicationToken>()
        for (id, _) in havenCategories where !policy.decision(category: id, at: now).allowed {
            let sel = AppGroup.category(id)
            shieldedCategories.formUnion(sel.categoryTokens)
            shieldedApps.formUnion(sel.applicationTokens)
        }
        // Approved bonus time for a specific app lifts its shield.
        shieldedApps.subtract(always.applicationTokens)
        shieldedApps.subtract(bonus)

        store.shield.applicationCategories = shieldedCategories.isEmpty ? nil : .specific(shieldedCategories, except: always.applicationTokens.union(bonus))
        store.shield.applications = shieldedApps.isEmpty ? nil : shieldedApps
        store.shield.webDomainCategories = nil
    }

    /// Apps with approved bonus time still running. iOS can't count one app's minutes from here,
    /// so the approved minutes run from when the phone first saw the approval.
    static func activeGrantTokens(_ policy: Policy, now: Date) -> Set<ApplicationToken> {
        let day = UsageLedger.day(now, timeZone: policy.timeZone)
        var out = Set<ApplicationToken>()
        for g in policy.grants where g.appId.hasPrefix("ios:app:") {
            let start = AppGroup.grantStart(g.appId, day: day, now: now)
            if now < start.addingTimeInterval(Double(g.minutes) * 60), let token = AppGroup.token(forAppId: g.appId) {
                out.insert(token)
            }
        }
        return out
    }

    /// Apple's numeric App Store ratings (as used by Screen Time): 4+ = 100, 9+ = 200, 12+ = 300, 17+ = 600.
    static func appRating(_ label: String?) -> Int {
        switch label {
        case "4+": return 100
        case "9+": return 200
        case "17+": return 600
        default: return 300
        }
    }

    static func clearAll() {
        store.clearAllSettings()
    }
}
