package com.eavisionlabs.kaptanbolt;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Telefonun "yazı boyutu" ayarı oyunun yazılarını büyütüp taşırmasın
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setTextZoom(100);
        }
    }
}
