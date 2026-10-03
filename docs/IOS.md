# אפליקציית אייפון

הקוד נמצא ב-`ios/`. זו אפליקציית Swift שמציגה את heykami.co.il ב-WKWebView, עם חלקים של אפליקציה אמיתית. אלה גם הדברים שאפל בודקת בסעיף 4.2, "לא סתם אתר בקופסה":

- **סרגל לשוניות תחתון:** בית, חיפוש, מבצעים, החשבון שלי.
- **החלקה אחורה ומשיכה לרענון.**
- **שיתוף מערכת:** הקריאה `navigator.share` באתר פותחת את גיליון השיתוף של אייפון.
- **התראות פוש:** דרך Firebase, עם אותו API של אנדרואיד (`window.KamiApp`, ראו `src/components/push-toggle.tsx`).
- **מסך פתיחה מונפש:** כמו באנדרואיד. מסך ההשקה (`LaunchScreen.storyboard`) מציג את ה-K בעיגול באותו מקום, כך שהמעבר רציף.
- **מסך "אין חיבור".**
- **קישורים חיצוניים:** אתרים נפתחים ב-Safari בתוך האפליקציה. וואטסאפ, טלפון ומפות נפתחים באפליקציות שלהם.
- **בלי "בטא":** האפליקציה מוסיפה ל-`<html>` את המחלקה `kami-ios`. כל אלמנט עם `data-beta` מוסתר, וכל אלמנט עם `data-ios-only` מוצג (`globals.css`). זה נדרש כי אפל דוחה גרסאות בטא (סעיף 2.2).
- **זיהוי האפליקציה:** ה-User-Agent מכיל `KamiApp-iOS/<גרסה>`.

**איך זה נבנה:** פרויקט ה-Xcode נוצר מ-`ios/project.yml` (XcodeGen), ולכן אין `.xcodeproj` בריפו. הבנייה רצה ב-GitHub Actions (`.github/workflows/ios.yml`) על מק של GitHub. לא צריך מק.

## אחרי פתיחת חשבון Apple Developer ($99), לפי הסדר

1. **App Store Connect → Apps → + → New App**
   - Platform: iOS
   - Name: Kami
   - Primary language: Hebrew
   - Bundle ID: `il.co.heykami.app`. אם הוא לא ברשימה, יוצרים אותו ב-developer.apple.com → Identifiers, ומסמנים Push Notifications.
   - SKU: `kami`
2. **מפתח API להעלאה:** App Store Connect → Users and Access → Integrations → App Store Connect API → מפתח חדש עם הרשאת **App Manager**. מורידים את הקובץ `AuthKey_XXXX.p8`. אפשר להוריד אותו רק פעם אחת.
3. **GitHub Secrets** (Settings → Secrets and variables → Actions):

   | Secret | מה שמים |
   |---|---|
   | `APPLE_TEAM_ID` | Team ID (developer.apple.com → Membership) |
   | `APPSTORE_API_KEY_ID` | Key ID של המפתח |
   | `APPSTORE_API_ISSUER_ID` | Issuer ID (מופיע מעל רשימת המפתחות) |
   | `APPSTORE_API_KEY_P8` | כל התוכן של קובץ ה-p8, כולל שורות BEGIN/END |
   | `IOS_FCM_APP_ID` | Firebase → הוספת אפליקציית iOS עם `il.co.heykami.app` → App ID (`1:…:ios:…`) |
   | `IOS_FCM_API_KEY` | ה-`API_KEY` מתוך GoogleService-Info.plist של אפליקציית ה-iOS |

   `KAMI_FCM_PROJECT_ID` ו-`KAMI_FCM_SENDER_ID` כבר קיימים מאנדרואיד.
4. **התראות:**
   - developer.apple.com → Keys → מפתח חדש עם **Apple Push Notifications service (APNs)** → מורידים את קובץ ה-p8.
   - Firebase → Project settings → Cloud Messaging → אפליקציית ה-iOS → APNs Authentication Key: מעלים את הקובץ, עם Key ID ו-Team ID.
5. **בנייה והעלאה:** GitHub → Actions → **iOS app** → Run workflow (version `1.0`). אחרי כמה דקות הבנייה מופיעה ב-App Store Connect → TestFlight.
6. **TestFlight:** מוסיפים את עצמכם כבודקים, מתקינים את TestFlight באייפון ובודקים.
7. **דף החנות:**
   - צילומי מסך 6.9" (1320×2868), 3 עד 10.
   - תיאור, מילות מפתח, Support URL (`https://heykami.co.il/contact`), Privacy Policy (`https://heykami.co.il/privacy`).
   - App Privacy (תווית הפרטיות) וסיווג גיל.
   - חשבון בדיקה לבוחני אפל, ב-App Review Information.
8. **Submit for Review.**

## קישורים שנפתחים באפליקציה (Universal Links)

אחרי שיש Team ID:
- מוסיפים לאתר את הקובץ `/.well-known/apple-app-site-association` עם `appIDs: ["<TEAM_ID>.il.co.heykami.app"]`.
- מוסיפים ל-`Kami.entitlements` את `com.apple.developer.associated-domains` עם `applinks:heykami.co.il`.

## רכישות בתוך האפליקציה (בעתיד)

אם עסק משדרג ל-PRO מתוך האפליקציה, אפל דורשת In-App Purchase (סעיף 3.1.1). העמלה היא 15% בתוכנית לעסקים קטנים.

מוסיפים את זה בעדכון אחרי שהאפליקציה בחנות:
- **צד האפליקציה:** StoreKit 2.
- **צד השרת:** אימות הרכישה ו-App Store Server Notifications.
- **App Store Connect:** חוזה Paid Apps, ופרטי בנק ומס.

הרכישה הראשונה נשלחת לבדיקה יחד עם גרסה חדשה של האפליקציה. עד אז, אין באפליקציה כפתור קנייה או הפניה לתשלום באתר.
