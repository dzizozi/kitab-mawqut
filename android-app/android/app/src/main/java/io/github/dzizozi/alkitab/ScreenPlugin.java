package io.github.dzizozi.alkitab;

import android.os.Build;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Mosque display mode: keep the TV screen on, and choose the output resolution (1080p / 4K). */
@CapacitorPlugin(name = "Screen")
public class ScreenPlugin extends Plugin {
    @PluginMethod
    public void keepOn(PluginCall call) {
        final boolean on = call.getBoolean("on", true);
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            JSObject r = new JSObject(); r.put("on", on); call.resolve(r);
        });
    }

    private Display display() {
        if (Build.VERSION.SDK_INT >= 30) return getActivity().getDisplay();
        return getActivity().getWindowManager().getDefaultDisplay();
    }

    /** Display modes supported by the TV / TV box: [{id, w, h, fps}], plus the current mode id. */
    @PluginMethod
    public void modes(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject r = new JSObject();
            JSArray list = new JSArray();
            Display d = display();
            if (d != null && Build.VERSION.SDK_INT >= 23) {
                for (Display.Mode m : d.getSupportedModes()) {
                    JSObject o = new JSObject();
                    o.put("id", m.getModeId()); o.put("w", m.getPhysicalWidth()); o.put("h", m.getPhysicalHeight());
                    o.put("fps", Math.round(m.getRefreshRate()));
                    list.put(o);
                }
                r.put("current", d.getMode().getModeId());
            }
            r.put("modes", list);
            call.resolve(r);
        });
    }

    /** Ask the system to switch the output to this mode while the app is shown (Android TV honours it when the TV supports it). */
    @PluginMethod
    public void setMode(PluginCall call) {
        final int id = call.getInt("id", 0);
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowManager.LayoutParams lp = w.getAttributes();
            if (Build.VERSION.SDK_INT >= 23) lp.preferredDisplayModeId = id;
            w.setAttributes(lp);
            JSObject r = new JSObject(); r.put("id", id); call.resolve(r);
        });
    }
}
