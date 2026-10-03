import FirebaseCore
import FirebaseMessaging
import UIKit
import UserNotifications

// Push notifications through Firebase, exposed to the site with the same API as the
// Android app (window.KamiApp: pushState / requestPush / pushToken, and the
// "kami-push" event) — see src/components/push-toggle.tsx.
final class Push {
    static let shared = Push()
    private static let tokenKey = "fcm_token"

    /// "granted" (on, token saved) / "default" / "denied" / "unavailable"
    private(set) var state = "default"
    var token: String? { UserDefaults.standard.string(forKey: Push.tokenKey) }

    /// Called whenever the state or token changes (the web view pushes it into the page).
    var onChange: (() -> Void)?
    /// Called once with the token (or nil) after requestPush().
    var onResult: ((String?) -> Void)?

    static var configured: Bool { FirebaseApp.app() != nil }

    // Firebase is set up from build-time values (no GoogleService-Info.plist), so a build
    // without them still works, just without push.
    static func firebaseOptions() -> FirebaseOptions? {
        let info = Bundle.main.infoDictionary ?? [:]
        func value(_ key: String) -> String? {
            guard let v = info[key] as? String, !v.isEmpty, !v.hasPrefix("$(") else { return nil }
            return v
        }
        guard let appId = value("KamiFcmAppId"), let apiKey = value("KamiFcmApiKey"),
              let projectId = value("KamiFcmProjectId"), let sender = value("KamiFcmSenderId") else { return nil }
        let o = FirebaseOptions(googleAppID: appId, gcmSenderID: sender)
        o.apiKey = apiKey
        o.projectID = projectId
        return o
    }

    static func url(from userInfo: [AnyHashable: Any]) -> URL? {
        guard let s = userInfo["url"] as? String, let url = URL(string: s) else { return nil }
        return url
    }

    /// Re-read the permission (on launch and when coming back to the app).
    func refresh() {
        guard Push.configured else {
            set("unavailable")
            return
        }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    self.set(self.token != nil ? "granted" : "default")
                    UIApplication.shared.registerForRemoteNotifications() // keeps the token fresh
                case .denied:
                    self.set("denied")
                default:
                    self.set("default")
                }
            }
        }
    }

    /// The site's "turn on notifications" button.
    func request() {
        guard Push.configured else {
            finish(token: nil)
            return
        }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications() // → AppDelegate → fetchToken()
                } else {
                    self.set("denied")
                    self.finish(token: nil)
                }
            }
        }
    }

    func fetchToken() {
        Messaging.messaging().token { token, _ in
            DispatchQueue.main.async {
                self.saveToken(token)
                self.finish(token: token)
            }
        }
    }

    func saveToken(_ token: String?) {
        guard let token, !token.isEmpty else { return }
        UserDefaults.standard.set(token, forKey: Push.tokenKey)
        set("granted")
    }

    func finish(token: String?) {
        let done = onResult
        onResult = nil
        done?(token)
    }

    private func set(_ s: String) {
        state = s
        onChange?()
    }
}
