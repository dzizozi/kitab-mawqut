package io.github.dzizozi.alkitab;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app update: download the new APK into the app cache and hand it to the Android installer.
 * Also opens the system Wi-Fi / date & time screens (TV boxes without a battery lose the time when unplugged).
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) { call.reject("bad url"); return; }
        new Thread(() -> {
            File out = new File(getContext().getCacheDir(), "update.apk");
            try {
                String u = url;
                HttpURLConnection c = null;
                for (int hop = 0; hop < 6; hop++) {                 // follow redirects (GitHub → objects.githubusercontent.com)
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(20000); c.setReadTimeout(60000);
                    c.setRequestProperty("User-Agent", "KitabMawqut-Updater");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                        u = new URL(new URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue;
                    }
                    if (code != 200) throw new Exception("HTTP " + code);
                    break;
                }
                long total = c.getContentLengthLong(), done = 0; int lastPct = -1;
                try (InputStream in = c.getInputStream(); FileOutputStream fo = new FileOutputStream(out)) {
                    byte[] buf = new byte[64 * 1024]; int n;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n); done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != lastPct) { lastPct = pct; JSObject p = new JSObject(); p.put("pct", pct); p.put("done", done); notifyListeners("progress", p); }
                    }
                }
                if (total > 0 && done != total) throw new Exception("incomplete download");
                JSObject r = new JSObject(); r.put("path", out.getAbsolutePath()); r.put("size", done); call.resolve(r);
            } catch (Exception e) {
                out.delete(); call.reject(e.getMessage() == null ? "download failed" : e.getMessage());
            }
        }).start();
    }

    /** true when Android lets this app install packages (Android 8+: «Install unknown apps» permission). */
    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject r = new JSObject(); r.put("ok", ok); call.resolve(r);
    }

    @PluginMethod
    public void install(PluginCall call) {
        File f = new File(getContext().getCacheDir(), "update.apk");
        if (!f.exists()) { call.reject("no file"); return; }
        try {
            if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(s);          // same task: «Back» returns to the app, which then continues the installation
                JSObject r = new JSObject(); r.put("needPermission", true); call.resolve(r); return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(i);
            JSObject r = new JSObject(); r.put("started", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage() == null ? "install failed" : e.getMessage()); }
    }

    /** which: "wifi" | "date" | "unknown" */
    @PluginMethod
    public void openSettings(PluginCall call) {
        String which = call.getString("which", "wifi");
        String action = "date".equals(which) ? Settings.ACTION_DATE_SETTINGS
                : "unknown".equals(which) && Build.VERSION.SDK_INT >= 26 ? Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES
                : Settings.ACTION_WIFI_SETTINGS;
        try {
            Intent i = "unknown".equals(which) && Build.VERSION.SDK_INT >= 26
                    ? new Intent(action, Uri.parse("package:" + getContext().getPackageName())) : new Intent(action);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            try { Intent i = new Intent(Settings.ACTION_SETTINGS); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve(); }
            catch (Exception e2) { call.reject("no settings screen"); }
        }
    }
}
