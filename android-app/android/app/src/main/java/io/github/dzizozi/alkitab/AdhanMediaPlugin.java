package io.github.dzizozi.alkitab;

import android.os.StatFs;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Optional adhan background videos: the catalog and the clips live on GitHub releases (no CORS there, so the
 * WebView cannot fetch them itself). Files are kept in the app's private storage: files/adhan/<name>.
 */
@CapacitorPlugin(name = "AdhanMedia")
public class AdhanMediaPlugin extends Plugin {

    private File dir() { File d = new File(getContext().getFilesDir(), "adhan"); if (!d.exists()) d.mkdirs(); return d; }

    private static boolean safeName(String n) { return n != null && n.matches("[A-Za-z0-9._-]{1,80}") && !n.contains(".."); }

    private HttpURLConnection open(String url) throws Exception {
        String u = url; HttpURLConnection c = null;
        for (int hop = 0; hop < 6; hop++) {                       // GitHub → release-assets.githubusercontent.com
            c = (HttpURLConnection) new URL(u).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(20000); c.setReadTimeout(60000);
            c.setRequestProperty("User-Agent", "KitabMawqut-Media");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                u = new URL(new URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue;
            }
            if (code != 200) throw new Exception("HTTP " + code);
            return c;
        }
        throw new Exception("too many redirects");
    }

    @PluginMethod
    public void fetchText(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) { call.reject("bad url"); return; }
        new Thread(() -> {
            try {
                HttpURLConnection c = open(url);
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                try (InputStream in = c.getInputStream()) { byte[] b = new byte[16384]; int n; while ((n = in.read(b)) > 0) { bo.write(b, 0, n); if (bo.size() > 2_000_000) throw new Exception("too big"); } }
                JSObject r = new JSObject(); r.put("text", bo.toString("UTF-8")); call.resolve(r);
            } catch (Exception e) { call.reject(e.getMessage() == null ? "fetch failed" : e.getMessage()); }
        }).start();
    }

    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url"), name = call.getString("name");
        if (url == null || !url.startsWith("https://") || !safeName(name)) { call.reject("bad args"); return; }
        new Thread(() -> {
            File tmp = new File(dir(), name + ".part"), out = new File(dir(), name);
            try {
                HttpURLConnection c = open(url);
                long total = c.getContentLengthLong(), done = 0; int lastPct = -1;
                if (total > 0 && total + 50_000_000L > new StatFs(dir().getAbsolutePath()).getAvailableBytes()) throw new Exception("no space");
                try (InputStream in = c.getInputStream(); FileOutputStream fo = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[64 * 1024]; int n;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n); done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != lastPct) { lastPct = pct; JSObject p = new JSObject(); p.put("name", name); p.put("pct", pct); notifyListeners("progress", p); }
                    }
                }
                if (total > 0 && done != total) throw new Exception("incomplete download");
                if (out.exists()) out.delete();
                if (!tmp.renameTo(out)) throw new Exception("rename failed");
                JSObject r = new JSObject(); r.put("path", out.getAbsolutePath()); r.put("size", done); call.resolve(r);
            } catch (Exception e) {
                tmp.delete(); call.reject(e.getMessage() == null ? "download failed" : e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String name = call.getString("name");
        if (!safeName(name)) { call.reject("bad name"); return; }
        boolean ok = new File(dir(), name).delete();
        JSObject r = new JSObject(); r.put("removed", ok); call.resolve(r);
    }

    @PluginMethod
    public void list(PluginCall call) {
        JSArray a = new JSArray(); long used = 0;
        File[] fs = dir().listFiles();
        if (fs != null) for (File f : fs) {
            if (f.getName().endsWith(".part")) { f.delete(); continue; }
            JSObject o = new JSObject(); o.put("name", f.getName()); o.put("size", f.length()); o.put("path", f.getAbsolutePath()); a.put(o); used += f.length();
        }
        StatFs st = new StatFs(dir().getAbsolutePath());
        JSObject r = new JSObject(); r.put("files", a); r.put("used", used); r.put("free", st.getAvailableBytes()); r.put("total", st.getTotalBytes());
        call.resolve(r);
    }
}
