package pl.kuznialegend.gra;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Własna wtyczka gry (podpis aplikacji do diagnozy logowania Google) — rejestracja przed startem mostka.
        registerPlugin(AppSigningPlugin.class);
        // Otwieranie ustawień powiadomień gry (gdy telefon już nie pyta o zgodę).
        registerPlugin(AppSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        // Bez paska przewijania po prawej: grę przewija się palcem, a pasek WebView tylko zasłania obraz.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
        }
    }
}
