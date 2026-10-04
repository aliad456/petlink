import SafariServices
import UIKit
import WebKit

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UITabBarDelegate {
    static let home = URL(string: "https://heykami.co.il/")!

    /// A page to open once the web view exists (from a notification that launched the app).
    var pendingURL: URL?

    private var web: WKWebView!
    private let tabBar = UITabBar()
    private let offline = OfflineView()
    private var splash: SplashView?
    private var progressObservation: NSKeyValueObservation?

    // Native tab bar (right to left: בית first).
    private let tabs: [(title: String, icon: String, selected: String, path: String)] = [
        ("בית", "house", "house.fill", "/"),
        ("חיפוש", "magnifyingglass", "magnifyingglass", "/search"),
        ("מבצעים", "tag", "tag.fill", "/deals"),
        ("החשבון שלי", "person.crop.circle", "person.crop.circle.fill", "/account"),
    ]

    private static let pageBg = UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.020, green: 0.031, blue: 0.043, alpha: 1)
        : UIColor(red: 0.933, green: 0.949, blue: 0.957, alpha: 1) }
    static let brand = UIColor(red: 0.031, green: 0.569, blue: 0.698, alpha: 1)

    override var preferredStatusBarStyle: UIStatusBarStyle { splash != nil ? .darkContent : .default }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.pageBg

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.applicationNameForUserAgent = "Version/17.0 Mobile/15E148 Safari/604.1 KamiApp-iOS/\(Self.appVersion)"
        config.userContentController.add(WeakHandler(self), name: "kami")
        installScripts(config.userContentController)

        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true // swipe back, like any iPhone app
        web.isOpaque = false
        web.backgroundColor = Self.pageBg
        web.scrollView.backgroundColor = Self.pageBg
        if #available(iOS 16.4, *) {
            #if DEBUG
            web.isInspectable = true
            #endif
        }
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(pullToRefresh(_:)), for: .valueChanged)
        web.scrollView.refreshControl = refresh

        tabBar.delegate = self
        tabBar.tintColor = Self.brand
        tabBar.items = tabs.enumerated().map { i, t in
            let item = UITabBarItem(title: t.title, image: UIImage(systemName: t.icon), selectedImage: UIImage(systemName: t.selected))
            item.tag = i
            return item
        }
        tabBar.selectedItem = tabBar.items?.first
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        tabBar.standardAppearance = appearance
        tabBar.scrollEdgeAppearance = appearance

        for v in [web!, tabBar, offline] as [UIView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(v)
        }
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: tabBar.topAnchor),
            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            offline.topAnchor.constraint(equalTo: view.topAnchor),
            offline.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            offline.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            offline.bottomAnchor.constraint(equalTo: tabBar.topAnchor),
        ])
        offline.isHidden = true
        offline.onRetry = { [weak self] in
            guard let self else { return }
            self.offline.isHidden = true
            if self.web.url == nil { self.web.load(URLRequest(url: Self.home)) } else { self.web.reload() }
        }

        // Opening screen, over everything until the first page is ready.
        let s = SplashView(frame: view.bounds)
        s.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(s)
        splash = s
        s.start()
        progressObservation = web.observe(\.estimatedProgress, options: [.new]) { [weak self] web, _ in
            self?.splash?.setProgress(web.estimatedProgress)
        }

        Push.shared.onChange = { [weak self] in self?.syncPush() }

        web.load(URLRequest(url: pendingURL.flatMap { isOurs($0) ? $0 : nil } ?? Self.home))
        pendingURL = nil

        NotificationCenter.default.addObserver(self, selector: #selector(didBecomeActive),
                                               name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    func open(_ url: URL) {
        guard isOurs(url) else { return }
        if web == nil { pendingURL = url } else { web.load(URLRequest(url: url)) }
    }

    @objc private func didBecomeActive() {
        Push.shared.refresh() // notifications may have been turned on/off in Settings
    }

    @objc private func pullToRefresh(_ sender: UIRefreshControl) {
        web.reload()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
    }

    private static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1"
    }

    private func isOurs(_ url: URL) -> Bool {
        guard let scheme = url.scheme, scheme == "https" || scheme == "http" else { return false }
        return url.host == "heykami.co.il" || url.host == "www.heykami.co.il"
    }

    // ─── Scripts: the bridge the site talks to ───

    private func installScripts(_ ucc: WKUserContentController) {
        ucc.removeAllUserScripts()
        let state = Self.js(Push.shared.state), token = Self.js(Push.shared.token ?? "")
        let bridge = """
        (function () {
          var s = { state: \(state), token: \(token) };
          window.KamiApp = {
            pushState: function () { return s.state; },
            pushToken: function () { return s.token; },
            requestPush: function () { window.webkit.messageHandlers.kami.postMessage({ type: "push" }); }
          };
          window.__kamiSetPush = function (state, token) { s.state = state; s.token = token || ""; };
          navigator.share = function (d) {
            d = d || {};
            window.webkit.messageHandlers.kami.postMessage({ type: "share", title: d.title || "", text: d.text || "", url: d.url || "" });
            return Promise.resolve();
          };
          navigator.canShare = function () { return true; };
          // Lets the site hide things that don't belong in the App Store build (html.kami-ios).
          function mark() { if (document.documentElement) { document.documentElement.classList.add("kami-ios"); return true; } return false; }
          if (!mark()) new MutationObserver(function (_, o) { if (mark()) o.disconnect(); }).observe(document, { childList: true });
        })();
        """
        ucc.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    private static func js(_ s: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [s])
        let arr = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(arr.dropFirst().dropLast())
    }

    private func syncPush() {
        guard let web else { return }
        installScripts(web.configuration.userContentController) // for the next full page load
        web.evaluateJavaScript("window.__kamiSetPush && window.__kamiSetPush(\(Self.js(Push.shared.state)), \(Self.js(Push.shared.token ?? "")))")
    }

    private func sendPushResult(_ token: String?) {
        let detail = token.map { Self.js($0) } ?? "null"
        web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('kami-push', { detail: { token: \(detail) } }))")
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String,
              let url = message.frameInfo.request.url, isOurs(url) else { return }
        switch type {
        case "push":
            Push.shared.onResult = { [weak self] token in
                self?.syncPush()
                self?.sendPushResult(token)
            }
            Push.shared.request()
        case "share":
            var items: [Any] = []
            let text = [body["title"] as? String, body["text"] as? String].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: "\n")
            if !text.isEmpty { items.append(text) }
            if let s = body["url"] as? String, let u = URL(string: s, relativeTo: web.url)?.absoluteURL { items.append(u) }
            if items.isEmpty, let u = web.url { items.append(u) }
            present(UIActivityViewController(activityItems: items, applicationActivities: nil), animated: true)
        default:
            break
        }
    }

    // ─── Navigation ───

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        if isOurs(url) || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" {
            return decisionHandler(.allow)
        }
        decisionHandler(.cancel)
        openOutside(url)
    }

    // target=_blank: our pages open here, everything else outside.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if isOurs(url) { webView.load(action.request) } else { openOutside(url) }
        }
        return nil
    }

    // Websites in an in-app Safari sheet; WhatsApp, phone, maps, e-mail in their apps.
    private func openOutside(_ url: URL) {
        if url.scheme == "http" || url.scheme == "https", url.host != "wa.me", url.host != "api.whatsapp.com",
           url.host != "maps.apple.com", url.host != "waze.com", url.host != "www.waze.com" {
            let safari = SFSafariViewController(url: url)
            safari.preferredControlTintColor = Self.brand
            present(safari, animated: true)
        } else {
            UIApplication.shared.open(url)
        }
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        updateTab()
        syncPush()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        offline.isHidden = true
        updateTab()
        finishSplash()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        failed(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        failed(error)
    }

    private func failed(_ error: Error) {
        let e = error as NSError
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return } // navigation handed to another app
        offline.isHidden = false
        finishSplash(now: true)
    }

    // The page's process was killed (memory): reload instead of showing a blank screen.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    private func finishSplash(now: Bool = false) {
        guard let s = splash else { return }
        s.finish(now: now) { [weak self] in
            self?.splash = nil
            self?.setNeedsStatusBarAppearanceUpdate()
        }
    }

    // ─── Tab bar ───

    // Client-side navigation in the site doesn't fire didFinish, so the URL is also watched.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        urlObservation = web.observe(\.url, options: [.new]) { [weak self] _, _ in self?.updateTab() }
    }
    private var urlObservation: NSKeyValueObservation?

    private func updateTab() {
        let path = web.url?.path ?? "/"
        let index = tabs.lastIndex { t in t.path == "/" ? (path == "/" || path.isEmpty) : path.hasPrefix(t.path) }
        tabBar.selectedItem = index.flatMap { i in tabBar.items?[i] }
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let path = tabs[item.tag].path
        if web.url?.path == path || (path == "/" && (web.url?.path ?? "").isEmpty) {
            web.scrollView.setContentOffset(CGPoint(x: 0, y: -web.scrollView.adjustedContentInset.top), animated: true)
        } else {
            web.load(URLRequest(url: URL(string: path, relativeTo: Self.home)!.absoluteURL))
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }
}

// WKUserContentController keeps a strong reference to its handlers.
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(ucc, didReceive: message)
    }
}

// "No internet" screen.
final class OfflineView: UIView {
    var onRetry: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .systemBackground
        let icon = UIImageView(image: UIImage(named: "KamiK"))
        icon.contentMode = .scaleAspectFit
        icon.heightAnchor.constraint(equalToConstant: 72).isActive = true
        let title = UILabel()
        title.text = "אין חיבור לאינטרנט"
        title.font = .systemFont(ofSize: 22, weight: .bold)
        let body = UILabel()
        body.text = "בדקו את החיבור ונסו שוב."
        body.textColor = .secondaryLabel
        var conf = UIButton.Configuration.filled()
        conf.title = "לנסות שוב"
        conf.baseBackgroundColor = WebViewController.brand
        conf.cornerStyle = .capsule
        conf.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 32, bottom: 12, trailing: 32)
        let retry = UIButton(configuration: conf, primaryAction: UIAction { [weak self] _ in self?.onRetry?() })
        let stack = UIStackView(arrangedSubviews: [icon, title, body, retry])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.setCustomSpacing(24, after: body)
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 32),
        ])
    }

    required init?(coder: NSCoder) { fatalError() }
}
