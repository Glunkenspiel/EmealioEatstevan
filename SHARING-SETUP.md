# Switching on family sharing

Family sharing keeps the plan in a small database under **your** Google account (a free Firebase
project), and lets a second phone join with a family code. It needs a one-time setup that only the
owner of the Google account can do. It takes about ten minutes and stays inside Firebase's free tier
for a household.

## 1. Create the project

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. **Create a project**. Any name works (for example "Glonky Jobo"). Analytics can stay off.

## 2. Add the Android app

1. In the project, choose **Add app → Android**.
2. Package name: `com.eatstevan.emealio`
3. Debug signing certificate SHA-1: paste the SHA-1 printed for the app's signing key
   (the one in `signing/glonky.keystore`; run the command below if you need it again).
4. Register the app. Skip the remaining wizard steps for now.

```bash
keytool -list -v -keystore signing/glonky.keystore -storepass android | grep SHA1
```

## 3. Turn on Google sign-in

**Build → Authentication → Get started → Sign-in method → Google → Enable**, pick a support email, Save.

## 4. Create the database

1. **Build → Firestore Database → Create database**. Choose a location near you and **production mode**.
2. Open the **Rules** tab, replace everything with the contents of `firestore.rules` from this repo, and **Publish**.

## 5. Download the config file

**Project settings (gear icon) → Your apps → google-services.json**. Download it *after* step 3,
so it includes the Google sign-in client.

Put it at `app/google-services.json` and rebuild:

```bash
./gradlew assembleDebug
```

The build notices the file and switches sharing on. Without the file the app still builds and
works, with sharing off.

## Using it

1. Tap the people button in the app header and **Sign in with Google**.
2. Tap **Share this phone's plan**. You get an 8-character family code.
3. On the second phone: install the same APK, sign in with that person's own Google account,
   and enter the code under **Join a family**.

From then on both phones edit the same plan, meal library, favourites and grocery ticks. Changes
made offline are sent when the phone is back online.

## Good to know

- Anyone who has the family code and a Google account can join, up to six people. Share the code
  privately. To retire a code, both phones choose **Stop sharing** and one starts a new family.
- `google-services.json` and the signing keystore are deliberately not committed (this repo is
  public). Keep your own copies: every build must be signed with the same keystore, or Google
  sign-in stops working and updates will not install over the old version.
- The data lives in your Firebase project. You can view or delete it any time in the Firebase
  console under Firestore Database.
