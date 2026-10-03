import UIKit

// Opening screen (same as the Android app's KamiSplash): the light background with the
// pet doodles, the K in its glowing ring that opens into the "Kami" wordmark (the site's
// logo animation, src/components/logo.tsx), "טוען…" and a gradient progress bar, and
// "by APPEB". The launch screen (LaunchScreen.storyboard) shows the ring and K in the same
// place, so the animation continues from it. No BETA tag in the App Store build.
//
// Sizes follow the site's logo, in "em" = the K's height.
final class SplashView: UIView {
    private let em: CGFloat = 56
    private let minShow: TimeInterval = 1.7
    private let maxShow: TimeInterval = 12

    private let ring = RingView()
    private let k = UIImageView(image: UIImage(named: "KamiK"))
    private let amiClip = UIView()
    private let letters = UIImageView(image: UIImage(named: "KamiLetters")?.withRenderingMode(.alwaysTemplate))
    private let leaf = UIImageView(image: UIImage(named: "KamiLeaf"))
    private let loading = UILabel()
    private let bar = GradientBar()
    private let by = UILabel()

    private var openProgress: CGFloat = 0 // 0 = just the K, 1 = "Kami"
    private let shownAt = Date()
    private var ready = false
    private var leaving = false
    private var onGone: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 0.957, alpha: 1)
        overrideUserInterfaceStyle = .light
        semanticContentAttribute = .forceLeftToRight

        let bg = UIImageView(image: UIImage(named: "SplashBg"))
        bg.contentMode = .scaleAspectFill
        bg.frame = bounds
        bg.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(bg)

        addSubview(ring)
        k.contentMode = .scaleAspectFit
        addSubview(k)

        amiClip.clipsToBounds = true
        addSubview(amiClip)
        letters.contentMode = .scaleAspectFit
        letters.tintColor = UIColor(red: 0.043, green: 0.071, blue: 0.082, alpha: 1)
        amiClip.addSubview(letters)
        leaf.contentMode = .scaleAspectFit
        leaf.layer.anchorPoint = CGPoint(x: 0, y: 1) // grows from its stem, like the site
        amiClip.addSubview(leaf)

        loading.text = "טוען…"
        loading.font = .systemFont(ofSize: 15)
        loading.textColor = UIColor(red: 0.357, green: 0.420, blue: 0.451, alpha: 1)
        loading.textAlignment = .center
        addSubview(loading)
        addSubview(bar)

        let byText = NSMutableAttributedString(string: "by ", attributes: [.font: UIFont.systemFont(ofSize: 12)])
        byText.append(NSAttributedString(string: "APPEB", attributes: [.font: UIFont.systemFont(ofSize: 12, weight: .bold)]))
        byText.addAttributes([.foregroundColor: loading.textColor!, .kern: 0.5], range: NSRange(location: 0, length: byText.length))
        by.attributedText = byText
        addSubview(by)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layoutSubviews() {
        super.layoutSubviews()
        let c = CGPoint(x: bounds.midX, y: bounds.midY)
        let ringSize = 1.6 * em
        // The logo widens as "ami" opens and stays centred.
        let width = ringSize + openProgress * (2.42 - 0.41) * em
        let left = c.x - width / 2
        let ringCenter = CGPoint(x: left + ringSize / 2, y: c.y)

        let glow = ringSize * 1.8
        ring.bounds = CGRect(x: 0, y: 0, width: glow, height: glow)
        ring.center = ringCenter
        ring.ringSize = ringSize
        k.bounds = CGRect(x: 0, y: 0, width: 1.0244 * em, height: em)
        k.center = ringCenter

        let amiH = 1.12 * em
        amiClip.frame = CGRect(x: left + ringSize - 0.41 * em * min(1, openProgress), y: c.y - amiH / 2,
                               width: max(0, 2.42 * em * openProgress), height: amiH)
        letters.bounds = CGRect(x: 0, y: 0, width: 2.31 * em, height: 0.727 * em)
        letters.center = CGPoint(x: letters.bounds.width / 2, y: amiH - 0.02 * em - letters.bounds.height / 2)
        let leafH = 0.346 * em
        leaf.bounds = CGRect(x: 0, y: 0, width: leafH * 141 / 160, height: leafH)
        leaf.center = CGPoint(x: 2.08 * em, y: 0.125 * em + leafH) // anchor: bottom-left

        let top = c.y + ringSize / 2 + 36
        loading.frame = CGRect(x: 0, y: top, width: bounds.width, height: 20)
        bar.frame = CGRect(x: c.x - 92, y: top + 34, width: 184, height: 6)
        by.sizeToFit()
        by.frame.origin = CGPoint(x: bounds.width - by.bounds.width - 24, y: bounds.height - safeAreaInsets.bottom - by.bounds.height - 24)
    }

    func start() {
        letters.alpha = 0
        letters.transform = CGAffineTransform(translationX: -0.4 * em, y: 0)
        leaf.transform = CGAffineTransform(rotationAngle: -.pi / 4).scaledBy(x: 0.01, y: 0.01)
        for v in [loading, bar] as [UIView] {
            v.alpha = 0
            v.transform = CGAffineTransform(translationX: 0, y: 10)
        }
        setNeedsLayout()
        layoutIfNeeded()

        let open: TimeInterval = 0.45
        UIView.animate(withDuration: 0.45, delay: open - 0.2, options: .curveEaseOut) {
            for v in [self.loading, self.bar] as [UIView] {
                v.alpha = 1
                v.transform = .identity
            }
        }
        // The ring dissolves outward, the K grows a little and "ami" opens out of it.
        UIView.animate(withDuration: 0.5, delay: open, options: .curveEaseOut) {
            self.ring.transform = CGAffineTransform(scaleX: 1.35, y: 1.35)
            self.ring.alpha = 0
        }
        UIView.animate(withDuration: 0.6, delay: open, usingSpringWithDamping: 0.72, initialSpringVelocity: 0.4) {
            self.k.transform = CGAffineTransform(scaleX: 1.12, y: 1.12)
            self.openProgress = 1
            self.setNeedsLayout()
            self.layoutIfNeeded()
        }
        UIView.animate(withDuration: 0.5, delay: open, options: .curveEaseOut) {
            self.letters.alpha = 1
            self.letters.transform = .identity
        }
        UIView.animate(withDuration: 0.5, delay: open + 0.15, usingSpringWithDamping: 0.6, initialSpringVelocity: 0.5) {
            self.leaf.transform = .identity
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + maxShow) { [weak self] in self?.finish(now: false, then: nil) }
    }

    func setProgress(_ value: Double) {
        bar.set(max(0.08, CGFloat(value)))
    }

    /// The first page is ready (or failed): finish the animation, then fade out.
    func finish(now: Bool, then: (() -> Void)?) {
        if let then { onGone = then }
        if ready && !now { return }
        ready = true
        let wait = now ? 0 : max(0, minShow - Date().timeIntervalSince(shownAt))
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) { [weak self] in
            guard let self else { return }
            self.bar.set(1)
            DispatchQueue.main.asyncAfter(deadline: .now() + (now ? 0 : 0.28)) { self.leave() }
        }
    }

    private func leave() {
        if leaving { return }
        leaving = true
        UIView.animate(withDuration: 0.32, delay: 0, options: .curveEaseOut, animations: {
            self.alpha = 0
            self.transform = CGAffineTransform(scaleX: 1.03, y: 1.03)
        }, completion: { _ in
            self.removeFromSuperview()
            self.onGone?()
        })
    }
}

// The gradient ring with its soft glow (the site's conic-gradient ring).
private final class RingView: UIView {
    var ringSize: CGFloat = 0 { didSet { setNeedsLayout() } }
    private let gradient = CAGradientLayer()
    private let ringMask = CAShapeLayer()
    private let glow = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        glow.fillColor = UIColor.clear.cgColor
        glow.strokeColor = UIColor(red: 0.133, green: 0.827, blue: 0.933, alpha: 0.55).cgColor
        glow.shadowColor = UIColor(red: 0.133, green: 0.827, blue: 0.933, alpha: 1).cgColor
        glow.shadowOpacity = 0.9
        glow.shadowOffset = .zero
        layer.addSublayer(glow)
        gradient.type = .conic
        gradient.colors = ["#4ADE80", "#22D3EE", "#3B82F6", "#22D3EE", "#4ADE80"].map { UIColor(hex: $0).cgColor }
        gradient.startPoint = CGPoint(x: 0.5, y: 0.5)
        // CSS "from 200deg" starts at the top; a conic CAGradientLayer starts at 3 o'clock.
        let a = (200.0 - 90.0) * Double.pi / 180
        gradient.endPoint = CGPoint(x: 0.5 + cos(a) * 0.5, y: 0.5 + sin(a) * 0.5)
        ringMask.fillColor = UIColor.clear.cgColor
        ringMask.strokeColor = UIColor.black.cgColor
        gradient.mask = ringMask
        layer.addSublayer(gradient)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layoutSubviews() {
        super.layoutSubviews()
        let w = 0.075 / 1.6 * ringSize
        let r = (ringSize - w) / 2
        let path = UIBezierPath(arcCenter: CGPoint(x: bounds.midX, y: bounds.midY), radius: r,
                                startAngle: 0, endAngle: .pi * 2, clockwise: true).cgPath
        gradient.frame = bounds
        ringMask.frame = bounds
        ringMask.path = path
        ringMask.lineWidth = w
        glow.frame = bounds
        glow.path = path
        glow.lineWidth = w
        glow.shadowRadius = 0.35 / 1.6 * ringSize / 2
    }
}

// Rounded progress bar with the brand gradient. Fills from the right (the start of the
// line in Hebrew) and eases toward the page's progress instead of jumping.
private final class GradientBar: UIView {
    private let fill = UIView()
    private let gradient = CAGradientLayer()
    private var value: CGFloat = 0.04

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 0.031, green: 0.569, blue: 0.698, alpha: 0.27)
        layer.cornerRadius = 3
        clipsToBounds = true
        fill.clipsToBounds = true
        fill.layer.cornerRadius = 3
        gradient.colors = ["#4ADE80", "#22D3EE", "#3B82F6"].map { UIColor(hex: $0).cgColor }
        gradient.startPoint = CGPoint(x: 1, y: 0.5)
        gradient.endPoint = CGPoint(x: 0, y: 0.5)
        fill.layer.addSublayer(gradient)
        addSubview(fill)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.height / 2
        fill.layer.cornerRadius = bounds.height / 2
        place()
        // The gradient spans the whole bar, so the colour under the fill doesn't shift.
        gradient.frame = CGRect(x: -fill.frame.minX, y: 0, width: bounds.width, height: bounds.height)
    }

    private func place() {
        let w = max(bounds.height, bounds.width * value)
        fill.frame = CGRect(x: bounds.width - w, y: 0, width: w, height: bounds.height)
    }

    func set(_ target: CGFloat) {
        guard target > value else { return }
        value = min(1, target)
        UIView.animate(withDuration: target >= 1 ? 0.25 : 0.5, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
            self.place()
            self.gradient.frame = CGRect(x: -self.fill.frame.minX, y: 0, width: self.bounds.width, height: self.bounds.height)
        }
    }
}

extension UIColor {
    convenience init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
        self.init(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255,
                  blue: CGFloat(v & 0xFF) / 255, alpha: 1)
    }
}
