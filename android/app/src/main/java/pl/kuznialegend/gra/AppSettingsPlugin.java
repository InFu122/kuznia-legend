package pl.kuznialegend.gra;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Otwiera ustawienia powiadomień gry w telefonie — gdy gracz dwa razy odmówił, Android już nie pyta o zgodę,
 * więc gra może tylko zaprowadzić go do właściwego ekranu (Android 8+: powiadomienia aplikacji, starszy: informacje o aplikacji).
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    @PluginMethod
    public void openNotifications(PluginCall call) {
        String pkg = getContext().getPackageName();
        Intent i;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent d = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
                d.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(d);
            } catch (Exception e2) {
                call.reject("Nie udało się otworzyć ustawień telefonu.");
                return;
            }
        }
        call.resolve();
    }
}
