# אפליקציית אנדרואיד (WebView)

הקוד ב-`android/`. זו אפליקציה פשוטה שמציגה את heykami.co.il, עם התוספות שאפליקציה צריכה:
העלאת תמונות, מיקום ("קרוב אליי"), כפתור חזרה, קישורים לוואטסאפ/טלפון/מפות באפליקציה המתאימה,
מסך "אין חיבור" וקישורים ל-heykami.co.il שנפתחים ישר באפליקציה.

- package: `il.co.heykami.app` (אותו כמו גרסת ה-TWA הראשונה, כדי לעדכן את אותה אפליקציה ב-Play).
- הבנייה רצה ב-GitHub Actions (`.github/workflows/android.yml`); אין צורך ב-Android Studio.
- האתר מזהה את האפליקציה לפי `KamiApp/` ב-User-Agent (למשל כדי לא להציע "התקנת האפליקציה" בתוכה).

## מפתח החתימה (upload key)
המפתח של PWABuilder (`signing.keystore` + `signing-key-info.txt`) **לא נכנס לקוד ולא נשלח לאף אחד**.
הבעלים שומר אותו ב-GitHub → Settings → Secrets and variables → Actions:

| Secret | מה שמים |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | הקובץ `signing.keystore` בקידוד base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Key store password מתוך signing-key-info.txt |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

base64 במחשב Windows (PowerShell, בתיקייה של הקובץ):
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\signing.keystore")) | Set-Clipboard`
ב-Mac (Terminal): `base64 -i signing.keystore | pbcopy`

## בנייה והעלאה
1. GitHub → Actions → **Android app** → Run workflow. `version_code` חייב להיות גבוה מההעלאה הקודמת ל-Play.
2. בסוף הריצה: Artifacts → `kami-android-<מספר>` → בתוכו `app-release.aab` (ל-Play) ו-`app-release.apk` (להתקנה ישירה לבדיקה).
3. Play Console → בדיקה סגורה → גרסה חדשה → להעלות את ה-aab.
4. נתוני הגרסה, ורישום כל גרסה ומשוב מהבודקים (בשביל טופס הגישה לייצור): `docs/PLAY_CHANGELOG.md`.

טביעת ה-SHA-256 שמודפסת בשלב "Signing certificate" צריכה להופיע ב-`public/.well-known/assetlinks.json`.

## התראות (Firebase)
האפליקציה מקבלת התראות פוש דרך Firebase Cloud Messaging. אין `google-services.json` בקוד: הערכים נכנסים בזמן
הבנייה מ-GitHub Secrets, ובלעדיהם האפליקציה נבנית ועובדת, רק בלי התראות.

| Secret | מאיפה (Firebase → Project settings → General → האפליקציה `il.co.heykami.app`) |
|---|---|
| `KAMI_FCM_APP_ID` | App ID (`1:…:android:…`) |
| `KAMI_FCM_API_KEY` | Web API key (או `current_key` מתוך google-services.json) |
| `KAMI_FCM_PROJECT_ID` | Project ID |
| `KAMI_FCM_SENDER_ID` | Project number (Cloud Messaging → Sender ID) |

השרת שולח עם חשבון שירות: Firebase → Project settings → Service accounts → Generate new private key, ואת כל
תוכן קובץ ה-JSON שמים ב-Vercel כ-`FIREBASE_SERVICE_ACCOUNT`.

האתר מדבר עם האפליקציה דרך `window.KamiApp` (`pushState`, `requestPush`, `pushToken`; רק בעמודי heykami.co.il).
הטוקן חוזר לאתר באירוע `kami-push` ונשמר ב-`push_subscriptions`. ב-Play → Data safety: "Device or other IDs"
(לפונקציונליות האפליקציה, לא משותף).
