package com.eavisionlabs.kaptanbolt;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Durum çubuğu ve gezinme çubuğunun arkası oyunun koyu rengiyle dolsun, simgeler açık renk olsun
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#110C30"));
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(false);
        if (bridge == null || bridge.getWebView() == null) return;
        WebView web = bridge.getWebView();
        // Telefonun "yazı boyutu" ayarı oyunun yazılarını büyütüp taşırmasın
        web.getSettings().setTextZoom(100);
        // Giriş videosu sesli başlayabilsin
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        // Android 15+ kenardan kenara çizim: oyun durum/gezinme çubuklarının altına girmesin
        ViewCompat.setOnApplyWindowInsetsListener(web, (View v, WindowInsetsCompat insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            ViewGroup.LayoutParams lp = v.getLayoutParams();
            if (lp instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams m = (ViewGroup.MarginLayoutParams) lp;
                if (m.leftMargin != b.left || m.topMargin != b.top || m.rightMargin != b.right || m.bottomMargin != b.bottom) {
                    m.setMargins(b.left, b.top, b.right, b.bottom);
                    v.setLayoutParams(m);
                }
            }
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(web);
    }
}
