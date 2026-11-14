package com.eatstevan.emealio;

import android.app.Activity;
import android.content.SharedPreferences;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FieldPath;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.ListenerRegistration;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Family sharing: Google sign-in plus one Firestore document per family.
 *
 *   households/{code}  { members: [uid], names: {uid: name}, data: {...the shared plan...} }
 *   users/{uid}        { household: code }   so a new phone finds its family after sign-in
 *
 * The document id doubles as the invite code. The web UI decides what changed and sends small
 * field-level updates through {@link #push}; every snapshot of the document is handed back to it.
 * Firestore keeps an offline copy and replays queued writes, so the app keeps working offline.
 *
 * All methods must be called on the main thread. If the app was built without
 * google-services.json there is no Firebase app and everything here is a no-op.
 */
final class Sync {

    interface Listener {
        void onStatus(String json);
        void onRemote(String json);
    }

    private static final String KEY_HOUSEHOLD = "household";
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
    private static final int CODE_LENGTH = 8;

    private final Activity activity;
    private final Listener listener;
    private final SharedPreferences prefs;
    private final boolean available;

    private FirebaseAuth auth;
    private FirebaseFirestore db;
    private ListenerRegistration registration;
    private String household;
    private List<String> members = new ArrayList<>();
    private boolean busy;

    Sync(Activity activity, SharedPreferences prefs, Listener listener) {
        this.activity = activity;
        this.prefs = prefs;
        this.listener = listener;
        this.available = !FirebaseApp.getApps(activity).isEmpty();
        if (available) {
            auth = FirebaseAuth.getInstance();
            db = FirebaseFirestore.getInstance();
            household = prefs.getString(KEY_HOUSEHOLD, null);
        }
    }

    /** Call once the page is ready to receive callbacks. */
    void start() {
        if (available && auth.getCurrentUser() != null) {
            if (household != null) listen();
            else findHousehold();
        }
        status(null);
    }

    void stop() {
        if (registration != null) registration.remove();
        registration = null;
    }

    // ---- account ----

    void signIn() {
        if (!available || busy) return;
        int id = activity.getResources().getIdentifier("default_web_client_id", "string", activity.getPackageName());
        if (id == 0) {
            status("Google sign-in is not enabled in the Firebase project yet");
            return;
        }
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(new GetSignInWithGoogleOption.Builder(activity.getString(id)).build())
                .build();
        CredentialManager.create(activity).getCredentialAsync(activity, request, null, activity::runOnUiThread,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential c = response.getCredential();
                        if (c instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                            firebaseSignIn(GoogleIdTokenCredential.createFrom(c.getData()).getIdToken());
                        } else {
                            status("Google sign-in did not return an account");
                        }
                    }

                    @Override
                    public void onError(GetCredentialException e) {
                        status(e instanceof GetCredentialCancellationException ? null
                                : "Google sign-in failed. Check the connection and try again.");
                    }
                });
    }

    private void firebaseSignIn(String idToken) {
        busy = true;
        status(null);
        auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null)).addOnCompleteListener(task -> {
            busy = false;
            if (task.isSuccessful()) {
                findHousehold();
                status(null);
            } else {
                status("Could not sign in. Check the connection and try again.");
            }
        });
    }

    void signOut() {
        if (!available) return;
        stop();
        setHousehold(null);
        auth.signOut();
        CredentialManager.create(activity).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
                activity::runOnUiThread, new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void result) { }
                    @Override public void onError(ClearCredentialException e) { }
                });
        status("Signed out. The plan stays on this phone.");
    }

    // ---- family ----

    /** After sign-in on a phone that has no family yet: look up the one stored with the account. */
    private void findHousehold() {
        FirebaseUser user = auth.getCurrentUser();
        if (user == null || household != null) return;
        db.collection("users").document(user.getUid()).get().addOnSuccessListener(doc -> {
            String code = doc.getString(KEY_HOUSEHOLD);
            if (code != null && household == null && auth.getCurrentUser() != null) {
                setHousehold(code);
                listen();
                status("Connected to your family plan");
            }
        });
    }

    void create(String dataJson) {
        FirebaseUser user = auth == null ? null : auth.getCurrentUser();
        if (user == null || busy || household != null) return;
        Object data;
        try {
            data = fromJson(new JSONObject(dataJson));
        } catch (Exception e) {
            return;
        }
        busy = true;
        status(null);
        tryCreate(user, data, 3);
    }

    private void tryCreate(FirebaseUser user, Object data, int attemptsLeft) {
        String code = newCode();
        Map<String, Object> doc = new HashMap<>();
        doc.put("members", Collections.singletonList(user.getUid()));
        doc.put("names", Collections.singletonMap(user.getUid(), displayName(user)));
        doc.put("data", data);
        doc.put("created", FieldValue.serverTimestamp());
        // If the code is already taken this is an update of someone else's family, which the
        // security rules reject, so we simply try another code.
        db.collection("households").document(code).set(doc).addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                busy = false;
                rememberHousehold(user, code);
                listen();
                status("Sharing is on. Send the family code to someone.");
            } else if (attemptsLeft > 1) {
                tryCreate(user, data, attemptsLeft - 1);
            } else {
                busy = false;
                status("Could not start sharing. Check the connection and try again.");
            }
        });
    }

    void join(String code) {
        FirebaseUser user = auth == null ? null : auth.getCurrentUser();
        if (user == null || busy || household != null || code == null || code.isEmpty()) return;
        busy = true;
        status(null);
        db.collection("households").document(code)
                .update("members", FieldValue.arrayUnion(user.getUid()),
                        FieldPath.of("names", user.getUid()), displayName(user))
                .addOnCompleteListener(task -> {
                    busy = false;
                    if (task.isSuccessful()) {
                        rememberHousehold(user, code);
                        listen();
                        status("You joined the family plan");
                    } else {
                        status("That family code did not work. Check it and try again.");
                    }
                });
    }

    void leave() {
        FirebaseUser user = auth == null ? null : auth.getCurrentUser();
        if (user == null || household == null) return;
        DocumentReference ref = db.collection("households").document(household);
        stop();
        ref.update("members", FieldValue.arrayRemove(user.getUid()),
                FieldPath.of("names", user.getUid()), FieldValue.delete());
        db.collection("users").document(user.getUid()).delete();
        setHousehold(null);
        status("Sharing stopped. The plan stays on this phone.");
    }

    private void rememberHousehold(FirebaseUser user, String code) {
        setHousehold(code);
        db.collection("users").document(user.getUid()).set(Collections.singletonMap(KEY_HOUSEHOLD, code));
    }

    private void setHousehold(String code) {
        household = code;
        members = new ArrayList<>();
        if (code == null) prefs.edit().remove(KEY_HOUSEHOLD).apply();
        else prefs.edit().putString(KEY_HOUSEHOLD, code).apply();
    }

    private void listen() {
        stop();
        final String code = household;
        registration = db.collection("households").document(code).addSnapshotListener((snap, error) -> {
            if (!code.equals(household)) return;
            boolean gone = snap != null && !snap.exists();
            boolean denied = error != null && error.getCode() == FirebaseFirestoreException.Code.PERMISSION_DENIED;
            if (gone || denied) {
                stop();
                setHousehold(null);
                status("This phone is no longer part of that family plan");
                return;
            }
            if (snap == null) return; // transient error; the listener retries on its own

            List<String> names = new ArrayList<>();
            Object map = snap.get("names");
            if (map instanceof Map) {
                for (Object n : ((Map<?, ?>) map).values()) if (n != null) names.add(String.valueOf(n));
                Collections.sort(names);
            }
            if (!names.equals(members)) {
                members = names;
                status(null);
            }
            Object data = snap.get("data");
            if (data instanceof Map) listener.onRemote(String.valueOf(toJson(data)));
        });
    }

    /** Applies field-level changes from the UI: [{"p": ["plan", "3"], "v": {...}}, {"p": [...], "d": 1}]. */
    void push(String opsJson) {
        if (!available || household == null || auth.getCurrentUser() == null) return;
        try {
            JSONArray ops = new JSONArray(opsJson);
            List<Object> args = new ArrayList<>();
            for (int i = 0; i < ops.length(); i++) {
                JSONObject op = ops.getJSONObject(i);
                JSONArray p = op.getJSONArray("p");
                String[] path = new String[p.length() + 1];
                path[0] = "data";
                boolean valid = true;
                for (int j = 0; j < p.length(); j++) {
                    path[j + 1] = p.getString(j);
                    if (path[j + 1].isEmpty()) valid = false;
                }
                if (!valid) continue;
                args.add(FieldPath.of(path));
                args.add(op.has("d") ? FieldValue.delete() : fromJson(op.opt("v")));
            }
            if (args.isEmpty()) return;
            FieldPath first = (FieldPath) args.remove(0);
            Object value = args.remove(0);
            db.collection("households").document(household).update(first, value, args.toArray());
        } catch (Exception ignored) {
            // A malformed batch is dropped; the next snapshot puts the UI back in step.
        }
    }

    // ---- helpers ----

    private void status(String message) {
        try {
            JSONObject o = new JSONObject();
            FirebaseUser user = available ? auth.getCurrentUser() : null;
            o.put("available", available);
            o.put("busy", busy);
            o.put("household", household == null ? JSONObject.NULL : household);
            o.put("members", new JSONArray(members));
            if (user == null) {
                o.put("user", JSONObject.NULL);
            } else {
                JSONObject u = new JSONObject();
                u.put("name", displayName(user));
                u.put("email", user.getEmail() == null ? "" : user.getEmail());
                o.put("user", u);
            }
            if (message != null) o.put("message", message);
            listener.onStatus(o.toString());
        } catch (Exception ignored) {
            // JSONException cannot happen with these values
        }
    }

    private static String displayName(FirebaseUser user) {
        String n = user.getDisplayName();
        if (n == null || n.isEmpty()) n = user.getEmail();
        return n == null || n.isEmpty() ? "Family member" : n;
    }

    private static String newCode() {
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) sb.append(CODE_ALPHABET.charAt(r.nextInt(CODE_ALPHABET.length())));
        return sb.toString();
    }

    private static Object fromJson(Object v) throws Exception {
        if (v == null || v == JSONObject.NULL) return null;
        if (v instanceof JSONObject) {
            JSONObject o = (JSONObject) v;
            Map<String, Object> m = new HashMap<>();
            for (Iterator<String> it = o.keys(); it.hasNext(); ) {
                String k = it.next();
                if (!k.isEmpty()) m.put(k, fromJson(o.get(k)));
            }
            return m;
        }
        if (v instanceof JSONArray) {
            JSONArray a = (JSONArray) v;
            List<Object> l = new ArrayList<>();
            for (int i = 0; i < a.length(); i++) l.add(fromJson(a.get(i)));
            return l;
        }
        return v;
    }

    private static Object toJson(Object v) {
        if (v == null) return JSONObject.NULL;
        if (v instanceof Map) {
            JSONObject o = new JSONObject();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
                try {
                    o.put(String.valueOf(e.getKey()), toJson(e.getValue()));
                } catch (Exception ignored) {
                    // null key or non-finite number: skip the entry
                }
            }
            return o;
        }
        if (v instanceof List) {
            JSONArray a = new JSONArray();
            for (Object x : (List<?>) v) a.put(toJson(x));
            return a;
        }
        if (v instanceof Number || v instanceof Boolean || v instanceof String) return v;
        return String.valueOf(v);
    }
}
