import Foundation
import FamilyControls
#if !HAVEN_EXTENSION
import NetworkExtension
#endif
import CoreLocation
import HavenCore

/// One check-in with the server: report usage and tamper signals, get the latest policy, apply it.
enum Sync {
    static var api: HavenAPI {
        let base = (Bundle.main.object(forInfoDictionaryKey: "HavenServer") as? String) ?? "https://havenparents.com"
        return HavenAPI(base: URL(string: base)!)
    }

    @discardableResult
    static func checkIn(location: CLLocation? = nil) async -> Bool {
        guard let token = Keychain.token else { return false }
        let policy = AppGroup.policy
        var body: [String: Any] = [
            "appliedPolicyVersion": AppGroup.appliedPolicyVersion,
            "deviceTime": ISO8601DateFormatter().string(from: Date()),
            "osVersion": "iOS \(ProcessInfo.processInfo.operatingSystemVersionString)",
            "signals": await signals(),
            "usage": AppGroup.ledger.rows(),
        ]
        if let location, policy?.locationEnabled ?? true {
            body["location"] = ["latitude": location.coordinate.latitude, "longitude": location.coordinate.longitude]
        }
        do {
            let (newPolicy, data) = try await api.heartbeat(token: token, body: body)
            ServerClock.shared.sync(serverTime: newPolicy.serverTime)
            AppGroup.policyData = data
            Shields.apply(newPolicy)
            AppGroup.appliedPolicyVersion = newPolicy.policyVersion
            await flushRequests(token: token)
            return true
        } catch let e as APIError where e.status == 401 {
            // A parent removed this phone on the website.
            Keychain.token = nil
            Shields.clearAll()
            return false
        } catch {
            // Offline: the last policy stays applied through ManagedSettings.
            return false
        }
    }

    /// Requests the shield queued while it couldn't reach the server.
    static func flushRequests(token: String) async {
        var queue = AppGroup.pendingRequests
        while let r = queue.first {
            do {
                try await api.requestTime(token: token, appId: r.appId, appName: r.appName, minutes: r.minutes, reason: "")
            } catch let e as APIError where e.status == 429 || e.status == 403 {
                // Over the daily limit or turned off: drop it, the child saw the limit on the shield.
            } catch {
                break
            }
            queue.removeFirst()
        }
        AppGroup.pendingRequests = queue
    }

    static func signals() async -> [String: Any] {
        let auth = AuthorizationCenter.shared.authorizationStatus
        #if HAVEN_EXTENSION
        // Extensions can't read DNS settings; use what the app saw last.
        let dnsSwitchedOff = AppGroup.defaults.bool(forKey: "dnsSwitchedOff")
        #else
        let dns = NEDNSSettingsManager.shared()
        try? await dns.loadFromPreferences()
        let dnsSwitchedOff = dns.dnsSettings != nil && !dns.isEnabled
        AppGroup.defaults.set(dnsSwitchedOff, forKey: "dnsSwitchedOff")
        #endif
        return [
            "timeZone": TimeZone.current.identifier,
            "controlsPermissionRevoked": auth != .approved,
            // The encrypted-DNS web filter was switched off in Settings.
            "profileRemoved": dnsSwitchedOff,
            "vpnActive": false,
            "assistedAccess": false,
        ]
    }
}
