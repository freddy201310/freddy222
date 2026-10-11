import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct APIError: Error, Equatable {
    public let status: Int
    public let code: String
}

/// Client for the Haven device API (haven/docs/PHONE_APPS.md).
public final class HavenAPI: @unchecked Sendable {
    public let base: URL
    private let session: URLSession

    public init(base: URL, session: URLSession = .shared) {
        self.base = base
        self.session = session
    }

    public struct Enrollment: Decodable, Sendable { public let deviceId: String; public let deviceToken: String; public let childName: String }

    public func enroll(code: String, name: String, model: String, osVersion: String) async throws -> Enrollment {
        let data = try await call("POST", "/api/device/enroll", token: nil, body: ["code": code, "platform": "IOS", "name": name, "model": model, "osVersion": osVersion])
        return try JSONDecoder().decode(Enrollment.self, from: data)
    }

    public func heartbeat(token: String, body: [String: Any]) async throws -> (Policy, Data) {
        let data = try await call("POST", "/api/device/heartbeat", token: token, body: body)
        return (try Policy.decode(data), data)
    }

    public func requestTime(token: String, appId: String, appName: String, minutes: Int, reason: String) async throws {
        _ = try await call("POST", "/api/device/requests", token: token, body: ["appId": appId, "appName": appName, "minutes": minutes, "reason": String(reason.prefix(200))])
    }

    public func myRequests(token: String) async throws -> [[String: Any]] {
        let data = try await call("GET", "/api/device/requests", token: token, body: nil)
        return ((try JSONSerialization.jsonObject(with: data) as? [String: Any])?["requests"] as? [[String: Any]]) ?? []
    }

    public func sos(token: String, latitude: Double?, longitude: Double?) async throws {
        var body: [String: Any] = [:]
        if let latitude, let longitude { body = ["latitude": latitude, "longitude": longitude] }
        _ = try await call("POST", "/api/device/sos", token: token, body: body)
    }

    public func webCheck(token: String, host: String) async throws -> (allowed: Bool, ttl: Int) {
        var comps = URLComponents(url: base.appendingPathComponent("api/device/web-check"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "host", value: host)]
        let data = try await send(URLRequest(url: comps.url!), token: token, timeout: 2.5)
        let json = (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        return ((json["allowed"] as? Bool) ?? true, (json["ttl"] as? Int) ?? 21600)
    }

    public func blocklist(token: String) async throws -> [String: Any] {
        let data = try await call("GET", "/api/device/blocklist", token: token, body: nil)
        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    private func call(_ method: String, _ path: String, token: String?, body: [String: Any]?) async throws -> Data {
        var req = URLRequest(url: base.appendingPathComponent(String(path.dropFirst())))
        req.httpMethod = method
        if let body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            req.setValue("application/json", forHTTPHeaderField: "content-type")
        }
        return try await send(req, token: token, timeout: 15)
    }

    private func send(_ request: URLRequest, token: String?, timeout: TimeInterval) async throws -> Data {
        var req = request
        req.timeoutInterval = timeout
        req.setValue("application/json", forHTTPHeaderField: "accept")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        let (data, response) = try await session.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(status) else {
            let code = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any])?["error"] as? String ?? "http_\(status)"
            throw APIError(status: status, code: code)
        }
        return data
    }
}

/// "m.example.com" matches "example.com"; "notexample.com" doesn't.
public func domainMatches(_ host: String, _ domain: String) -> Bool {
    host == domain || host.hasSuffix("." + domain)
}
