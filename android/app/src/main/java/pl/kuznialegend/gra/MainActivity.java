package pl.kuznialegend.gra;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Własna wtyczka gry (podpis aplikacji do diagnozy logowania Google) — rejestracja przed startem mostka.
        registerPlugin(AppSigningPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
