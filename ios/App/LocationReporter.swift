import CoreLocation

/// Keeps the latest location using significant-change monitoring, which is light on battery and
/// also wakes the app in the background so it can check in.
final class LocationReporter: NSObject, CLLocationManagerDelegate {
    static let shared = LocationReporter()
    private let manager = CLLocationManager()
    private(set) var last: CLLocation?

    override init() {
        super.init()
        manager.delegate = self
    }

    func start() {
        manager.requestAlwaysAuthorization()
        manager.startMonitoringSignificantLocationChanges()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        last = locations.last
        Task { await Sync.checkIn(location: last) }
    }
}
