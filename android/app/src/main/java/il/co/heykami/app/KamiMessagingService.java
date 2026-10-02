package il.co.heykami.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

// Data-only messages from src/lib/push/send.ts: { title, body, url, tag }.
// Tapping the notification opens the url inside the app.
public class KamiMessagingService extends FirebaseMessagingService {
    static final String PREFS = "kami";
    static final String TOKEN = "fcm_token";

    @Override
    public void onNewToken(String token) {
        // The site picks it up (window.KamiApp.pushToken) next time the account page opens.
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(TOKEN, token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> d = message.getData();
        String title = d.containsKey("title") ? d.get("title") : "Kami";
        String body = d.containsKey("body") ? d.get("body") : "";
        String url = d.containsKey("url") ? d.get("url") : "https://heykami.co.il/";
        String tag = d.containsKey("tag") ? d.get("tag") : null;

        Intent open = new Intent(this, MainActivity.class)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.parse(url))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(this, url.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new Notification.Builder(this, KamiApplication.CHANNEL)
                .setSmallIcon(R.drawable.ic_launcher_monochrome)
                .setColor(getColor(R.color.brand))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(tap)
                .build();
        getSystemService(NotificationManager.class).notify(tag, tag == null ? (int) System.currentTimeMillis() : 0, n);
    }
}
