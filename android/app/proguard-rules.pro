# No reflection or JavaScript interfaces; the defaults are enough.
# The page calls these through window.KamiApp.
-keepclassmembers class il.co.heykami.app.** {
    @android.webkit.JavascriptInterface <methods>;
}
