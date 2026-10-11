import Foundation

/// Time a child can't change: the server's time plus how long the phone has been running since
/// we heard it. `systemUptime` keeps counting no matter what the date & time settings say.
public final class ServerClock: @unchecked Sendable {
    public static let shared = ServerClock()

    private let lock = NSLock()
    private var serverAtSync: Date?
    private var uptimeAtSync: TimeInterval = 0
    private let uptime: () -> TimeInterval

    public init(uptime: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }) {
        self.uptime = uptime
    }

    public func sync(serverTime: Date) {
        lock.lock(); defer { lock.unlock() }
        serverAtSync = serverTime
        uptimeAtSync = uptime()
    }

    public var isSynced: Bool { lock.lock(); defer { lock.unlock() }; return serverAtSync != nil }

    public func now() -> Date {
        lock.lock(); defer { lock.unlock() }
        guard let base = serverAtSync else { return Date() }
        return base.addingTimeInterval(uptime() - uptimeAtSync)
    }
}
