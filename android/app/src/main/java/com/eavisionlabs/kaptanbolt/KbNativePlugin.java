package com.eavisionlabs.kaptanbolt;

import android.os.CancellationSignal;
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
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Kaptan Bolt yerel köprüsü:
 *  - Google Play Faturalandırma (doğrudan, RevenueCat yok). İndirim teklifi varsa en ucuz teklif seçilir.
 *    Satın alma "purchase" olayıyla JS'e gelir; JS ödülü verip kaydettikten sonra finish() ile tüketir/onaylar.
 *  - Google ile giriş (Credential Manager) + Firestore bulut kayıt: kb_users/{uid}
 */
@CapacitorPlugin(name = "KbNative")
public class KbNativePlugin extends Plugin {
    static final String WEB_CLIENT = "437362291475-l2plioqbn63plaf8io4o4teu93bbeq3k.apps.googleusercontent.com";
    static final String COLL = "kb_users";

    BillingClient client;
    volatile boolean ready;
    final Map<String, ProductDetails> details = new HashMap<>();
    final List<String> wanted = new ArrayList<>();
    final List<PluginCall> waiting = new ArrayList<>();
    final Executor ex = Executors.newSingleThreadExecutor();

    // ---------------- Faturalandırma ----------------
    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this::onPurchases)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
        connect();
    }

    void connect() {
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult r) {
                ready = r.getResponseCode() == BillingClient.BillingResponseCode.OK;
                if (ready && !wanted.isEmpty()) query(null);
                else if (!ready) flushWaiting();
            }
            @Override public void onBillingServiceDisconnected() { ready = false; }
        });
    }

    static ProductDetails.OneTimePurchaseOfferDetails best(ProductDetails d) {
        ProductDetails.OneTimePurchaseOfferDetails b = null;
        List<ProductDetails.OneTimePurchaseOfferDetails> l = d.getOneTimePurchaseOfferDetailsList();
        if (l != null) for (ProductDetails.OneTimePurchaseOfferDetails o : l)
            if (b == null || o.getPriceAmountMicros() < b.getPriceAmountMicros()) b = o;
        return b != null ? b : d.getOneTimePurchaseOfferDetails();
    }
    static ProductDetails.OneTimePurchaseOfferDetails full(ProductDetails d) {
        ProductDetails.OneTimePurchaseOfferDetails m = d.getOneTimePurchaseOfferDetails();
        List<ProductDetails.OneTimePurchaseOfferDetails> l = d.getOneTimePurchaseOfferDetailsList();
        if (l != null) for (ProductDetails.OneTimePurchaseOfferDetails o : l)
            if (m == null || o.getPriceAmountMicros() > m.getPriceAmountMicros()) m = o;
        return m;
    }

    JSObject productsJson() {
        JSObject o = new JSObject();
        for (ProductDetails d : details.values()) {
            ProductDetails.OneTimePurchaseOfferDetails b = best(d), f = full(d);
            JSObject p = new JSObject();
            p.put("price", b != null ? b.getFormattedPrice() : "");
            p.put("full", f != null ? f.getFormattedPrice() : "");
            p.put("sale", b != null && f != null && b.getPriceAmountMicros() < f.getPriceAmountMicros());
            o.put(d.getProductId(), p);
        }
        return o;
    }

    void flushWaiting() {
        List<PluginCall> l;
        synchronized (waiting) { l = new ArrayList<>(waiting); waiting.clear(); }
        JSObject r = new JSObject();
        r.put("ready", ready && !details.isEmpty());
        r.put("products", productsJson());
        for (PluginCall c : l) c.resolve(r);
    }

    void query(PluginCall call) {
        if (call != null) synchronized (waiting) { waiting.add(call); }
        if (!ready) return; // bağlanınca sorgulanır
        List<QueryProductDetailsParams.Product> ps = new ArrayList<>();
        for (String id : wanted) ps.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        if (ps.isEmpty()) { flushWaiting(); return; }
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(ps).build(), (r, res) -> {
            List<ProductDetails> l = res.getProductDetailsList();
            if (l != null) for (ProductDetails d : l) details.put(d.getProductId(), d);
            flushWaiting();
        });
    }

    @PluginMethod
    public void init(PluginCall call) {
        JSArray ids = call.getArray("ids");
        wanted.clear();
        try { for (Object o : ids.toList()) wanted.add(String.valueOf(o)); } catch (Exception ignored) {}
        query(call);
        if (!ready) {
            // bağlantı kurulamazsa uzun bekletme
            getBridge().getWebView().postDelayed(this::flushWaiting, 8000);
        }
    }

    @PluginMethod
    public void buy(PluginCall call) {
        String id = call.getString("id");
        ProductDetails d = id == null ? null : details.get(id);
        if (!ready || d == null) { call.reject("not_ready"); if (ready) query(null); return; }
        BillingFlowParams.ProductDetailsParams.Builder pb = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
        ProductDetails.OneTimePurchaseOfferDetails b = best(d);
        if (b != null && b.getOfferToken() != null) pb.setOfferToken(b.getOfferToken());
        BillingFlowParams f = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(pb.build())).build();
        BillingResult r = client.launchBillingFlow(getActivity(), f);
        JSObject o = new JSObject();
        o.put("code", r.getResponseCode());
        if (r.getResponseCode() == BillingClient.BillingResponseCode.OK) call.resolve(o);
        else if (r.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { restoreAll(); call.resolve(o); }
        else call.reject("launch_" + r.getResponseCode());
    }

    void emit(Purchase p, boolean fresh) {
        for (String id : p.getProducts()) {
            JSObject o = new JSObject();
            o.put("id", id);
            o.put("token", p.getPurchaseToken());
            o.put("state", p.getPurchaseState() == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending");
            o.put("acknowledged", p.isAcknowledged());
            o.put("fresh", fresh);
            notifyListeners("purchase", o, true);
        }
    }

    void onPurchases(BillingResult r, List<Purchase> list) {
        int c = r.getResponseCode();
        if (c == BillingClient.BillingResponseCode.OK && list != null) { for (Purchase p : list) emit(p, true); return; }
        if (c == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { restoreAll(); return; }
        JSObject o = new JSObject();
        o.put("code", c);
        o.put("cancelled", c == BillingClient.BillingResponseCode.USER_CANCELED);
        notifyListeners("purchaseError", o, true);
    }

    void restoreAll() {
        if (!ready) return;
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (r, list) -> {
            if (r.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) for (Purchase p : list) emit(p, false);
        });
    }

    @PluginMethod
    public void restore(PluginCall call) {
        if (!ready) { call.reject("not_ready"); return; }
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (r, list) -> {
            JSArray arr = new JSArray();
            if (r.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) for (Purchase p : list) {
                emit(p, false);
                for (String id : p.getProducts()) arr.put(id);
            }
            JSObject o = new JSObject();
            o.put("ok", r.getResponseCode() == BillingClient.BillingResponseCode.OK);
            o.put("owned", arr);
            call.resolve(o);
        });
    }

    /** JS ödülü verdikten sonra: consume=true ise tüket (altın paketleri), değilse onayla (Pro, başlangıç paketi). */
    @PluginMethod
    public void finish(PluginCall call) {
        String token = call.getString("token");
        boolean consume = Boolean.TRUE.equals(call.getBoolean("consume", false));
        if (token == null || !ready) { call.reject("bad"); return; }
        if (consume) {
            client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (r, t) -> {
                JSObject o = new JSObject(); o.put("ok", r.getResponseCode() == BillingClient.BillingResponseCode.OK); call.resolve(o);
            });
        } else {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build(), r -> {
                JSObject o = new JSObject(); o.put("ok", r.getResponseCode() == BillingClient.BillingResponseCode.OK); call.resolve(o);
            });
        }
    }

    // ---------------- Google ile giriş + bulut ----------------
    JSObject userJson() {
        FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
        JSObject o = new JSObject();
        if (u == null) return o;
        o.put("uid", u.getUid());
        o.put("name", u.getDisplayName() == null ? "" : u.getDisplayName());
        o.put("email", u.getEmail() == null ? "" : u.getEmail());
        return o;
    }

    @PluginMethod
    public void user(PluginCall call) { call.resolve(userJson()); }

    @PluginMethod
    public void signIn(PluginCall call) {
        GetSignInWithGoogleOption opt = new GetSignInWithGoogleOption.Builder(WEB_CLIENT).build();
        GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(opt).build();
        CredentialManager.create(getContext()).getCredentialAsync(getActivity(), req, new CancellationSignal(), ex,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override public void onResult(GetCredentialResponse r) {
                    Credential c = r.getCredential();
                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                        try {
                            String token = GoogleIdTokenCredential.createFrom(((CustomCredential) c).getData()).getIdToken();
                            FirebaseAuth.getInstance().signInWithCredential(GoogleAuthProvider.getCredential(token, null))
                                .addOnCompleteListener(t -> {
                                    if (t.isSuccessful()) call.resolve(userJson());
                                    else call.reject("firebase");
                                });
                        } catch (Exception e) { call.reject("token"); }
                    } else call.reject("type");
                }
                @Override public void onError(GetCredentialException e) {
                    call.reject(e instanceof GetCredentialCancellationException ? "cancel" : e.getClass().getSimpleName());
                }
            });
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        FirebaseAuth.getInstance().signOut();
        CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(), new CancellationSignal(), ex,
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void v) {}
                @Override public void onError(ClearCredentialException e) {}
            });
        call.resolve();
    }

    @PluginMethod
    public void cloudSave(PluginCall call) {
        FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
        if (u == null) { call.reject("auth"); return; }
        Map<String, Object> m = new HashMap<>();
        m.put("save", call.getString("data", ""));
        m.put("stars", call.getInt("stars", 0));
        m.put("updated", FieldValue.serverTimestamp());
        FirebaseFirestore.getInstance().collection(COLL).document(u.getUid()).set(m, SetOptions.merge())
            .addOnCompleteListener(t -> { if (t.isSuccessful()) call.resolve(); else call.reject("save"); });
    }

    @PluginMethod
    public void cloudLoad(PluginCall call) {
        FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
        if (u == null) { call.reject("auth"); return; }
        FirebaseFirestore.getInstance().collection(COLL).document(u.getUid()).get().addOnCompleteListener(t -> {
            if (!t.isSuccessful()) { call.reject("load"); return; }
            DocumentSnapshot d = t.getResult();
            JSObject o = new JSObject();
            if (d != null && d.exists()) {
                o.put("data", d.getString("save"));
                Timestamp ts = d.getTimestamp("updated");
                o.put("updated", ts == null ? 0 : ts.toDate().getTime());
            }
            call.resolve(o);
        });
    }

    @PluginMethod
    public void deleteAccount(PluginCall call) {
        FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
        if (u == null) { call.reject("auth"); return; }
        FirebaseFirestore.getInstance().collection(COLL).document(u.getUid()).delete().addOnCompleteListener(t1 ->
            u.delete().addOnCompleteListener(t2 -> {
                FirebaseAuth.getInstance().signOut();
                if (t2.isSuccessful()) call.resolve(); else call.reject("relogin");
            }));
    }

    @Override
    protected void handleOnDestroy() { try { client.endConnection(); } catch (Exception ignored) {} }
}
