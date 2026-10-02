package il.co.heykami.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class KamiApplication extends Application {
    static final String CHANNEL = "general";

    @Override
    public void onCreate() {
        super.onCreate();
        // Firebase is set up from build-time values (no google-services.json), so a
        // build without them still works, just without push.
        if (pushConfigured() && FirebaseApp.getApps(this).isEmpty()) {
            FirebaseApp.initializeApp(this, new FirebaseOptions.Builder()
                    .setApplicationId(BuildConfig.FCM_APP_ID)
                    .setApiKey(BuildConfig.FCM_API_KEY)
                    .setProjectId(BuildConfig.FCM_PROJECT_ID)
                    .setGcmSenderId(BuildConfig.FCM_SENDER_ID)
                    .build());
        }
        NotificationChannel channel = new NotificationChannel(CHANNEL, getString(R.string.channel_general), NotificationManager.IMPORTANCE_HIGH);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static boolean pushConfigured() {
        return !BuildConfig.FCM_APP_ID.isEmpty() && !BuildConfig.FCM_API_KEY.isEmpty()
                && !BuildConfig.FCM_PROJECT_ID.isEmpty() && !BuildConfig.FCM_SENDER_ID.isEmpty();
    }
}
