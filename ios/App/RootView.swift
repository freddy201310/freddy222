import SwiftUI
import FamilyControls
import NetworkExtension
import HavenCore

/// First run: a parent enters the code from the website, approves Screen Time with their Apple ID,
/// and picks which apps belong to each category. There is no "disconnect" button for the child.
struct RootView: View {
    @State private var enrolled = Keychain.token != nil

    var body: some View {
        NavigationStack {
            if enrolled { SetupChecklist() } else { EnrollView(enrolled: $enrolled) }
        }
        .tint(Color(red: 0.08, green: 0.50, blue: 0.42))
    }
}

struct EnrollView: View {
    @Binding var enrolled: Bool
    @State private var code = ""
    @State private var name = UIDevice.current.name
    @State private var status = ""
    @State private var busy = false

    var body: some View {
        Form {
            Section {
                Text("Parents: on the Haven website, open your child's page → Connect a phone → iPhone, and type the code here.")
                    .foregroundStyle(.secondary)
            }
            Section("Setup code") {
                TextField("ABCD-2345", text: $code).textInputAutocapitalization(.characters).autocorrectionDisabled()
                TextField("Name this phone", text: $name)
            }
            if !status.isEmpty { Text(status).foregroundStyle(.red) }
            Button(busy ? "Connecting…" : "Connect") { Task { await connect() } }.disabled(busy || code.count < 8)
        }
        .navigationTitle("Set up Haven")
    }

    private func connect() async {
        busy = true
        defer { busy = false }
        do {
            let r = try await Sync.api.enroll(code: code, name: name, model: UIDevice.current.model, osVersion: "iOS \(UIDevice.current.systemVersion)")
            Keychain.token = r.deviceToken
            AppGroup.defaults.set(r.childName, forKey: "childName")
            enrolled = true
        } catch let e as APIError {
            status = switch e.code {
            case "invalid_or_expired_code": "That code didn't work or has expired. Make a new one on the website."
            case "wrong_platform": "That code is for Android. Make an iPhone code instead."
            case "rate_limited": "Too many tries. Wait 15 minutes."
            default: "Something went wrong (\(e.code))."
            }
        } catch {
            status = "No internet connection."
        }
    }
}

struct SetupChecklist: View {
    @State private var auth = AuthorizationCenter.shared.authorizationStatus
    @State private var picking: String?
    @State private var selection = FamilyActivitySelection()
    @State private var dnsOn = false
    @State private var error = ""

    var body: some View {
        List {
            Section {
                Text("Protecting \(AppGroup.defaults.string(forKey: "childName") ?? "this phone"). A parent should finish these steps.")
            }
            Section("1. Screen Time permission") {
                if auth == .approved {
                    Label("Approved", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                } else {
                    Button("Approve with the parent's Apple ID") { Task { await authorize() } }
                }
            }
            Section {
                pickRow("Everything (select all categories)", key: "everything")
                pickRow("Apps that should always work", key: "always")
                ForEach(havenCategories, id: \.id) { c in pickRow(c.label, key: c.id) }
            } header: {
                Text("2. Sort apps")
            } footer: {
                Text("Apple doesn't let apps see which apps are installed, so Haven asks you to point them out once. Your website rules for each category then apply to these apps.")
            }
            Section("3. Web filter") {
                if dnsOn {
                    Label("On", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                } else {
                    Button("Turn on the web filter") { Task { await enableDNS() } }
                    Text("Then open Settings → General → VPN & Device Management → DNS and choose Haven.").font(.footnote).foregroundStyle(.secondary)
                }
            }
            Section("4. Location") {
                Button("Allow location") { LocationReporter.shared.start() }
            }
            if !error.isEmpty { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Haven is on")
        .familyActivityPicker(isPresented: Binding(get: { picking != nil }, set: { if !$0 { save() } }), selection: $selection)
        .task { await refresh() }
    }

    private func pickRow(_ label: String, key: String) -> some View {
        Button {
            selection = key == "always" ? AppGroup.alwaysAllowed : key == "everything" ? AppGroup.everything : AppGroup.category(key)
            picking = key
        } label: {
            HStack {
                Text(label)
                Spacer()
                let s = key == "always" ? AppGroup.alwaysAllowed : key == "everything" ? AppGroup.everything : AppGroup.category(key)
                Text("\(s.applicationTokens.count + s.categoryTokens.count) chosen").foregroundStyle(.secondary)
            }
        }
        .disabled(auth != .approved)
    }

    private func save() {
        guard let key = picking else { return }
        switch key {
        case "always": AppGroup.alwaysAllowed = selection
        case "everything": AppGroup.everything = selection
        default: AppGroup.setCategory(key, selection)
        }
        picking = nil
        do { try Monitoring.start() } catch { self.error = "Couldn't start screen-time tracking: \(error.localizedDescription)" }
        Task { await Sync.checkIn() }
    }

    private func authorize() async {
        do {
            // .child: requires a parent's Apple ID approval, and the child can't remove Haven or revoke this.
            try await AuthorizationCenter.shared.requestAuthorization(for: .child)
        } catch {
            do { try await AuthorizationCenter.shared.requestAuthorization(for: .individual) } catch { self.error = error.localizedDescription }
        }
        auth = AuthorizationCenter.shared.authorizationStatus
    }

    private func enableDNS() async {
        let m = NEDNSSettingsManager.shared()
        try? await m.loadFromPreferences()
        let doh = NEDNSOverHTTPSSettings(servers: ["1.1.1.3", "1.0.0.3"])
        doh.serverURL = URL(string: "https://family.cloudflare-dns.com/dns-query")
        m.dnsSettings = doh
        m.localizedDescription = "Haven web filter"
        do {
            try await m.saveToPreferences()
            await refresh()
        } catch {
            self.error = "Couldn't set up the web filter: \(error.localizedDescription)"
        }
    }

    private func refresh() async {
        auth = AuthorizationCenter.shared.authorizationStatus
        let m = NEDNSSettingsManager.shared()
        try? await m.loadFromPreferences()
        dnsOn = m.isEnabled
    }
}
