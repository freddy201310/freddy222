import SwiftUI
import BackgroundTasks
import HavenCore

@main
struct HavenKidsApp: App {
    @Environment(\.scenePhase) private var phase
    static let refreshTask = "com.haven.kids.refresh"

    init() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.refreshTask, using: nil) { task in
            Self.scheduleRefresh()
            let work = Task {
                let ok = await Sync.checkIn(location: LocationReporter.shared.last)
                task.setTaskCompleted(success: ok)
            }
            task.expirationHandler = { work.cancel() }
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .onChange(of: phase) { _, newPhase in
            if newPhase == .active { Task { await Sync.checkIn(location: LocationReporter.shared.last) } }
            if newPhase == .background { Self.scheduleRefresh() }
        }
    }

    /// iOS decides when this actually runs (usually every hour or few). Screen-time events and
    /// opening the app also trigger check-ins.
    static func scheduleRefresh() {
        let req = BGAppRefreshTaskRequest(identifier: refreshTask)
        req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(req)
    }
}
