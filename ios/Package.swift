// swift-tools-version:5.9
// HavenCore: the platform-independent part of the Haven Kids iPhone app (API client, policy,
// tamper-proof clock, usage bookkeeping). Builds and tests on macOS and Linux.
import PackageDescription

let package = Package(
    name: "HavenCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "HavenCore", targets: ["HavenCore"])],
    targets: [
        .target(name: "HavenCore"),
        .testTarget(name: "HavenCoreTests", dependencies: ["HavenCore"]),
    ]
)
