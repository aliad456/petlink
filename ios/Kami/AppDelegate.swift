import FirebaseCore
import FirebaseMessaging
import UIKit
import UserNotifications

// Kami for iPhone: the site (heykami.co.il) in a WKWebView with native pieces around it —
// a tab bar, the share sheet, pull to refresh, swipe back, an opening screen, an offline
// screen and push notifications (Firebase, like the Android app). See docs/IOS.md.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
    var window: UIWindow?
    private var main: WebViewController?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UIView.appearance().semanticContentAttribute = .forceRightToLeft

        if let options = Push.firebaseOptions() {
            FirebaseApp.configure(options: options)
            Messaging.messaging().delegate = self
        }
        UNUserNotificationCenter.current().delegate = self

        let vc = WebViewController()
        main = vc
        if let remote = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            vc.pendingURL = Push.url(from: remote)
        }
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = vc
        window.makeKeyAndVisible()
        self.window = window

        Push.shared.refresh()
        return true
    }

    // Links to heykami.co.il opened from other apps (universal links, once set up).
    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb, let url = userActivity.webpageURL else { return false }
        main?.open(url)
        return true
    }

    // ─── Push ───

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard Push.configured else { return }
        Messaging.messaging().apnsToken = deviceToken
        Push.shared.fetchToken()
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Push.shared.finish(token: nil)
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        Push.shared.saveToken(fcmToken)
    }

    // Show notifications also while the app is open.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    // Tapping a notification opens its page.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let url = Push.url(from: response.notification.request.content.userInfo) {
            main?.open(url)
        }
        completionHandler()
    }
}
