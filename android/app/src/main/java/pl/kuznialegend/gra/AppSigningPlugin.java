package pl.kuznialegend.gra;

import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.MessageDigest;

/**
 * Odciski SHA-1 certyfikatów, którymi podpisana jest zainstalowana aplikacja.
 * Gra pokazuje je przy błędzie logowania przez Google — muszą być wpisane w Google Cloud (klienci OAuth „Android”).
 */
@CapacitorPlugin(name = "AppSigning")
public class AppSigningPlugin extends Plugin {

    @PluginMethod
    public void sha1(PluginCall call) {
        JSArray current = new JSArray();
        JSArray history = new JSArray();
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                SigningInfo si = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo;
                if (si != null) {
                    Signature[] now = si.getApkContentsSigners();
                    if (now != null) for (Signature s : now) current.put(fingerprint(s));
                    // Przy rotacji klucza: wszystkie certyfikaty z historii (od najstarszego).
                    Signature[] past = si.hasMultipleSigners() ? null : si.getSigningCertificateHistory();
                    if (past != null) for (Signature s : past) history.put(fingerprint(s));
                }
            } else {
                @SuppressWarnings("deprecation")
                Signature[] sigs = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES).signatures;
                if (sigs != null) for (Signature s : sigs) current.put(fingerprint(s));
            }
        } catch (Exception e) {
            call.reject("Nie udało się odczytać podpisu aplikacji: " + e.getMessage());
            return;
        }
        JSObject r = new JSObject();
        r.put("current", current);
        r.put("history", history);
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    private static String fingerprint(Signature s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-1").digest(s.toByteArray());
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < d.length; i++) {
            if (i > 0) b.append(':');
            b.append(String.format("%02X", d[i]));
        }
        return b.toString();
    }
}
