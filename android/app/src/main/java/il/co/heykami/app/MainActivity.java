package il.co.heykami.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

// Kami for Android: the site (heykami.co.il) in a WebView, with the native pieces
// a browser tab would give for free: photo uploads, "near me" location, the back
// button, links to other apps (WhatsApp, phone, maps), an offline screen and
// opening heykami.co.il links straight in the app, and push notifications
// (window.KamiApp, used by src/components/push-toggle.tsx).
public class MainActivity extends Activity {
    private static final String HOME = "https://heykami.co.il/";
    private static final int REQ_FILES = 1;
    private static final int REQ_LOCATION = 2;
    private static final int REQ_NOTIFICATIONS = 3;

    private WebView web;
    private ProgressBar progress;
    private View offline;
    private boolean failed;
    private KamiSplash splash;
    private boolean night;
    // The bridge runs off the UI thread, so it can't ask the WebView what page is open.
    private volatile boolean onOurPage;

    private ValueCallback<Uri[]> fileCallback;
    private String geoOrigin;
    private GeolocationPermissions.Callback geoCallback;

    private OnBackInvokedCallback backCallback;
    private boolean backRegistered;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        setUpSystemBars();

        web = findViewById(R.id.web);
        progress = findViewById(R.id.progress);
        offline = findViewById(R.id.offline);
        findViewById(R.id.retry).setOnClickListener(v -> {
            offline.setVisibility(View.GONE);
            if (web.getUrl() == null) web.loadUrl(HOME);
            else web.reload();
        });

        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false); // target=_blank opens in place, then goes through shouldOverrideUrlLoading
        s.setUserAgentString(s.getUserAgentString() + " KamiApp/" + appVersion());

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(), "KamiApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener((url, ua, disposition, mime, length) -> openExternal(Uri.parse(url)));

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = () -> {
                if (web.canGoBack()) web.goBack();
            };
        }

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(startUrl(getIntent()));
        }

        // Opening screen until the first page is ready (not when coming back from a rotation).
        if (savedInstanceState == null) {
            splash = new KamiSplash(this, () -> {
                splash = null;
                setBarIcons(!night);
            });
            setBarIcons(true); // the splash is light, also in dark mode
            splash.show();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isOurs(data)) web.loadUrl(data.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush(); // keep the login
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // Android 12 and older. Newer versions use backCallback (predictive back).
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // Our callback only while there is a page to go back to, so the system can
    // close the app (with its back animation) from the first page.
    private void updateBack() {
        if (Build.VERSION.SDK_INT < 33 || web == null) return;
        boolean can = web.canGoBack();
        OnBackInvokedDispatcher d = getOnBackInvokedDispatcher();
        if (can && !backRegistered) {
            d.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
            backRegistered = true;
        } else if (!can && backRegistered) {
            d.unregisterOnBackInvokedCallback(backCallback);
            backRegistered = false;
        }
    }

    private String startUrl(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        return data != null && isOurs(data) ? data.toString() : HOME;
    }

    private static boolean isOurs(Uri uri) {
        String host = uri.getHost();
        return ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                && ("heykami.co.il".equals(host) || "www.heykami.co.il".equals(host));
    }

    // WhatsApp, phone, e-mail, maps, advertisers' sites: the right app, not the WebView.
    private void openExternal(Uri uri) {
        try {
            Intent intent;
            if ("intent".equals(uri.getScheme())) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, uri);
            }
            startActivity(intent);
        } catch (ActivityNotFoundException | URISyntaxException e) {
            Toast.makeText(this, R.string.no_app, Toast.LENGTH_SHORT).show();
        }
    }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "1";
        }
    }

    // Draw behind the status and navigation bars (required from Android 15) and
    // pad the content so nothing hides under them or under the keyboard.
    private void setUpSystemBars() {
        Window w = getWindow();
        night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        View root = findViewById(R.id.root);
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            setBarColors(w, Color.TRANSPARENT);
            w.setNavigationBarContrastEnforced(false);
            setBarIcons(!night);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            });
        } else {
            setBarColors(w, getColor(R.color.page_bg));
            setBarIcons(!night);
        }
    }

    // Dark status/navigation bar icons on a light screen, light icons on a dark one.
    @SuppressWarnings("deprecation")
    private void setBarIcons(boolean lightScreen) {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c == null) return;
            int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            c.setSystemBarsAppearance(lightScreen ? light : 0, light);
        } else {
            w.getDecorView().setSystemUiVisibility(lightScreen
                    ? View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                    : 0);
            setBarColors(w, lightScreen && night ? getColor(R.color.splash_bg) : getColor(R.color.page_bg));
        }
    }

    @SuppressWarnings("deprecation")
    private static void setBarColors(Window w, int color) {
        w.setStatusBarColor(color);
        w.setNavigationBarColor(color);
    }

    // ─── Photo uploads ───

    private void openFilePicker(WebChromeClient.FileChooserParams params) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        String[] types = mimeTypes(params.getAcceptTypes());
        if (types.length == 1) {
            intent.setType(types[0]);
        } else {
            intent.setType(types.length == 0 ? "*/*" : types[0].startsWith("image/") ? "image/*" : "*/*");
            if (types.length > 1) intent.putExtra(Intent.EXTRA_MIME_TYPES, types);
        }
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        try {
            startActivityForResult(intent, REQ_FILES);
        } catch (ActivityNotFoundException e) {
            finishFilePicker(null);
        }
    }

    // accept="image/jpeg,.csv" → ["image/jpeg", "text/csv"]
    private static String[] mimeTypes(String[] accept) {
        List<String> out = new ArrayList<>();
        if (accept != null) {
            for (String group : accept) {
                for (String raw : group.split(",")) {
                    String t = raw.trim().toLowerCase();
                    if (t.isEmpty()) continue;
                    if (t.startsWith(".")) t = MimeTypeMap.getSingleton().getMimeTypeFromExtension(t.substring(1));
                    if (t != null && !out.contains(t)) out.add(t);
                }
            }
        }
        return out.toArray(new String[0]);
    }

    private void finishFilePicker(Uri[] result) {
        if (fileCallback != null) fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILES) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                result = new Uri[clip.getItemCount()];
                for (int i = 0; i < result.length; i++) result[i] = clip.getItemAt(i).getUri();
            } else if (data.getData() != null) {
                result = new Uri[] {data.getData()};
            }
        }
        finishFilePicker(result);
    }

    // ─── Location ("near me") ───

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_NOTIFICATIONS) {
            prefs().edit().putBoolean("notifications_asked", true).apply();
            if (granted) fetchPushToken();
            else sendPushToken(null);
            return;
        }
        if (requestCode != REQ_LOCATION || geoCallback == null) return;
        geoCallback.invoke(geoOrigin, granted, false);
        geoCallback = null;
        geoOrigin = null;
    }

    // ─── Push notifications ───

    private SharedPreferences prefs() {
        return getSharedPreferences(KamiMessagingService.PREFS, MODE_PRIVATE);
    }

    private boolean notificationsAllowed() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    private void fetchPushToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            String token = task.isSuccessful() ? task.getResult() : null;
            if (token != null) prefs().edit().putString(KamiMessagingService.TOKEN, token).apply();
            sendPushToken(token);
        });
    }

    private void sendPushToken(String token) {
        if (web == null) return;
        String detail = token == null ? "null" : JSONObject.quote(token);
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('kami-push',{detail:{token:" + detail + "}}))", null);
    }

    private class Bridge {
        // "granted" (on, token saved) / "default" (can be turned on) / "denied" / "unavailable"
        @JavascriptInterface
        public String pushState() {
            if (!onOurPage || !KamiApplication.pushConfigured()) return "unavailable";
            if (notificationsAllowed()) return prefs().getString(KamiMessagingService.TOKEN, null) != null ? "granted" : "default";
            boolean blocked = Build.VERSION.SDK_INT < 33
                    || (prefs().getBoolean("notifications_asked", false)
                        && !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS));
            return blocked ? "denied" : "default";
        }

        @JavascriptInterface
        public void requestPush() {
            if (!onOurPage) return;
            runOnUiThread(() -> {
                if (!KamiApplication.pushConfigured()) {
                    sendPushToken(null);
                } else if (notificationsAllowed()) {
                    fetchPushToken();
                } else if (Build.VERSION.SDK_INT >= 33) {
                    requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
                } else {
                    sendPushToken(null); // turned off in the phone's settings
                }
            });
        }

        @JavascriptInterface
        public String pushToken() {
            if (!onOurPage || !KamiApplication.pushConfigured() || !notificationsAllowed()) return "";
            String token = prefs().getString(KamiMessagingService.TOKEN, null);
            return token == null ? "" : token;
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (splash != null) {
                splash.setProgress(newProgress);
                return;
            }
            progress.setProgress(newProgress);
            progress.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            finishFilePicker(null); // a picker left open
            fileCallback = callback;
            openFilePicker(params);
            return true;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (!isOurs(Uri.parse(origin))) {
                callback.invoke(origin, false, false);
            } else if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false);
            } else {
                geoOrigin = origin;
                geoCallback = callback;
                requestPermissions(new String[] {Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
            }
        }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isOurs(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            failed = false;
            onOurPage = isOurs(Uri.parse(url));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!failed) offline.setVisibility(View.GONE);
            if (splash != null && !failed) splash.markReady();
            updateBack();
            CookieManager.getInstance().flush();
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            onOurPage = isOurs(Uri.parse(url));
            updateBack();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            failed = true;
            offline.setVisibility(View.VISIBLE);
            if (splash != null) splash.dismissNow();
        }

        // The WebView's renderer crashed or was killed to free memory: start over
        // instead of letting the whole app crash.
        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            recreate();
            return true;
        }
    }
}
