import ManagedSettings
import Foundation
import HavenCore

/// Handles the buttons on the block screen. "Ask for more time" sends a request for this one app.
final class ShieldActionHandler: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        guard action == .primaryButtonPressed, AppGroup.policy?.rules.requests.enabled ?? true else {
            completionHandler(.close)
            return
        }
        var queue = AppGroup.pendingRequests
        queue.append(.init(appId: AppGroup.appId(for: application), appName: AppGroup.name(for: application), minutes: 15))
        AppGroup.pendingRequests = queue
        Task {
            if let token = Keychain.token { await Sync.flushRequests(token: token) }
            completionHandler(.close)
        }
    }
}
