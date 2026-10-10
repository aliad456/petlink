# App Review: Apple (Guideline 2.1, Information Needed)

Apple asked on 10.10.2026 for more information about the first submission. Paste the reply below into App Store Connect.
Paste it in two places:
- as the reply to the message;
- in **App Review Information → Notes**.

Fill in the demo account. It is a regular user account, never a staff/admin account.

## Recording script (iPhone, latest iOS, about 2 minutes)

Use Control Center → Screen Recording. Start recording **before** opening the app.

1. Open the Kami app from the home screen (splash, then home).
2. Search for "וטרינר", open a business page, and scroll through the gallery, hours and reviews.
3. Account tab → "הרשמה": create a new account (email + password) and land on "החשבון שלי".
4. Add a pet (name, species).
5. Open a business → Reviews tab → on someone else's review:
   - tap **"דיווח"**, choose a reason and send;
   - tap **"חסימה"** and confirm. The review disappears.
6. "החשבון שלי":
   - show "ביטול החסימות";
   - sign out, then sign in again with the same account.
7. "החשבון שלי" → "מחיקת החשבון" → type "מחיקה" → "מחיקה לצמיתות". The confirmation page appears.

## Reply (English)

```
Thank you for the review. Below is the information requested.

1. Screen recording
Attached: recorded on a physical iPhone running the latest iOS. It shows launching the app, browsing businesses, account registration, login, logout, reporting a review, blocking a review author, and deleting the account from within the app ("My account" → "Delete account").

2. Purpose and audience
Kami is a Hebrew directory of pet services in Israel: veterinarians (including emergency/24h clinics), groomers, pet shops, trainers and animal-adoption nonprofits. Pet owners use it to find a nearby service that is open now, read and write reviews, save favorites, keep their pets' details and receive vaccination reminders. Businesses get a free page to present their services. The problem it solves: pet-service information in Israel is scattered across social networks and outdated listings; Kami puts it in one place, searchable by location, category and opening hours.

3. How to use / demo account
Browsing does not require an account. To test account features, sign in from the "Account" tab:
Email: <DEMO EMAIL>
Password: <DEMO PASSWORD>
Or create a new account in the app (email + password; no verification needed to sign in).
Main features: Home (categories, "open now"), Search (filters, city), business page (gallery, hours, reviews; "Report" and "Block" on each review), My account (pets, saved businesses, notification settings, sign out, "Delete account").
User-generated content: reviews. Every review has "Report" (sent to our moderation queue; a review is hidden automatically after repeated reports) and "Block" (hides all reviews by that author for the user immediately). We review reports within 24 hours and remove offending content and users.

4. External services
- Supabase: database, user authentication, file storage.
- Vercel: web hosting for the content shown in the app.
- Firebase Cloud Messaging (Google): push notifications.
- Resend: transactional email (e.g. password reset, reminders).
No payment processors, no in-app purchases, no AI services, no advertising SDKs or tracking.

5. Regional differences
The app functions the same in all regions. Its content is in Hebrew and covers businesses in Israel.

6. Regulated industry / third-party material
Not applicable. Kami is a directory and does not provide medical, financial or other regulated services. Business information is provided by the businesses themselves or taken from their public listings.
```
