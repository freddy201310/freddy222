import DeviceActivity
import Foundation
import HavenCore

/// Runs inside iOS, even when the Haven app is closed. It records usage as threshold events fire,
/// re-applies the rules at the start of each day, and checks in with the server.
final class HavenMonitor: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        if let policy = AppGroup.policy { Shields.apply(policy) }
        checkIn()
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        guard let parsed = Monitoring.parse(event) else { return }
        let policy = AppGroup.policy
        let day = UsageLedger.day(ServerClock.shared.now(), timeZone: policy?.timeZone)
        var ledger = AppGroup.ledger
        ledger.record(day: day, category: parsed.category, minutes: parsed.minutes)
        AppGroup.ledger = ledger
        // Re-check locally right away (the policy counts down on its own), then ask the server.
        if let policy { Shields.apply(policy) }
        checkIn()
    }

    private func checkIn() {
        let done = DispatchSemaphore(value: 0)
        Task {
            await Sync.checkIn()
            done.signal()
        }
        _ = done.wait(timeout: .now() + 20)
    }
}
