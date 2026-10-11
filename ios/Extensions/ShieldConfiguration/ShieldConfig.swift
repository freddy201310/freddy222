import ManagedSettings
import ManagedSettingsUI
import UIKit

/// What the child sees on a blocked app.
final class ShieldConfig: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        if let token = application.token, let name = application.localizedDisplayName {
            AppGroup.rememberName(name, for: token)
        }
        let reason = AppGroup.policy?.state.reason ?? "Not allowed right now"
        let canAsk = AppGroup.policy?.rules.requests.enabled ?? true
        return ShieldConfiguration(
            backgroundBlurStyle: .systemMaterial,
            icon: UIImage(systemName: "shield.lefthalf.filled"),
            title: .init(text: "\(application.localizedDisplayName ?? "This app") is paused", color: .label),
            subtitle: .init(text: reason, color: .secondaryLabel),
            primaryButtonLabel: .init(text: canAsk ? "Ask for 15 more minutes" : "OK", color: .white),
            primaryButtonBackgroundColor: UIColor(red: 0.08, green: 0.50, blue: 0.42, alpha: 1),
            secondaryButtonLabel: canAsk ? .init(text: "OK", color: .label) : nil
        )
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        configuration(shielding: application)
    }
}
