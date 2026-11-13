# Emealio Eatstevan

Two weeks of simple, healthy, kid-friendly suppers for a family of 5, with a grocery list to match.

## What it does

- **Plan** – builds a 14-night supper plan from your favourites plus a few new meals each week.
  Lock the nights you like, swap the ones you don't, or pick a meal by hand. Leftovers and eating-out nights are supported.
- **Meals** – 40 built-in suppers with estimated Weight Watchers points, prep time and kid tips.
  Heart the ones your family likes, hide the ones they don't, and add your own recipes.
- **Groceries** – one list for both weeks, or week by week, grouped by aisle and scaled to your family size.
  Tick items off as you shop and add extras.
- **Share** – sends the meal plan and/or grocery lists as plain text to Messages, Google Keep, email, or any other app.

Everything is stored on the phone. The app needs no account, no permissions and no internet.

WW points are estimates per adult serving; check the WW app for exact values.

## Install

Copy `EmealioEatstevan.apk` to the phone and open it (you will be asked to allow installing from that source).

## Build

Open the folder in Android Studio, or from a terminal with the Android SDK installed:

```bash
./gradlew assembleDebug
```

The APK lands in `app/build/outputs/apk/debug/`.

## Layout

- `app/src/main/assets/` – the whole UI (`index.html`, `app.css`, `app.js`) and the meal library (`meals.js`).
  Open `index.html` in a desktop browser to work on it.
- `app/src/main/java/.../MainActivity.java` – the native shell: hosts the UI and provides storage, the share sheet and the back button.
